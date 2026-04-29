import { type ReactNode, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, Check, Loader2, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import { CategoryIcon } from '@/lib/utils/categoryIcon'
import categoriesConfig from '@/config/dimension-categories.json'
import type { DimensionCategoryConfig, DimensionOption } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

export interface FilterSelectOption {
  value: string
  label: string
  category?: string
  /** When true the option is shown but not selectable (e.g. already used in another zone). */
  disabled?: boolean
}

export interface FilterSelectProps {
  mode: 'single' | 'multi'
  options: FilterSelectOption[]
  isLoading?: boolean
  value: string | string[] | null
  onChange: (value: string | string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** 'default' = h-10 (standard controls). 'sm' = h-7 (compact paired filter rows).
   *  Note: FilterSelect size="sm" is h-7, distinct from Button size="sm" which is h-9. */
  size?: 'default' | 'sm'
  searchable?: boolean
  /** Enables category two-panel grouping using dimension-categories.json config. */
  tree?: boolean
  /** Override the entire trigger button content (e.g. an "+ Add" button for the pivot zone bar). */
  triggerContent?: ReactNode
}

export function FilterSelect({
  mode,
  options,
  isLoading = false,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className,
  size = 'default',
  searchable = false,
  tree = false,
  triggerContent,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const selectedValues: string[] = value === null ? [] : Array.isArray(value) ? value : [value]

  const triggerLabel = (() => {
    if (selectedValues.length === 0) return null
    if (mode === 'multi') {
      if (selectedValues.length === 1)
        return options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
      return `${selectedValues.length} values`
    }
    return options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
  })()

  const groups = useMemo(() => {
    if (!tree) return []
    const raw = groupDimensionsByCategory(options as DimensionOption[], CATEGORIES)
    return [...raw].sort((a, b) => a.category.label.localeCompare(b.category.label))
  }, [tree, options])

  function handleOpenChange(next: boolean) {
    if (next && tree) {
      const activeValue = selectedValues[0] ?? null
      const initialCategory =
        activeValue != null
          ? (groups.find((g) => g.dimensions.some((d) => d.value === activeValue))?.category.id ??
            groups[0]?.category.id)
          : groups[0]?.category.id
      setActiveCategory(initialCategory ?? null)
    }
    if (!next) setSearch('')
    setOpen(next)
  }

  function handleSelect(opt: FilterSelectOption) {
    if (opt.disabled) return
    if (mode === 'single') {
      onChange(opt.value)
      setOpen(false)
    } else {
      const next = selectedValues.includes(opt.value)
        ? selectedValues.filter((v) => v !== opt.value)
        : [...selectedValues, opt.value]
      onChange(next)
    }
  }

  function handleClear() {
    onChange([])
  }

  const filteredFlat = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const flatListParentRef = useRef<HTMLDivElement>(null)
  const flatVirtualizer = useVirtualizer({
    count: filteredFlat.length,
    getScrollElement: () => flatListParentRef.current,
    estimateSize: () => 32,
    overscan: 8,
    initialRect: { width: 224, height: 240 },
  })

  const triggerHeight = size === 'sm' ? 'h-7 text-xs px-2' : 'h-10 text-sm px-3'
  const hasValue = selectedValues.length > 0

  // For tree search mode: group the filtered results by category
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

  const activeGroup = useMemo(
    () => groups.find((g) => g.category.id === activeCategory),
    [groups, activeCategory]
  )

  function renderColumnButton(dim: DimensionOption) {
    const opt = options.find((o) => o.value === dim.value)!
    const isDisabled = opt.disabled ?? false
    const isSelected = selectedValues.includes(dim.value)
    return (
      <button
        key={dim.value}
        type="button"
        disabled={isDisabled}
        className={cn(
          'w-full text-left px-2.5 py-1.5 text-xs truncate flex items-center gap-2',
          'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
          isSelected && 'bg-primary/10 text-primary font-medium',
          isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none'
        )}
        onClick={() => handleSelect(opt)}
      >
        {mode === 'multi' && (
          <span
            className={cn(
              'h-3 w-3 shrink-0 rounded-sm border',
              isSelected ? 'bg-primary/80 border-primary/80' : 'border-muted-foreground/30'
            )}
          />
        )}
        {mode === 'single' &&
          (isSelected ? (
            <Check className="h-3 w-3 shrink-0 text-primary" />
          ) : (
            <span className="h-3 w-3 shrink-0" />
          ))}
        {dim.label}
      </button>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {triggerContent ? (
          <span>{triggerContent}</span>
        ) : (
          <button
            type="button"
            disabled={disabled}
            aria-label={triggerLabel ?? placeholder}
            className={cn(
              'w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background',
              'hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              triggerHeight,
              hasValue && 'border-primary text-primary',
              className
            )}
          >
            <span aria-hidden="true" className="truncate">
              {triggerLabel != null ? (
                triggerLabel
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent className={cn('p-0', tree ? 'w-72' : 'w-56')} align="start">
        {isLoading ? (
          <div role="status" className="flex items-center justify-center py-6 max-h-60">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : tree ? (
          <>
            {/* Search bar — always shown in tree mode */}
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                placeholder="Search columns…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none focus:shadow-none focus-visible:shadow-none placeholder:text-muted-foreground"
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
              /* Search mode: full-width grouped list */
              <div className="max-h-52 overflow-y-auto">
                {searchGrouped.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No columns match
                  </p>
                ) : (
                  searchGrouped.map((group) => (
                    <div key={group.category.id}>
                      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground px-3 py-1 sticky top-0 bg-popover">
                        {group.category.label}
                      </div>
                      {group.dimensions.map((dim) => renderColumnButton(dim))}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Two-panel mode */
              <div className="flex max-h-52">
                {/* Left panel: categories */}
                <div className="w-32 shrink-0 bg-muted/40 overflow-y-auto border-r">
                  {groups.map((group) => {
                    const isActive = group.category.id === activeCategory
                    const categorySelectedCount = group.dimensions.filter((d) =>
                      selectedValues.includes(d.value)
                    ).length
                    const hasSelections = categorySelectedCount > 0
                    return (
                      <button
                        key={group.category.id}
                        type="button"
                        className={cn(
                          'w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted/60'
                        )}
                        onClick={() => setActiveCategory(group.category.id)}
                      >
                        <CategoryIcon name={group.category.icon} className="h-3 w-3 shrink-0" />
                        <span className="truncate flex-1 min-w-0">{group.category.label}</span>
                        {hasSelections ? (
                          <span className="shrink-0 text-[10px] leading-none bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium">
                            {categorySelectedCount}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] leading-none text-muted-foreground/50">
                            {group.dimensions.length}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Right panel: columns */}
                <div className="flex-1 overflow-y-auto">
                  {activeGroup ? (
                    activeGroup.dimensions.map((dim) => renderColumnButton(dim))
                  ) : (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                      No options
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Footer: multi mode only */}
            {mode === 'multi' && selectedValues.length > 0 && (
              <div className="p-2 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {selectedValues.length} selected
                </span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                >
                  Clear all
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {searchable && (
              <div className="p-2 border-b">
                <Input
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                />
              </div>
            )}

            <div ref={flatListParentRef} className="max-h-60 overflow-y-auto">
              {filteredFlat.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground text-center">No options</p>
              ) : (
                (() => {
                  const virtualItems = flatVirtualizer.getVirtualItems()
                  // Fall back to direct render when virtualizer has no items (e.g. jsdom / zero-height container)
                  const itemsToRender = virtualItems.length > 0 ? virtualItems : null
                  return itemsToRender ? (
                    <div
                      className="p-1"
                      style={{ height: flatVirtualizer.getTotalSize(), position: 'relative' }}
                    >
                      {itemsToRender.map((virtualItem) => {
                        const opt = filteredFlat[virtualItem.index]
                        const isSelected = selectedValues.includes(opt.value)
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={opt.disabled}
                            data-index={virtualItem.index}
                            ref={flatVirtualizer.measureElement}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualItem.start}px)`,
                            }}
                            className={cn(
                              'text-left px-2 py-1.5 rounded text-sm truncate flex items-center gap-2',
                              'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                              isSelected && 'font-medium',
                              opt.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                            )}
                            onClick={() => handleSelect(opt)}
                          >
                            {mode === 'multi' && (
                              <span
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0 rounded-sm border',
                                  isSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-muted-foreground/40'
                                )}
                              />
                            )}
                            {mode === 'single' && isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-1">
                      {filteredFlat.map((opt) => {
                        const isSelected = selectedValues.includes(opt.value)
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={opt.disabled}
                            className={cn(
                              'w-full text-left px-2 py-1.5 rounded text-sm truncate flex items-center gap-2',
                              'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                              isSelected && 'font-medium',
                              opt.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                            )}
                            onClick={() => handleSelect(opt)}
                          >
                            {mode === 'multi' && (
                              <span
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0 rounded-sm border',
                                  isSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-muted-foreground/40'
                                )}
                              />
                            )}
                            {mode === 'single' && isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()
              )}
            </div>

            {mode === 'multi' && selectedValues.length > 0 && (
              <div className="p-2 border-t">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground w-full text-left"
                  onClick={() => onChange([])}
                >
                  Clear selection
                </button>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
