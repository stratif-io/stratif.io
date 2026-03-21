import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table'
import { format } from 'date-fns'
import { User, X } from 'lucide-react'
import { FilterBar } from '@/components/shared/FilterBar'
import { FilterSelect } from '@/components/FilterSelect'
import { Pagination } from '@/components/shared/Pagination'
import { DataTable } from '@/components/data-table/DataTable'
import { Spinner } from '@/components/ui/spinner'
import type { EventsTableProps, FilterField, CustomProperty } from './types'

// ── ColumnTextFilter ─────────────────────────────────────────────────────────

function ColumnTextFilter({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: string
  onChange: (val: string) => void
}) {
  const [local, setLocal] = useState(value)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocal(value) }, [value])

  return (
    <div className="relative flex items-center w-full" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        placeholder={placeholder}
        value={local}
        onChange={(e) => {
          const v = e.target.value
          setLocal(v)
          if (debounce.current) clearTimeout(debounce.current)
          debounce.current = setTimeout(() => onChange(v), 400)
        }}
        className="w-full bg-transparent text-xs font-medium placeholder:text-foreground/70 placeholder:font-medium focus:outline-none min-w-0 pr-4"
      />
      {local && (
        <button
          className="absolute right-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); setLocal(''); onChange('') }}
        >
          <X size={9} />
        </button>
      )}
    </div>
  )
}

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

export interface DimCol {
  id: string
  label: string
  getValue: (props: Record<string, unknown>) => unknown
}

export function buildDimCols(fields: FilterField[], custom: CustomProperty[]): DimCol[] {
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
export function defaultVisibility(dimCols: DimCol[], filterFields: FilterField[]): VisibilityState {
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
  colVisibility: colVisibilityProp,
  onColumnVisibilityChange: onColumnVisibilityChangeProp,
}: EventsTableProps) {
  const storageKey = `of_events_colstate_v2_${connectionId ?? 'default'}`
  const dimCols = useMemo(
    () => buildDimCols(filterFields, customProperties),
    [filterFields, customProperties],
  )
  const [colVisibilityInternal, setColVisibilityInternal] = useState<VisibilityState>(
    () => loadColVisibility(storageKey) ?? defaultVisibility(dimCols, filterFields),
  )
  const colVisibility = colVisibilityProp ?? colVisibilityInternal

  // Re-apply saved (or default) visibility when storageKey or dimCols changes (only if uncontrolled).
  const dimColsLengthRef = useRef(dimCols.length)
  useEffect(() => {
    if (colVisibilityProp != null) return
    if (dimCols.length === 0) return
    if (dimCols.length === dimColsLengthRef.current && dimColsLengthRef.current !== 0) return
    dimColsLengthRef.current = dimCols.length
    const saved = loadColVisibility(storageKey)
    setColVisibilityInternal(saved ?? defaultVisibility(dimCols, filterFields))
  }, [storageKey, dimCols, filterFields, colVisibilityProp])


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
    (field: string, val: string) => {
      const current = columnFilters[field] ?? []
      const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
      if (next.length === 0) onColumnFilterClear(field)
      else onColumnFilterChange(field, next)
    },
    [columnFilters, onColumnFilterChange, onColumnFilterClear],
  )

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => [
      {
        id: 'user_id',
        accessorKey: 'user_id',
        header: () => (
          <ColumnTextFilter
            placeholder="User ID"
            value={userIdFilter}
            onChange={onUserIdFilterChange}
          />
        ),
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
        header: () => (
          <div onClick={(e) => e.stopPropagation()}>
            <FilterSelect
              mode="multi"
              searchable
              size="sm"
              value={eventNameFilter}
              onChange={(v) => onEventNameFilterChange(v as string[])}
              options={allEventNames.map((name) => ({ value: name, label: name }))}
              placeholder="Event Name"
              className="h-6 text-xs border-0 bg-transparent hover:bg-accent/60 -mx-2 font-medium"
            />
          </div>
        ),
        size: 200,
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
      ...dimCols.map<ColumnDef<Record<string, unknown>>>((col) => {
        const suggestions = filterOptions[col.id] ?? []
        const isLowCardinality = suggestions.length > 0 && suggestions.length < 200
        return {
          id: col.id,
          accessorKey: col.id,
          header: () => isLowCardinality ? (
            <div onClick={(e) => e.stopPropagation()}>
              <FilterSelect
                mode="multi"
                searchable={suggestions.length > 8}
                size="sm"
                value={columnFilters[col.id] ?? []}
                onChange={(v) => {
                  const vals = v as string[]
                  if (vals.length === 0) onColumnFilterClear(col.id)
                  else onColumnFilterChange(col.id, vals)
                }}
                options={[...suggestions].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }))}
                placeholder={col.label}
                className="h-6 text-xs border-0 bg-transparent hover:bg-accent/60 -mx-2 font-medium"
              />
            </div>
          ) : (
            <ColumnTextFilter
              placeholder={col.label}
              value={columnFilters[col.id]?.[0] ?? ''}
              onChange={(v) => v ? onColumnFilterChange(col.id, [v]) : onColumnFilterClear(col.id)}
            />
          ),
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
        }
      }),
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
    [dimCols, handleUserClick, handleEventNameFilter, handleDimFilter, allEventNames, eventNameFilter, onEventNameFilterChange, userIdFilter, onUserIdFilterChange, columnFilters, onColumnFilterChange, onColumnFilterClear, filterOptions],
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
      setColVisibilityInternal(next)
      saveColVisibility(storageKey, next)
      onColumnVisibilityChangeProp?.(next)
    },
    [storageKey, onColumnVisibilityChangeProp],
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
      .filter(([, v]) => v?.length)
      .map(([field, values]) => ({
        label: field,
        value: values.join(', '),
        onClear: () => onColumnFilterClear(field),
      })),
  ]

  const filterToolbar = isFetching ? <Spinner className="h-3.5 w-3.5" /> : null

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
          showColumnVisibility={false}
          showExport={false}
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
