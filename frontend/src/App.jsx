import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import MyRecords from "./pages/MyRecords.jsx";

export default function App() {
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
      </Routes>
    </div>
  );
}
