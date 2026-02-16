import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartDataItem } from '../hooks/useRetentionData'

interface RetentionChartProps {
  data: ChartDataItem[]
}

export function RetentionChart({ data }: RetentionChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
        No retention data available
      </div>
    )
  }

  return (
    <div className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="cohort" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            tickFormatter={(val) => `${val}%`}
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            domain={[0, 100]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-sm mb-2">{label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {String(entry.name)}: {String(entry.value)}%
                      </p>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="day0"
            name="Day 0"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="day1"
            name="Day 1"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="day7"
            name="Day 7"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="day14"
            name="Day 14"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="day30"
            name="Day 30"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
