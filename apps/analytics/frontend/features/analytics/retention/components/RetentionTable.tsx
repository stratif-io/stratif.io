import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { RetentionCohort } from '@/types'
import type { RetentionGranularity } from '../hooks/useRetentionData'
import { getCellClass, BENCHMARKS, milestoneTooltip } from '../retention-benchmarks'

// ── Sparkline ──────────────────────────────────────────────────────────────────

function RetentionMiniBar({
  values,
  granularity,
  milestones,
}: {
  values: (number | null)[]
  granularity: RetentionGranularity
  milestones: number[]
}) {
  const max = Math.max(...values.filter((v): v is number => v !== null), 1)
  return (
    <div className="flex items-end gap-0.5 h-5 w-24">
      {values.map((v, i) => {
        const { container } = getCellClass(v, granularity, milestones[i])
        const heightPct = v === null ? 8 : Math.max((v / max) * 100, v > 0 ? 15 : 8)
        return (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-sm',
              v !== null && v > 0 ? container || 'bg-primary/60' : 'bg-muted/40'
            )}
            style={{ height: `${heightPct}%` }}
          />
        )
      })}
    </div>
  )
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

function formatDate(d: string, granularity: RetentionGranularity) {
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  const date = new Date(y, m - 1, day)
  if (granularity === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  if (granularity === 'quarter') {
    const q = Math.floor(date.getMonth() / 3) + 1
    return `Q${q} ${date.getFullYear()}`
  }
  if (granularity === 'year') {
    return String(date.getFullYear())
  }
  if (granularity === 'week') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function milestoneLabel(unit: number, granularity: RetentionGranularity): string {
  if (granularity === 'week') return `W${unit}`
  if (granularity === 'month') return `M${unit}`
  if (granularity === 'quarter') return `Q${unit}`
  if (granularity === 'year') return `Y${unit}`
  return `D${unit}`
}

// ── Delta helpers ──────────────────────────────────────────────────────────────

function deltaMilestoneIdx(milestones: number[]): number {
  return milestones.length > 1 ? 1 : 0
}

function computeDelta(
  current: (number | null)[],
  previous: (number | null)[],
  idx: number
): number | null {
  const cur = current[idx]
  const prev = previous[idx]
  if (cur === null || prev === null) return null
  return cur - prev
}

function formatDelta(delta: number | null): { text: string; className: string } {
  if (delta === null) return { text: '—', className: 'text-muted-foreground/50' }
  const sign = delta >= 0 ? '+' : '−'
  const abs = Math.abs(delta).toFixed(1)
  return {
    text: `${sign}${abs}%`,
    className:
      delta > 0
        ? 'text-success font-medium'
        : delta < 0
          ? 'text-destructive font-medium'
          : 'text-muted-foreground',
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

interface RetentionTableProps {
  data: RetentionCohort[]
  granularity: RetentionGranularity
  milestones: number[]
}

export function RetentionTable({ data, granularity, milestones }: RetentionTableProps) {
  const orderedData = useMemo(
    () => [...data].sort((a, b) => a.cohort_date.localeCompare(b.cohort_date)),
    [data]
  )

  const deltaIdx = deltaMilestoneIdx(milestones)
  const deltaLabel =
    milestones.length > 0 ? `Δ ${milestoneLabel(milestones[deltaIdx], granularity)}` : 'Δ'

  const avgMilestoneValues = useMemo(
    () =>
      milestones.map((_, i) => {
        const valid = orderedData
          .map((r) => r.milestone_values[i])
          .filter((v): v is number => v !== null && v !== undefined)
        return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
      }),
    [orderedData, milestones]
  )

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead scope="col" className="font-semibold text-foreground whitespace-nowrap">
              Cohort
            </TableHead>
            <TableHead
              scope="col"
              className="font-semibold text-foreground text-right whitespace-nowrap"
            >
              Users
            </TableHead>
            <TableHead scope="col" className="font-semibold text-foreground whitespace-nowrap">
              Trend
            </TableHead>
            {milestones.map((unit) => (
              <Tooltip key={unit}>
                <TooltipTrigger asChild>
                  <TableHead
                    scope="col"
                    className="font-semibold text-foreground text-center whitespace-nowrap cursor-help"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{milestoneLabel(unit, granularity)}</span>
                      <span className="text-[9px] font-normal text-muted-foreground">
                        ≥{BENCHMARKS[`${granularity}_${unit}`]?.good ?? 20}% good
                      </span>
                    </div>
                  </TableHead>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  {milestoneTooltip(granularity, unit)}
                </TooltipContent>
              </Tooltip>
            ))}
            <TableHead
              scope="col"
              className="font-semibold text-foreground text-right whitespace-nowrap"
            >
              {deltaLabel}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orderedData.map((row, idx) => {
            const prevRow = idx > 0 ? orderedData[idx - 1] : null
            const delta = prevRow
              ? computeDelta(row.milestone_values, prevRow.milestone_values, deltaIdx)
              : null
            const { text: deltaText, className: deltaClass } = formatDelta(idx === 0 ? null : delta)

            return (
              <TableRow key={row.cohort_date} className="hover:bg-muted/20 transition-colors">
                <TableHead scope="row" className="font-medium whitespace-nowrap">
                  {formatDate(row.cohort_date, granularity)}
                </TableHead>
                <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                  {row.cohort_size.toLocaleString()}
                </TableCell>
                <TableCell className="py-1.5 pr-4">
                  <RetentionMiniBar
                    values={row.milestone_values}
                    granularity={granularity}
                    milestones={milestones}
                  />
                </TableCell>
                {milestones.map((unit, i) => {
                  const pct = row.milestone_values[i]
                  const { container, text } = getCellClass(pct, granularity, unit)
                  return (
                    <TableCell key={unit} className="text-center p-1.5">
                      {pct === null ? (
                        <span className="text-xs text-muted-foreground/40 italic">soon</span>
                      ) : (
                        <div
                          className={cn(
                            'rounded-md px-2 py-1 text-sm tabular-nums font-medium transition-colors mx-auto w-fit',
                            container,
                            text
                          )}
                        >
                          {pct.toFixed(1)}%
                        </div>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell className={cn('text-right text-sm tabular-nums pr-4', deltaClass)}>
                  {deltaText}
                </TableCell>
              </TableRow>
            )
          })}

          {/* Average row */}
          {orderedData.length > 1 && (
            <TableRow className="border-t-2 bg-muted/30 font-semibold">
              <TableHead scope="row" className="text-muted-foreground text-sm font-semibold">
                Average
              </TableHead>
              <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                {Math.round(
                  orderedData.reduce((s, r) => s + r.cohort_size, 0) / orderedData.length
                ).toLocaleString()}
              </TableCell>
              <TableCell />
              {avgMilestoneValues.map((pct, i) => {
                const { container, text } = getCellClass(pct, granularity, milestones[i])
                return (
                  <TableCell key={milestones[i]} className="text-center p-1.5">
                    {pct === null ? (
                      <span className="text-xs text-muted-foreground/40 italic">—</span>
                    ) : (
                      <div
                        className={cn(
                          'rounded-md px-2 py-1 text-sm tabular-nums font-semibold mx-auto w-fit',
                          container,
                          text
                        )}
                      >
                        {pct.toFixed(1)}%
                      </div>
                    )}
                  </TableCell>
                )
              })}
              <TableCell />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
