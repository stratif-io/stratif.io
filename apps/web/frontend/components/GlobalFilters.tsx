import { useRef, useState } from 'react'
import { useAppStore } from '@/stores'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DateRangePicker } from '@/components/DateRangePicker'
import {
  Globe,
  Chrome,
  Monitor,
  Building,
  Tag,
  Layers,
  ChevronDown,
  X,
  LucideIcon,
} from 'lucide-react'
import { useFilterConfig, useFilterOptions } from '@/features/connections/hooks/useConnectionsData'
import { cn } from '@/lib/utils'
import type { FilterField } from '@/types'

function pluralize(word: string): string {
  if (word.endsWith('y')) return word.slice(0, -1) + 'ies'
  return word + 's'
}

const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Chrome,
  Monitor,
  Building,
  Tag,
  Layers,
}

function DimensionFilter({ field, options }: { field: FilterField; options: string[] }) {
  const activeFilters = useAppStore((s) => s.activeFilters)
  const setActiveFilter = useAppStore((s) => s.setActiveFilter)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const value = activeFilters[field.field] ?? null
  const Icon = ICON_MAP[field.icon] ?? Tag

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
            'h-9 flex items-center gap-1.5 px-3 text-sm font-medium shrink-0',
            'hover:bg-accent/60 transition-colors',
            value ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <Icon className={cn('h-3.5 w-3.5 shrink-0', value && 'text-primary')} />
          <span className="max-w-[100px] truncate">
            {value ?? `All ${pluralize(field.label.toLowerCase())}`}
          </span>
          {value ? (
            <X
              role="button"
              aria-label={`Clear ${field.label} filter`}
              className="h-3 w-3 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                select(null)
              }}
            />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-52 p-0" align="start">
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

        <div className="max-h-56 overflow-y-auto">
          <div className="p-1">
            {allItems.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">No results</p>
            ) : (
              allItems.map((opt, i) => (
                <button
                  key={opt ?? '__all__'}
                  ref={(el) => { optionRefs.current[i] = el }}
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
  const { data: filterOptions, isLoading: optionsLoading } = useFilterOptions(activeConnectionId ?? '')

  const filterFields = filterConfig?.filter_fields ?? []
  const isLoading = configLoading || optionsLoading

  return (
    <div
      role="group"
      aria-label="Global filters"
      className="flex items-center h-9 w-full rounded-lg border bg-background shadow-sm divide-x divide-border overflow-x-auto scrollbar-none"
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
