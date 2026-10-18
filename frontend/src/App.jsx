import { Navigate, Routes, Route, useLocation, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import NavBar from "./components/NavBar.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import MyRecords from "./pages/MyRecords.jsx";
import Settings from "./pages/Settings.jsx";
import IceCreamGame from "./pages/IceCreamGame.jsx";
import Invitation from "./pages/Invitation.jsx";
import InvitationResponses from "./pages/InvitationResponses.jsx";
import { getSettings, recordVisit } from "./data/api.js";
import { getPageVisibility, pages } from "./data/pages.js";
import { ID } from "./appwrite.js";

export default function App() {
  const { pathname } = useLocation();
  const isInvitation = pathname.replace(/\/$/, "") === "/invitation";
  const [visibility, setVisibility] = useState(null);
  const [visitId] = useState(() => ID.unique());
  const visitSaved = useRef(false);
  const visitRequest = useRef(null);
  const [visitSaveError, setVisitSaveError] = useState("");

  useEffect(() => {
    let active = true;
    const update = settings => { if (active) setVisibility(getPageVisibility(settings)); };
    const refresh = event => event?.detail ? update(event.detail) : getSettings().then(update);
    refresh();
    window.addEventListener("settings-changed", refresh);
    return () => { active = false; window.removeEventListener("settings-changed", refresh); };
  }, []);

  useEffect(() => {
    if (!visibility) return;
    const saveVisit = () => {
      if (visitSaved.current || visitRequest.current) return;
      visitRequest.current = recordVisit(visitId)
        .then(() => { visitSaved.current = true; setVisitSaveError(""); })
        .catch(error => setVisitSaveError(error.message))
        .finally(() => { visitRequest.current = null; });
    };
    saveVisit();
    window.addEventListener("online", saveVisit);
    window.addEventListener("focus", saveVisit);
    return () => { window.removeEventListener("online", saveVisit); window.removeEventListener("focus", saveVisit); };
  }, [Boolean(visibility), visitId]);

  if (!visibility) return <main className="min-h-screen bg-[#100D20] py-16 text-center text-white/70" role="status">Loading page…</main>;
  if (isInvitation && visibility.invitation) return <Invitation />;

  const firstPublic = pages.find(page => !page.admin && visibility[page.id]);
  const hiddenPage = firstPublic ? <Navigate to={firstPublic.path} replace /> : <main className="mx-auto max-w-lg px-5 py-16 text-center text-white"><h1 className="font-display text-2xl font-bold">No public pages are available right now.</h1><p className="mt-4 text-white/60">Please check back later.</p><Link className="mt-8 inline-block text-sm text-bloom underline" to="/settings">Admin settings</Link></main>;

  return <div className="min-h-screen bg-[#100D20]">
    <NavBar visibility={visibility} />
    <Routes>
      <Route path="/" element={visibility.checkin ? <CheckIn /> : hiddenPage} />
      <Route path="/ice-cream" element={visibility.iceCream ? <IceCreamGame /> : hiddenPage} />
      <Route path="/invitation" element={hiddenPage} />
      <Route path="/records" element={<RequireAuth><MyRecords visitSaveError={visitSaveError} /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="/invitation-responses" element={<RequireAuth><InvitationResponses /></RequireAuth>} />
      <Route path="*" element={hiddenPage} />
    </Routes>
  </div>;
}
