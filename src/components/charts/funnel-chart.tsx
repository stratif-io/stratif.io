import { useMemo } from 'react'
import { FUNNEL_CHART_COLORS } from './chart-colors'

interface FunnelStage {
  name: string
  value: number
  color?: string
}

interface FunnelChartProps {
  data: FunnelStage[]
  orientation?: 'horizontal' | 'vertical'
  height?: number
  showPercentage?: boolean
  showValue?: boolean
  gradient?: boolean
  onStageClick?: (stage: FunnelStage, index: number) => void
}

export function FunnelChart({
  data,
  orientation = 'vertical',
  height = 400,
  showPercentage = true,
  showValue = true,
  gradient = true,
  onStageClick,
}: FunnelChartProps) {
  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.value))
  }, [data])

  const colors = FUNNEL_CHART_COLORS

  const getGradientColor = (index: number, total: number) => {
    if (!gradient) return colors[index % colors.length]

    const startColor = colors[0]
    const endColor = colors[Math.min(total - 1, colors.length - 1)]

    const parseHSL = (hsl: string) => {
      const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
      if (match) {
        return {
          h: parseInt(match[1]),
          s: parseInt(match[2]),
          l: parseInt(match[3]),
        }
      }
      return { h: 200, s: 70, l: 60 }
    }

    const start = parseHSL(startColor)
    const end = parseHSL(endColor)
    const ratio = index / Math.max(total - 1, 1)

    const h = Math.round(start.h + (end.h - start.h) * ratio)
    const s = Math.round(start.s + (end.s - start.s) * ratio)
    const l = Math.round(start.l + (end.l - start.l) * ratio)

    return `hsl(${h}, ${s}%, ${l}%)`
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        No data available
      </div>
    )
  }

  if (orientation === 'horizontal') {
    return (
      <div className="w-full" style={{ height }}>
        <div className="flex flex-col gap-2 h-full justify-center">
          {data.map((stage, index) => {
            const widthPercent = (stage.value / maxValue) * 100
            const color = stage.color || getGradientColor(index, data.length)
            const conversionRate =
              index > 0 ? ((stage.value / data[index - 1].value) * 100).toFixed(1) : '100'

            return (
              <div
                key={stage.name}
                className="flex items-center gap-3 group"
                onClick={() => onStageClick?.(stage, index)}
                style={{ cursor: onStageClick ? 'pointer' : 'default' }}
              >
                <div className="w-24 text-sm text-muted-foreground truncate">{stage.name}</div>
                <div className="flex-1 h-10 relative">
                  <div
                    className="h-full rounded-md transition-all duration-200 group-hover:brightness-110 flex items-center justify-end pr-3"
                    style={{
                      width: `${Math.max(widthPercent, 10)}%`,
                      backgroundColor: color,
                    }}
                  >
                    <div className="flex items-center gap-2 text-white text-sm font-medium">
                      {showValue && <span>{stage.value.toLocaleString()}</span>}
                      {showPercentage && (
                        <span className="opacity-80">({widthPercent.toFixed(1)}%)</span>
                      )}
                    </div>
                  </div>
                  {index > 0 && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full text-xs text-muted-foreground">
                      ↓ {conversionRate}%
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex justify-center" style={{ height }}>
      <svg
        viewBox={`0 0 400 ${height}`}
        className="w-full max-w-md"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {gradient && (
            <linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[0]} />
              <stop
                offset="100%"
                stopColor={colors[Math.min(data.length - 1, colors.length - 1)]}
              />
            </linearGradient>
          )}
        </defs>

        {data.map((stage, index) => {
          const widthPercent = (stage.value / maxValue) * 100
          const nextWidthPercent =
            index < data.length - 1 ? (data[index + 1].value / maxValue) * 100 : widthPercent * 0.8

          const stageHeight = height / data.length
          const y = index * stageHeight
          const centerX = 200

          const topWidth = (widthPercent / 100) * 350
          const bottomWidth = (nextWidthPercent / 100) * 350

          const topLeft = centerX - topWidth / 2
          const topRight = centerX + topWidth / 2
          const bottomLeft = centerX - bottomWidth / 2
          const bottomRight = centerX + bottomWidth / 2

          const color = stage.color || getGradientColor(index, data.length)
          const conversionRate =
            index > 0 ? ((stage.value / data[index - 1].value) * 100).toFixed(1) : '100'

          return (
            <g
              key={stage.name}
              onClick={() => onStageClick?.(stage, index)}
              style={{ cursor: onStageClick ? 'pointer' : 'default' }}
              className="group"
            >
              <path
                d={`M ${topLeft} ${y} 
                    L ${topRight} ${y} 
                    L ${bottomRight} ${y + stageHeight} 
                    L ${bottomLeft} ${y + stageHeight} Z`}
                fill={color}
                className="transition-all duration-200 group-hover:brightness-110"
                stroke="hsl(var(--background))"
                strokeWidth={1}
              />

              <text
                x={centerX}
                y={y + stageHeight / 2 - 8}
                textAnchor="middle"
                className="fill-white font-semibold text-sm pointer-events-none"
              >
                {stage.name}
              </text>

              <text
                x={centerX}
                y={y + stageHeight / 2 + 10}
                textAnchor="middle"
                className="fill-white/80 text-xs pointer-events-none"
              >
                {showValue && stage.value.toLocaleString()}
                {showValue && showPercentage && ' • '}
                {showPercentage && `${widthPercent.toFixed(1)}%`}
              </text>

              {index > 0 && (
                <text
                  x={topRight + 10}
                  y={y + stageHeight / 2}
                  className="fill-muted-foreground text-xs pointer-events-none"
                >
                  {conversionRate}%
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
