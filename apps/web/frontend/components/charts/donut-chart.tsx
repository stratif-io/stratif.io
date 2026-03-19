import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { DONUT_CHART_COLORS } from './chart-colors'
import { useReducedMotion } from '@/hooks'

interface DonutChartProps {
  data: Array<{
    name: string
    value: number
    color?: string
  }>
  innerRadius?: number
  outerRadius?: number
  height?: number
  showLegend?: boolean
  showLabels?: boolean
  colors?: string[]
  loading?: boolean
  error?: string
  onSliceClick?: (data: { name: string; value: number }) => void
}

interface CustomLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  name: string
}

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: CustomLabelProps) {
  if (percent < 0.05) return null

  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function DonutChart({
  data,
  innerRadius = 60,
  outerRadius = 100,
  height = 300,
  showLegend = true,
  showLabels = false,
  colors = DONUT_CHART_COLORS,
  loading = false,
  error,
  onSliceClick,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const prefersReducedMotion = useReducedMotion()

  if (loading) {
    return (
      <div className="flex items-center justify-center animate-pulse" style={{ height }}>
        <div className="w-32 h-32 rounded-full bg-muted/50" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center text-destructive" style={{ height }}>
        <p>{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        <svg
          width={outerRadius * 2}
          height={outerRadius * 2}
          viewBox={`0 0 ${outerRadius * 2} ${outerRadius * 2}`}
        >
          <circle
            cx={outerRadius}
            cy={outerRadius}
            r={outerRadius - 10}
            fill="none"
            stroke="currentColor"
            strokeWidth={outerRadius - innerRadius}
            opacity={0.2}
          />
        </svg>
        <p className="mt-4 text-sm">No data available</p>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div role="img" aria-label="Donut chart" className="motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-500">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            label={showLabels ? renderCustomLabel : undefined}
            labelLine={false}
            animationDuration={prefersReducedMotion ? 0 : 800}
            isAnimationActive={!prefersReducedMotion}
            animationEasing="ease-out"
            onClick={(_, index) => {
              if (onSliceClick) {
                onSliceClick(data[index])
              }
            }}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((entry, index) => {
              const color = entry.color || colors[index % colors.length]
              const isActive = activeIndex === index

              return (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                  stroke={isActive ? 'hsl(var(--background))' : 'transparent'}
                  strokeWidth={isActive ? 2 : 0}
                  style={{
                    cursor: onSliceClick ? 'pointer' : 'default',
                    filter: isActive ? 'brightness(1.1)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              )
            })}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                const percentage = ((data.value / total) * 100).toFixed(1)
                return (
                  <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
                    <p className="mb-1 font-semibold text-sm">{data.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Value:{' '}
                      <span className="font-medium text-foreground">
                        {data.value.toLocaleString()}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Percentage: <span className="font-medium text-foreground">{percentage}%</span>
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
