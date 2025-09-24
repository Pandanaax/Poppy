import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

(window as any).__POPPY_PARTNER_KEY = import.meta.env.VITE_POPPY_PARTNER_KEY;

createRoot(document.getElementById("root")!).render(<App />);
