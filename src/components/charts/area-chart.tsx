import { AreaChart as RechartsAreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_COLORS } from '@/lib/constants'
import { CustomTooltip } from './CustomTooltip'

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
  color = CHART_COLORS.primary,
  gradientId = 'colorGradient',
  height = 300,
}: AreaChartProps) {
  return (
    <div className="animate-in fade-in-50 duration-500">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', opacity: 0.5 }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            name={name || dataKey}
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
