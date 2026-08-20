import { useEffect, useState } from "react";
import { subscribeToAuth, login } from "../auth.js";

export default function RequireAuth({ children }) {
  // undefined = still checking, null = signed out, object = signed in
  const [user, setUser] = useState(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(setUser);
    return unsubscribe;
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setLoginError("Couldn't sign in. Check your email and password.");
    } finally {
      setLoggingIn(false);
    }
  }

  if (user === undefined) {
    return <p className="text-center text-mist py-16">Loading…</p>;
  }

  if (user === null) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="font-display font-bold text-xl text-ink text-center mb-2">
          Sign in to view records
        </h1>
        <p className="text-mist text-sm text-center mb-6">
          Only you can see submitted check-ins.
        </p>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full px-4 py-3 rounded-2xl border border-ink/10 bg-white text-ink placeholder:text-mist focus:outline-none focus:border-bloom"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="w-full px-4 py-3 rounded-2xl border border-ink/10 bg-white text-ink placeholder:text-mist focus:outline-none focus:border-bloom"
          />

          {loginError && (
            <p className="text-bloomDark bg-bloom/10 rounded-2xl px-4 py-3 text-sm font-medium text-center">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full px-6 py-3 rounded-2xl font-display font-semibold bg-bloom text-white hover:bg-bloomDark transition-colors disabled:opacity-60"
          >
            {loggingIn ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return children;
}
