export function TypographyPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Typography
      </h1>
      <p
        style={{ color: "var(--muted-foreground, #64748b)", marginBottom: 32 }}
      >
        Font families and scale.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Plus Jakarta Sans (UI)
        </h2>
        <div
          style={{
            fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)',
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {(
            [
              { size: 32, weight: 700, label: "Heading 1" },
              { size: 24, weight: 700, label: "Heading 2" },
              { size: 20, weight: 600, label: "Heading 3" },
              { size: 16, weight: 400, label: "Body" },
              { size: 14, weight: 400, label: "Small" },
              { size: 12, weight: 400, label: "Caption" },
            ] as { size: number; weight: number; label: string }[]
          ).map(({ size, weight, label }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "baseline", gap: 16 }}
            >
              <span
                style={{
                  width: 100,
                  fontSize: 12,
                  color: "var(--muted-foreground, #64748b)",
                }}
              >
                {label}
              </span>
              <span style={{ fontSize: size, fontWeight: weight }}>
                The quick brown fox
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          JetBrains Mono (Code)
        </h2>
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 14,
            padding: "12px 16px",
            background: "var(--muted, #f1f5f9)",
            borderRadius: 8,
          }}
        >
          SELECT * FROM events WHERE timestamp &gt; now() - INTERVAL &apos;7
          days&apos;
        </div>
      </section>
    </div>
  );
}
