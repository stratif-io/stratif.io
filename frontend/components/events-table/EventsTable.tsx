import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format } from 'date-fns'
import { User, Columns3, ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FilterBar } from '@/components/shared/FilterBar'
import { Pagination } from '@/components/shared/Pagination'
import { ColumnPanel } from './ColumnPanel'
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
    } catch { return {} }
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

interface DimCol { id: string; label: string; getValue: (props: Record<string, unknown>) => unknown }

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

const ALWAYS_VISIBLE = new Set(['user_id', 'event_name', 'timestamp'])

/** Default visibility: show core cols + any col that has an active column filter. */
function defaultVisibility(dimCols: DimCol[], columnFilters: Record<string, string>): VisibilityState {
  const state: VisibilityState = {}
  for (const col of dimCols) {
    state[col.id] = col.id in columnFilters && !!columnFilters[col.id]
  }
  return state
}

function loadColVisibility(key: string): VisibilityState | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as VisibilityState : null } catch { return null }
}

function saveColVisibility(key: string, state: VisibilityState) {
  try { localStorage.setItem(key, JSON.stringify(state)) } catch {}
}

const ROW_HEIGHT_PX = 40

// ── EventsTable ─────────────────────────────────────────────────────────────

export function EventsTable({
  data, total, page, pageSize, loading, isFetching,
  sortField, sortOrder, onSortChange,
  filterFields, customProperties,
  filterOptions: _filterOptions, // accepted for API compat; dim cols use click-to-filter
  allEventNames,
  columnFilters, onColumnFilterChange, onColumnFilterClear,
  eventNameFilter, onEventNameFilterChange,
  userIdFilter, onUserIdFilterChange,
  onPageChange, onUserClick, connectionId,
}: EventsTableProps) {
  const storageKey = `of_events_colstate_v2_${connectionId ?? 'default'}`
  const [showColumnPanel, setShowColumnPanel] = useState(false)
  const [userIdInput, setUserIdInput] = useState(userIdFilter)
  const dimCols = useMemo(() => buildDimCols(filterFields, customProperties), [filterFields, customProperties])
  const [colVisibility, setColVisibility] = useState<VisibilityState>(
    () => loadColVisibility(storageKey) ?? defaultVisibility(dimCols, columnFilters)
  )
  // Per-dim-col input state for inline header filters
  const [dimFilterInputs, setDimFilterInputs] = useState<Record<string, string>>(() => ({ ...columnFilters }))
  const parentRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dimDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => { setUserIdInput(userIdFilter) }, [userIdFilter])
  // Sync dim filter inputs when columnFilters reset externally
  useEffect(() => { setDimFilterInputs((prev) => ({ ...prev, ...columnFilters })) }, [columnFilters])

  const rowData = useMemo(() =>
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
    [data, dimCols]
  )

  const handleUserClick = useCallback((uid: string) => { if (uid) onUserClick(uid) }, [onUserClick])
  const handleEventNameFilter = useCallback((name: string) => onEventNameFilterChange(name), [onEventNameFilterChange])
  const handleDimFilter = useCallback((field: string, val: string) => onColumnFilterChange(field, val), [onColumnFilterChange])

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => [
    {
      id: 'user_id', accessorKey: 'user_id', header: 'User ID', size: 220, enableSorting: true,
      cell: ({ getValue }) => {
        const v = String(getValue() ?? '')
        return (
          <div className="flex items-center gap-1.5 h-full cursor-pointer" onClick={() => handleUserClick(v)}>
            <span className="font-mono text-xs">{v}</span>
            <User size={11} className="opacity-40 shrink-0" />
          </div>
        )
      },
    },
    {
      id: 'event_name', accessorKey: 'event_name', header: 'Event Name', size: 180, enableSorting: true,
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
      id: col.id, accessorKey: col.id, header: col.label, size: 150, enableSorting: false,
      cell: ({ getValue }) => {
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
      id: 'timestamp', accessorKey: 'timestamp', header: 'Timestamp', size: 210, enableSorting: true,
      cell: ({ getValue }) => {
        const v = getValue() as string
        return <span className="text-xs text-muted-foreground tabular-nums">{v ? format(new Date(v), 'MMM d, yyyy HH:mm:ss') : '—'}</span>
      },
    },
  ], [dimCols, handleUserClick, handleEventNameFilter, handleDimFilter])

  const [sorting, setSorting] = useState<SortingState>([{ id: sortField, desc: sortOrder === 'desc' }])

  const table = useReactTable({
    data: rowData,
    columns,
    state: { sorting, columnVisibility: colVisibility },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      if (next.length > 0) onSortChange(next[0].id, next[0].desc ? 'desc' : 'asc')
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(colVisibility) : updater
      setColVisibility(next)
      saveColVisibility(storageKey, next)
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  })

  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 10,
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const activeFilters = [
    ...(eventNameFilter ? [{ label: 'event', value: eventNameFilter, onClear: () => onEventNameFilterChange('') }] : []),
    ...(userIdFilter ? [{ label: 'user', value: userIdFilter, onClear: () => onUserIdFilterChange('') }] : []),
    ...Object.entries(columnFilters).filter(([, v]) => v).map(([field, value]) => ({
      label: field, value, onClear: () => {
        onColumnFilterClear(field)
        setDimFilterInputs((prev) => { const next = { ...prev }; delete next[field]; return next })
      },
    })),
  ]

  const columnPanelEntries = table.getAllColumns()
    .filter((col) => !ALWAYS_VISIBLE.has(col.id))
    .map((col) => ({
      id: col.id,
      label: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id,
      visible: col.getIsVisible(),
    }))

  const dimColIds = new Set(dimCols.map((c) => c.id))

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">Events</span>
        <div className="ml-auto relative flex items-center gap-2">
          {isFetching && <Spinner className="h-3.5 w-3.5" />}
          <button
            onClick={() => setShowColumnPanel((s) => !s)}
            className="h-7 text-xs px-2.5 rounded border border-border bg-background hover:bg-accent flex items-center gap-1.5"
            aria-label="Show/hide columns"
          >
            <Columns3 size={13} />
            Columns
          </button>
          {showColumnPanel && (
            <ColumnPanel
              columns={columnPanelEntries}
              onToggle={(id) => table.getColumn(id)?.toggleVisibility()}
              onClose={() => setShowColumnPanel(false)}
            />
          )}
        </div>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="px-4 pt-2">
          <FilterBar filters={activeFilters} />
        </div>
      )}

      {/* Table */}
      <div ref={parentRef} className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <table className="w-full border-collapse text-sm" style={{ opacity: isFetching ? 0.6 : 1 }}>
            <thead className="sticky top-0 z-10 bg-background border-b border-border">
              {/* Sort headers */}
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sortDir = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={cn('px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap', canSort && 'cursor-pointer select-none hover:text-foreground')}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <span className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (sortDir === 'desc' ? <ArrowDown size={11} /> : sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowUpDown size={11} className="opacity-30" />)}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              ))}
              {/* Filter row */}
              {table.getHeaderGroups().map((hg) => (
                <tr key={`${hg.id}-filters`} className="border-b border-border/60 bg-muted/20">
                  {hg.headers.map((header) => {
                    const colId = header.column.id
                    if (colId === 'user_id') {
                      return (
                        <th key={header.id} style={{ width: header.getSize() }} className="px-2 py-1">
                          <input
                            type="text"
                            placeholder="Filter by user ID…"
                            value={userIdInput}
                            onChange={(e) => {
                              setUserIdInput(e.target.value)
                              if (debounceRef.current) clearTimeout(debounceRef.current)
                              debounceRef.current = setTimeout(() => onUserIdFilterChange(e.target.value), 400)
                            }}
                            className="w-full h-6 text-xs px-2 rounded border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </th>
                      )
                    }
                    if (colId === 'event_name') {
                      return (
                        <th key={header.id} style={{ width: header.getSize() }} className="px-2 py-1">
                          <select
                            value={eventNameFilter}
                            onChange={(e) => onEventNameFilterChange(e.target.value)}
                            className="w-full h-6 text-xs px-1 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">All events</option>
                            {allEventNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </th>
                      )
                    }
                    if (dimColIds.has(colId)) {
                      const active = columnFilters[colId]
                      const inputVal = dimFilterInputs[colId] ?? ''
                      return (
                        <th key={header.id} style={{ width: header.getSize() }} className="px-2 py-1">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              placeholder="Filter…"
                              value={inputVal}
                              onChange={(e) => {
                                const val = e.target.value
                                setDimFilterInputs((prev) => ({ ...prev, [colId]: val }))
                                if (dimDebounceRefs.current[colId]) clearTimeout(dimDebounceRefs.current[colId])
                                dimDebounceRefs.current[colId] = setTimeout(() => {
                                  if (val) onColumnFilterChange(colId, val)
                                  else onColumnFilterClear(colId)
                                }, 400)
                              }}
                              className="w-full h-6 text-xs px-2 rounded border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring pr-5"
                            />
                            {active && (
                              <button
                                className="absolute right-1 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  onColumnFilterClear(colId)
                                  setDimFilterInputs((prev) => { const next = { ...prev }; delete next[colId]; return next })
                                }}
                                aria-label={`Clear ${colId} filter`}
                              >
                                <X size={10} />
                              </button>
                            )}
                            {!active && <Filter size={10} className="absolute right-1.5 opacity-20 pointer-events-none" />}
                          </div>
                        </th>
                      )
                    }
                    return <th key={header.id} style={{ width: header.getSize() }} className="px-2 py-1" />
                  })}
                </tr>
              ))}
            </thead>
            <tbody style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const row = rows[vi.index]
                return (
                  <tr
                    key={row.id}
                    style={{ position: 'absolute', top: vi.start, left: 0, width: '100%', height: ROW_HEIGHT_PX }}
                    className="border-b border-border/50 hover:bg-accent/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={{ width: cell.column.getSize() }} className="px-3 overflow-hidden text-ellipsis whitespace-nowrap align-middle h-10">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={onPageChange} />
    </div>
  )
}
