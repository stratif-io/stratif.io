import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BarChart3 } from 'lucide-react'
import type { PathAnalysisData, DateRange } from '@/types'
import { PathFunnelDialog } from './PathFunnelDialog'

interface PathExplorerChartProps {
  data: PathAnalysisData[]
  dateRange: DateRange
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return 'N/A'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
  return `${(seconds / 3600).toFixed(1)}h`
}

export function PathExplorerChart({ data, dateRange }: PathExplorerChartProps) {
  const [selectedPath, setSelectedPath] = useState<PathAnalysisData | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const chartData = data.slice(0, 10).map((path, idx) => ({
    name: path.path.length > 40 ? path.path.substring(0, 37) + '...' : path.path,
    fullPath: path.path,
    count: path.occurrence_count,
    percentage: path.percentage_of_total,
    avgTime: path.avg_time_to_complete,
    uniqueUsers: path.unique_users,
    rank: idx + 1,
    originalData: path,
  }))

  const handleBarClick = (data: { originalData: PathAnalysisData }) => {
    if (data?.originalData) {
      setSelectedPath(data.originalData)
      setDialogOpen(true)
    }
  }

  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        No paths found matching the criteria
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Top paths by occurrence — click a bar to see the conversion funnel
          </span>
        </div>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 16, right: 30, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(val) => val.toLocaleString()} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as {
                      rank: number
                      fullPath: string
                      count: number
                      percentage: number
                      avgTime: number | null
                      uniqueUsers: number
                    }
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-sm">
                        <p className="font-semibold text-sm mb-1">#{d.rank} most common path</p>
                        <p className="text-xs text-muted-foreground mb-2 break-all">{d.fullPath}</p>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {d.uniqueUsers.toLocaleString()} unique users
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {d.count.toLocaleString()} total occurrences · {d.percentage}% of paths
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Avg completion: {formatTime(d.avgTime)}
                          </p>
                          <p className="text-xs text-primary font-medium mt-1">
                            Click to see funnel breakdown →
                          </p>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                name="Occurrences"
                className="cursor-pointer"
                onClick={(data) =>
                  handleBarClick(data as unknown as { originalData: PathAnalysisData })
                }
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <PathFunnelDialog
        path={selectedPath}
        dateRange={dateRange}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
