import { Query } from "appwrite";
import { account, appwriteConfig, databases, ID } from "../appwrite.js";
import { isValidInvitationAnswer, isValidInvitationEvent } from "../lib/invitation-validation.js";

function collectionId() {
  const id = appwriteConfig.invitationCollectionId || appwriteConfig.collectionId;
  if (!id) throw new Error("The Appwrite database connection is missing. Please check the app's environment settings.");
  return id;
}

function usesSharedCollection() {
  return !appwriteConfig.invitationCollectionId || appwriteConfig.invitationCollectionId === appwriteConfig.collectionId;
}

export async function setFollowupAccess(sessionId, allowed) {
  const { jwt } = await account.createJWT();
  const response = await fetch("/api/invitations", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Admin-JWT": jwt },
    body: JSON.stringify({ action: "set_followup_access", session_id: sessionId, allowed }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok || body.updated !== true) throw new Error(body.error || "Unable to change link access. Please try again.");
  window.dispatchEvent(new Event("records-changed"));
}

export function makeInvitationResponse(sessionId, stage, answer, followupToken) {
  if (!isValidInvitationAnswer(stage, answer)) throw new Error("Invalid invitation response.");
  return {
    id: ID.unique(),
    session_id: sessionId,
    stage,
    answer,
    created_at: new Date().toISOString(),
    ...(followupToken ? { followup_token: followupToken } : {}),
  };
}

export async function saveInvitationResponse(event) {
  if (!isValidInvitationEvent(event)) throw new Error("Invalid invitation response.");
  try {
    const response = await fetch("/api/invitations", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(20000),
    });
    const body = await response.json();
    if (!response.ok || body.saved !== true) {
      throw new Error(body.error || "Your answer hasn't been saved. Please try again.");
    }
    window.dispatchEvent(new Event("records-changed"));
    return body;
  } catch (error) {
    if (error instanceof TypeError || error.name === "TimeoutError" || error instanceof SyntaxError) {
      throw new Error("Your answer hasn't been saved. Please check your connection and try again.");
    }
    throw error;
  }
}

export async function getInvitationResponses({ all = false } = {}) {
  const shared = usesSharedCollection();
  const documents = [];
  let cursor;
  while (true) {
    const result = await databases.listDocuments(appwriteConfig.databaseId, collectionId(), [
    ...(shared ? [Query.equal("event_type", "invitation")] : []),
    Query.orderDesc("$createdAt"), Query.limit(100),
    ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);
    documents.push(...result.documents);
    const nextCursor = result.documents.at(-1)?.$id;
    if (!all || result.documents.length < 100 || !nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
  }
  return shared ? documents
    .filter(document => document.event_type === "invitation")
    .map(document => ({
      $id: document.$id,
      session_id: document.what_happened,
      stage: document.anger_level,
      answer: document.what_wants,
      created_at: document.created_at,
    })) : documents;
}
