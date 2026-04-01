import { useState, useEffect } from 'react'
import { BarChart2, ChevronDown, ChevronLeft, Sigma } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { DimensionOption } from '@/types'

const AGG_LABELS: Record<string, string> = {
  sum: 'Sum',
  avg: 'Avg',
  min: 'Min',
  max: 'Max',
  count: 'Count',
  countDistinct: 'Distinct',
}

const AGG_OPTIONS = ['sum', 'avg', 'min', 'max', 'count', 'countDistinct']

type Category = 'standard' | 'custom'

interface TrendMetricPickerProps {
  measureField: string
  aggregation: string
  standardMeasures: DimensionOption[]
  numericDimensions: DimensionOption[]
  onChange: (field: string, agg: string) => void
}

export function TrendMetricPicker({
  measureField,
  aggregation,
  standardMeasures,
  numericDimensions,
  onChange,
}: TrendMetricPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category>('standard')
  const [selectedCustom, setSelectedCustom] = useState<DimensionOption | null>(null)

  // Close the popover when key props change so callers can reset UI state
  useEffect(() => {
    setOpen(false)
    setSelectedCustom(null)
    setActiveCategory('standard')
  }, [measureField, numericDimensions.length])

  const standardMatch = standardMeasures.find((m) => m.value === measureField)
  const chipLabel = standardMatch
    ? standardMatch.label
    : (() => {
        const dim = numericDimensions.find((d) => d.value === measureField) ?? {
          label: measureField,
        }
        return `${dim.label} (${AGG_LABELS[aggregation] ?? aggregation})`
      })()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setActiveCategory('standard')
      setSelectedCustom(null)
    }
  }

  function handleStandardSelect(item: DimensionOption) {
    onChange(item.value, aggregation)
    setOpen(false)
  }

  function handleCustomDimSelect(item: DimensionOption) {
    setSelectedCustom(item)
  }

  function handleAggSelect(agg: string) {
    if (!selectedCustom) return
    onChange(selectedCustom.value, agg)
    setOpen(false)
  }

  const showCustomCategory = numericDimensions.length > 0

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 border border-transparent px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-border transition-colors">
          <BarChart2 className="h-3 w-3 text-muted-foreground" />
          {chipLabel}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {selectedCustom === null ? (
          <div className="flex max-h-52">
            {/* Left panel: categories */}
            <div className="w-32 shrink-0 bg-muted/40 overflow-y-auto border-r">
              <button
                type="button"
                className={cn(
                  'w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs focus-visible:outline-none',
                  activeCategory === 'standard'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/60'
                )}
                onClick={() => setActiveCategory('standard')}
              >
                <BarChart2 className="h-3 w-3 shrink-0" />
                <span className="truncate flex-1">Standard</span>
              </button>
              {showCustomCategory && (
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs focus-visible:outline-none',
                    activeCategory === 'custom'
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/60'
                  )}
                  onClick={() => setActiveCategory('custom')}
                >
                  <Sigma className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1">Custom</span>
                </button>
              )}
            </div>

            {/* Right panel: items */}
            <div className="flex-1 overflow-y-auto">
              {activeCategory === 'standard'
                ? standardMeasures.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                      onClick={() => handleStandardSelect(item)}
                    >
                      {item.label}
                    </button>
                  ))
                : numericDimensions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                      onClick={() => handleCustomDimSelect(item)}
                    >
                      {item.label}
                    </button>
                  ))}
            </div>
          </div>
        ) : (
          /* Step 2: aggregation picker */
          <>
            <div className="flex items-center gap-1 px-3 py-2 border-b">
              <button
                type="button"
                aria-label="Back"
                className="h-6 w-6 p-0 inline-flex items-center justify-center rounded hover:bg-muted"
                onClick={() => setSelectedCustom(null)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-medium">{selectedCustom.label}</span>
            </div>
            <div className="text-[10px] font-semibold tracking-wide text-muted-foreground px-3 py-1">
              AGGREGATION
            </div>
            {AGG_OPTIONS.map((agg) => (
              <button
                key={agg}
                type="button"
                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                onClick={() => handleAggSelect(agg)}
              >
                {AGG_LABELS[agg] ?? agg}
              </button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
