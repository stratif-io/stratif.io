import { Routes, Route, Navigate } from "react-router-dom";
import { DesignSystemPage } from "./DesignSystemPage";

export default function App() {
  return (
    <div
      className="bg-background text-foreground"
      style={{ height: "100vh", overflowY: "auto" }}
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<DesignSystemPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
