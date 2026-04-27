const colorTokens = [
  { name: "background", var: "--background" },
  { name: "foreground", var: "--foreground" },
  { name: "primary", var: "--primary" },
  { name: "primary-foreground", var: "--primary-foreground" },
  { name: "secondary", var: "--secondary" },
  { name: "secondary-foreground", var: "--secondary-foreground" },
  { name: "muted", var: "--muted" },
  { name: "muted-foreground", var: "--muted-foreground" },
  { name: "accent", var: "--accent" },
  { name: "destructive", var: "--destructive" },
  { name: "border", var: "--border" },
  { name: "input", var: "--input" },
  { name: "ring", var: "--ring" },
  { name: "card", var: "--card" },
];

export function ColorsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Colors</h1>
      <p
        style={{ color: "var(--muted-foreground, #64748b)", marginBottom: 32 }}
      >
        CSS custom property tokens.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {colorTokens.map(({ name, var: cssVar }) => (
          <div
            key={name}
            style={{
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid var(--border, #e2e8f0)",
            }}
          >
            <div style={{ height: 64, background: `var(${cssVar})` }} />
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground, #64748b)",
                  fontFamily: "monospace",
                }}
              >
                {cssVar}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
