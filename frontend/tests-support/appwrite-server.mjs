// Local integration-test database only. Never used by the application or deployed.
import { createServer } from "node:http";

let records = new Map();
let failVisit = false;
let visitAttempts = [];
let failCheckinReads = false;
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "http://127.0.0.1:5182");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "content-type,x-appwrite-project,x-appwrite-key");
  res.setHeader("Content-Type", "application/json");
  const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
  if (req.method === "OPTIONS") return send(200, {});
  const url = new URL(req.url, "http://127.0.0.1:5181");
  const tablesRequest = url.pathname.startsWith("/v1/tablesdb/");
  if (tablesRequest) url.pathname = url.pathname.replace("/tablesdb/", "/databases/").replace("/tables/", "/collections/").replace("/rows", "/documents");
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  if (tablesRequest && body.rowId) body.documentId = body.rowId;
  if (url.pathname === "/__test/reset") {
    records = new Map(); failVisit = Boolean(body.failNextVisit); visitAttempts = []; failCheckinReads = Boolean(body.failCheckinReads);
    for (let index = 0; index < (body.seedVisits || 0); index++) {
      const created_at = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
      records.set(`seed-${index}`, { $id: `seed-${index}`, $createdAt: created_at, created_at, collection: "test-checkins", event_type: "visit", platform: `Seed platform ${index}` });
    }
    return send(200, { reset: true });
  }
  if (url.pathname === "/__test/state") return send(200, { visits: [...records.values()].filter(doc => doc.event_type === "visit").length, answers: [...records.values()].filter(doc => doc.collection === "test-invitations").length, visitAttempts });
  if (url.pathname === "/v1/account") return send(200, { $id: "test-admin", email: "admin@example.test" });
  if (url.pathname === "/v1/account/jwts" && req.method === "POST") return send(201, { jwt: "integration-admin-jwt" });
  if (url.pathname.endsWith("/global-settings")) return send(200, { config: JSON.stringify({ title: "Mood check-in", description: "How are you?", showIceCreamShop: false }) });
  const path = url.pathname.match(/^\/v1\/databases\/test-db\/collections\/([^/]+)(?:\/documents(?:\/([^/]+))?)?$/);
  if (!path) return send(404, { message: "Not found" });
  const [, collection, id] = path;
  if (!url.pathname.includes("/documents")) return send(200, { $permissions: ['read("user:test-admin")'], documentSecurity: true, rowSecurity: true });
  if (req.method === "POST") {
    if (body.data.event_type === "visit") {
      visitAttempts.push(body.documentId);
      if (failVisit) { failVisit = false; return send(503, { message: "Temporary test connection failure" }); }
    } else if (req.headers["x-appwrite-key"] !== "integration-only-key") return send(401, { message: "Server key required" });
    if (records.has(body.documentId)) return send(409, { message: "Already exists", type: "document_already_exists" });
    const doc = { $id: body.documentId, $createdAt: new Date().toISOString(), ...body.data, collection, $permissions: body.permissions };
    records.set(doc.$id, doc);
    return send(201, doc);
  }
  if (id) {
    if (!records.has(id)) return send(404, { message: "Not found" });
    if (req.method === "PATCH") {
      if (req.headers["x-appwrite-key"] !== "integration-only-key") return send(401, { message: "Server key required" });
      Object.assign(records.get(id), body.data);
    }
    return send(200, records.get(id));
  }
  let documents = [...records.values()].filter(doc => doc.collection === collection);
  const queries = [...url.searchParams.entries()].filter(([key]) => key.startsWith("queries")).map(([, value]) => JSON.parse(value));
  if (failCheckinReads && collection === "test-checkins" && !queries.some(query => query.method === "equal")) return send(503, { message: "Check-ins temporarily unavailable" });
  for (const query of queries.filter(query => query.method === "equal")) documents = documents.filter(doc => query.values.includes(doc[query.attribute]));
  documents.sort((a, b) => b.$createdAt.localeCompare(a.$createdAt));
  const total = documents.length;
  const cursor = queries.find(query => query.method === "cursorAfter")?.values[0];
  if (cursor) documents = documents.slice(documents.findIndex(doc => doc.$id === cursor) + 1);
  documents = documents.slice(0, queries.find(query => query.method === "limit")?.values[0] || 100);
  return send(200, { total, documents });
});
server.listen(5181, "127.0.0.1", () => process.stdout.write("Integration Appwrite server listening on 5181\n"));
