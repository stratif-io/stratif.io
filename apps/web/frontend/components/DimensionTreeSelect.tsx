import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'
import type { DimensionCategoryConfig, DimensionOption } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

interface DimensionTreeSelectProps {
  value: string | null
  onChange: (value: string) => void
  dimensions: DimensionOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DimensionTreeSelect({
  value,
  onChange,
  dimensions,
  placeholder = 'Select dimension…',
  disabled = false,
  className,
}: DimensionTreeSelectProps) {
  const [open, setOpen] = useState(false)

  const groups = groupDimensionsByCategory(dimensions, CATEGORIES)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // When popover opens, reset expanded state to the category of the current value
  // (or first non-empty group). Done here — not in useState init — so it works
  // correctly when `dimensions` is initially empty and populates later.
  function handleOpenChange(next: boolean) {
    if (next) {
      const activeGroupId =
        value != null
          ? (groups.find((g) => g.dimensions.some((d) => d.value === value))?.category.id ?? groups[0]?.category.id)
          : groups[0]?.category.id
      setExpandedIds(new Set(activeGroupId ? [activeGroupId] : []))
    }
    setOpen(next)
  }

  function toggleGroup(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelect(dimValue: string) {
    onChange(dimValue)
    setOpen(false)
  }

  const selectedLabel = value != null
    ? dimensions.find((d) => d.value === value)?.label ?? value
    : null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'h-9 w-full flex items-center justify-between gap-2 px-3 rounded-md text-sm border border-input bg-background',
            'hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value && 'border-primary text-primary',
            className,
          )}
        >
          <span className="truncate">{selectedLabel ?? <span className="text-muted-foreground">{placeholder}</span>}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="max-h-72 overflow-y-auto">
          {groups.map((group) => {
            const isExpanded = expandedIds.has(group.category.id)
            return (
              <div key={group.category.id}>
                {/* Category header */}
                <button
                  type="button"
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => toggleGroup(group.category.id)}
                >
                  {isExpanded
                    ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  }
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {group.category.label}
                  </span>
                </button>
                {/* Dimension items */}
                {isExpanded && group.dimensions.map((dim) => (
                  <button
                    key={dim.value}
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-1.5 pl-8 text-sm truncate',
                      'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                      dim.value === value && 'bg-accent font-medium text-accent-foreground',
                    )}
                    onClick={() => handleSelect(dim.value)}
                  >
                    {dim.label}
                  </button>
                ))}
              </div>
            )
          })}
          {groups.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No dimensions available</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
