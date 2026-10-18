// api.js
// All reads/writes to the Appwrite "checkins" collection.
// Every function throws a plain Error on failure so pages can catch it
// and show a friendly message instead of a technical one.

import { Query } from "appwrite";
import { ID, Permission, Role, appwriteConfig, databases } from "../appwrite.js";
import { questions as defaultQuestions } from "./questions.js";
import { currentDeviceId } from "../lib/visit-devices.js";

const { databaseId, collectionId, settingsCollectionId } = appwriteConfig;

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
export async function createCheckin(
  { whatHappened, angerLevel, whatWants },
  questions = defaultQuestions,
) {
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
        what_happened_header: questions[0]?.title ?? defaultQuestions[0].title,
        anger_level_header: questions[1]?.title ?? defaultQuestions[1].title,
        what_wants_header: questions[2]?.title ?? defaultQuestions[2].title,
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

export async function getSettings() {
  const defaultSettings = {
    title: "How are you feeling?",
    description: "Choose the answers that feel closest. You don't need to type anything.",
    // Existing settings documents predate this option, so keep the shop
    // visible until an admin explicitly turns it off.
    showIceCreamShop: true,
    questions: defaultQuestions,
  };
  if (!settingsCollectionId) return defaultSettings;
  try {
    const document = await databases.getDocument(databaseId, settingsCollectionId, "global-settings");
    const config = JSON.parse(document.config);
    return Array.isArray(config)
      ? { ...defaultSettings, questions: config }
      : { ...defaultSettings, ...config };
  } catch (err) {
    console.error("Failed to load settings:", err);
    return defaultSettings;
  }
}

export async function saveSettings(settings) {
  await databases.updateDocument(databaseId, settingsCollectionId, "global-settings", {
    config: JSON.stringify(settings),
  });
  window.dispatchEvent(new CustomEvent("settings-changed", { detail: settings }));
}

export async function recordVisit(id = ID.unique()) {
  try {
    const visit = {
      created_at: new Date().toISOString(),
      event_type: "visit",
      what_happened: `device:${currentDeviceId()}`,
      device_info: navigator.userAgent,
      platform: navigator.platform || "Unknown",
      language: navigator.language || "Unknown",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
      screen_size: `${window.screen.width}x${window.screen.height}`,
      referrer: document.referrer || "Direct visit",
      location_info: "Not collected",
    };
    await databases.createDocument(
      databaseId,
      collectionId,
      id,
      visit,
      [],
    );
    window.dispatchEvent(new Event("records-changed"));
    return { success: true };
  } catch (err) {
    if (err.code === 409 && err.type === "document_already_exists") return { success: true };
    console.error("Failed to record visit:", err);
    throw new Error("This page's visit couldn't be saved. Check your connection and Appwrite collection Create permission.");
  }
}

async function listAllCollectionDocuments(queries = []) {
  const documents = [];
  let cursor;
  while (true) {
    const response = await databases.listDocuments(databaseId, collectionId, [
      ...queries, Query.orderDesc("$createdAt"), Query.limit(100),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);
    documents.push(...response.documents);
    const next = response.documents.at(-1)?.$id;
    if (response.documents.length < 100 || !next || next === cursor) return documents;
    cursor = next;
  }
}

export async function getVisits() {
  const documents = await listAllCollectionDocuments([Query.equal("event_type", "visit")]);
  return documents
    .filter((document) => document.event_type === "visit")
    .sort((left, right) => (right.created_at || right.$createdAt || "").localeCompare(left.created_at || left.$createdAt || ""));
}

// Updates an in-progress check-in in place (used while someone is still
// filling in their answers, before all three are done). This does not
// touch created_at, so the record keeps its original save time.
export async function updateCheckin(
  id,
  {
    whatHappened,
    angerLevel,
    whatWants,
    whatHappenedHeader,
    angerLevelHeader,
    whatWantsHeader,
  },
) {
  try {
    await databases.updateDocument(
      databaseId,
      collectionId,
      id,
      {
        what_happened: whatHappened ?? null,
        anger_level: angerLevel ?? null,
        what_wants: whatWants ?? null,
        what_happened_header: whatHappenedHeader ?? null,
        anger_level_header: angerLevelHeader ?? null,
        what_wants_header: whatWantsHeader ?? null,
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
    const documents = await listAllCollectionDocuments();
    const checkins = documents
      .filter((document) => !document.event_type || document.event_type === "checkin")
      .sort((left, right) => (right.created_at || right.$createdAt || "").localeCompare(left.created_at || left.$createdAt || ""))
      .map((document) => {
      const data = document;
      return {
        id: document.$id,
        what_happened: data.what_happened,
        anger_level: data.anger_level,
        what_wants: data.what_wants,
        what_happened_header: data.what_happened_header,
        anger_level_header: data.anger_level_header,
        what_wants_header: data.what_wants_header,
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
    const response = await databases.listDocuments(databaseId, collectionId, [Query.equal("event_type", "visit"), Query.limit(1)]);
    return response.total;
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
    const documents = await listAllCollectionDocuments();
    await Promise.all(
      documents
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
