import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CHART_COLORS } from '@/lib/constants'
import { CustomTooltip } from './CustomTooltip'

interface LineChartProps {
  data: Array<Record<string, unknown>>
  lines: Array<{
    dataKey: string
    name?: string
    color?: string
    strokeWidth?: number
  }>
  xAxisKey?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  loading?: boolean
}

export function LineChartComponent({
  data,
  lines,
  xAxisKey = 'day',
  height = 300,
  showGrid = true,
  showLegend = true,
}: LineChartProps) {
  return (
    <div className="animate-in fade-in-50 duration-500">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border opacity-50" />}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            tickLine={false}
            tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', opacity: 0.5 }} />
          {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || CHART_COLORS.series[index % CHART_COLORS.series.length]}
              strokeWidth={line.strokeWidth || 2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
