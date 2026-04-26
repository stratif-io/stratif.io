import { Routes, Route, NavLink } from "react-router-dom";
import { ButtonsPage } from "./pages/ButtonsPage";
import { ColorsPage } from "./pages/ColorsPage";
import { TypographyPage } from "./pages/TypographyPage";
import { FormsPage } from "./pages/FormsPage";

const navItems = [
  { to: "/", label: "Buttons" },
  { to: "/colors", label: "Colors" },
  { to: "/typography", label: "Typography" },
  { to: "/forms", label: "Forms" },
];

export default function App() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 220,
          padding: "24px 16px",
          borderRight: "1px solid var(--border, #e2e8f0)",
          flexShrink: 0,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 24, fontSize: 15 }}>
          stratif.io Design System
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              style={({ isActive }) => ({
                padding: "6px 10px",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 14,
                color: isActive
                  ? "var(--primary, #6366f1)"
                  : "var(--muted-foreground, #64748b)",
                background: isActive
                  ? "var(--accent, rgba(99,102,241,0.1))"
                  : "transparent",
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main style={{ flex: 1, padding: 32 }}>
        <Routes>
          <Route path="/" element={<ButtonsPage />} />
          <Route path="/colors" element={<ColorsPage />} />
          <Route path="/typography" element={<TypographyPage />} />
          <Route path="/forms" element={<FormsPage />} />
        </Routes>
      </main>
    </div>
  );
}
