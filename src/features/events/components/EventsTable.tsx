import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  ArrowUp,
  ArrowDown,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Search,
  Columns3,
  Check,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FilterField, CustomProperty } from '@/types'

export interface RawEvent {
  event_id: string
  user_id: string
  event_name: string
  timestamp: string
  properties?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseProperties(raw: unknown): Record<string, unknown> {
  if (raw == null) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function extractValueFromPath(props: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  const keys = parts[0] === 'properties' ? parts.slice(1) : parts
  if (keys.length === 0) return undefined
  let cur: unknown = props
  for (const key of keys) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

interface DimensionColumn {
  id: string
  label: string
  extractValue: (props: Record<string, unknown>) => unknown
  filterOptions: string[]
}

function buildDimensionColumns(
  filterFields: FilterField[],
  customProperties: CustomProperty[],
  filterOptions: Record<string, string[]>,
): DimensionColumn[] {
  const result: DimensionColumn[] = []
  const seen = new Set<string>()
  const STANDARD = new Set(['user_id', 'event_name', 'timestamp', 'session_id'])

  for (const cp of customProperties) {
    seen.add(cp.name)
    result.push({
      id: cp.name,
      label: cp.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      extractValue: (props) => extractValueFromPath(props, cp.path),
      filterOptions: filterOptions[cp.name] ?? [],
    })
  }

  for (const ff of filterFields) {
    if (!seen.has(ff.field) && !STANDARD.has(ff.field)) {
      seen.add(ff.field)
      result.push({
        id: ff.field,
        label: ff.label,
        extractValue: (props) => props[ff.field],
        filterOptions: filterOptions[ff.field] ?? [],
      })
    }
  }

  return result
}

function loadStoredColumns(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

// ---------------------------------------------------------------------------
// ColumnFilterCombobox
// ---------------------------------------------------------------------------

function ColumnFilterCombobox({
  options,
  value,
  onChange,
  onClear,
  placeholder,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
  onClear: () => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const suggestions =
    search.length > 0
      ? options.filter((o) => o.toLowerCase().startsWith(search.toLowerCase())).slice(0, 20)
      : []

  // Show the exact typed value as an option when it isn't already a suggestion
  const exactInSuggestions = suggestions.some((o) => o.toLowerCase() === search.toLowerCase())
  const showExact = search.length > 0 && !exactInSuggestions

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full text-left text-xs px-2 py-1 rounded border h-7',
            'flex items-center gap-1 truncate transition-colors',
            value
              ? 'border-primary/50 bg-primary/5 text-foreground'
              : 'border-border/40 text-muted-foreground hover:border-border',
          )}
        >
          <span className="flex-1 truncate">{value || placeholder}</span>
          {value && (
            <X
              className="h-3 w-3 flex-shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.length > 0) {
                select(search)
              }
            }}
            placeholder="Type to search…"
            className="h-7 text-xs"
            autoFocus
          />
        </div>
        <ScrollArea className="h-44">
          {search.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center">
              Start typing to see options
            </div>
          ) : (
            <div className="p-1">
              {showExact && (
                <button
                  className={cn(
                    'w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-1.5',
                    value === search && 'bg-accent font-medium',
                  )}
                  onClick={() => select(search)}
                >
                  <span className="text-muted-foreground shrink-0">Use:</span>
                  <span className="truncate font-mono">{search}</span>
                </button>
              )}
              {suggestions.map((opt) => (
                <button
                  key={opt}
                  className={cn(
                    'w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent',
                    value === opt && 'bg-accent font-medium',
                  )}
                  onClick={() => select(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        {value && (
          <div className="p-2 border-t">
            <button
              className="w-full text-xs text-center text-muted-foreground hover:text-foreground"
              onClick={() => {
                onClear()
                setOpen(false)
              }}
            >
              Clear filter
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// ColumnSelector
// ---------------------------------------------------------------------------

function ColumnSelector({
  columns,
  visible,
  onToggle,
  onHideAll,
}: {
  columns: DimensionColumn[]
  visible: Set<string>
  onToggle: (id: string) => void
  onHideAll: () => void
}) {
  const [open, setOpen] = useState(false)

  if (columns.length === 0) return null

  const visibleCount = columns.filter((c) => visible.has(c.id)).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0">
          <Columns3 className="h-3.5 w-3.5" />
          Columns
          {visibleCount > 0 && (
            <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 leading-4">
              {visibleCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="end">
        <div className="px-3 py-2 border-b">
          <p className="text-xs font-medium text-muted-foreground">Toggle columns</p>
        </div>
        <div className="p-1">
          {columns.map((col) => {
            const checked = visible.has(col.id)
            return (
              <button
                key={col.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent transition-colors"
                onClick={() => onToggle(col.id)}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                    checked ? 'bg-primary border-primary' : 'border-border bg-background',
                  )}
                >
                  {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                <span
                  className={cn('text-xs', checked ? 'text-foreground' : 'text-muted-foreground')}
                >
                  {col.label}
                </span>
              </button>
            )
          })}
        </div>
        {visibleCount > 0 && (
          <div className="p-2 border-t">
            <button
              className="w-full text-xs text-center text-muted-foreground hover:text-foreground"
              onClick={() => {
                onHideAll()
                setOpen(false)
              }}
            >
              Hide all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// EventsTable
// ---------------------------------------------------------------------------

export interface EventsTableProps {
  data: RawEvent[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  isFetching?: boolean
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (order: 'asc' | 'desc') => void
  eventNameFilter: string
  onEventNameFilterChange: (v: string) => void
  userIdFilter: string
  onUserIdFilterChange: (v: string) => void
  columnFilters: Record<string, string>
  onColumnFilterChange: (field: string, value: string) => void
  onColumnFilterClear: (field: string) => void
  filterFields: FilterField[]
  customProperties: CustomProperty[]
  filterOptions: Record<string, string[]>
  allEventNames: string[]
  onPageChange: (page: number) => void
  onUserClick: (userId: string) => void
  connectionId?: string | null
}

export function EventsTable({
  data,
  total,
  page,
  pageSize,
  loading,
  isFetching = false,
  sortOrder,
  onSortOrderChange,
  eventNameFilter,
  onEventNameFilterChange,
  userIdFilter,
  onUserIdFilterChange,
  columnFilters,
  onColumnFilterChange,
  onColumnFilterClear,
  filterFields,
  customProperties,
  filterOptions,
  allEventNames,
  onPageChange,
  onUserClick,
  connectionId,
}: EventsTableProps) {
  const storageKey = `of_events_cols_${connectionId ?? 'default'}`

  const [visibleDimColumns, setVisibleDimColumns] = useState<Set<string>>(
    () => loadStoredColumns(storageKey),
  )

  // Re-load from storage when the connection changes
  useEffect(() => {
    setVisibleDimColumns(loadStoredColumns(storageKey))
  }, [storageKey])

  const toggleColumn = useCallback(
    (id: string) => {
      setVisibleDimColumns((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        try {
          localStorage.setItem(storageKey, JSON.stringify([...next]))
        } catch {}
        return next
      })
    },
    [storageKey],
  )

  const hideAll = useCallback(() => {
    setVisibleDimColumns(new Set())
    try {
      localStorage.removeItem(storageKey)
    } catch {}
  }, [storageKey])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const allDimCols = buildDimensionColumns(filterFields, customProperties, filterOptions)
  const visibleCols = allDimCols.filter((c) => visibleDimColumns.has(c.id))

  const activeFilterCount =
    (eventNameFilter ? 1 : 0) +
    (userIdFilter ? 1 : 0) +
    Object.values(columnFilters).filter(Boolean).length

  return (
    <div className="space-y-3">
      {/* Toolbar: filters + column selector */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground min-h-[2rem]">
          {activeFilterCount > 0 && (
            <>
              <span className="font-medium">Filters:</span>
              {eventNameFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  event: {eventNameFilter}
                  <button onClick={() => onEventNameFilterChange('')} className="hover:opacity-70">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {userIdFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  user: {userIdFilter}
                  <button onClick={() => onUserIdFilterChange('')} className="hover:opacity-70">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {Object.entries(columnFilters).map(([field, value]) =>
                value ? (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-foreground font-medium"
                  >
                    {field}: {value}
                    <button
                      onClick={() => onColumnFilterClear(field)}
                      className="hover:opacity-70"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ) : null,
              )}
            </>
          )}
        </div>
        <ColumnSelector
          columns={allDimCols}
          visible={visibleDimColumns}
          onToggle={toggleColumn}
          onHideAll={hideAll}
        />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent align-top">
              {/* User ID */}
              <TableHead className="!h-auto w-[200px] py-2 align-top">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground leading-none">
                    User ID
                  </span>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                    <Input
                      value={userIdFilter}
                      onChange={(e) => onUserIdFilterChange(e.target.value)}
                      placeholder="Filter…"
                      className={cn(
                        'h-7 text-xs pl-6',
                        userIdFilter ? 'border-primary/50 bg-primary/5' : 'border-border/40',
                      )}
                    />
                    {userIdFilter && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                        onClick={() => onUserIdFilterChange('')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </TableHead>

              {/* Event Name */}
              <TableHead className="!h-auto w-[180px] py-2 align-top">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground leading-none">
                    Event Name
                  </span>
                  <ColumnFilterCombobox
                    options={allEventNames}
                    value={eventNameFilter}
                    onChange={onEventNameFilterChange}
                    onClear={() => onEventNameFilterChange('')}
                    placeholder="Filter…"
                  />
                </div>
              </TableHead>

              {/* Dynamic dimension columns */}
              {visibleCols.map((col) => (
                <TableHead key={col.id} className="!h-auto min-w-[140px] py-2 align-top">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground leading-none">
                      {col.label}
                    </span>
                    <ColumnFilterCombobox
                      options={col.filterOptions}
                      value={columnFilters[col.id] ?? ''}
                      onChange={(v) => onColumnFilterChange(col.id, v)}
                      onClear={() => onColumnFilterClear(col.id)}
                      placeholder="Filter…"
                    />
                  </div>
                </TableHead>
              ))}

              {/* Timestamp — sortable, no filter */}
              <TableHead className="!h-auto w-[210px] py-2 align-top">
                <div className="flex flex-col gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-fit px-0 py-0 font-medium text-xs text-muted-foreground hover:text-foreground hover:bg-transparent gap-1 leading-none"
                    onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
                  >
                    Timestamp
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-primary" />
                    )}
                  </Button>
                  {/* Spacer to match filter row height of other columns */}
                  <div className="h-7" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody key={`${loading}-${sortOrder}-${page}`}>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </TableCell>
                  {visibleCols.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3 + visibleCols.length}
                  className="h-32 text-center text-muted-foreground text-sm"
                >
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              data.map((event) => {
                const props = parseProperties(event.properties)
                return (
                  <TableRow key={event.event_id} className="group">
                    {/* User ID */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[150px]">
                          {event.user_id}
                        </span>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent shrink-0"
                          onClick={() => onUserClick(event.user_id)}
                          title="View user timeline"
                        >
                          <User className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </TableCell>

                    {/* Event name */}
                    <TableCell>
                      <button
                        className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        onClick={() => onEventNameFilterChange(event.event_name)}
                        title={`Filter by ${event.event_name}`}
                      >
                        {event.event_name}
                      </button>
                    </TableCell>

                    {/* Dimension values */}
                    {visibleCols.map((col) => {
                      const raw = col.extractValue(props)
                      const strVal = raw != null && raw !== '' ? String(raw) : null
                      return (
                        <TableCell key={col.id}>
                          {strVal ? (
                            <button
                              className="text-xs px-2 py-0.5 rounded-full bg-accent hover:bg-accent/70 text-foreground transition-colors"
                              onClick={() => onColumnFilterChange(col.id, strVal)}
                              title={`Filter by ${strVal}`}
                            >
                              {strVal}
                            </button>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </TableCell>
                      )
                    })}

                    {/* Timestamp */}
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {event.timestamp
                        ? format(new Date(event.timestamp), 'MMM d, yyyy HH:mm:ss')
                        : '—'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {total === 0
            ? 'No events'
            : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} events`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs px-2.5 py-1 rounded border border-border/50 bg-muted/30 tabular-nums min-w-[60px] text-center">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
