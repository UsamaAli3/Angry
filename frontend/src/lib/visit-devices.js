const deviceKey = "mood-checkin-device";
const ownedKey = "mood-checkin-owned-devices";
let fallbackId;

export function currentDeviceId() {
  try {
    let id = localStorage.getItem(deviceKey);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(deviceKey, id); }
    return id;
  } catch { return fallbackId ||= crypto.randomUUID(); }
}

export function visitDeviceKey(visit) {
  // Older records have no browser identifier: mark only that visit, never
  // guess ownership from a user agent shared by many different people.
  return visit.what_happened?.startsWith("device:") ? visit.what_happened : `visit:${visit.$id}`;
}

export function readOwnedDevices() {
  try {
    const value = JSON.parse(localStorage.getItem(ownedKey) || "[]");
    return Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
  } catch { return []; }
}

export function saveOwnedDevices(value) {
  localStorage.setItem(ownedKey, JSON.stringify(value));
}

export function deviceColorIndex(key) {
  return Array.from(key).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % 5;
}
