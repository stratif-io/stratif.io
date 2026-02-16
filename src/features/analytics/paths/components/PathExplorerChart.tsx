import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      <Card className="p-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Path Popularity
          </CardTitle>
          <CardDescription>Click a bar to see the conversion funnel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(val) => val.toLocaleString()} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as {
                        rank: number
                        fullPath: string
                        count: number
                        percentage: number
                        avgTime: number | null
                        uniqueUsers: number
                      }
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-sm">
                          <p className="font-semibold text-sm mb-1">Rank #{data.rank}</p>
                          <p className="text-xs text-muted-foreground mb-2 break-all">
                            {data.fullPath}
                          </p>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {data.count.toLocaleString()} occurrences
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {data.percentage}% of total
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {data.uniqueUsers} unique users
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Avg time: {formatTime(data.avgTime)}
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
        </CardContent>
      </Card>

      <PathFunnelDialog
        path={selectedPath}
        dateRange={dateRange}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
