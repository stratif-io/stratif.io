import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts'

import { CHART_MARGINS } from '@/lib/constants'

const SERIES_COLORS = [
  'hsl(262, 83%, 70%)',
  'hsl(199, 89%, 60%)',
  'hsl(142, 71%, 55%)',
  'hsl(32, 95%, 65%)',
  'hsl(346, 84%, 65%)',
  'hsl(221, 83%, 65%)',
  'hsl(0, 72%, 65%)',
  'hsl(174, 72%, 50%)',
]

interface TrendChartProps {
  data: Array<Record<string, unknown>>
  chartType: 'area' | 'line' | 'bar'
  averageValue: number
  eventName: string
  seriesKeys: string[] | null
  measureKey?: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function TrendChart({
  data,
  chartType,
  averageValue,
  eventName,
  seriesKeys,
  measureKey = 'count',
}: TrendChartProps) {
  if (!data.length) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  const chartProps = {
    data,
    margin: CHART_MARGINS.default,
  }

  const ariaLabel = `${chartType} chart for ${eventName || 'All Events'}${seriesKeys ? ` broken down by ${seriesKeys.join(', ')}` : ''}, ${data.length} data points`

  // ── Bar chart ─────────────────────────────────────────────────────────────
  if (chartType === 'bar') {
    return (
      <div role="img" aria-label={ariaLabel} className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            tickFormatter={(val) => val.toLocaleString()}
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {seriesKeys ? (
            seriesKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="stack"
                fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                name={key}
              />
            ))
          ) : (
            <Bar dataKey={measureKey} fill="hsl(var(--primary))" name={eventName || 'All Events'} />
          )}
        </BarChart>
      </ResponsiveContainer>
      </div>
    )
  }

  // ── Stacked / multi-series mode (area or line) ────────────────────────────
  if (seriesKeys) {
    if (chartType === 'line') {
      return (
      <div role="img" aria-label={ariaLabel} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              tickFormatter={(val) => val.toLocaleString()}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {seriesKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={false}
                name={key}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      )
    }

    return (
      <div role="img" aria-label={ariaLabel} className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...chartProps}>
          <defs>
            {seriesKeys.map((key, i) => (
              <linearGradient key={key} id={`colorKey-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.5} />
                <stop offset="95%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            tickFormatter={(val) => val.toLocaleString()}
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {seriesKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="stack"
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#colorKey-${i})`}
              name={key}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      </div>
    )
  }

  // ── Single-series mode ────────────────────────────────────────────────────
  if (chartType === 'line') {
    return (
      <div role="img" aria-label={ariaLabel} className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            tickFormatter={(val) => val.toLocaleString()}
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine
            y={averageValue}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey={measureKey}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            name={eventName || 'All Events'}
          />
          <Brush dataKey="date" height={30} stroke="hsl(var(--primary))" />
        </LineChart>
      </ResponsiveContainer>
      </div>
    )
  }

  // area (default single-series)
  return (
    <div role="img" aria-label={ariaLabel} className="w-full h-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart {...chartProps}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          tickFormatter={(val) => val.toLocaleString()}
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <ReferenceLine
          y={averageValue}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="3 3"
          label={{
            value: `Avg: ${averageValue.toLocaleString()}`,
            position: 'right',
            fill: 'hsl(var(--muted-foreground))',
          }}
        />
        <Area
          type="monotone"
          dataKey={measureKey}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCount)"
          name={eventName || 'All Events'}
        />
        <Brush dataKey="date" height={30} stroke="hsl(var(--primary))" />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  )
}
