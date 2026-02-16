import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import type { PathData } from '@/types'

interface PathsChartProps {
  data: PathData[]
  targetEvent: string
}

export function PathsChart({ data, targetEvent }: PathsChartProps) {
  const chartData = data.map((path, idx) => ({
    name: `${path.step_3} → ${path.step_2} → ${path.step_1}`,
    count: path.count,
    percentage: path.percentage,
    fullPath: path,
    rank: idx + 1,
  }))

  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        No paths found for "{targetEvent}"
      </div>
    )
  }

  return (
    <Card className="p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Path Popularity
        </CardTitle>
        <CardDescription>Top 5 paths leading to {targetEvent}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(val) => val.toLocaleString()} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as {
                      rank: number
                      fullPath: PathData
                      count: number
                      percentage: number
                    }
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-xs">
                        <p className="font-semibold text-sm mb-1">Rank #{data.rank}</p>
                        <p className="text-xs text-muted-foreground mb-2">{data.fullPath.path}</p>
                        <p className="text-sm font-medium">{data.count.toLocaleString()} events</p>
                        <p className="text-xs text-muted-foreground">{data.percentage}% of total</p>
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
                name="Event Count"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
