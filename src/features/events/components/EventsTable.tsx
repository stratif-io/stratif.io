import { useEffect, useCallback, useRef, useMemo } from 'react'
import { format } from 'date-fns'
import { AgGridReact } from 'ag-grid-react'
import { AllEnterpriseModule, LicenseManager, ModuleRegistry } from 'ag-grid-enterprise'
import { useAgGridTheme } from '@/lib/ag-grid-theme'
import type {
  CellClickedEvent,
  ColDef,
  ColumnState,
  FilterChangedEvent,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  SortChangedEvent,
} from 'ag-grid-community'
import { User, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FilterField, CustomProperty } from '@/types'

ModuleRegistry.registerModules([AllEnterpriseModule])
LicenseManager.setLicenseKey('')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RawEvent {
  event_id: string
  user_id: string
  event_name: string
  timestamp: string
  properties?: Record<string, unknown>
}

export interface EventsTableProps {
  data: RawEvent[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  isFetching?: boolean
  sortField: string
  sortOrder: 'asc' | 'desc'
  onSortChange: (field: string, order: 'asc' | 'desc') => void
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
}

function buildDimensionColumns(
  filterFields: FilterField[],
  customProperties: CustomProperty[],
  filterOptions: Record<string, string[]>
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
    })
  }

  for (const ff of filterFields) {
    if (!seen.has(ff.field) && !STANDARD.has(ff.field)) {
      seen.add(ff.field)
      result.push({
        id: ff.field,
        label: ff.label,
        extractValue: (props) => props[ff.field],
      })
    }
  }

  // filterOptions consumed by caller; kept in signature for API compat
  void filterOptions

  return result
}

function loadStoredColumnState(key: string): ColumnState[] | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as ColumnState[]) : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Cell renderers (display only — clicks handled via onCellClicked)
// ---------------------------------------------------------------------------

function UserIdCellRenderer(params: ICellRendererParams) {
  const userId = String(params.value ?? '')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: '100%' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'inherit' }}>{userId}</span>
      <User size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
    </div>
  )
}

function EventNameCellRenderer(params: ICellRendererParams) {
  const name = String(params.data?.event_name ?? '')
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary cursor-pointer">
      {name}
    </span>
  )
}

function DimValueCellRenderer(params: ICellRendererParams) {
  const strVal = params.value != null && params.value !== '' ? String(params.value) : null
  if (!strVal) return <span style={{ opacity: 0.3, fontSize: 12 }}>—</span>
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-foreground cursor-pointer">
      {strVal}
    </span>
  )
}

// ---------------------------------------------------------------------------
// EventsTable
// ---------------------------------------------------------------------------

