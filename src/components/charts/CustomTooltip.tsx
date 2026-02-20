import { cn } from '@/lib/utils'

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (value: number) => string
  labelFormatter?: (label: string) => string
  className?: string
}

/**
 * Enhanced custom tooltip for Recharts with theme-aware styling
 */
export function CustomTooltip({
  active,
  payload,
  label,
  formatter = (value) => value.toLocaleString(),
  labelFormatter = (label) => label,
  className,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        className
      )}
    >
      {/* Label */}
      {label && (
        <p className="text-xs font-medium text-muted-foreground mb-2">{labelFormatter(label)}</p>
      )}

      {/* Values */}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            {/* Color indicator */}
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {/* Label and value */}
            <span className="text-xs text-muted-foreground">{entry.name}:</span>
            <span className="text-sm font-semibold">{formatter(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Simple tooltip variant for single-value charts
 */
export function SimpleTooltip({
  active,
  payload,
  label,
  formatter = (value) => value.toLocaleString(),
  labelFormatter = (label) => label,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const entry = payload[0]

  return (
    <div
      className={cn(
        'rounded-lg border bg-background/95 backdrop-blur-sm p-2.5 shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
    >
      <div className="flex flex-col gap-1">
        {label && (
          <span className="text-xs font-medium text-muted-foreground">{labelFormatter(label)}</span>
        )}
        <span className="text-sm font-bold">{formatter(entry.value)}</span>
      </div>
    </div>
  )
}

/**
 * Percentage tooltip formatter
 */
export function PercentageTooltip({ active, payload, label, labelFormatter }: CustomTooltipProps) {
  return (
    <SimpleTooltip
      active={active}
      payload={payload}
      label={label}
      formatter={(value) => `${value.toFixed(1)}%`}
      labelFormatter={labelFormatter}
    />
  )
}
