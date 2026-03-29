import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { RetentionCohort } from '@/types'
import type { RetentionGranularity } from '../hooks/useRetentionData'

function RetentionMiniBar({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-0.5 h-6 w-18">
      {values.map((v, i) => (
        <div
          key={i}
          className={cn('flex-1 rounded-sm', v > 0 ? 'bg-primary/60' : 'bg-muted/40')}
          style={{ height: `${Math.max((v / max) * 100, v > 0 ? 15 : 8)}%` }}
        />
      ))}
    </div>
  )
}

interface RetentionTableProps {
  data: RetentionCohort[]
  granularity: RetentionGranularity
  milestones: number[]
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
  const avgMilestoneValues = useMemo(
    () =>
      milestones.map((_, i) =>
        data.length > 0
          ? data.reduce((s, r) => s + (r.milestone_values[i] ?? 0), 0) / data.length
          : 0
      ),
    [data, milestones]
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
              <TableHead
                key={unit}
                scope="col"
                className="font-semibold text-foreground text-center whitespace-nowrap"
              >
                {milestoneLabel(unit, granularity)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => {
            return (
              <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                <TableHead scope="row" className="font-medium whitespace-nowrap">
                  {formatDate(row.cohort_date, granularity)}
                </TableHead>
                <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                  {row.cohort_size.toLocaleString()}
                </TableCell>
                <TableCell className="py-1.5 pr-4">
                  <RetentionMiniBar values={row.milestone_values} />
                </TableCell>
                {milestones.map((unit, i) => {
                  const pct = row.milestone_values[i] ?? 0
                  return (
                    <TableCell key={unit} className="text-center p-1.5">
                      <div
                        className={cn(
                          'rounded-md px-2 py-1 text-sm tabular-nums font-medium transition-colors mx-auto w-fit',
                          pct >= 20 ? 'text-success' : 'text-foreground'
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
                      pct >= 20 ? 'text-success' : 'text-foreground'
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
