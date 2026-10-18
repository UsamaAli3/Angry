import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { subscribeToAuth } from "../auth.js";
import { getPageVisibility, pages } from "../data/pages.js";

export default function NavBar({ visibility = getPageVisibility() }) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => subscribeToAuth(user => setIsAdmin(Boolean(user))), []);

  return <nav aria-label="Main navigation" className="sticky top-0 z-40 border-b border-white/10 bg-[#100D20]/90 shadow-lg shadow-black/10 backdrop-blur-xl">
    <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3">
      {pages.filter(page => visibility[page.id] && (!page.admin || isAdmin)).map(page => <NavLink key={page.id} to={page.path} end={page.path === "/"} className={({ isActive }) => `shrink-0 whitespace-nowrap rounded-2xl px-4 py-2.5 text-center font-display text-sm font-semibold transition-colors sm:text-base ${isActive ? "bg-bloom text-white shadow-soft" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>{page.id === "iceCream" ? "Marry’s Shop" : page.title}</NavLink>)}
    </div>
  </nav>;
}
