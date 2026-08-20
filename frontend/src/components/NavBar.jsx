import { NavLink } from "react-router-dom";

const linkBase =
  "flex-1 sm:flex-none text-center px-4 py-2.5 rounded-2xl font-display font-semibold text-sm sm:text-base transition-colors";

export default function NavBar() {
  return (
    <nav className="sticky top-0 z-10 bg-cloud/90 backdrop-blur border-b border-ink/5">
      <div className="max-w-xl mx-auto px-4 py-3 flex gap-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${linkBase} ${
              isActive ? "bg-bloom text-white shadow-soft" : "text-ink/70 hover:bg-white"
            }`
          }
        >
          Check In
        </NavLink>
        <NavLink
          to="/records"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive ? "bg-bloom text-white shadow-soft" : "text-ink/70 hover:bg-white"
            }`
          }
        >
          📋 My Records
        </NavLink>
      </div>
    </nav>
  );
}
