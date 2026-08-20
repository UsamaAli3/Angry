// auth.js
// Wraps Appwrite Authentication so only a signed-in admin (you) can view
// or delete check-ins. Anyone can still submit a check-in without signing in
// — this only guards the My Records page.

import { account } from "./appwrite.js";

// callback receives the current user object, or null when signed out.
export function subscribeToAuth(callback) {
  let active = true;
  account
    .get()
    .then((user) => active && callback(user))
    .catch(() => active && callback(null));
  return () => {
    active = false;
  };
}

export async function login(email, password) {
  await account.createEmailPasswordSession(email, password);
}

export async function logout() {
  await account.deleteSession("current");
}
