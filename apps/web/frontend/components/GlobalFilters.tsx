import { useRef, useState } from 'react'
import { useAppStore } from '@/stores'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DateRangePicker } from '@/components/DateRangePicker'
import { ChevronDown, X } from 'lucide-react'
import { useFilterConfig, useFilterOptions } from '@/features/connections/hooks/useConnectionsData'
import { cn } from '@/lib/utils'
import type { DimensionCategoryConfig, FilterField } from '@/types'
import dimensionCategories from '@/config/dimension-categories.json'

function pluralize(word: string): string {
  if (word.endsWith('y')) return word.slice(0, -1) + 'ies'
  return word + 's'
}

const compiledCategories = (dimensionCategories as DimensionCategoryConfig[]).map((cat) => ({
  emoji: cat.emoji,
  regexes: cat.patterns.map((p) => new RegExp(p, 'i')),
}))

function resolveEmoji(fieldName: string): string {
  for (const { emoji, regexes } of compiledCategories) {
    if (regexes.some((r) => r.test(fieldName))) return emoji
  }
  return '🏷️'
}

function DimensionFilter({ field, options }: { field: FilterField; options: string[] }) {
  const activeFilters = useAppStore((s) => s.activeFilters)
  const setActiveFilter = useAppStore((s) => s.setActiveFilter)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const value = activeFilters[field.field] ?? null
  const emoji = resolveEmoji(field.field)

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options

  // "All" button is index 0 when not searching, then filtered options follow
  const allItems: (string | null)[] = search ? filtered : [null, ...filtered]

  function select(v: string | null) {
    setActiveFilter(field.field, v)
    setOpen(false)
    setSearch('')
    setFocusedIndex(-1)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setSearch('')
      setFocusedIndex(-1)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.min(focusedIndex + 1, allItems.length - 1)
      setFocusedIndex(next)
      optionRefs.current[next]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = Math.max(focusedIndex - 1, 0)
      setFocusedIndex(prev)
      optionRefs.current[prev]?.focus()
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      select(allItems[focusedIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'h-10 flex items-center gap-1.5 px-3 text-sm font-medium shrink-0',
            'hover:bg-accent/60 transition-colors',
            value ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <span className="shrink-0 text-sm leading-none">{emoji}</span>
          <span className="max-w-[100px] truncate">
            {value ?? `All ${pluralize(field.label.toLowerCase())}`}
          </span>
          {value ? (
            <button
              type="button"
              aria-label={`Clear ${field.label} filter`}
              className="flex items-center justify-center -mr-1 -mx-1 px-1 -my-2 py-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                select(null)
              }}
            >
              <X className="h-3 w-3 shrink-0" />
            </button>
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder={`Search ${pluralize(field.label.toLowerCase())}…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setFocusedIndex(-1)
            }}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm"
            autoFocus
          />
        </div>

        <div className="max-h-60 overflow-y-auto">
          <div className="p-1">
            {allItems.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">No results</p>
            ) : (
              allItems.map((opt, i) => (
                <button
                  key={opt ?? '__all__'}
                  ref={(el) => {
                    optionRefs.current[i] = el
                  }}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm truncate',
                    'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                    (opt === null ? value === null : value === opt) && 'bg-accent font-medium'
                  )}
                  onClick={() => select(opt)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      const next = Math.min(i + 1, allItems.length - 1)
                      setFocusedIndex(next)
                      optionRefs.current[next]?.focus()
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      if (i === 0) {
                        // back to search input — handled by focus moving up naturally
                        return
                      }
                      const prev = i - 1
                      setFocusedIndex(prev)
                      optionRefs.current[prev]?.focus()
                    } else if (e.key === 'Escape') {
                      setOpen(false)
                    }
                  }}
                >
                  {opt === null ? `All ${pluralize(field.label.toLowerCase())}` : opt}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function GlobalFilters() {
  const { dateRange, setDateRange, activeConnectionId } = useAppStore()

  const { data: filterConfig, isLoading: configLoading } = useFilterConfig(activeConnectionId ?? '')
  const { data: filterOptions, isLoading: optionsLoading } = useFilterOptions(
    activeConnectionId ?? ''
  )

  const filterFields = filterConfig?.filter_fields ?? []
  const isLoading = configLoading || optionsLoading

  return (
    <div
      role="group"
      aria-label="Global filters"
      aria-live="polite"
      className="flex flex-col sm:flex-row sm:items-center sm:h-10 w-full rounded-lg border bg-background shadow-sm sm:divide-x divide-y sm:divide-y-0 divide-border overflow-x-auto scrollbar-none"
    >
      <div className="shrink-0">
        <DateRangePicker value={dateRange} onChange={setDateRange} inlineMode />
      </div>
      {isLoading
        ? Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="px-3 h-full flex items-center shrink-0">
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        : filterFields.map((field) => (
            <DimensionFilter
              key={field.field}
              field={field}
              options={filterOptions?.[field.field] ?? []}
            />
          ))}
    </div>
  )
}
