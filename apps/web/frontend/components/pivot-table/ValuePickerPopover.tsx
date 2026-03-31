import { useState, useMemo } from 'react'
import { Plus, ChevronLeft, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import { CategoryIcon } from '@/lib/utils/categoryIcon'
import categoriesConfig from '@/config/dimension-categories.json'
import type { LeafMeta } from './types'
import type { DimensionCategoryConfig } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

const DEFAULT_AGG_CYCLE = ['sum', 'count', 'avg', 'min', 'max', 'countDistinct']
const AGG_LABELS: Record<string, string> = {
  sum: 'Σ Sum',
  count: 'n Count',
  avg: 'avg Avg',
  min: 'min Min',
  max: 'max Max',
  countDistinct: '# Distinct',
}

interface ValuePickerPopoverProps {
  leafCols: LeafMeta[]
  onSelect: (colId: string, label: string, aggFunc: string) => void
}

export function ValuePickerPopover({ leafCols, onSelect }: ValuePickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const [selectedCol, setSelectedCol] = useState<LeafMeta | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const eligible = leafCols.filter((c) => c.enableValue)

  const groups = groupDimensionsByCategory(
    eligible.map((c) => ({ value: c.colId, label: c.label })),
    CATEGORIES
  )

  const activeGroup = useMemo(
    () => groups.find((g) => g.category.id === activeCategory),
    [groups, activeCategory]
  )

  const searchGrouped = useMemo(
    () =>
      search
        ? groups
            .map((g) => ({
              ...g,
              dimensions: g.dimensions.filter((d) =>
                d.label.toLowerCase().includes(search.toLowerCase())
              ),
            }))
            .filter((g) => g.dimensions.length > 0)
        : [],
    [groups, search]
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
    if (next) {
      setActiveCategory(groups[0]?.category.id ?? null)
    } else {
      setSelectedCol(null)
      setSearch('')
    }
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
      <PopoverContent className="w-72 p-0" align="start">
        {selectedCol === null ? (
          <>
            {/* Search bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                placeholder="Search metrics…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                style={{ boxShadow: 'none' }}
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {search ? (
              /* Search results: flat grouped list */
              <div className="max-h-52 overflow-y-auto">
                {searchGrouped.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No metrics match
                  </p>
                ) : (
                  searchGrouped.map((group) => (
                    <div key={group.category.id}>
                      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground px-3 py-1 sticky top-0 bg-popover">
                        {group.category.label}
                      </div>
                      {group.dimensions.map((dim) => {
                        const col = eligible.find((c) => c.colId === dim.value)!
                        return (
                          <button
                            key={dim.value}
                            type="button"
                            className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                            onClick={() => handleDimSelect(col)}
                          >
                            {dim.label}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Two-panel mode */
              <div className="flex max-h-52">
                {/* Left panel: categories */}
                <div className="w-32 shrink-0 bg-muted/40 overflow-y-auto border-r">
                  {groups.map((group) => (
                    <button
                      key={group.category.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center px-2 py-1.5 text-left text-xs focus-visible:outline-none',
                        group.category.id === activeCategory
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/60'
                      )}
                      onClick={() => setActiveCategory(group.category.id)}
                    >
                      <CategoryIcon name={group.category.icon} className="h-3 w-3 shrink-0" />
                      <span className="truncate flex-1">{group.category.label}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/50 ml-1">
                        {group.dimensions.length}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Right panel: metrics */}
                <div className="flex-1 overflow-y-auto">
                  {activeGroup ? (
                    activeGroup.dimensions.map((dim) => {
                      const col = eligible.find((c) => c.colId === dim.value)!
                      return (
                        <button
                          key={dim.value}
                          type="button"
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                          onClick={() => handleDimSelect(col)}
                        >
                          {dim.label}
                        </button>
                      )
                    })
                  ) : (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                      No metrics
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Step 2: aggregation picker */
          <>
            <div className="flex items-center gap-1 px-3 py-2 border-b">
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
            <div className="text-[10px] font-semibold tracking-wide text-muted-foreground px-3 py-1">
              AGGREGATION
            </div>
            {aggCycle.map((agg) => (
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
