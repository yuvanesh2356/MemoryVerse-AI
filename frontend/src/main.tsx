// main.tsx — bootstrap, routing, and layout shell in one place. There's no
// separate App.tsx: with only 5 routes, splitting the shell out added a
// file without adding clarity.
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AmbientBackground, NavRail } from "./components";
import { DashboardPage, UploadPage, GraphPage, TimelinePage, ChatPage } from "./pages";
import "./styles.css";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AmbientBackground />
      <NavRail />
      <main className="min-h-screen pl-20">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <AnimatedRoutes />
        </div>
      </main>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
