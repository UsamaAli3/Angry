import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { subscribeToAuth } from "../auth.js";

const linkBase =
  "flex-1 sm:flex-none text-center px-4 py-2.5 rounded-2xl font-display font-semibold text-sm sm:text-base transition-colors";

export default function NavBar() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => subscribeToAuth((user) => setIsAdmin(Boolean(user))), []);

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#100D20]/90 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${linkBase} ${
              isActive ? "bg-bloom text-white shadow-soft" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          Check In
        </NavLink>
        <NavLink
          to="/ice-cream"
          className={({ isActive }) =>
            `${linkBase} whitespace-nowrap ${
              isActive ? "bg-sunny text-white shadow-soft" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          🍦 Marry’s Shop
        </NavLink>
        {isAdmin && <NavLink
          to="/records"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive ? "bg-bloom text-white shadow-soft" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          📋 My Records
        </NavLink>}
        {isAdmin && <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? "bg-bloom text-white shadow-soft" : "text-white/70 hover:bg-white/10 hover:text-white"}`
          }
        >
          Settings
        </NavLink>}
      </div>
    </nav>
  );
}
