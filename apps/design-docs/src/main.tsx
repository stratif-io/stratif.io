import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider, ToastProvider } from "@stratif-io/design-system";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <ToastProvider />
        <App />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
);
