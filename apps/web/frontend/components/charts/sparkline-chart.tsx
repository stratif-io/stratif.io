import { useId, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { DEFAULT_CHART_COLORS } from './chart-colors'

interface SparklineChartProps {
  data: number[]
  labels?: string[]
  width?: number
  height?: number
  color?: string
  showArea?: boolean
  showDots?: boolean
  showTrend?: boolean
  trendPosition?: 'start' | 'end'
  strokeWidth?: number
  formatter?: (value: number) => string
  animated?: boolean  // reveal path left-to-right on mount
}

export function SparklineChart({
  data,
  labels,
  width = 100,
  height = 30,
  color = DEFAULT_CHART_COLORS[0],
  showArea = true,
  showDots = false,
  showTrend = false,
  trendPosition: _trendPosition = 'end',
  strokeWidth = 1.5,
  formatter = (v: number) => v.toLocaleString(),
  animated = false,
}: SparklineChartProps) {
  const uid = useId()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const { path, areaPath, dots, trend, points } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: '', areaPath: '', dots: [], trend: 0, points: [] }
    }

    const minValue = Math.min(...data)
    const maxValue = Math.max(...data)
    const range = maxValue - minValue || 1
    const padding = 4

    const effectiveHeight = height - padding * 2
    const effectiveWidth = width - padding * 2

    const pts = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * effectiveWidth
      const y = padding + effectiveHeight - ((value - minValue) / range) * effectiveHeight
      return { x, y, value }
    })

    let pathString = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      pathString += ` L ${pts[i].x} ${pts[i].y}`
    }

    const areaPathString = showArea
      ? `${pathString} L ${pts[pts.length - 1].x} ${height - padding} L ${pts[0].x} ${height - padding} Z`
      : ''

    const trendValue = data.length >= 2 ? ((data[data.length - 1] - data[0]) / data[0]) * 100 : 0

    return {
      path: pathString,
      areaPath: areaPathString,
      dots: showDots ? pts : [],
      trend: trendValue,
      points: pts,
    }
  }, [data, width, height, showArea, showDots])

  const trendColor = trend >= 0 ? 'text-success' : 'text-destructive'
  const trendBgColor = trend >= 0 ? 'bg-success/10' : 'bg-destructive/10'

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length < 2) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (width / rect.width)
    const padding = 4
    const effectiveWidth = width - padding * 2
    const ratio = Math.max(0, Math.min(1, (mouseX - padding) / effectiveWidth))
    setHoveredIdx(Math.round(ratio * (points.length - 1)))
  }

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null
  const hasLabels = labels && labels.length > 0

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
    <div className="inline-flex items-center gap-2 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-300">
      <div className="relative" style={{ width, height }}>
        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-[var(--z-tooltip)] pointer-events-none bg-popover border border-border rounded px-2 py-1 text-xs shadow-md whitespace-nowrap"
            style={{
              left: hoveredPoint.x,
              top: hoveredPoint.y,
              transform:
                hoveredPoint.x > width * 0.65
                  ? 'translate(-100%, -110%)'
                  : 'translate(-10%, -110%)',
            }}
          >
            {hasLabels && hoveredIdx !== null && labels[hoveredIdx] && (
              <span className="text-muted-foreground">{labels[hoveredIdx]}: </span>
            )}
            <span className="font-semibold">{formatter(hoveredPoint.value)}</span>
          </div>
        )}

        <svg
          role="img"
          aria-label="Sparkline trend chart"
          width={width}
          height={height}
          className="overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            {animated && (
              <clipPath id={`sc-${uid}`}>
                <motion.rect
                  x={0}
                  y={-4}
                  height={height + 8}
                  initial={{ width: 0 }}
                  animate={{ width: width + 4 }}
                  transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
                />
              </clipPath>
            )}
          </defs>

          {showArea && (
            <path
              d={areaPath}
              fill={`url(#sg-${uid})`}
              clipPath={animated ? `url(#sc-${uid})` : undefined}
            />
          )}

          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-200"
            clipPath={animated ? `url(#sc-${uid})` : undefined}
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

          {/* Hover indicator */}
          {hoveredPoint && (
            <>
              <line
                x1={hoveredPoint.x}
                y1={4}
                x2={hoveredPoint.x}
                y2={height - 4}
                stroke={color}
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.6}
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r={3}
                fill={color}
                stroke="hsl(var(--background))"
                strokeWidth={1.5}
              />
            </>
          )}
        </svg>
      </div>

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
  const trendColor =
    trend !== undefined && trend >= 0
      ? 'text-success'
      : 'text-destructive'

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
