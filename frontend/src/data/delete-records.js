import { appwriteConfig, databases } from "../appwrite.js";
import { getCheckins, getVisits } from "./api.js";
import { getInvitationResponses } from "./invitations.js";

// Read the complete snapshot before deleting anything, including pages beyond
// the first 100. Appwrite enforces the signed-in admin's Delete permission.
export async function deleteRecords({ scope, id, sessionId }) {
  if (!["all", "visits", "invitations"].includes(scope)) throw new Error("Unknown record type.");
  const entries = [];
  if (scope === "all") {
    const { checkins } = await getCheckins();
    entries.push(...checkins.map(row => ({ collection: appwriteConfig.collectionId, id: row.id })));
  }
  if (scope === "all" || scope === "visits") {
    const visits = await getVisits();
    entries.push(...visits.filter(row => !id || row.$id === id).map(row => ({ collection: appwriteConfig.collectionId, id: row.$id })));
  }
  if (scope === "all" || scope === "invitations") {
    const responses = await getInvitationResponses({ all: true });
    entries.push(...responses.filter(row => !sessionId || (row.session_id || row.$id) === sessionId).map(row => ({ collection: appwriteConfig.invitationCollectionId || appwriteConfig.collectionId, id: row.$id })));
  }
  let failed = 0;
  try {
    for (let start = 0; start < entries.length; start += 5) {
      const results = await Promise.allSettled(entries.slice(start, start + 5).map(async row => {
        try { await databases.deleteDocument(appwriteConfig.databaseId, row.collection, row.id); }
        catch (error) { if (error.code !== 404) throw error; }
      }));
      failed += results.filter(result => result.status === "rejected").length;
    }
  } finally { window.dispatchEvent(new Event("records-changed")); }
  if (failed) throw new Error(`${failed} entr${failed === 1 ? "y couldn't" : "ies couldn't"} be deleted. Your records have been refreshed. Check your connection and admin Delete permission, then retry.`);
}
