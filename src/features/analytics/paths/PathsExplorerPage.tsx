import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ArrowRight,
  Clock,
  GitFork,
  Layers,
  RotateCcw,
  Settings2,
  Users,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/stores'
import { usePathExplorer } from './hooks/usePathExplorer'
import { PathFunnelDialog } from './components/PathFunnelDialog'
import { Badge } from '@/components/ui/badge'
import { PageTransition } from '@/components/layout/PageTransition'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import type { PathAnalysisData } from '@/types'
import { cn } from '@/lib/utils'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'

const TIME_UNITS = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
] as const

const STEP_COLORS = [
  'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
]

function hashEventName(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function getEventColor(eventName: string): string {
  return STEP_COLORS[hashEventName(eventName) % STEP_COLORS.length]
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds.toFixed(0)}s`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
  return `${(seconds / 3600).toFixed(1)}h`
}

function getRankLabel(idx: number) {
  if (idx === 0) return 'text-amber-500'
  if (idx === 1) return 'text-slate-400'
  if (idx === 2) return 'text-orange-600'
  return 'text-muted-foreground'
}

// Shared segment trigger style (matches GlobalFilters)
const segTrigger =
  'h-9 border-0 shadow-none rounded-none bg-transparent gap-1.5 px-3 text-sm font-medium focus:ring-0 focus:ring-offset-0 hover:bg-accent/60 transition-colors text-muted-foreground'

interface PathCardProps {
  path: PathAnalysisData
  rank: number
  maxCount: number
  onClick: () => void
}

function PathCard({ path, rank, maxCount, onClick }: PathCardProps) {
  const steps = path.path.split(' -> ')
  const barWidth = Math.max((path.occurrence_count / maxCount) * 100, 2)

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border bg-card px-5 py-4 hover:bg-accent/30 hover:border-primary/30 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'shrink-0 w-7 text-right font-bold text-lg tabular-nums leading-none mt-0.5',
            getRankLabel(rank - 1)
          )}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {steps.map((step, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap',
                    getEventColor(step)
                  )}
                >
                  {step}
                </span>
                {i < steps.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                )}
              </span>
            ))}
          </div>

          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/50 rounded-full transition-all duration-500"
              style={{ width: `${barWidth}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span className="font-semibold text-foreground">
                {path.occurrence_count.toLocaleString()}
              </span>
              &nbsp;occurrences
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="font-semibold text-foreground">
                {path.unique_users.toLocaleString()}
              </span>
              &nbsp;users
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {path.unique_sessions.toLocaleString()}
              </span>
              &nbsp;sessions
            </span>
            <span className="text-xs">
              <span className="font-semibold text-primary">{path.percentage_of_total}%</span>
              <span className="text-muted-foreground"> of paths</span>
            </span>
            {path.avg_time_to_complete !== null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                avg&nbsp;
                <span className="font-semibold text-foreground">
                  {formatTime(path.avg_time_to_complete)}
                </span>
              </span>
            )}
            <span className="ml-auto text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1">
              Analyze funnel
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export function PathsExplorerPage() {
  const { dateRange } = useAppStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // All filter state derived from URL search params
  const startEvent = searchParams.get('start') ?? ''
  const endEvent = searchParams.get('end') ?? ''
  const minPathLength = searchParams.has('min')
    ? Math.max(2, parseInt(searchParams.get('min')!))
    : null
  const maxPathLength = searchParams.has('max') ? parseInt(searchParams.get('max')!) : null
  const maxTimeBetweenEvents = searchParams.has('maxTime')
    ? parseInt(searchParams.get('maxTime')!)
    : null
  const timeUnit = (searchParams.get('timeUnit') ?? 'minutes') as
    | 'seconds'
    | 'minutes'
    | 'hours'
    | 'days'
  const groupBy = (searchParams.get('groupBy') ?? 'user_id') as 'user_id' | 'session_id'
  const topN = searchParams.has('top')
    ? Math.min(100, Math.max(1, parseInt(searchParams.get('top')!) || 20))
    : 20

  const [selectedPath, setSelectedPath] = useState<PathAnalysisData | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const pathLengthActive = minPathLength !== null || maxPathLength !== null
  const effectiveMin = minPathLength ?? 2
  const effectiveMax = maxPathLength ?? 5

  function setParam(key: string, value: string | null) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true }
    )
  }

  function clearPathLength() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('min')
        next.delete('max')
        return next
      },
      { replace: true }
    )
  }

  const { pathData, events, isLoading, eventsLoading, totalPaths } = usePathExplorer({
    dateRange,
    startEvent: startEvent || null,
    endEvent: endEvent || null,
    minPathLength: effectiveMin,
    maxPathLength: effectiveMax,
    maxTimeBetweenEvents,
    timeUnit,
    groupBy,
    topN,
  })

  const handleReset = () => setSearchParams({}, { replace: true })

  const hasActiveFilters =
    startEvent ||
    endEvent ||
    pathLengthActive ||
    maxTimeBetweenEvents !== null

  const maxCount = pathData[0]?.occurrence_count ?? 1

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={TYPOGRAPHY.pageTitle}>Path Explorer</h1>
            <p className={`${TYPOGRAPHY.muted} mt-1`}>
              Discover the most common journeys users take through your product
            </p>
          </div>
          {totalPaths > 0 && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <GitFork className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {totalPaths.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">unique paths</span>
            </div>
          )}
        </div>

        {/* Filter bar — same container as GlobalFilters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border bg-background shadow-sm overflow-hidden divide-x divide-border">
            {/* Start event */}
            <Select
              value={startEvent || 'any'}
              onValueChange={(v) => setParam('start', v === 'any' ? null : v)}
            >
              <SelectTrigger className={segTrigger} style={{ width: 'auto', minWidth: 0 }}>
                <SelectValue placeholder="Any start" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any start</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Arrow — non-interactive visual */}
            <div className="flex items-center justify-center w-8 shrink-0 text-muted-foreground/40 pointer-events-none select-none">
              <ArrowRight className="h-3.5 w-3.5" />
            </div>

            {/* End event */}
            <Select
              value={endEvent || 'any'}
              onValueChange={(v) => setParam('end', v === 'any' ? null : v)}
            >
              <SelectTrigger className={segTrigger} style={{ width: 'auto', minWidth: 0 }}>
                <SelectValue placeholder="Any end" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any end</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Path length — popover */}
            <Popover>
              <PopoverTrigger
                className={cn(
                  segTrigger,
                  'flex items-center gap-1.5',
                  pathLengthActive && 'text-foreground'
                )}
              >
                <Layers className={cn('h-3.5 w-3.5 shrink-0', pathLengthActive && 'text-primary')} />
                <span>{effectiveMin}–{effectiveMax} steps</span>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-3 space-y-3" align="start">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Path length
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Min</label>
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      placeholder="2"
                      value={minPathLength ?? ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        setParam('min', isNaN(val) ? null : String(Math.max(2, val)))
                      }}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                  <span className="text-muted-foreground text-sm mt-5">–</span>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Max</label>
                    <Input
                      type="number"
                      min={effectiveMin}
                      max={10}
                      placeholder="5"
                      value={maxPathLength ?? ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        setParam('max', isNaN(val) ? null : String(Math.max(effectiveMin, val)))
                      }}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                </div>
                {pathLengthActive && (
                  <button
                    onClick={clearPathLength}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset to defaults
                  </button>
                )}
              </PopoverContent>
            </Popover>

            {/* Group by */}
            <Select
              value={groupBy}
              onValueChange={(v) => setParam('groupBy', v)}
            >
              <SelectTrigger className={segTrigger} style={{ width: 'auto', minWidth: 0 }}>
                <Users className="h-3.5 w-3.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user_id">Per user</SelectItem>
                <SelectItem value="session_id">Per session</SelectItem>
              </SelectContent>
            </Select>

            {/* Top N — popover */}
            <Popover>
              <PopoverTrigger
                className={cn(segTrigger, 'flex items-center gap-1.5')}
              >
                <span className="text-muted-foreground">Top</span>
                <span className={cn('font-semibold', topN !== 20 && 'text-foreground')}>
                  {topN}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-3 space-y-2" align="start">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Show top N paths
                </p>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={topN}
                  onChange={(e) =>
                    setParam('top', String(Math.min(100, Math.max(1, parseInt(e.target.value) || 10))))
                  }
                  className="h-8 text-sm text-center"
                />
              </PopoverContent>
            </Popover>

            {/* Advanced (time constraint) — popover */}
            <Popover>
              <PopoverTrigger
                className={cn(
                  segTrigger,
                  'flex items-center gap-1.5',
                  maxTimeBetweenEvents !== null && 'text-foreground'
                )}
              >
                <Settings2 className="h-3.5 w-3.5 shrink-0" />
                {maxTimeBetweenEvents !== null ? (
                  <span>
                    ≤ {maxTimeBetweenEvents} {timeUnit}
                  </span>
                ) : (
                  <span>Advanced</span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3 space-y-3" align="start">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Max time between steps
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="No limit"
                    value={maxTimeBetweenEvents ?? ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setParam('maxTime', isNaN(val) ? null : String(val))
                    }}
                    className="h-8 text-sm w-20"
                  />
                  <Select
                    value={timeUnit}
                    onValueChange={(v) => setParam('timeUnit', v)}
                  >
                    <SelectTrigger className="h-8 text-sm flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {maxTimeBetweenEvents !== null && (
                  <button
                    onClick={() => setParam('maxTime', null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear limit
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Reset — outside container, appears only when dirty */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border bg-background shadow-sm text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Results */}
        {isLoading || eventsLoading ? (
          <LoadingState message="Analyzing paths…" />
        ) : pathData.length === 0 ? (
          <EmptyState
            icon={GitFork}
            title="No paths found"
            description="Try broadening your filters — relax path length, remove start/end events, or expand the date range."
          />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">
                Showing{' '}
                <span className="font-semibold text-foreground">{pathData.length}</span> of{' '}
                <span className="font-semibold text-foreground">{totalPaths}</span> paths — click
                any to analyze the conversion funnel
              </p>
              <div className="flex gap-1.5">
                {startEvent && (
                  <Badge variant="secondary" className="text-xs">
                    from: {startEvent}
                  </Badge>
                )}
                {endEvent && (
                  <Badge variant="secondary" className="text-xs">
                    to: {endEvent}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {pathData.map((path, idx) => (
                <PathCard
                  key={idx}
                  path={path}
                  rank={idx + 1}
                  maxCount={maxCount}
                  onClick={() => {
                    setSelectedPath(path)
                    setDialogOpen(true)
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <PathFunnelDialog
          path={selectedPath}
          dateRange={dateRange}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
        </div>
      </div>
    </PageTransition>
  )
}
