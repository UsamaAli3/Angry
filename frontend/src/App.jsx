import { Navigate, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import MyRecords from "./pages/MyRecords.jsx";
import Settings from "./pages/Settings.jsx";
import IceCreamGame from "./pages/IceCreamGame.jsx";
import { getSettings, recordVisit } from "./data/api.js";
import { useEffect, useState } from "react";

export default function App() {
  const [showIceCreamShop, setShowIceCreamShop] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem("mood-checkin-visit-recorded")) return;
    sessionStorage.setItem("mood-checkin-visit-recorded", "true");
    recordVisit();
  }, []);

  useEffect(() => {
    const refreshShopVisibility = (event) => {
      if (typeof event?.detail?.showIceCreamShop === "boolean") {
        setShowIceCreamShop(event.detail.showIceCreamShop);
        return;
      }
      getSettings().then((settings) => {
        setShowIceCreamShop(Boolean(settings.showIceCreamShop));
      });
    };

    refreshShopVisibility();
    window.addEventListener("settings-changed", refreshShopVisibility);
    return () => window.removeEventListener("settings-changed", refreshShopVisibility);
  }, []);

  return (
    <div className="min-h-screen bg-[#100D20]">
      <NavBar showIceCreamShop={showIceCreamShop} />
      <Routes>
        <Route path="/" element={<CheckIn />} />
        <Route
          path="/ice-cream"
          element={
            showIceCreamShop === null ? (
              <p className="py-16 text-center text-white/60">Loading shop…</p>
            ) : showIceCreamShop ? (
              <IceCreamGame />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/records"
          element={
            <RequireAuth>
              <MyRecords />
            </RequireAuth>
          }
        />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      </Routes>
    </div>
  );
}
