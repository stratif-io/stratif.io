import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { AGG_LABELS, AGG_SYMBOLS } from './agg-badge-config'

interface AggBadgeProps {
  aggFunc: string
  allowedAggFuncs: string[]
  onAggChange: (agg: string) => void
}

export function AggBadge({ aggFunc, allowedAggFuncs, onAggChange }: AggBadgeProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          className="ml-0.5 inline-flex items-center px-1 py-0 text-[10px] rounded bg-primary/20 hover:bg-primary/30 font-medium leading-4 transition-colors"
          title="Change aggregation"
        >
          {AGG_SYMBOLS[aggFunc] ?? aggFunc}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="start" onClick={(e) => e.stopPropagation()}>
        {allowedAggFuncs.map((agg) => (
          <button
            key={agg}
            type="button"
            className={cn(
              'w-full text-left px-2 py-1 text-xs rounded transition-colors focus:outline-none',
              agg === aggFunc ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
            )}
            onClick={(e) => {
              e.stopPropagation()
              if (agg !== aggFunc) onAggChange(agg)
              setOpen(false)
            }}
          >
            {AGG_LABELS[agg] ?? agg}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
