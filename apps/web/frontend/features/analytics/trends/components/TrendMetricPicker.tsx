import { useState, useMemo } from 'react'
import { BarChart2, ChevronDown, ChevronLeft, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import { CategoryIcon } from '@/lib/utils/categoryIcon'
import categoriesConfig from '@/config/dimension-categories.json'
import type { DimensionOption, DimensionCategoryConfig } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

const STANDARD_ID = '__standard__'

const AGG_LABELS: Record<string, string> = {
  sum: 'Sum',
  avg: 'Avg',
  min: 'Min',
  max: 'Max',
  count: 'Count',
  countDistinct: 'Distinct',
}

const AGG_OPTIONS = ['sum', 'avg', 'min', 'max', 'count', 'countDistinct']

export interface TrendMetricPickerProps {
  measureField: string
  aggregation: string
  standardMeasures: DimensionOption[]
  numericDimensions: DimensionOption[]
  onChange: (field: string, agg: string) => void
}

type CategoryEntry = {
  id: string
  label: string
  iconEl: React.ReactNode
  items: DimensionOption[]
  isStandard: boolean
}

export function TrendMetricPicker({
  measureField,
  aggregation,
  standardMeasures,
  numericDimensions,
  onChange,
}: TrendMetricPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>(STANDARD_ID)
  const [selectedCustom, setSelectedCustom] = useState<DimensionOption | null>(null)
  const [search, setSearch] = useState('')

  const numericGroups = useMemo(
    () =>
      numericDimensions.length > 0 ? groupDimensionsByCategory(numericDimensions, CATEGORIES) : [],
    [numericDimensions]
  )

  const allCategories = useMemo<CategoryEntry[]>(
    () => [
      {
        id: STANDARD_ID,
        label: 'Standard',
        iconEl: <BarChart2 className="h-3 w-3 shrink-0" />,
        items: standardMeasures,
        isStandard: true,
      },
      ...numericGroups.map((g) => ({
        id: g.category.id,
        label: g.category.label,
        iconEl: <CategoryIcon name={g.category.icon} className="h-3 w-3 shrink-0" />,
        items: g.dimensions,
        isStandard: false,
      })),
    ],
    [standardMeasures, numericGroups]
  )

  const searchGrouped = useMemo(() => {
    if (!search) return []
    return allCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [allCategories, search])

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
      setActiveCategory(STANDARD_ID)
      setSelectedCustom(null)
      setSearch('')
    } else {
      setSearch('')
    }
  }

  function handleItemClick(item: DimensionOption, isStandard: boolean) {
    if (isStandard) {
      onChange(item.value, aggregation)
      setOpen(false)
    } else {
      setSelectedCustom(item)
    }
  }

  function handleAggSelect(agg: string) {
    if (!selectedCustom) return
    onChange(selectedCustom.value, agg)
    setOpen(false)
  }

  const activeEntry = allCategories.find((c) => c.id === activeCategory)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 border border-transparent px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-border transition-colors"
        >
          <BarChart2 className="h-3 w-3 text-muted-foreground" />
          {chipLabel}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {selectedCustom === null ? (
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
                    <div key={group.id}>
                      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground px-3 py-1 sticky top-0 bg-popover">
                        {group.label}
                      </div>
                      {group.items.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                          onClick={() => handleItemClick(item, group.isStandard)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Two-panel mode */
              <div className="flex max-h-52">
                {/* Left panel: categories */}
                <div className="w-32 shrink-0 bg-muted/40 overflow-y-auto border-r">
                  {allCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs focus-visible:outline-none',
                        cat.id === activeCategory
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/60'
                      )}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      {cat.iconEl}
                      <span className="truncate flex-1">{cat.label}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/50 ml-1">
                        {cat.items.length}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Right panel: items */}
                <div className="flex-1 overflow-y-auto">
                  {activeEntry?.items.length ? (
                    activeEntry.items.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                        onClick={() => handleItemClick(item, activeEntry.isStandard)}
                      >
                        {item.label}
                      </button>
                    ))
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
