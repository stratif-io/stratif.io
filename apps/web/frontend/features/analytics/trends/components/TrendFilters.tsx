import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, X, Filter } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fetchPivotGridFilterValues } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Dimension {
  value: string
  label: string
}

interface DimensionFilterProps {
  dimension: Dimension
  value: string | null
  connectionId: string | undefined
  onChange: (field: string, value: string | null) => void
}

function DimensionFilterPicker({ dimension, value, connectionId, onChange }: DimensionFilterProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['trend-filter-values', dimension.value, connectionId],
    queryFn: () =>
      fetchPivotGridFilterValues({ field: dimension.value, connection_id: connectionId }),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  const options = (data?.values ?? []).map(String).filter(Boolean)
  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options
  const allItems: (string | null)[] = search ? filtered : [null, ...filtered]

  function select(v: string | null) {
    onChange(dimension.value, v)
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
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{dimension.label}</span>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'h-7 flex items-center gap-1 px-2.5 rounded-md text-xs font-medium border transition-colors',
              value
                ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
                : 'border-border text-muted-foreground hover:bg-accent/60'
            )}
          >
            <span className="max-w-[120px] truncate">{value ?? 'All'}</span>
            {value ? (
              <X
                className="h-3 w-3 shrink-0"
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
              placeholder={`Search ${dimension.label.toLowerCase()}…`}
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
              {isLoading ? (
                <p className="px-2 py-3 text-xs text-muted-foreground text-center">Loading…</p>
              ) : allItems.length === 0 ? (
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
                        if (i > 0) {
                          setFocusedIndex(i - 1)
                          optionRefs.current[i - 1]?.focus()
                        }
                      } else if (e.key === 'Escape') {
                        setOpen(false)
                      }
                    }}
                  >
                    {opt === null ? `All ${dimension.label.toLowerCase()}s` : opt}
                  </button>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface TrendFiltersProps {
  dimensions: Dimension[]
  filters: Record<string, string | null>
  connectionId: string | undefined
  onChange: (field: string, value: string | null) => void
  onClearAll: () => void
}

export function TrendFilters({
  dimensions,
  filters,
  connectionId,
  onChange,
  onClearAll,
}: TrendFiltersProps) {
  const [open, setOpen] = useState(false)
  const activeCount = Object.values(filters).filter((v) => v !== null).length

  if (dimensions.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {dimensions.map((dim) => (
            <DimensionFilterPicker
              key={dim.value}
              dimension={dim}
              value={filters[dim.value] ?? null}
              connectionId={connectionId}
              onChange={onChange}
            />
          ))}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={onClearAll}
            >
              Clear all
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
