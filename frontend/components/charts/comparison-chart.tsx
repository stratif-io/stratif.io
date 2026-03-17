import { useState, useMemo } from 'react'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
} from 'recharts'
import { DEFAULT_CHART_COLORS, COMPARISON_COLORS } from './chart-colors'

interface ComparisonSeries {
  dataKey: string
  name: string
  color?: string
  type: 'current' | 'previous'
}

interface ComparisonChartProps {
  data: Array<Record<string, unknown>>
  series: ComparisonSeries[]
  xAxisKey?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showDifference?: boolean
  syncId?: string
}

interface ComparisonTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
  series: ComparisonSeries[]
}

function ComparisonTooltip({ active, payload, label, series }: ComparisonTooltipProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  if (active && payload && payload.length) {
    const currentData = payload.find((p) => {
      const s = series.find((s) => s.dataKey === p.dataKey)
      return s?.type === 'current'
    })
    const previousData = payload.find((p) => {
      const s = series.find((s) => s.dataKey === p.dataKey)
      return s?.type === 'previous'
    })

    const difference = currentData && previousData ? currentData.value - previousData.value : null
    const percentChange =
      currentData && previousData && previousData.value !== 0
        ? ((currentData.value - previousData.value) / previousData.value) * 100
        : null

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        {label && <p className="mb-2 font-semibold text-sm">{label}</p>}
        {payload.map((entry, index) => {
          const s = series.find((s) => s.dataKey === entry.dataKey)
          const isCurrent = s?.type === 'current'

          return (
            <p key={index} className="flex items-center gap-2 text-sm mb-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{isCurrent ? 'Current' : 'Previous'}:</span>
              <span className="font-medium">{entry.value?.toLocaleString()}</span>
            </p>
          )
        })}
        {difference !== null && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm">
              <span className="text-muted-foreground">Difference: </span>
              <span
                className={`font-medium ${difference >= 0 ? 'text-success' : 'text-destructive'}`}
              >
                {difference >= 0 ? '+' : ''}
                {difference.toLocaleString()}
              </span>
              {percentChange !== null && (
                <span
                  className={`ml-1 text-xs ${difference >= 0 ? 'text-success' : 'text-destructive'}`}
                >
                  ({percentChange >= 0 ? '+' : ''}
                  {percentChange.toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    )
  }
  return null
}

export function ComparisonChart({
  data,
  series,
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  showDifference = true,
  syncId,
}: ComparisonChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const { currentSeries, previousSeries } = useMemo(() => {
    const current = series.filter((s) => s.type === 'current')
    const previous = series.filter((s) => s.type === 'previous')
    return { currentSeries: current, previousSeries: previous }
  }, [series])

  const getSeriesColor = (s: ComparisonSeries, index: number) => {
    if (s.color) return s.color
    if (s.type === 'current')
      return COMPARISON_COLORS.current[index % COMPARISON_COLORS.current.length]
    return COMPARISON_COLORS.previous[index % COMPARISON_COLORS.previous.length]
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        No data available
      </div>
    )
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-500">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          syncId={syncId}
          onMouseMove={(e) => {
            if (e?.activeTooltipIndex !== undefined) {
              setActiveIndex(e.activeTooltipIndex)
            }
          }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
          <YAxis
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value)}
          />
          <Tooltip content={<ComparisonTooltip series={series} />} />
          {showLegend && (
            <Legend
              formatter={(value, entry) => {
                const s = series.find((s) => s.dataKey === entry.dataKey)
                const isCurrent = s?.type === 'current'
                return (
                  <span className="text-sm text-muted-foreground">
                    {isCurrent ? 'Current Period' : 'Previous Period'}
                  </span>
                )
              }}
            />
          )}

          {previousSeries.map((s, index) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={getSeriesColor(s, index)}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: getSeriesColor(s, index) }}
            />
          ))}

          {currentSeries.map((s, index) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={getSeriesColor(s, index)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: getSeriesColor(s, index) }}
            />
          ))}

          {showDifference && activeIndex !== null && activeIndex > 0 && (
            <ReferenceArea
              x1={String(data[activeIndex - 1]?.[xAxisKey] ?? '')}
              x2={String(data[activeIndex]?.[xAxisKey] ?? '')}
              fill="hsl(var(--muted))"
              fillOpacity={0.3}
            />
          )}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface PeriodComparisonData {
  label: string
  current: number
  previous: number
}

export function transformPeriodData(data: PeriodComparisonData[]): Array<Record<string, unknown>> {
  return data.map((item) => ({
    name: item.label,
    current: item.current,
    previous: item.previous,
  }))
}
