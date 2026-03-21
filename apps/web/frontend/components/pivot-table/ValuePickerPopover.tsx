import { useState } from 'react'
import { Plus, ChevronLeft } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'
import type { LeafMeta } from './types'
import type { DimensionCategoryConfig } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

const DEFAULT_AGG_CYCLE = ['sum', 'count', 'avg', 'min', 'max', 'countDistinct']
const AGG_LABELS: Record<string, string> = {
  sum: 'Σ Sum', count: 'n Count', avg: 'avg Avg', min: 'min Min', max: 'max Max', countDistinct: '# Distinct',
}

interface ValuePickerPopoverProps {
  leafCols: LeafMeta[]
  onSelect: (colId: string, label: string, aggFunc: string) => void
}

export function ValuePickerPopover({ leafCols, onSelect }: ValuePickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const [selectedCol, setSelectedCol] = useState<LeafMeta | null>(null)

  const eligible = leafCols.filter((c) => c.enableValue)

  const groups = groupDimensionsByCategory(
    eligible.map((c) => ({ value: c.colId, label: c.label })),
    CATEGORIES,
  )

  function handleDimSelect(col: LeafMeta) {
    setSelectedCol(col)
  }

  function handleAggSelect(aggFunc: string) {
    if (!selectedCol) return
    onSelect(selectedCol.colId, selectedCol.label, aggFunc)
    setOpen(false)
    setSelectedCol(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSelectedCol(null)
  }

  const aggCycle = selectedCol?.allowedAggFuncs ?? DEFAULT_AGG_CYCLE

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground">
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {selectedCol === null ? (
          <>
            {groups.map((group) => (
              <div key={group.category.id} className="mb-2 last:mb-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 px-1 mb-1">
                  {group.category.label}
                </div>
                {group.dimensions.map((dim) => {
                  const col = eligible.find((c) => c.colId === dim.value)!
                  return (
                    <Button
                      key={dim.value}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDimSelect(col)}
                      className="w-full justify-start text-xs h-7 px-2"
                    >
                      {dim.label}
                    </Button>
                  )
                })}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">No metrics available.</p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCol(null)}
                className="h-6 w-6 p-0"
                aria-label="Back"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium">{selectedCol.label}</span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 px-1 mb-1">
              Aggregation
            </div>
            {aggCycle.map((agg) => (
              <Button
                key={agg}
                variant="ghost"
                size="sm"
                onClick={() => handleAggSelect(agg)}
                className="w-full justify-start text-xs h-7 px-2"
              >
                {AGG_LABELS[agg] ?? agg}
              </Button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
