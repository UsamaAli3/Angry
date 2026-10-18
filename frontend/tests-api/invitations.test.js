import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createInvitationHandler } from "../api/invitations.js";

const event = (stage = "permission", answer = "yes") => ({ id: "event-id", session_id: "private-session", stage, answer, created_at: "2026-10-18T10:00:00.000Z" });

function harness({ shared = false, permissions = ['read("user:admin")'], configured = true, loseConfirmation = false } = {}) {
  const env = {
    VITE_APPWRITE_ENDPOINT: "https://database.test/v1", VITE_APPWRITE_PROJECT_ID: "project",
    VITE_APPWRITE_DATABASE_ID: "database", VITE_APPWRITE_COLLECTION_ID: "checkins",
    VITE_APPWRITE_INVITATION_COLLECTION_ID: shared ? "" : "invitations",
    APPWRITE_API_KEY: configured ? "server-secret-never-return" : "", APPWRITE_ADMIN_USER_ID: "admin",
  };
  const documents = new Map();
  const calls = [];
  let confirmationLost = false;
  let currentTime = Date.parse("2026-10-18T10:00:00.000Z");
  let followupToken;
  const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const handler = createInvitationHandler({ env, now: () => currentTime, fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    if (url.endsWith("/account")) return options.headers["X-Appwrite-JWT"] === "expired" ? response(401, {}) : response(200, { $id: options.headers["X-Appwrite-JWT"] === "other-user" ? "someone-else" : "admin" });
    assert.equal(options.headers["X-Appwrite-Key"], env.APPWRITE_API_KEY);
    if (!url.includes("/rows")) return response(200, { $permissions: permissions, rowSecurity: true });
    if (options.method === "POST") {
      const { rowId: documentId, data, permissions: docPermissions } = JSON.parse(options.body);
      if (documents.has(documentId)) return response(409, { message: "Already exists", type: "document_already_exists" });
      documents.set(documentId, { $id: documentId, ...data, $permissions: docPermissions });
      if (loseConfirmation && !confirmationLost) { confirmationLost = true; return response(503, { message: "Lost confirmation" }); }
      return response(201, documents.get(documentId));
    }
    const doc = documents.get(url.split("/").at(-1));
    if (doc && options.method === "PATCH") Object.assign(doc, JSON.parse(options.body).data);
    return doc ? response(200, doc) : response(404, { message: "Not found" });
  } });
  return { documents, calls, async allow(allowed = true, jwt = "admin-jwt") { return this.send({ action: "set_followup_access", session_id: "private-session", allowed }, { headers: { "x-admin-jwt": jwt } }); }, advance: ms => { currentTime += ms; }, get token() { return followupToken; }, async send(body = event(), { method = "POST", origin = "https://invitation.test", headers = {}, url = "/api/invitations" } = {}) {
    if (body && typeof body === "object" && typeof body.stage === "string" && body.stage !== "permission" && !body.stage.startsWith("delivery_") && followupToken && body.followup_token === undefined) body = { ...body, followup_token: followupToken };
    const req = { method, url, headers: { origin, host: "invitation.test", "content-type": "application/json", ...headers }, body };
    let result;
    const res = { setHeader() {}, end(text) { result = { status: this.statusCode, body: JSON.parse(text) }; } };
    await handler(req, res);
    if (result.body.followup) followupToken = result.body.followup.token;
    assert.ok(!JSON.stringify(result).includes(env.APPWRITE_API_KEY || "never-in-output"));
    return result;
  } };
}

for (const shared of [false, true]) {
  test(`saves permission and maybe privately (${shared ? "shared" : "dedicated"})`, async () => {
    const app = harness({ shared });
    assert.equal((await app.send()).status, 200);
    await app.allow();
  assert.equal((await app.send(event("invitation", "maybe"))).status, 200);
    assert.equal(app.documents.size, 4);
    for (const doc of app.documents.values()) {
      assert.deepEqual(doc.$permissions, ['read("user:admin")', 'delete("user:admin")']);
      assert.equal(shared ? doc.what_happened : doc.session_id, "private-session");
    }
    const last = [...app.documents.values()].at(-1);
    assert.equal(shared ? last.what_wants : last.answer, "maybe");
  });
}

test("rejects malformed, unknown and oversized responses before database calls", async () => {
  const app = harness();
  for (const invalid of [event("invitation", "forced"), event("date", "2027-02-30"), event("time", "29:00"), event("timezone", "unknown/zone"), event("contact", "x".repeat(121)), { ...event(), unexpected: "injected" }, { ...event(), session_id: "../other" }]) {
    assert.equal((await app.send(invalid)).status, 400);
  }
  assert.equal((await app.send("x".repeat(5000))).status, 413);
  assert.equal(app.calls.length, 0);
});

