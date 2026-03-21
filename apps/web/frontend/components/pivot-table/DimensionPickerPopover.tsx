import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'
import type { LeafMeta } from './types'
import type { DimensionCategoryConfig } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

interface DimensionPickerPopoverProps {
  leafCols: LeafMeta[]
  usedIds: Set<string>
  canAdd: (meta: LeafMeta) => boolean
  onSelect: (colId: string) => void
}

export function DimensionPickerPopover({
  leafCols,
  usedIds,
  canAdd,
  onSelect,
}: DimensionPickerPopoverProps) {
  const [open, setOpen] = useState(false)

  const eligible = leafCols.filter(canAdd)

  const groups = groupDimensionsByCategory(
    eligible.map((c) => ({ value: c.colId, label: c.label })),
    CATEGORIES,
  )

  function handleSelect(colId: string) {
    onSelect(colId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground">
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {groups.map((group) => (
          <div key={group.category.id} className="mb-2 last:mb-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 px-1 mb-1">
              {group.category.label}
            </div>
            {group.dimensions.map((dim) => {
              const disabled = usedIds.has(dim.value)
              return (
                <Button
                  key={dim.value}
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleSelect(dim.value)}
                  className="w-full justify-start text-xs h-7 px-2"
                >
                  {dim.label}
                </Button>
              )
            })}
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground px-1">No dimensions available.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
