export const FOLLOWUP_DELAY_MS = 12 * 60 * 60 * 1000;

// Parsing is for display only. The server verifies the signature and unlock time.
export function readFollowupToken(token) {
  try {
    if (typeof token !== "string" || token.length > 512 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
    const base64 = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const value = JSON.parse(atob(base64));
    return typeof value.s === "string" && Number.isFinite(Date.parse(value.a)) ? value : null;
  } catch { return null; }
}
