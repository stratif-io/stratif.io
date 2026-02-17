import { useMemo } from 'react'
import { DEFAULT_CHART_COLORS } from './chart-colors'

interface SparklineChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  showArea?: boolean
  showDots?: boolean
  showTrend?: boolean
  trendPosition?: 'start' | 'end'
  strokeWidth?: number
}

export function SparklineChart({
  data,
  width = 100,
  height = 30,
  color = DEFAULT_CHART_COLORS[0],
  showArea = true,
  showDots = false,
  showTrend = false,
  trendPosition = 'end',
  strokeWidth = 1.5,
}: SparklineChartProps) {
  const { path, areaPath, dots, trend, min, max } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: '', areaPath: '', dots: [], trend: 0, min: 0, max: 0 }
    }

    const minValue = Math.min(...data)
    const maxValue = Math.max(...data)
    const range = maxValue - minValue || 1
    const padding = 4

    const effectiveHeight = height - padding * 2
    const effectiveWidth = width - padding * 2

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * effectiveWidth
      const y = padding + effectiveHeight - ((value - minValue) / range) * effectiveHeight
      return { x, y, value }
    })

    let pathString = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      pathString += ` L ${points[i].x} ${points[i].y}`
    }

    const areaPathString = showArea
      ? `${pathString} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : ''

    const trendValue = data.length >= 2 ? ((data[data.length - 1] - data[0]) / data[0]) * 100 : 0

    return {
      path: pathString,
      areaPath: areaPathString,
      dots: showDots ? points : [],
      trend: trendValue,
      min: minValue,
      max: maxValue,
    }
  }, [data, width, height, showArea, showDots])

  const trendColor = trend >= 0 ? 'text-green-500' : 'text-red-500'

  const trendBgColor = trend >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'

  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-xs"
        style={{ width, height }}
      >
        —
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 animate-in fade-in-50 duration-300">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`sparkline-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {showArea && <path d={areaPath} fill={`url(#sparkline-gradient-${color})`} />}

        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-200"
        />

        {dots.map((dot, index) => (
          <circle
            key={index}
            cx={dot.x}
            cy={dot.y}
            r={2}
            fill={color}
            className="opacity-0 hover:opacity-100 transition-opacity"
          >
            <title>{dot.value.toLocaleString()}</title>
          </circle>
        ))}
      </svg>

      {showTrend && (
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${trendColor} ${trendBgColor}`}
        >
          {trend >= 0 ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 2L8 6H2L5 2Z" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 8L2 4H8L5 8Z" />
            </svg>
          )}
          {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
  )
}

interface SparklineCardProps {
  title: string
  value: string | number
  data: number[]
  trend?: number
  subtitle?: string
  color?: string
}

export function SparklineCard({
  title,
  value,
  data,
  trend,
  subtitle,
  color = DEFAULT_CHART_COLORS[0],
}: SparklineCardProps) {
  const trendColor = trend !== undefined && trend >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {trend !== undefined && (
              <span className={`text-sm font-medium ${trendColor}`}>
                {trend >= 0 ? '+' : ''}
                {trend.toFixed(1)}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <SparklineChart data={data} width={80} height={40} color={color} showArea />
      </div>
    </div>
  )
}
