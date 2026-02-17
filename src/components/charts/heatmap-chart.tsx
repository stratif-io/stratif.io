import { useMemo } from 'react'
import { HEATMAP_SEQUENTIAL_COLORS } from './chart-colors'

interface HeatmapCell {
  hour: number
  value: number
}

interface HeatmapRow {
  day: string
  data: HeatmapCell[]
}

interface HeatmapChartProps {
  data: HeatmapRow[]
  height?: number
  cellSize?: number
  colors?: string[]
  showValues?: boolean
  showAxisLabels?: boolean
  onCellClick?: (day: string, hour: number, value: number) => void
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function HeatmapChart({
  data,
  height = 300,
  cellSize = 20,
  colors = HEATMAP_SEQUENTIAL_COLORS,
  showValues = false,
  showAxisLabels = true,
  onCellClick,
}: HeatmapChartProps) {
  const { minValue, maxValue } = useMemo(() => {
    let min = Infinity
    let max = -Infinity

    data.forEach((row) => {
      row.data.forEach((cell) => {
        if (cell.value < min) min = cell.value
        if (cell.value > max) max = cell.value
      })
    })

    return { minValue: min === Infinity ? 0 : min, maxValue: max === -Infinity ? 1 : max }
  }, [data])

  const getCellColor = (value: number) => {
    if (maxValue === minValue) return colors[0]

    const ratio = (value - minValue) / (maxValue - minValue)
    const index = Math.min(Math.floor(ratio * (colors.length - 1)), colors.length - 1)
    return colors[index]
  }

  const getCellValue = (dayData: HeatmapRow, hour: number): number => {
    const cell = dayData.data.find((c) => c.hour === hour)
    return cell?.value ?? 0
  }

  const tooltipContent = (day: string, hour: number, value: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${day}, ${displayHour}:00 ${period}: ${value.toLocaleString()}`
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        No data available
      </div>
    )
  }

  const paddingX = showAxisLabels ? 40 : 10
  const paddingY = showAxisLabels ? 30 : 10
  const svgWidth = paddingX + cellSize * 24 + 10
  const svgHeight = paddingY + cellSize * data.length + 10

  return (
    <div className="w-full overflow-auto animate-in fade-in-50 duration-500" style={{ height }}>
      <div className="flex flex-col items-center">
        <svg width={svgWidth} height={svgHeight} className="overflow-visible">
          {showAxisLabels && (
            <>
              {HOURS.filter((h) => h % 3 === 0).map((hour) => (
                <text
                  key={`hour-${hour}`}
                  x={paddingX + hour * cellSize + cellSize / 2}
                  y={15}
                  textAnchor="middle"
                  className="fill-muted-foreground text-xs"
                >
                  {hour === 0
                    ? '12a'
                    : hour < 12
                      ? `${hour}a`
                      : hour === 12
                        ? '12p'
                        : `${hour - 12}p`}
                </text>
              ))}
            </>
          )}

          {data.map((row, rowIndex) => (
            <g key={row.day}>
              {showAxisLabels && (
                <text
                  x={paddingX - 5}
                  y={paddingY + rowIndex * cellSize + cellSize / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-xs"
                >
                  {row.day}
                </text>
              )}

              {HOURS.map((hour) => {
                const value = getCellValue(row, hour)
                const color = getCellColor(value)
                const x = paddingX + hour * cellSize
                const y = paddingY + rowIndex * cellSize

                return (
                  <g key={`${row.day}-${hour}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellSize - 1}
                      height={cellSize - 1}
                      fill={color}
                      rx={2}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onClick={() => onCellClick?.(row.day, hour, value)}
                    >
                      <title>{tooltipContent(row.day, hour, value)}</title>
                    </rect>
                    {showValues && cellSize >= 25 && value > 0 && (
                      <text
                        x={x + (cellSize - 1) / 2}
                        y={y + (cellSize - 1) / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-white text-[8px] pointer-events-none"
                      >
                        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          ))}
        </svg>

        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-muted-foreground">Less</span>
          <div className="flex gap-0.5">
            {colors.map((color, i) => (
              <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  )
}

export function generateHeatmapData(
  valueGenerator: (day: number, hour: number) => number
): HeatmapRow[] {
  return DAYS.map((day, dayIndex) => ({
    day,
    data: HOURS.map((hour) => ({
      hour,
      value: valueGenerator(dayIndex, hour),
    })),
  }))
}
