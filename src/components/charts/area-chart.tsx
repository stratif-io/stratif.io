import { AreaChart as RechartsAreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { DEFAULT_CHART_COLORS } from './chart-colors'
import { ChartTooltip } from './chart-tooltip'

interface AreaChartProps {
  data: Array<Record<string, unknown>>
  dataKey: string
  name?: string
  color?: string
  gradientId?: string
  height?: number
}

export function AreaChartComponent({
  data,
  dataKey,
  name,
  color = DEFAULT_CHART_COLORS[0],
  gradientId = 'colorGradient',
  height = 300,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name || dataKey}
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
