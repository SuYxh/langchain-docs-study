import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import HomePage from "./pages/HomePage";
import ToolCallingPage from "./pages/ToolCallingPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tool-calling" element={<ToolCallingPage />} />
        <Route path="/custom-events" element={<div>自定义流式事件 - 待实现</div>} />
        <Route path="/multi-agent" element={<div>多智能体流式传输 - 待实现</div>} />
        <Route path="/human-in-loop" element={<div>人机交互 - 待实现</div>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
