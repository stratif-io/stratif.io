import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table'
import { format } from 'date-fns'
import { User, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FilterBar } from '@/components/shared/FilterBar'
import { FilterSelect } from '@/components/FilterSelect'
import { Pagination } from '@/components/shared/Pagination'
import { DataTable } from '@/components/data-table/DataTable'
import { Spinner } from '@/components/ui/spinner'
import type { EventsTableProps, FilterField, CustomProperty } from './types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseProperties(raw: unknown): Record<string, unknown> {
  if (raw == null) return {}
  if (Array.isArray(raw)) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      return Array.isArray(p) ? {} : typeof p === 'object' && p !== null ? p : {}
    } catch {
      return {}
    }
  }
  return {}
}

function extractFromPath(props: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  const keys = parts[0] === 'properties' ? parts.slice(1) : parts
  let cur: unknown = props
  for (const key of keys) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

interface DimCol {
  id: string
  label: string
  getValue: (props: Record<string, unknown>) => unknown
}

function buildDimCols(fields: FilterField[], custom: CustomProperty[]): DimCol[] {
  const seen = new Set<string>()
  const STANDARD = new Set(['user_id', 'event_name', 'timestamp', 'session_id'])
  const result: DimCol[] = []
  for (const cp of custom) {
    seen.add(cp.name)
    result.push({
      id: cp.name,
      label: cp.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      getValue: (p) => extractFromPath(p, cp.path),
    })
  }
  for (const ff of fields) {
    if (!seen.has(ff.field) && !STANDARD.has(ff.field)) {
      seen.add(ff.field)
      result.push({ id: ff.field, label: ff.label, getValue: (p) => p[ff.field] })
    }
  }
  return result
}

/** Default visibility: show core cols + filter fields; hide custom properties. */
function defaultVisibility(dimCols: DimCol[], filterFields: FilterField[]): VisibilityState {
  const filterFieldIds = new Set(filterFields.map((f) => f.field))
  const state: VisibilityState = {}
  for (const col of dimCols) {
    state[col.id] = filterFieldIds.has(col.id)
  }
  return state
}

const COL_VISIBILITY_VERSION = 'v3'
function loadColVisibility(key: string): VisibilityState | null {
  try {
    const versionKey = `${key}_ver`
    if (localStorage.getItem(versionKey) !== COL_VISIBILITY_VERSION) {
      localStorage.removeItem(key)
      localStorage.setItem(versionKey, COL_VISIBILITY_VERSION)
      return null
    }
    const r = localStorage.getItem(key)
    return r ? (JSON.parse(r) as VisibilityState) : null
  } catch {
    return null
  }
}

function saveColVisibility(key: string, state: VisibilityState) {
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

// ── EventsTable ─────────────────────────────────────────────────────────────

export function EventsTable({
  data,
  total,
  page,
  pageSize,
  loading,
  isFetching,
  sortField,
  sortOrder,
  onSortChange,
  filterFields,
  customProperties,
  filterOptions,
  allEventNames,
  columnFilters,
  onColumnFilterChange,
  onColumnFilterClear,
  eventNameFilter,
  onEventNameFilterChange,
  userIdFilter,
  onUserIdFilterChange,
  onPageChange,
  onUserClick,
  connectionId,
}: EventsTableProps) {
  const storageKey = `of_events_colstate_v2_${connectionId ?? 'default'}`
  const [userIdInput, setUserIdInput] = useState(userIdFilter)
  const dimCols = useMemo(
    () => buildDimCols(filterFields, customProperties),
    [filterFields, customProperties],
  )
  const [colVisibility, setColVisibility] = useState<VisibilityState>(
    () => loadColVisibility(storageKey) ?? defaultVisibility(dimCols, filterFields),
  )

  // Re-apply saved (or default) visibility when storageKey or dimCols changes.
  const dimColsLengthRef = useRef(dimCols.length)
  useEffect(() => {
    if (dimCols.length === 0) return
    if (dimCols.length === dimColsLengthRef.current && dimColsLengthRef.current !== 0) return
    dimColsLengthRef.current = dimCols.length
    const saved = loadColVisibility(storageKey)
    setColVisibility(saved ?? defaultVisibility(dimCols, filterFields))
  }, [storageKey, dimCols, filterFields])

  // Per-dim-col input state for inline filters
  const [dimFilterInputs, setDimFilterInputs] = useState<Record<string, string>>(
    () => ({ ...columnFilters }),
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dimDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    setUserIdInput(userIdFilter)
  }, [userIdFilter])
  useEffect(() => {
    setDimFilterInputs((prev) => ({ ...prev, ...columnFilters }))
  }, [columnFilters])

  const rowData = useMemo(
    () =>
      data.map((event) => {
        const props = parseProperties(event.properties)
        const row: Record<string, unknown> = {
          event_id: event.event_id,
          user_id: event.user_id,
          event_name: event.event_name,
          timestamp: event.timestamp,
        }
        for (const col of dimCols) row[col.id] = col.getValue(props)
        return row
      }),
    [data, dimCols],
  )

  const handleUserClick = useCallback(
    (uid: string) => {
      if (uid) onUserClick(uid)
    },
    [onUserClick],
  )
  const handleEventNameFilter = useCallback(
    (name: string) =>
      onEventNameFilterChange(
        eventNameFilter.includes(name)
          ? eventNameFilter.filter((n) => n !== name)
          : [...eventNameFilter, name],
      ),
    [onEventNameFilterChange, eventNameFilter],
  )
  const handleDimFilter = useCallback(
    (field: string, val: string) => onColumnFilterChange(field, val),
    [onColumnFilterChange],
  )

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => [
      {
        id: 'user_id',
        accessorKey: 'user_id',
        header: 'User ID',
        size: 220,
        enableSorting: true,
        cell: ({ getValue }) => {
          const v = String(getValue() ?? '')
          return (
            <div
              className="flex items-center gap-1.5 h-full cursor-pointer"
              onClick={() => handleUserClick(v)}
            >
              <span className="font-mono text-xs">{v}</span>
              <User size={11} className="opacity-40 shrink-0" />
            </div>
          )
        },
      },
      {
        id: 'event_name',
        accessorKey: 'event_name',
        header: 'Event Name',
        size: 180,
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = String(getValue() ?? '')
          return (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary cursor-pointer"
              onClick={() => handleEventNameFilter(name)}
            >
              {name}
            </span>
          )
        },
      },
      ...dimCols.map<ColumnDef<Record<string, unknown>>>((col) => ({
        id: col.id,
        accessorKey: col.id,
        header: col.label,
        size: 150,
        enableSorting: false,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const v = getValue()
          if (v == null || v === '') return <span className="opacity-30 text-xs">—</span>
          const str = String(v)
          return (
            <span
              className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground cursor-pointer"
              onClick={() => handleDimFilter(col.id, str)}
            >
              {str}
            </span>
          )
        },
      })),
      {
        id: 'timestamp',
        accessorKey: 'timestamp',
        header: 'Timestamp',
        size: 210,
        enableSorting: true,
        cell: ({ getValue }) => {
          const v = getValue() as string
          return (
            <span className="text-xs text-muted-foreground tabular-nums">
              {v ? format(new Date(v), 'MMM d, yyyy HH:mm:ss') : '—'}
            </span>
          )
        },
      },
    ],
    [dimCols, handleUserClick, handleEventNameFilter, handleDimFilter],
  )

  const [sorting, setSorting] = useState<SortingState>([{ id: sortField, desc: sortOrder === 'desc' }])

  const handleSortingChange = useCallback(
    (next: SortingState) => {
      setSorting(next)
      if (next.length > 0) onSortChange(next[0].id, next[0].desc ? 'desc' : 'asc')
    },
    [onSortChange],
  )

  const handleColumnVisibilityChange = useCallback(
    (next: VisibilityState) => {
      setColVisibility(next)
      saveColVisibility(storageKey, next)
    },
    [storageKey],
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const activeFilters = [
    ...eventNameFilter.map((name) => ({
      label: 'event',
      value: name,
      onClear: () => onEventNameFilterChange(eventNameFilter.filter((n) => n !== name)),
    })),
    ...(userIdFilter
      ? [{ label: 'user', value: userIdFilter, onClear: () => onUserIdFilterChange('') }]
      : []),
    ...Object.entries(columnFilters)
      .filter(([, v]) => v)
      .map(([field, value]) => ({
        label: field,
        value,
        onClear: () => {
          onColumnFilterClear(field)
          setDimFilterInputs((prev) => {
            const next = { ...prev }
            delete next[field]
            return next
          })
        },
      })),
  ]

  // Filter controls rendered in the toolbar
  const filterToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {isFetching && <Spinner className="h-3.5 w-3.5" />}
      {/* User ID filter */}
      <input
        type="text"
        placeholder="Filter by user ID…"
        value={userIdInput}
        onChange={(e) => {
          setUserIdInput(e.target.value)
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => onUserIdFilterChange(e.target.value), 400)
        }}
        className="h-7 text-xs px-2 rounded border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-44"
      />
      {/* Event name filter */}
      <FilterSelect
        mode="multi"
        searchable={true}
        size="sm"
        value={eventNameFilter}
        onChange={(v) => onEventNameFilterChange(v as string[])}
        options={allEventNames.map((name) => ({ value: name, label: name }))}
        placeholder="All events"
        className="w-40"
      />
      {/* Dim col filters */}
      {dimCols
        .filter((col) => colVisibility[col.id] !== false)
        .map((col) => {
          const colId = col.id
          const active = columnFilters[colId]
          const suggestions = filterOptions[colId] ?? []
          const isLowCardinality = suggestions.length > 0 && suggestions.length < 200
          const inputVal = dimFilterInputs[colId] ?? ''

          const applyFilter = (val: string) => {
            if (dimDebounceRefs.current[colId]) clearTimeout(dimDebounceRefs.current[colId])
            if (val) onColumnFilterChange(colId, val)
            else onColumnFilterClear(colId)
          }

          return (
            <div key={colId} className="relative flex items-center">
              {isLowCardinality ? (
                <Select
                  value={active ?? '__all__'}
                  onValueChange={(v) => applyFilter(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="h-7 text-xs w-32" aria-label={`Filter ${col.label}`}>
                    <SelectValue placeholder={`All ${col.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All {col.label}</SelectItem>
                    {[...suggestions]
                      .sort((a, b) => a.localeCompare(b))
                      .map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder={`${col.label}… (Enter)`}
                    value={inputVal}
                    onChange={(e) =>
                      setDimFilterInputs((prev) => ({ ...prev, [colId]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyFilter(inputVal)
                    }}
                    onBlur={() => {
                      if (inputVal !== (active ?? '')) applyFilter(inputVal)
                    }}
                    className={cn(
                      'h-7 text-xs px-2 rounded border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-32',
                      active ? 'pr-5' : 'pr-5',
                    )}
                  />
                  {active ? (
                    <button
                      className="absolute right-1 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        onColumnFilterClear(colId)
                        setDimFilterInputs((prev) => {
                          const next = { ...prev }
                          delete next[colId]
                          return next
                        })
                      }}
                      aria-label={`Clear ${colId} filter`}
                    >
                      <X size={10} />
                    </button>
                  ) : (
                    <Filter size={10} className="absolute right-1.5 opacity-20 pointer-events-none" />
                  )}
                </>
              )}
            </div>
          )
        })}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="px-4 pt-2">
          <FilterBar filters={activeFilters} />
        </div>
      )}

      {/* Table via DataTable primitive */}
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={rowData}
          isLoading={loading}
          emptyMessage="No events found."
          showSearch={false}
          showPagination={false}
          showRowSelection={false}
          showRowActions={false}
          showColumnVisibility={true}
          state={{
            sorting,
            columnVisibility: colVisibility,
          }}
          onSortingChange={handleSortingChange}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          toolbarActions={filterToolbar}
        />
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        from={from}
        to={to}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  )
}
