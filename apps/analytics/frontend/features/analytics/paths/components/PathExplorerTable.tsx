import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Clock, Users, TrendingUp } from 'lucide-react'
import type { PathAnalysisData } from '@/types'

interface PathExplorerTableProps {
  data: PathAnalysisData[]
}

function getRankColor(idx: number): string {
  if (idx === 0) return 'bg-warning/10 text-warning border-warning/20'
  if (idx === 1) return 'bg-muted text-muted-foreground border-border'
  if (idx === 2) return 'bg-chart-5/10 text-chart-5 border-chart-5/20'
  return 'bg-muted text-muted-foreground'
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '-'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`
  return `${(seconds / 86400).toFixed(1)}d`
}

export function PathExplorerTable({ data }: PathExplorerTableProps) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        No paths found matching the criteria
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Path</TableHead>
              <TableHead className="text-center">Length</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Count
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Users className="h-3 w-3" />
                  Users
                </div>
              </TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />
                  Avg Time
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((path, idx) => {
              const events = (path.path ?? '').split(' -> ')
              return (
                <TableRow key={idx}>
                  <TableCell>
                    <Badge variant="outline" className={getRankColor(idx)}>
                      #{idx + 1}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-mono text-sm flex-wrap max-w-md">
                      {events.map((event, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span
                            className={
                              i === events.length - 1
                                ? 'font-semibold text-primary'
                                : 'text-muted-foreground'
                            }
                          >
                            {event}
                          </span>
                          {i < events.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{path.path_length}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {path.occurrence_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{path.unique_users.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {path.unique_sessions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{path.percentage_of_total}%</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatTime(path.avg_time_to_complete)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
