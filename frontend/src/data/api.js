// api.js
// All reads/writes to the Appwrite "checkins" collection.
// Every function throws a plain Error on failure so pages can catch it
// and show a friendly message instead of a technical one.

import { Query } from "appwrite";
import { ID, Permission, Role, appwriteConfig, databases } from "../appwrite.js";

const { databaseId, collectionId } = appwriteConfig;

function answerData({ whatHappened, angerLevel, whatWants }) {
  return Object.fromEntries(
    Object.entries({
      what_happened: whatHappened,
      anger_level: angerLevel,
      what_wants: whatWants,
    }).filter(([, value]) => value != null),
  );
}

// Answers may be partial here — a check-in can be saved with only one or
// two of the three questions answered so far.
export async function createCheckin({ whatHappened, angerLevel, whatWants }) {
  try {
    const createdAt = new Date().toISOString();
    const docRef = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      {
        ...answerData({ whatHappened, angerLevel, whatWants }),
        created_at: createdAt,
        event_type: "checkin",
      },
      [Permission.write(Role.any())],
    );
    return {
      checkin: {
        id: docRef.id,
        what_happened: whatHappened ?? null,
        anger_level: angerLevel ?? null,
        what_wants: whatWants ?? null,
        created_at: createdAt,
      },
    };
  } catch (err) {
    console.error("Failed to save check-in:", err);
    if (err?.message?.includes("No permissions provided for action 'create'")) {
      throw new Error("Appwrite collection permissions must allow Any to create documents.");
    }
    throw new Error("Failed to save check-in.");
  }
}

export async function recordVisit() {
  try {
    await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      { created_at: new Date().toISOString(), event_type: "visit" },
      [Permission.write(Role.any())],
    );
  } catch (err) {
    console.error("Failed to record visit:", err);
  }
}

// Updates an in-progress check-in in place (used while someone is still
// filling in their answers, before all three are done). This does not
// touch created_at, so the record keeps its original save time.
export async function updateCheckin(id, { whatHappened, angerLevel, whatWants }) {
  try {
    await databases.updateDocument(
      databaseId,
      collectionId,
      id,
      {
        what_happened: whatHappened ?? null,
        anger_level: angerLevel ?? null,
        what_wants: whatWants ?? null,
      },
    );
    return { success: true };
  } catch (err) {
    console.error("Failed to update check-in:", err);
    throw new Error("Failed to save check-in.");
  }
}

export async function getCheckins() {
  try {
    const response = await databases.listDocuments(databaseId, collectionId, [Query.limit(100)]);
    const checkins = response.documents
      .filter((document) => !document.event_type || document.event_type === "checkin")
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((document) => {
      const data = document;
      return {
        id: document.$id,
        what_happened: data.what_happened,
        anger_level: data.anger_level,
        what_wants: data.what_wants,
        created_at: data.created_at ?? null,
      };
      });
    return { checkins };
  } catch (err) {
    console.error("Failed to load check-ins:", err);
    throw new Error("Failed to load check-ins.");
  }
}

export async function getVisitCount() {
  try {
    const response = await databases.listDocuments(databaseId, collectionId, [Query.limit(100)]);
    return response.documents.filter((document) => document.event_type === "visit").length;
  } catch (err) {
    console.error("Failed to load visit count:", err);
    throw new Error("Failed to load visitor count.");
  }
}

export async function deleteCheckin(id) {
  try {
    await databases.deleteDocument(databaseId, collectionId, id);
    return { success: true };
  } catch (err) {
    console.error("Failed to delete check-in:", err);
    throw new Error("Failed to delete check-in.");
  }
}

export async function deleteAllCheckins() {
  try {
    const response = await databases.listDocuments(databaseId, collectionId, [Query.limit(100)]);
    await Promise.all(
      response.documents
        .filter((document) => !document.event_type || document.event_type === "checkin")
        .map((document) =>
        databases.deleteDocument(databaseId, collectionId, document.$id),
        ),
    );
    return { success: true };
  } catch (err) {
    console.error("Failed to clear check-ins:", err);
    throw new Error("Failed to clear check-ins.");
  }
}
