interface Total {
  label: string
  value: string
  color: string
}

interface SummaryPanelProps {
  insight: string
  totals: Total[]
}

export function SummaryPanel({ insight, totals }: SummaryPanelProps) {
  return (
    <div className="flex flex-col gap-2 w-[220px] shrink-0">
      <div className="bg-card border border-border rounded-[10px] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground/60 mb-2">
          Summary
        </p>
        <p className="text-[11px] text-foreground/80 leading-[1.7]">{insight}</p>
      </div>

      <div className="bg-card border border-border rounded-[10px] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground/60 mb-2">
          Totals
        </p>
        <div className="flex flex-col gap-1.5">
          {totals.map((t) => (
            <div key={t.label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: t.color }}
                />
                <span className="text-[10px] text-foreground/75">{t.label}</span>
              </div>
              <span className="text-[11px] font-bold text-foreground">{t.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
