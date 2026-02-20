import { useState } from 'react'
import { useAppStore } from '@/stores'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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

  const value = activeFilters[field.field] ?? null
  const Icon = ICON_MAP[field.icon] ?? Tag

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options

  function select(v: string | null) {
    setActiveFilter(field.field, v)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'h-9 flex items-center gap-1.5 px-3 text-sm font-medium',
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
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-sm"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-56">
          <div className="p-1">
            {!search && (
              <button
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-sm',
                  'hover:bg-accent transition-colors',
                  value === null && 'bg-accent font-medium'
                )}
                onClick={() => select(null)}
              >
                All {pluralize(field.label.toLowerCase())}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">No results</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm truncate',
                    'hover:bg-accent transition-colors',
                    value === opt && 'bg-accent font-medium'
                  )}
                  onClick={() => select(opt)}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export function GlobalFilters() {
  const { dateRange, setDateRange, activeConnectionId } = useAppStore()

  const { data: filterConfig } = useFilterConfig(activeConnectionId ?? '')
  const { data: filterOptions } = useFilterOptions(activeConnectionId ?? '')

  const filterFields = filterConfig?.filter_fields ?? []

  return (
    <div className="flex items-center h-9 rounded-lg border bg-background shadow-sm overflow-hidden divide-x divide-border">
      <DateRangePicker value={dateRange} onChange={setDateRange} inlineMode />
      {filterFields.map((field) => (
        <DimensionFilter
          key={field.field}
          field={field}
          options={filterOptions?.[field.field] ?? []}
        />
      ))}
    </div>
  )
}
