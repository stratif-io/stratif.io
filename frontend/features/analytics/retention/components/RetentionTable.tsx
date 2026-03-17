import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { RetentionCohort } from '@/types'
import type { RetentionGranularity } from '../hooks/useRetentionData'

interface RetentionTableProps {
  data: RetentionCohort[]
  granularity: RetentionGranularity
  milestones: number[]
}

function getTrend(data: number[]): 'up' | 'down' | 'flat' {
  const valid = data.filter((v) => v != null && !isNaN(v))
  if (valid.length < 2) return 'flat'
  const delta = valid[valid.length - 1] - valid[0]
  if (delta > 1) return 'up'
  if (delta < -1) return 'down'
  return 'flat'
}

function getCellStyle(percent: number): React.CSSProperties {
  const opacity = 0.06 + (percent / 100) * 0.44
  return { backgroundColor: `hsl(var(--chart-2) / ${opacity})` }
}

function formatDate(d: string, granularity: RetentionGranularity) {
  const date = new Date(d)
  if (granularity === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  if (granularity === 'week') {
    return `Wk ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function milestoneLabel(unit: number, granularity: RetentionGranularity): string {
  if (granularity === 'week') return `Wk ${unit}`
  if (granularity === 'month') return `Mo ${unit}`
  return `Day ${unit}`
}

export function RetentionTable({ data, granularity, milestones }: RetentionTableProps) {
  const avgMilestoneValues = milestones.map((_, i) =>
    data.length > 0 ? data.reduce((s, r) => s + (r.milestone_values[i] ?? 0), 0) / data.length : 0
  )

  return (
    <div className="overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-semibold text-foreground whitespace-nowrap">
              Cohort
            </TableHead>
            <TableHead className="font-semibold text-foreground text-right whitespace-nowrap">
              Users
            </TableHead>
            <TableHead className="font-semibold text-foreground whitespace-nowrap">Trend</TableHead>
            {milestones.map((unit) => (
              <TableHead
                key={unit}
                className="font-semibold text-foreground text-center whitespace-nowrap"
              >
                {milestoneLabel(unit, granularity)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => {
            // Skip unit 0 (signup day — always ~100%, not meaningful in the trend)
            const sparkData = row.retention_series.slice(1)
            const trend = getTrend(sparkData)
            const trendConfig = {
              up:   { label: 'Improving', icon: '↑', className: 'text-success' },
              down: { label: 'Declining',  icon: '↓', className: 'text-destructive' },
              flat: { label: 'Stable',    icon: '→', className: 'text-muted-foreground' },
            }[trend]
            return (
              <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-medium whitespace-nowrap">
                  {formatDate(row.cohort_date, granularity)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                  {row.cohort_size.toLocaleString()}
                </TableCell>
                <TableCell className="py-1.5 pr-4">
                  <span className={cn('inline-flex items-center gap-1 text-xs font-medium tabular-nums', trendConfig.className)}>
                    <span aria-hidden="true">{trendConfig.icon}</span>
                    <span className="sr-only">{trendConfig.label}</span>
                  </span>
                </TableCell>
                {milestones.map((unit, i) => {
                  const pct = row.milestone_values[i] ?? 0
                  return (
                    <TableCell key={unit} className="text-center p-1.5">
                      <div
                        className={cn(
                          'rounded-md px-2 py-1 text-sm tabular-nums font-medium transition-colors mx-auto w-fit',
                          pct >= 50
                            ? 'text-success'
                            : pct >= 20
                              ? 'text-success'
                              : 'text-foreground'
                        )}
                        style={getCellStyle(pct)}
                      >
                        {pct.toFixed(1)}%
                      </div>
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}

          {/* Average row */}
          {data.length > 1 && (
            <TableRow className="border-t-2 bg-muted/30 font-semibold">
              <TableCell className="text-muted-foreground text-sm">Average</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                {Math.round(
                  data.reduce((s, r) => s + r.cohort_size, 0) / data.length
                ).toLocaleString()}
              </TableCell>
              <TableCell />
              {avgMilestoneValues.map((pct, i) => (
                <TableCell key={milestones[i]} className="text-center p-1.5">
                  <div
                    className={cn(
                      'rounded-md px-2 py-1 text-sm tabular-nums font-semibold mx-auto w-fit',
                      pct >= 50
                        ? 'text-success'
                        : pct >= 20
                          ? 'text-success'
                          : 'text-foreground'
                    )}
                    style={getCellStyle(pct)}
                  >
                    {pct.toFixed(1)}%
                  </div>
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
