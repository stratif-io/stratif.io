import { X, BookOpen, Zap, Users, GitFork, ArrowRight, Layers, Clock } from 'lucide-react'

interface PathsLearnPanelProps {
  onClose: () => void
}

export function PathsLearnPanel({ onClose }: PathsLearnPanelProps) {
  return (
    <div role="complementary" aria-label="Learn about Paths" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Paths</span>
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
        {/* What it is */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Paths shows the most common sequences of events your users follow — in the order they
          actually happened. Each row is a distinct route through your product, ranked by how often
          it occurred.
        </p>

        {/* Metrics */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            What each number means
          </p>
          <div className="bg-muted/40 rounded-xl p-3 space-y-3">
            <div className="flex items-start gap-2.5">
              <Zap className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Occurrences</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Total number of times this exact sequence was completed — across all users and
                  sessions. One user repeating the path counts multiple times.
                </div>
              </div>
            </div>
            <div className="border-t border-border/50 pt-3 flex items-start gap-2.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Users</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  How many distinct users followed this path at least once. Always ≤ occurrences.
                </div>
              </div>
            </div>
            <div className="border-t border-border/50 pt-3 flex items-start gap-2.5">
              <GitFork className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">% of paths</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Share of all users who took this path, out of all users in scope.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Filters
          </p>
          <div className="bg-muted/40 rounded-xl p-3 space-y-3">
            <div className="flex items-start gap-2.5">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Start / End event</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Constrain paths to those that begin or end with a specific event. Use both to
                  focus on a particular journey — e.g. from Sign Up to Purchase.
                </div>
              </div>
            </div>
            <div className="border-t border-border/50 pt-3 flex items-start gap-2.5">
              <Layers className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Path length</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Min and max number of steps. Short paths (2–3) show quick flows; longer paths
                  reveal deep exploration journeys.
                </div>
              </div>
            </div>
            <div className="border-t border-border/50 pt-3 flex items-start gap-2.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Time limit</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Maximum time allowed between consecutive steps. Tighter limits surface focused,
                  intentional flows and filter out coincidental sequences spread over days.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="bg-primary/5 rounded-xl p-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Tip:</span> Click any path to open its
            conversion funnel — see exactly how many users made it through each step and where they
            dropped off.
          </p>
        </div>
      </div>
    </div>
  )
}
