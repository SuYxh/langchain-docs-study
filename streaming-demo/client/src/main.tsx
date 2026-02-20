import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import HomePage from "./pages/HomePage.tsx";
import ToolCallingPage from "./pages/ToolCallingPage.tsx";
import MultiAgentPage from "./pages/MultiAgentPage.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tool-calling" element={<ToolCallingPage />} />
        <Route path="/multi-agent" element={<MultiAgentPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
