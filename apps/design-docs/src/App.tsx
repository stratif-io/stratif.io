import { Routes, Route, Navigate } from "react-router-dom";
import { DesignSystemPage } from "./DesignSystemPage";
import { ToastProvider } from "@stratif-io/design-system";

export default function App() {
  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<DesignSystemPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
}
