import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import MyRecords from "./pages/MyRecords.jsx";
import Settings from "./pages/Settings.jsx";
import { recordVisit } from "./data/api.js";
import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    if (sessionStorage.getItem("mood-checkin-visit-recorded")) return;
    sessionStorage.setItem("mood-checkin-visit-recorded", "true");
    recordVisit();
  }, []);

  return (
    <div className="min-h-screen bg-cloud">
      <NavBar />
      <Routes>
        <Route path="/" element={<CheckIn />} />
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
