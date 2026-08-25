// auth.js
// Wraps Appwrite Authentication so only a signed-in admin (you) can view
// or delete check-ins. Anyone can still submit a check-in without signing in
// — this only guards the My Records page.

import { account } from "./appwrite.js";

// callback receives the current user object, or null when signed out.
export function subscribeToAuth(callback) {
  let active = true;

  const refreshUser = () => {
    account
      .get()
      .then((user) => active && callback(user))
      .catch(() => active && callback(null));
  };

  refreshUser();
  window.addEventListener("auth-changed", refreshUser);

  return () => {
    active = false;
    window.removeEventListener("auth-changed", refreshUser);
  };
}

export async function login(email, password) {
  await account.createEmailPasswordSession(email, password);
  const user = await account.get();
  window.dispatchEvent(new Event("auth-changed"));
  return user;
}

export async function logout() {
  await account.deleteSession("current");
  window.dispatchEvent(new Event("auth-changed"));
}