export function EventsTable({
  data,
  total,
  page,
  pageSize,
  loading,
  sortField,
  sortOrder,
  onSortChange,
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
  const gridTheme = useAgGridTheme()
  const storageKey = `of_events_colstate_v2_${connectionId ?? 'default'}`
  const gridApiRef = useRef<GridApi | null>(null)
  // Guard to only apply initial column state once per storageKey (not on every allDimCols recompute)
  const columnStateAppliedRef = useRef<string | null>(null)
  // Stable refs for filter values — updated every render but never trigger columnDefs recompute
  const allEventNamesRef = useRef(allEventNames)
  allEventNamesRef.current = allEventNames
  const filterOptionsRef = useRef(filterOptions)
  filterOptionsRef.current = filterOptions
  // Stable ref for allDimCols — initialized empty, updated after useMemo below
  const allDimColsRef = useRef<DimensionColumn[]>([])
  // Stable ref for rowData — ensures every visible cell value is available in Set Filter
  const rowDataRef = useRef<Record<string, unknown>[]>([])

  // filterOptions intentionally excluded — it changes reference every render but
  // DimensionColumn no longer carries filterOptions, so it doesn't affect the result
  const allDimCols = useMemo(
    () => buildDimensionColumns(filterFields, customProperties, filterOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterFields, customProperties]
  )
  allDimColsRef.current = allDimCols

  const persistColumnState = useCallback(
    (api: GridApi) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(api.getColumnState()))
      } catch {}
    },
    [storageKey]
  )

  const handleGridReady = useCallback(
    (e: GridReadyEvent) => {
      gridApiRef.current = e.api
      const saved = loadStoredColumnState(storageKey)
      if (saved) {
        e.api.applyColumnState({ state: saved, applyOrder: true })
      } else {
        // No saved state: hide all dim cols by default
        e.api.applyColumnState({
          state: allDimColsRef.current.map((c) => ({ colId: c.id, hide: true })),
          applyOrder: false,
        })
      }
      columnStateAppliedRef.current = storageKey
    },
    [storageKey]
  )

  // Re-apply saved state only when the connection (storageKey) changes — not on allDimCols recompute
  useEffect(() => {
    const api = gridApiRef.current
    if (!api || columnStateAppliedRef.current === storageKey) return
    const saved = loadStoredColumnState(storageKey)
    if (saved) {
      api.applyColumnState({ state: saved, applyOrder: true })
    } else {
      api.applyColumnState({
        state: allDimColsRef.current.map((c) => ({ colId: c.id, hide: true })),
      })
    }
    columnStateAppliedRef.current = storageKey
  }, [storageKey])

  const handleColumnVisible = useCallback(() => {
    if (gridApiRef.current) persistColumnState(gridApiRef.current)
  }, [persistColumnState])

  const handleColumnMoved = useCallback(() => {
    if (gridApiRef.current) persistColumnState(gridApiRef.current)
  }, [persistColumnState])

  const handleSortChanged = useCallback(
    (e: SortChangedEvent) => {
      const sorted = e.api.getColumnState().find((c) => c.sort != null)
      if (sorted?.colId && sorted.sort) {
        onSortChange(sorted.colId, sorted.sort as 'asc' | 'desc')
      }
    },
    [onSortChange]
  )

  const handleFilterChanged = useCallback(
    (e: FilterChangedEvent) => {
      const model = e.api.getFilterModel() as Record<string, { filter?: string; values?: string[] }> | null
      // user_id: text filter (contains)
      onUserIdFilterChange(model?.user_id?.filter ?? '')
      // event_name: set filter (multi-value joined with |)
      const enVals = model?.event_name?.values
      onEventNameFilterChange(enVals && enVals.length ? enVals.join('|') : '')
      // dim cols are managed via direct state (cell click / badge clear) — not via AG Grid filter model
    },
    [onUserIdFilterChange, onEventNameFilterChange]
  )

  const rowData = useMemo(
    () =>
      data.map((event) => {
        const props = parseProperties(event.properties)
        const row: Record<string, unknown> = {}
        for (const col of allDimCols) {
          row[col.id] = col.extractValue(props)
        }
        // Set core fields last so dim cols can never overwrite them
        row.event_id = event.event_id
        row.user_id = event.user_id
        row.event_name = event.event_name
        row.timestamp = event.timestamp
        return row
      }),
    [data, allDimCols]
  )
  rowDataRef.current = rowData

  const handleCellClicked = useCallback(
    (e: CellClickedEvent) => {
      const field = e.colDef.field
      const api = gridApiRef.current
      if (field === 'user_id') {
        const uid = String(e.value ?? '')
        if (uid) onUserClick(uid)
      } else if (field === 'event_name') {
        const name = String(e.data?.event_name ?? '')
        if (!name || !api) return
        const current = (api.getFilterModel() ?? {}) as Record<string, unknown>
        api.setFilterModel({ ...current, event_name: { filterType: 'set', values: [name] } })
      } else if (field && e.value != null && e.value !== '') {
        // Dim cols: call parent state directly — Set Filter validation cannot interfere
        onColumnFilterChange(field, String(e.value))
      }
    },
    [onUserClick, onColumnFilterChange]
  )

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'user_id',
        headerName: 'User ID',
        width: 220,
        sortable: true,
        sort: sortField === 'user_id' ? sortOrder : null,
        cellRenderer: UserIdCellRenderer,
        filter: 'agTextColumnFilter',
        filterParams: { filterOptions: ['contains'], maxNumConditions: 1, debounceMs: 400 },
      },
      {
        field: 'event_name',
        headerName: 'Event Name',
        width: 180,
        sortable: true,
        sort: sortField === 'event_name' ? sortOrder : null,
        cellRenderer: EventNameCellRenderer,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: (p: { success: (v: string[]) => void }) => p.success(allEventNamesRef.current),
        },
      },
      ...allDimCols.map<ColDef>((col) => ({
        field: col.id,
        headerName: col.label,
        minWidth: 140,
        sortable: false,
        cellRenderer: DimValueCellRenderer,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: (p: { success: (v: string[]) => void }) => {
            // Merge backend suggestions with every value visible in current rows
            const preset = filterOptionsRef.current[col.id] ?? []
            const fromRows = rowDataRef.current
              .map((r) => r[col.id])
              .filter((v) => v != null && v !== '')
              .map(String)
            const merged = Array.from(new Set([...preset, ...fromRows])).sort()
            p.success(merged)
          },
        },
      })),
      {
        field: 'timestamp',
        headerName: 'Timestamp',
        width: 210,
        sortable: true,
        sort: sortField === 'timestamp' ? sortOrder : null,
        filter: false,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value as string), 'MMM d, yyyy HH:mm:ss') : '—',
        cellClass: 'text-xs text-muted-foreground tabular-nums',
      },
    ],
    [allDimCols, sortField, sortOrder]
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const activeFilterCount =
    (eventNameFilter ? 1 : 0) +
    (userIdFilter ? 1 : 0) +
    Object.values(columnFilters).filter(Boolean).length

  return (
    <div className="flex flex-col">
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
          {eventNameFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              event: {eventNameFilter}
              <button
                onClick={() => {
                  const api = gridApiRef.current
                  if (api) { const m = { ...(api.getFilterModel() ?? {}) }; delete m.event_name; api.setFilterModel(Object.keys(m).length ? m : null) }
                }}
                className="hover:opacity-70" aria-label="Clear event filter"
              >
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          )}
          {userIdFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              user: {userIdFilter}
              <button
                onClick={() => {
                  const api = gridApiRef.current
                  if (api) { const m = { ...(api.getFilterModel() ?? {}) }; delete m.user_id; api.setFilterModel(Object.keys(m).length ? m : null) }
                }}
                className="hover:opacity-70" aria-label="Clear user filter"
              >
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          )}
          {Object.entries(columnFilters).map(([field, value]) =>
            value ? (
              <span
                key={field}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-foreground text-xs font-medium"
              >
                {field}: {value}
                <button
                  onClick={() => onColumnFilterClear(field)}
                  className="hover:opacity-70" aria-label={`Clear ${field} filter`}
                >
                  <X className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
              </span>
            ) : null
          )}
        </div>
      )}

      <div style={{ height: 'calc(100vh - 196px)' }}>
        <AgGridReact
          theme={gridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          onGridReady={handleGridReady}
          onSortChanged={handleSortChanged}
          onCellClicked={handleCellClicked}
          onFilterChanged={handleFilterChanged}
          onColumnVisible={handleColumnVisible}
          onColumnMoved={handleColumnMoved}
          sideBar={{
            toolPanels: [
              {
                id: 'columns',
                labelDefault: 'Columns',
                labelKey: 'columns',
                iconKey: 'columns',
                toolPanel: 'agColumnsToolPanel',
                toolPanelParams: {
                  suppressRowGroups: true,
                  suppressValues: true,
                  suppressPivots: true,
                  suppressPivotMode: true,
                },
              },
            ],
          }}
          suppressPaginationPanel
          rowHeight={40}
          headerHeight={44}
          loading={loading}
          defaultColDef={{
            resizable: true,
            floatingFilter: true,
            suppressHeaderMenuButton: true,
            suppressHeaderFilterButton: true,
          }}
        />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t">
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
            aria-label="First page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
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
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
