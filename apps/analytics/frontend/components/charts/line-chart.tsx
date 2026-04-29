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
import { CHART_COLORS, CHART_MARGINS } from '@/lib/constants'
import { CustomTooltip } from './CustomTooltip'
import { useReducedMotion } from '@/hooks'

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
  ariaLabel?: string
  ariaDescription?: string
}

export function LineChartComponent({
  data,
  lines,
  xAxisKey = 'day',
  height = 300,
  showGrid = true,
  showLegend = true,
  ariaLabel,
  ariaDescription,
}: LineChartProps) {
  const reducedMotion = useReducedMotion()
  const defaultLabel = lines.map((l) => l.name || l.dataKey).join(' and ') + ' line chart'
  const descId = `line-chart-desc-${lines.map((l) => l.dataKey).join('-')}`
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? defaultLabel}
      aria-describedby={ariaDescription ? descId : undefined}
      className="motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-500"
    >
      {ariaDescription && (
        <p id={descId} className="sr-only">
          {ariaDescription}
        </p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={CHART_MARGINS.default}>
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
              isAnimationActive={!reducedMotion}
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
