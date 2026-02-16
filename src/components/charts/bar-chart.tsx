import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { DEFAULT_CHART_COLORS } from './chart-colors'
import { ChartTooltip } from './chart-tooltip'

interface BarChartProps {
  data: Array<Record<string, unknown>>
  bars: Array<{
    dataKey: string
    name?: string
    color?: string
  }>
  xAxisKey?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  layout?: 'horizontal' | 'vertical'
}

export function BarChartComponent({
  data,
  bars,
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  layout = 'horizontal',
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <Tooltip content={<ChartTooltip />} />
        {showLegend && <Legend />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name || bar.dataKey}
            fill={bar.color || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
