import { createHmac, timingSafeEqual } from "node:crypto";
import { FOLLOWUP_DELAY_MS, readFollowupToken } from "../src/lib/followup.js";

export function makeFollowupToken(session, createdAt, secret) {
  const availableAt = new Date(Date.parse(createdAt) + FOLLOWUP_DELAY_MS).toISOString();
  const payload = Buffer.from(JSON.stringify({ s: session, a: availableAt })).toString("base64url");
  return { token: `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`, availableAt };
}

export function verifyFollowupToken(token, secret) {
  const value = readFollowupToken(token);
  if (!value) return null;
  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", secret).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? value : null;
}

export function makeAccessValue(session, allowed, createdAt, secret) {
  const state = allowed ? "allowed" : "blocked";
  const proof = createHmac("sha256", secret).update(`followup-access:${session}:${state}:${createdAt}`).digest("base64url");
  return `${state}.${proof}`;
}
