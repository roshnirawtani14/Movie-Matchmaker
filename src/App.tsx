import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Join from "./pages/Join";
import Preferences from "./pages/Preferences";
import Waiting from "./pages/Waiting";
import Swipe from "./pages/Swipe";
import Match from "./pages/Match";
import FinalPick from "./pages/FinalPick";
import Rate from "./pages/Rate";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join/:sessionId" element={<Join />} />
        <Route path="/session/:sessionId/preferences" element={<Preferences />} />
        <Route path="/session/:sessionId/waiting" element={<Waiting />} />
        <Route path="/session/:sessionId/swipe" element={<Swipe />} />
        <Route path="/session/:sessionId/match" element={<Match />} />
        <Route path="/session/:sessionId/final" element={<FinalPick />} />
        <Route path="/session/:sessionId/rate" element={<Rate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
