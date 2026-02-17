import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Top paths by occurrence count
        </span>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 16, right: 30, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tickFormatter={(val) => val.toLocaleString()} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as {
                    rank: number
                    fullPath: PathData
                    count: number
                    percentage: number
                  }
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-xs">
                      <p className="font-semibold text-sm mb-1">#{d.rank} most common path</p>
                      <p className="text-xs text-muted-foreground mb-2">{d.fullPath.path}</p>
                      <p className="text-sm font-medium">{d.count.toLocaleString()} occurrences</p>
                      <p className="text-xs text-muted-foreground">{d.percentage}% of all paths</p>
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
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
