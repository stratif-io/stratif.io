import { X, BookOpen, BarChart2, Layers, TrendingDown, Clock } from 'lucide-react'

interface RetentionLearnPanelProps {
  onClose: () => void
}

export function RetentionLearnPanel({ onClose }: RetentionLearnPanelProps) {
  return (
    <div role="complementary" aria-label="Learn about Retention" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Retention</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close learn panel"
          className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Retention groups users by when they first appeared (their cohort), then tracks what
          percentage came back over time. Each row is one cohort; each column is a milestone.
        </p>

        {/* Bracket semantics */}
        <div className="bg-primary/8 border border-primary/20 rounded-xl px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-foreground">
            <span className="font-semibold">Bracket retention.</span> D7 means: what % of this
            cohort returned <em>at least once</em> in their first 7 days. A user who came back on
            day 3 counts. A user who only came back on day 8 doesn&apos;t count for D7 — but does
            count for D30. Same logic for weekly (W4 = first 4 weeks), monthly (M3 = first 3
            months), etc.
          </p>
        </div>

        {/* What each thing means */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            What each thing means
          </p>
          <div className="bg-muted/40 rounded-xl p-3 space-y-3">
            <div className="flex items-start gap-2.5">
              <BarChart2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Cell color</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Green = above industry benchmark. Amber = average. Red = below benchmark. Hover a
                  column header to see exact thresholds.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <TrendingDown className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Δ column</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Change vs the previous cohort at the same milestone. Green = improving, red =
                  declining.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">soon</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  This cohort hasn&apos;t had enough time to reach this milestone yet. Data will
                  appear automatically once enough time has passed.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Layers className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Average row</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Average across all cohorts that have reached the milestone. Cohorts with
                  &quot;soon&quot; are excluded from the average.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Tip
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Widen the date range to see more cohorts and longer-term retention. Narrow it to focus
            on a specific period.
          </p>
        </div>
      </div>
    </div>
  )
}
