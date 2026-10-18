import { createHash } from "node:crypto";
import { isValidInvitationEvent, invitationIdPattern } from "../src/lib/invitation-validation.js";
import { makeAccessValue, makeFollowupToken, verifyFollowupToken } from "./followup.js";

const documentId = (session, stage) => `i${createHash("sha256").update(`${session}:${stage}`).digest("hex").slice(0, 32)}`;

export function createInvitationHandler({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
  return async function invitationHandler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
    if (req.method === "GET" && new URL(req.url || "/", "http://localhost").searchParams.get("status") === "1") {
      // Report readiness only, never credential values or private responses.
      const missing = ["APPWRITE_API_KEY", "APPWRITE_ADMIN_USER_ID"].filter(name => !env[name]);
      return send(200, { configured: missing.length === 0, missing });
    }
    const nextToken = new URL(req.url || "/", "http://localhost").searchParams.get("next");
    const isFollowupRead = req.method === "GET" && Boolean(nextToken);
    if (req.method !== "POST" && !isFollowupRead) { res.setHeader("Allow", "POST"); return send(405, { error: "Method not allowed." }); }
    const origin = req.headers.origin;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    try {
      if (!isFollowupRead && (!origin || new URL(origin).host !== host || !["http:", "https:"].includes(new URL(origin).protocol))) return send(403, { error: "Please send your answer from the invitation page." });
    } catch { return send(403, { error: "Invalid request origin." }); }
    if (!isFollowupRead && !req.headers["content-type"]?.toLowerCase().startsWith("application/json")) return send(415, { error: "Expected a JSON response." });
    let event;
    let isAccessUpdate = false;
    if (!isFollowupRead) {
    try {
      if (Number(req.headers["content-length"]) > 4096) return send(413, { error: "Response is too large." });
      let body = req.body;
      if (body === undefined) {
        let raw = "";
        for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 4096) return send(413, { error: "Response is too large." }); }
        body = raw;
      }
      if (Buffer.byteLength(typeof body === "string" ? body : JSON.stringify(body)) > 4096) return send(413, { error: "Response is too large." });
      event = typeof body === "string" ? JSON.parse(body) : body;
      isAccessUpdate = event?.action === "set_followup_access";
      const validAccessUpdate = isAccessUpdate && Object.keys(event).every(key => ["action", "session_id", "allowed"].includes(key)) && typeof event.session_id === "string" && invitationIdPattern.test(event.session_id) && typeof event.allowed === "boolean";
      if (!(isAccessUpdate ? validAccessUpdate : isValidInvitationEvent(event))) return send(400, { error: "Please check your response and try again." });
    } catch { return send(400, { error: "Please check your response and try again." }); }
    }

    const endpoint = env.APPWRITE_ENDPOINT || env.VITE_APPWRITE_ENDPOINT;
    const project = env.APPWRITE_PROJECT_ID || env.VITE_APPWRITE_PROJECT_ID;
    const database = env.APPWRITE_DATABASE_ID || env.VITE_APPWRITE_DATABASE_ID;
    const collection = env.APPWRITE_INVITATION_COLLECTION_ID || env.VITE_APPWRITE_INVITATION_COLLECTION_ID || env.VITE_APPWRITE_COLLECTION_ID;
    const key = env.APPWRITE_API_KEY;
    const admin = env.APPWRITE_ADMIN_USER_ID;
    if (!endpoint || !project || !database || !collection || !key || !admin || !invitationIdPattern.test(admin)) {
      return send(503, { error: "Your answer hasn't been saved. The owner needs to configure the private invitation API." });
    }
    const shared = collection === env.VITE_APPWRITE_COLLECTION_ID;
    const base = `/tablesdb/${encodeURIComponent(database)}/tables/${encodeURIComponent(collection)}`;
    const request = async (path, options = {}) => {
      const response = await fetchImpl(`${endpoint.replace(/\/$/, "")}${path}`, {
        ...options, signal: AbortSignal.timeout(10000),
        headers: { "X-Appwrite-Project": project, "X-Appwrite-Key": key, "Content-Type": "application/json" },
      });
      const body = await response.json();
      if (!response.ok) { const error = new Error(body.message); error.status = response.status; error.type = body.type; throw error; }
      return body;
    };
    const normalize = doc => shared ? { session_id: doc.what_happened, stage: doc.anger_level, answer: doc.what_wants, created_at: doc.created_at } : doc;
    const secret = env.INVITATION_LINK_SECRET || key;
    const accessAllowed = async session => {
      try {
        const row = normalize(await request(`${base}/rows/${documentId(session, "link_access")}`));
        return row.session_id === session && row.stage === "link_access" && row.answer === makeAccessValue(session, true, row.created_at, secret);
      } catch (error) { if (error.status === 404) return false; throw error; }
    };
    try {
      const config = await request(base);
      // A collection grant overrides document privacy. Reject broad read/edit grants.
      const allowed = new Set([`create("user:${admin}")`, `read("user:${admin}")`, `update("user:${admin}")`, `delete("user:${admin}")`]);
      if (!Array.isArray(config.$permissions)
        || config.$permissions.some(permission => !allowed.has(permission) && !(shared && permission.startsWith("create(")))
        || (!config.rowSecurity && !config.$permissions.includes(`read("user:${admin}")`))) {
        return send(503, { error: "Your answer hasn't been saved. The owner needs to restrict invitation database access to their admin account." });
      }
      if (isAccessUpdate) {
        const jwt = req.headers["x-admin-jwt"];
        if (typeof jwt !== "string" || !jwt || jwt.length > 8192) return send(401, { error: "Sign in to your admin account to control the link." });
        const auth = await fetchImpl(`${endpoint.replace(/\/$/, "")}/account`, {
          headers: { "X-Appwrite-Project": project, "X-Appwrite-JWT": jwt }, signal: AbortSignal.timeout(10000),
        });
        if (!auth.ok) return send(401, { error: "Your sign-in has expired. Please sign in again." });
        const user = await auth.json();
        if (user.$id !== admin) return send(403, { error: "Only the invitation owner can control the link." });
        const permission = normalize(await request(`${base}/rows/${documentId(event.session_id, "permission")}`));
        if (permission.answer !== "yes") return send(409, { error: "Only a Yes response can have a follow-up link." });
        const stage = "link_access", created_at = new Date(now()).toISOString();
        const answer = makeAccessValue(event.session_id, event.allowed, created_at, secret);
        const data = shared ? { event_type: "invitation", what_happened: event.session_id, anger_level: stage, what_wants: answer, created_at }
          : { session_id: event.session_id, stage, answer, created_at };
        const id = documentId(event.session_id, stage);
        try {
          await request(`${base}/rows`, { method: "POST", body: JSON.stringify({ rowId: id, data, permissions: [`read("user:${admin}")`, `delete("user:${admin}")`] }) });
        } catch (error) {
          if (error.status !== 409 || !["row_already_exists", "document_already_exists"].includes(error.type)) throw error;
          await request(`${base}/rows/${id}`, { method: "PATCH", body: JSON.stringify({ data }) });
        }
        return send(200, { updated: true, allowed: event.allowed });
      }
      if (isFollowupRead) {
        const ticket = verifyFollowupToken(nextToken, secret);
        if (!ticket || !invitationIdPattern.test(ticket.s)) return send(403, { error: "This follow-up link is invalid. Please ask for a new link." });
        const permission = normalize(await request(`${base}/rows/${documentId(ticket.s, "permission")}`));
        const expected = makeFollowupToken(ticket.s, permission.created_at, secret);
        if (permission.answer !== "yes" || expected.token !== nextToken) return send(403, { error: "This follow-up link is invalid." });
        const ready = await accessAllowed(ticket.s);
        return send(200, { ready, availableAt: ticket.a, serverNow: new Date(now()).toISOString(), ...(ready ? { sessionId: ticket.s } : {}) });
      }
      if (event.stage !== "permission") {
        const delivery = ["delivery_method", "delivery_contact"].includes(event.stage);
        const previousStage = event.stage === "invitation" || delivery ? "permission" : "invitation";
        const previous = normalize(await request(`${base}/rows/${documentId(event.session_id, previousStage)}`));
        const valid = previous.session_id === event.session_id && (previousStage === "permission" ? previous.answer === "yes" : ["coffee", "dinner"].includes(previous.answer));
        if (!valid) return send(409, { error: "Please complete the invitation question before sending these details." });
        if (!delivery) {
          const ticket = verifyFollowupToken(event.followup_token, secret);
          if (!ticket || ticket.s !== event.session_id) return send(403, { error: "Please open your private follow-up link to answer the next question." });
          if (!await accessAllowed(event.session_id)) return send(423, { error: "The next question isn't open yet. Please wait until the sender allows your link." });
          const permission = previousStage === "permission" ? previous : normalize(await request(`${base}/rows/${documentId(event.session_id, "permission")}`));
          if (makeFollowupToken(event.session_id, permission.created_at, secret).token !== event.followup_token) return send(403, { error: "This follow-up link is invalid." });
        }
      }
      const id = documentId(event.session_id, event.stage);
      let created_at = new Date(now()).toISOString();
      const data = shared ? { event_type: "invitation", what_happened: event.session_id, anger_level: event.stage, what_wants: event.answer, created_at }
        : { session_id: event.session_id, stage: event.stage, answer: event.answer, created_at };
      try {
        await request(`${base}/rows`, { method: "POST", body: JSON.stringify({ rowId: id, data, permissions: [`read("user:${admin}")`, `delete("user:${admin}")`] }) });
      } catch (error) {
        if (error.status !== 409 || !["row_already_exists", "document_already_exists"].includes(error.type)) throw error;
        const existing = normalize(await request(`${base}/rows/${id}`));
        if (existing.session_id !== event.session_id || existing.stage !== event.stage || existing.answer !== event.answer) return send(409, { error: "This question already has a different saved answer." });
        created_at = existing.created_at;
      }
      if (event.stage === "permission" && event.answer === "yes") {
        const followup = makeFollowupToken(event.session_id, created_at, secret);
        const linkData = shared ? { event_type: "invitation", what_happened: event.session_id, anger_level: "next_link", what_wants: followup.token, created_at }
          : { session_id: event.session_id, stage: "next_link", answer: followup.token, created_at };
        try {
          await request(`${base}/rows`, { method: "POST", body: JSON.stringify({ rowId: documentId(event.session_id, "next_link"), data: linkData, permissions: [`read("user:${admin}")`, `delete("user:${admin}")`] }) });
        } catch (error) { if (error.status !== 409 || !["row_already_exists", "document_already_exists"].includes(error.type)) throw error; }
        return send(200, { saved: true, followup });
      }
      return send(200, { saved: true });
    } catch (error) {
      // Never return Appwrite documents, credentials or internal errors to visitors.
      if (/project is paused/i.test(error.message ?? "")) return send(503, { error: "Your answer hasn't been saved: the Appwrite project is paused. Please retry after its owner restores it." });
      if (error.status === 404) return send(409, { error: "Your answer hasn't been saved. Please retry your pending answers in order." });
      return send(503, { error: "Your answer hasn't been saved. Please try again later." });
    }
  };
}

export default createInvitationHandler();
