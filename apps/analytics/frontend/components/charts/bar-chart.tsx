import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { CHART_COLORS, CHART_MARGINS } from '@/lib/constants'
import { CustomTooltip } from './CustomTooltip'
import { useState } from 'react'

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
  ariaLabel?: string
  ariaDescription?: string
}

export function BarChartComponent({
  data,
  bars,
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  layout = 'horizontal',
  ariaLabel,
  ariaDescription,
}: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const defaultLabel = bars.map((b) => b.name || b.dataKey).join(' and ') + ' bar chart'
  const descId = `bar-chart-desc-${bars.map((b) => b.dataKey).join('-')}`

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
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={CHART_MARGINS.default}
          onMouseMove={(state) => {
            if (state.isTooltipActive) {
              setActiveIndex(state.activeTooltipIndex ?? null)
            } else {
              setActiveIndex(null)
            }
          }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border opacity-50" />}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickLine={false} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color || CHART_COLORS.series[index % CHART_COLORS.series.length]}
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((_, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  opacity={activeIndex === null || activeIndex === idx ? 1 : 0.5}
                  className="transition-opacity duration-200"
                />
              ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