test("rejects GET, cross-origin and non-JSON requests", async () => {
  const app = harness();
  assert.equal((await app.send(event(), { method: "GET" })).status, 405);
  assert.equal((await app.send(event(), { origin: "https://other.test" })).status, 403);
  assert.equal((await app.send(event(), { headers: { "content-type": "text/plain" } })).status, 415);
  assert.equal(app.calls.length, 0);
});

test("missing server credentials fail closed", async () => {
  const app = harness({ configured: false });
  assert.equal((await app.send()).status, 503);
  assert.equal(app.calls.length, 0);
});

test("readiness reports missing configuration without exposing keys or querying responses", async () => {
  const missing = harness({ configured: false });
  assert.deepEqual(await missing.send(undefined, { method: "GET", url: "/api/invitations?status=1" }), {
    status: 200, body: { configured: false, missing: ["APPWRITE_API_KEY"] },
  });
  assert.equal(missing.calls.length, 0);
  const ready = harness();
  assert.deepEqual(await ready.send(undefined, { method: "GET", url: "/api/invitations?status=1" }), { status: 200, body: { configured: true, missing: [] } });
  assert.equal(ready.calls.length, 0);
});

test("refuses collections that expose responses to other users", async () => {
  for (const permission of ['read("any")', 'read("users")', 'update("any")', 'delete("users")', 'create("any")']) {
    const app = harness({ permissions: [permission] });
    assert.equal((await app.send()).status, 503);
    assert.equal(app.documents.size, 0);
  }
});

test("does not accept an invitation without permission or details after maybe", async () => {
  const app = harness();
  assert.equal((await app.send(event("invitation", "coffee"))).status, 409);
  assert.equal((await app.send()).status, 200);
  await app.allow();
  assert.equal((await app.send(event("invitation", "maybe"))).status, 200);
  assert.equal((await app.send(event("contact", "hello@example.test"))).status, 409);
});

test("idempotent retries verify content and never overwrite an earlier answer", async () => {
  const app = harness({ loseConfirmation: true });
  assert.equal((await app.send()).status, 503);
  assert.equal((await app.send()).status, 200);
  assert.equal(app.documents.size, 2);
  assert.equal((await app.send(event("permission", "no"))).status, 409);
  assert.equal([...app.documents.values()][0].answer, "yes");
});

test("accepted invitations can save optional contact and scheduling details", async () => {
  const app = harness();
  await app.send();
  await app.allow();
  await app.send(event("invitation", "dinner"));
  for (const [stage, answer] of Object.entries({ date: "2099-12-20", time: "18:30", timezone: "Asia/Dubai", contact_method: "Email", contact: "hello@example.test" })) {
    assert.equal((await app.send(event(stage, answer))).status, 200);
  }
  assert.equal(app.documents.size, 9);
});

test("only owner approval opens the link, and blocking closes it again", async () => {
  const app = harness();
  await app.send();
  assert.equal((await app.send(event("delivery_method", "Email"))).status, 200);
  assert.equal((await app.send(event("delivery_contact", "hello@example.test"))).status, 200);
  const next = () => app.send(undefined, { method: "GET", url: `/api/invitations?next=${app.token}` });
  assert.equal((await next()).body.ready, false);
  app.advance(24 * 60 * 60 * 1000);
  assert.equal((await next()).body.ready, false);
  assert.equal((await app.send(event("invitation", "coffee"))).status, 423);
  assert.equal((await app.allow(true, "")).status, 401);
  assert.equal((await app.allow(true, "other-user")).status, 403);
  assert.equal((await app.allow(true, "expired")).status, 401);
  assert.equal((await app.allow()).status, 200);
  assert.equal((await next()).body.ready, true);
  assert.equal((await app.send(event("invitation", "coffee"))).status, 200);
  assert.equal((await app.allow(false)).status, 200);
  assert.equal((await next()).body.ready, false);
  assert.equal((await app.send(event("time", "18:30"))).status, 423);
});

test("a forged approval row cannot open the question", async () => {
  const app = harness();
  await app.send();
  const id = 'i' + createHash('sha256').update('private-session:link_access').digest('hex').slice(0,32);
  app.documents.set(id, { $id: id, session_id: 'private-session', stage: 'link_access', answer: 'allowed', created_at: '2026-10-18T10:00:00.000Z' });
  const next = () => app.send(undefined, { method: "GET", url: `/api/invitations?next=${app.token}` });
  assert.equal((await next()).body.ready, false);
  assert.equal((await app.allow()).status, 200);
  assert.equal((await next()).body.ready, true);
});

test("retry preserves the original deadline and tampered tokens cannot unlock the question", async () => {
  const app = harness();
  const first = await app.send();
  app.advance(1000);
  const retry = await app.send();
  assert.deepEqual(retry.body.followup, first.body.followup);
  const fake = `x${app.token.slice(1)}`;
  assert.equal((await app.send(undefined, { method: "GET", url: `/api/invitations?next=${fake}` })).status, 403);
  assert.equal((await app.send({ ...event("invitation", "coffee"), followup_token: fake })).status, 403);
});
