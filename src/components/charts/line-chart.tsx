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
import { DEFAULT_CHART_COLORS } from './chart-colors'
import { ChartTooltip } from './chart-tooltip'

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
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <YAxis
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value)}
        />
        <Tooltip content={<ChartTooltip />} />
        {showLegend && <Legend />}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name || line.dataKey}
            stroke={line.color || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]}
            strokeWidth={line.strokeWidth || 2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
