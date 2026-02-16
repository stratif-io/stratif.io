import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        {label && <p className="mb-2 font-semibold">{label}</p>}
        {payload.map((entry, index) => (
          <p key={index} className="flex items-center gap-2 text-sm" style={{ color: entry.color }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value?.toLocaleString()}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}
