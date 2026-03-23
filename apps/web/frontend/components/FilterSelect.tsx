import { type ReactNode, useState } from 'react'
import { ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'
import type { DimensionCategoryConfig } from '@/types'

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
  /** Enables category accordion grouping using dimension-categories.json config. */
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const selectedValues: string[] =
    value === null ? [] : Array.isArray(value) ? value : [value]

  const triggerLabel = (() => {
    if (selectedValues.length === 0) return null
    if (mode === 'multi') {
      if (selectedValues.length === 1)
        return options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
      return `${selectedValues.length} values`
    }
    return options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
  })()

  const groups = tree
    ? groupDimensionsByCategory(
        options.map((o) => ({ value: o.value, label: o.label, category: o.category })),
        CATEGORIES,
      )
    : []

  function handleOpenChange(next: boolean) {
    if (next && tree) {
      const activeValue = selectedValues[0] ?? null
      const activeGroupId =
        activeValue != null
          ? (groups.find((g) => g.dimensions.some((d) => d.value === activeValue))?.category.id ??
            groups[0]?.category.id)
          : groups[0]?.category.id
      setExpandedIds(new Set(activeGroupId ? [activeGroupId] : []))
    }
    if (!next) setSearch('')
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

  const filteredFlat = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const triggerHeight = size === 'sm' ? 'h-7 text-xs px-2' : 'h-10 text-sm px-3'
  const hasValue = selectedValues.length > 0

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
              className,
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

      <PopoverContent className="w-56 p-0" align="start">
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

        <div className="max-h-60 overflow-y-auto">
          {isLoading ? (
            <div role="status" className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : tree ? (
            <div className="p-1">
              {groups.map((group) => {
                const isExpanded = expandedIds.has(group.category.id)
                return (
                  <div key={group.category.id}>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      className="w-full flex items-center gap-1.5 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                      onClick={() => toggleGroup(group.category.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.category.label}
                      </span>
                    </button>
                    {isExpanded &&
                      group.dimensions.map((dim) => {
                        const opt = options.find((o) => o.value === dim.value)
                        const isDisabled = opt?.disabled ?? false
                        const isSelected = selectedValues.includes(dim.value)
                        return (
                          <button
                            key={dim.value}
                            type="button"
                            disabled={isDisabled}
                            className={cn(
                              'w-full text-left px-3 py-1.5 pl-8 text-sm truncate flex items-center gap-2',
                              'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                              isSelected && 'bg-accent font-medium text-accent-foreground',
                              isDisabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                            )}
                            onClick={() => opt && handleSelect(opt)}
                          >
                            {mode === 'multi' && (
                              <span
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0 rounded-sm border',
                                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40',
                                )}
                              />
                            )}
                            {mode === 'single' && isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                            {dim.label}
                          </button>
                        )
                      })}
                  </div>
                )
              })}
              {groups.length === 0 && (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                  No options
                </p>
              )}
            </div>
          ) : (
            <div className="p-1">
              {filteredFlat.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground text-center">No options</p>
              ) : (
                filteredFlat.map((opt) => {
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
                        opt.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                      )}
                      onClick={() => handleSelect(opt)}
                    >
                      {mode === 'multi' && (
                        <span
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 rounded-sm border',
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40',
                          )}
                        />
                      )}
                      {mode === 'single' && isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                      {opt.label}
                    </button>
                  )
                })
              )}
            </div>
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
      </PopoverContent>
    </Popover>
  )
}
