import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { AgGridReact } from 'ag-grid-react'
import { AllEnterpriseModule, LicenseManager, ModuleRegistry } from 'ag-grid-enterprise'
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  IServerSideDatasource,
  IServerSideGetRowsParams,
} from 'ag-grid-community'
import { RotateCcw, Download, Loader2, Plus, X, Filter, Sigma } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores'
import { fetchPivotGridColDefs, fetchPivotGridRows, fetchPivotGridFilterValues, fetchFilterConfig } from '@/lib/api'
import { useAgGridTheme } from '@/lib/ag-grid-theme'

ModuleRegistry.registerModules([AllEnterpriseModule])
LicenseManager.setLicenseKey('')

// ─── Formatting ────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDimValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (field === 'ts_year') return String(value)
  if (field === 'ts_quarter') return `Q${value}`
  if (field === 'ts_month') {
    try {
      const d = new Date(String(value))
      return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    } catch {
      return String(value)
    }
  }
  if (field === 'ts_week') {
    try {
      const d = new Date(String(value))
      const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
      const w = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getUTCDay() + 1) / 7)
      return `W${w} ${d.getUTCFullYear()}`
    } catch {
      return String(value)
    }
  }
  if (field === 'ts_date') {
    try {
      return format(new Date(String(value)), 'MMM d, yyyy')
    } catch {
      return String(value)
    }
  }
  if (field === 'ts_hour') return `${String(value).padStart(2, '0')}:00`
  if (field === 'day_of_week' && typeof value === 'number') return DAY_NAMES[value] ?? String(value)
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}


// ─── Types ─────────────────────────────────────────────────────────────────

type ZoneCol = { colId: string; label: string; aggFunc?: string }
type LeafMeta = {
  colId: string
  label: string
  enableRowGroup: boolean
  enablePivot: boolean
  enableValue: boolean
  allowedAggFuncs?: string[]
}
type FilterEntry = { field: string; fieldLabel: string; value: string }

const AGG_LABELS: Record<string, string> = {
  sum: 'Σ',
  count: 'n',
  avg: 'avg',
  min: 'min',
  max: 'max',
  countDistinct: '#',
}

// ─── Main page ─────────────────────────────────────────────────────────────

export function NewPivotPage() {
  const { dateRange, activeFilters, activeConnectionId, setActiveFilter } = useAppStore()
  const gridTheme = useAgGridTheme()
  const [isQuerying, setIsQuerying] = useState(false)
  const [showSubtotals, setShowSubtotals] = useState(false)
  const gridApiRef = useRef<GridApi | null>(null)

  // Column zone state, synced from grid events
  const [rowGroups, setRowGroups] = useState<ZoneCol[]>([])
  const [pivotCols, setPivotCols] = useState<ZoneCol[]>([])
  const [valueCols, setValueCols] = useState<ZoneCol[]>([])

  // aggFunc overrides: colId → aggFunc (source of truth for datasource)
  const aggFuncOverridesRef = useRef<Record<string, string>>({})

  // Dimension filters (field → value)
  const [pivotFilters, setPivotFilters] = useState<FilterEntry[]>([])

  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  const { data: colDefsData, isLoading: colDefsLoading } = useQuery({
    queryKey: ['pivot-grid-col-defs', activeConnectionId],
    queryFn: () => fetchPivotGridColDefs(activeConnectionId ?? undefined),
  })

  const { data: filterConfig } = useQuery({
    queryKey: ['filter-config', activeConnectionId],
    queryFn: () => fetchFilterConfig(activeConnectionId!),
    enabled: !!activeConnectionId,
  })

  // Strip URL params that aren't valid filter fields for this connection
  const validFilterIds = useMemo(
    () => new Set((filterConfig?.filter_fields ?? []).map((f) => f.field)),
    [filterConfig],
  )

  useEffect(() => {
    if (!filterConfig) return
    Object.keys(activeFilters).forEach((key) => {
      if (!validFilterIds.has(key)) setActiveFilter(key, null)
    })
  }, [filterConfig])

  // Only pass filters that are valid for this connection
  const validActiveFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(activeFilters).filter(([key]) => validFilterIds.has(key)),
      ),
    [activeFilters, validFilterIds],
  )

  const requestParamsRef = useRef({
    startDate,
    endDate,
    activeFilters: validActiveFilters,
    activeConnectionId,
    pivotFilters,
  })
  requestParamsRef.current = { startDate, endDate, activeFilters: validActiveFilters, activeConnectionId, pivotFilters }

  // ── Flatten column defs into leaf metadata ──────────────────────────────
  const leafCols = useMemo<LeafMeta[]>(() => {
    const result: LeafMeta[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (cols: any[]) => {
      cols.forEach((c) => {
        if (c.children) walk(c.children)
        else if (c.field)
          result.push({
            colId: c.field,
            label: c.headerName ?? c.field,
            enableRowGroup: !!c.enableRowGroup,
            enablePivot: !!c.enablePivot,
            enableValue: !!c.enableValue,
            allowedAggFuncs: c.allowedAggFuncs,
          })
      })
    }
    walk(colDefsData?.columnDefs ?? [])
    return result
  }, [colDefsData?.columnDefs])

  // ── Sync column zones from grid API ────────────────────────────────────
  const syncFromApi = useCallback((api: GridApi) => {
    setRowGroups(
      api.getRowGroupColumns().map((c) => ({
        colId: c.getColId(),
        label: c.getColDef().headerName ?? c.getColId(),
      }))
    )
    setPivotCols(
      api.getPivotColumns().map((c) => ({
        colId: c.getColId(),
        label: c.getColDef().headerName ?? c.getColId(),
      }))
    )
    setValueCols(
      api.getValueColumns().map((c) => {
        const colId = c.getColId()
        return {
          colId,
          label: c.getColDef().headerName ?? colId,
          aggFunc: aggFuncOverridesRef.current[colId] ?? String(c.getAggFunc() ?? 'sum'),
        }
      })
    )
  }, [])

  const handleColEvent = useCallback((e: { api: GridApi }) => syncFromApi(e.api), [syncFromApi])

  // ── Available columns per zone ──────────────────────────────────────────
  const rowGroupIds = useMemo(() => new Set(rowGroups.map((c) => c.colId)), [rowGroups])
  const pivotColIds = useMemo(() => new Set(pivotCols.map((c) => c.colId)), [pivotCols])
  const valueColIds = useMemo(() => new Set(valueCols.map((c) => c.colId)), [valueCols])
  const filterFieldIds = useMemo(() => new Set(pivotFilters.map((f) => f.field)), [pivotFilters])

  const availForRowGroup = useMemo(
    () => leafCols.filter((c) => c.enableRowGroup && !rowGroupIds.has(c.colId)),
    [leafCols, rowGroupIds]
  )
  const availForPivot = useMemo(
    () =>
      leafCols.filter(
        (c) => c.enablePivot && !pivotColIds.has(c.colId) && !rowGroupIds.has(c.colId)
      ),
    [leafCols, pivotColIds, rowGroupIds]
  )
  const availForValues = useMemo(
    () => leafCols.filter((c) => c.enableValue && !valueColIds.has(c.colId)),
    [leafCols, valueColIds]
  )
  const availForFilter = useMemo(
    () => leafCols.filter((c) => c.enableRowGroup && !filterFieldIds.has(c.colId)),
    [leafCols, filterFieldIds]
  )

  // ── Zone actions ────────────────────────────────────────────────────────
  const addRowGroup = useCallback((colId: string) => {
    gridApiRef.current?.addRowGroupColumns([colId])
  }, [])
  const removeRowGroup = useCallback((colId: string) => {
    gridApiRef.current?.removeRowGroupColumns([colId])
  }, [])
  const addPivotCol = useCallback((colId: string) => {
    gridApiRef.current?.addPivotColumns([colId])
  }, [])
  const removePivotCol = useCallback((colId: string) => {
    gridApiRef.current?.removePivotColumns([colId])
  }, [])
  const removeValueCol = useCallback((colId: string) => {
    delete aggFuncOverridesRef.current[colId]
    gridApiRef.current?.removeValueColumns([colId])
  }, [])
  const addValueCol = useCallback(
    (colId: string) => {
      const col = leafCols.find((c) => c.colId === colId)
      const defaultAgg =
        col?.allowedAggFuncs?.includes('countDistinct') && !col.allowedAggFuncs.includes('sum')
          ? 'countDistinct'
          : 'sum'
      aggFuncOverridesRef.current[colId] = defaultAgg
      gridApiRef.current?.addValueColumns([colId])
      if (defaultAgg === 'countDistinct') {
        setTimeout(() => {
          gridApiRef.current?.applyColumnState({ state: [{ colId, aggFunc: 'countDistinct' }] })
        }, 30)
      }
    },
    [leafCols]
  )

  // ── aggFunc change ──────────────────────────────────────────────────────
  // We store aggFunc in a ref so the datasource always reads the latest value
  // regardless of whether applyColumnState has committed to AG Grid's internal
  // state yet. applyColumnState is still called so the grid UI reflects the
  // change, but the datasource overrides request.valueCols[i].aggFunc from ref.
  const changeValueAggFunc = useCallback((colId: string, aggFunc: string) => {
    aggFuncOverridesRef.current[colId] = aggFunc
    setValueCols((prev) => prev.map((c) => (c.colId === colId ? { ...c, aggFunc } : c)))
    gridApiRef.current?.applyColumnState({ state: [{ colId, aggFunc }] })
    gridApiRef.current?.refreshServerSide({ purge: true })
  }, [])

  // ── Look up allowed agg funcs for a value column ────────────────────────
  const getAllowedAggFuncs = useCallback(
    (colId: string): string[] => {
      const leaf = leafCols.find((c) => c.colId === colId)
      if (leaf?.allowedAggFuncs) return leaf.allowedAggFuncs
      return ['sum', 'min', 'max', 'avg', 'count']
    },
    [leafCols]
  )

  // ── Filter actions ──────────────────────────────────────────────────────
  const addFilter = useCallback((field: string, fieldLabel: string, value: string) => {
    setPivotFilters((prev) => {
      const existing = prev.findIndex((f) => f.field === field)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = { field, fieldLabel, value }
        return updated
      }
      return [...prev, { field, fieldLabel, value }]
    })
  }, [])
  const removeFilter = useCallback((field: string) => {
    setPivotFilters((prev) => prev.filter((f) => f.field !== field))
  }, [])

  // ── enrichColDef ────────────────────────────────────────────────────────
  const enrichColDef = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (col: any): ColDef => {
      if (col.children) return { ...col, children: col.children.map(enrichColDef) }
      const field: string = col.field ?? ''
      const base: ColDef = {
        ...col,
        valueFormatter: ({ value }: { value: unknown }) => formatDimValue(field, value),
      }
      if (field) {
        base.filter = 'agSetColumnFilter'
        base.filterParams = {
          values: (params: { success: (v: unknown[]) => void }) => {
            const { startDate, endDate } = requestParamsRef.current
            fetchPivotGridFilterValues({
              field,
              start_date: startDate,
              end_date: endDate,
              connection_id: activeConnectionId ?? undefined,
            })
              .then((d) => params.success(d.values))
              .catch(() => params.success([]))
          },
          valueFormatter: ({ value }: { value: unknown }) => formatDimValue(field, value),
          searchType: 'contains',
          refreshValuesOnOpen: true,
        }
      }
      return base
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeConnectionId]
  )

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!colDefsData?.columnDefs) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (colDefsData.columnDefs as any[]).map(enrichColDef)
  }, [colDefsData?.columnDefs, enrichColDef])

  // ── SSRM datasource ─────────────────────────────────────────────────────
  const datasource = useMemo<IServerSideDatasource>(
    () => ({
      getRows(params: IServerSideGetRowsParams) {
        setIsQuerying(true)
        const { startDate, endDate, activeFilters, activeConnectionId, pivotFilters } =
          requestParamsRef.current
        const { request } = params

        // Merge app-level filters with pivot-specific filters
        const mergedFilters: Record<string, string | null> = {
          ...(activeFilters ?? {}),
          ...Object.fromEntries(pivotFilters.map((f) => [f.field, f.value])),
        }

        fetchPivotGridRows({
          rowGroupCols: request.rowGroupCols.map((c) => ({
            id: c.id,
            field: c.field ?? '',
            aggFunc: c.aggFunc ?? 'sum',
            displayName: c.displayName ?? '',
          })),
          valueCols: request.valueCols.map((c) => ({
            id: c.id,
            field: c.field ?? '',
            aggFunc: aggFuncOverridesRef.current[c.id] ?? c.aggFunc ?? 'sum',
            displayName: c.displayName ?? '',
          })),
          pivotCols: request.pivotCols.map((c) => ({
            id: c.id,
            field: c.field ?? '',
            aggFunc: c.aggFunc ?? 'sum',
            displayName: c.displayName ?? '',
          })),
          pivotMode: request.pivotMode ?? false,
          groupKeys: request.groupKeys,
          filterModel: (request.filterModel ?? {}) as Record<string, unknown>,
          sortModel: (request.sortModel ?? []).map((s) => ({
            colId: s.colId,
            sort: s.sort ?? 'asc',
          })),
          startRow: request.startRow ?? 0,
          endRow: request.endRow ?? 10000,
          start_date: startDate,
          end_date: endDate,
          extra_filters: Object.keys(mergedFilters).length > 0 ? mergedFilters : undefined,
          connection_id: activeConnectionId ?? undefined,
        })
          .then((data) => {
            if (data.error) {
              console.error('[Pivot SSRM]', data.error)
              params.fail()
              return
            }
            if (data.secondaryColDefs)
              gridApiRef.current?.setPivotResultColumns((data.secondaryColDefs as ColDef[]) ?? null)
            params.success({ rowData: data.rows ?? [], rowCount: data.rowCount ?? 0 })
          })
          .catch((err) => {
            console.error('[Pivot SSRM] fetch error', err)
            params.fail()
          })
          .finally(() => setIsQuerying(false))
      },
    }),
    []
  )

  // ── Grid ready ──────────────────────────────────────────────────────────
  const handleGridReady = useCallback(
    (e: GridReadyEvent) => {
      gridApiRef.current = e.api
      // Default: event_count in VALUES, no row group
      aggFuncOverridesRef.current['event_count'] = 'sum'
      e.api.addValueColumns(['event_count'])
      e.api.setGridOption('serverSideDatasource', datasource)
      syncFromApi(e.api)
    },
    [datasource, syncFromApi]
  )

  useEffect(() => {
    gridApiRef.current?.refreshServerSide({ purge: true })
  }, [startDate, endDate, activeFilters])
  useEffect(() => {
    gridApiRef.current?.refreshServerSide({ purge: true })
  }, [pivotFilters])

  const handleReset = useCallback(() => {
    if (!gridApiRef.current) return
    aggFuncOverridesRef.current = { event_count: 'sum' }
    setShowSubtotals(false)
    gridApiRef.current.setGridOption('pinnedBottomRowData', [])
    gridApiRef.current.applyColumnState({
      defaultState: { rowGroup: false, pivot: false, aggFunc: null, hide: false },
      applyOrder: false,
    })
    gridApiRef.current.addValueColumns(['event_count'])
    setPivotFilters([])
    gridApiRef.current.refreshServerSide({ purge: true })
    syncFromApi(gridApiRef.current)
  }, [syncFromApi])

  const handleExportCsv = useCallback(() => {
    gridApiRef.current?.exportDataAsCsv()
  }, [])

  const handleToggleSubtotals = useCallback(() => {
    setShowSubtotals((prev) => !prev)
  }, [])

  // ── Pinned total row ────────────────────────────────────────────────────
  // SSRM pivot mode can't compute grand totals client-side (values are
  // server-computed CASE WHEN). We fetch the total row ourselves and pin it.
  useEffect(() => {
    const api = gridApiRef.current
    if (!api) return
    if (!showSubtotals || valueCols.length === 0) {
      api.setGridOption('pinnedBottomRowData', [])
      return
    }
    const { startDate, endDate, activeFilters, activeConnectionId, pivotFilters } = requestParamsRef.current
    const mergedFilters: Record<string, string | null> = {
      ...(activeFilters ?? {}),
      ...Object.fromEntries(pivotFilters.map((f) => [f.field, f.value])),
    }
    fetchPivotGridRows({
      rowGroupCols: [],
      valueCols: valueCols.map((c) => ({
        id: c.colId, field: c.colId,
        aggFunc: aggFuncOverridesRef.current[c.colId] ?? c.aggFunc ?? 'sum',
        displayName: c.label,
      })),
      pivotCols: [],
      pivotMode: false,
      groupKeys: [],
      filterModel: {},
      sortModel: [],
      startRow: 0, endRow: 1,
      start_date: startDate, end_date: endDate,
      extra_filters: Object.keys(mergedFilters).length > 0 ? mergedFilters : undefined,
      connection_id: activeConnectionId ?? undefined,
    }).then((data) => {
      if (data.rows?.length) {
        api.setGridOption('pinnedBottomRowData', [{ ...data.rows[0], _isTotal: true }])
      }
    }).catch(() => {})
  }, [showSubtotals, valueCols, startDate, endDate, activeFilters, pivotFilters])

  // ── Theme tokens (CSS variables — auto dark/light) ───────────────────────
  const accent = 'hsl(var(--primary))'
  const border = 'hsl(var(--border))'
  const textStrong = 'hsl(var(--foreground))'
  const textMuted = 'hsl(var(--muted-foreground))'
  const textDim = 'hsl(var(--muted-foreground))'
  const chipBg = 'hsl(var(--muted))'
  const chipBorder = 'hsl(var(--border))'

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 flex flex-col gap-3">
          {/* Config bar */}
          {columnDefs.length > 0 && (
            <Card>
              <CardContent className="py-2 px-3 flex items-center flex-wrap gap-1.5">
                <ZoneSection
                  label="GROUP BY"
                  cols={rowGroups}
                  available={availForRowGroup}
                  onRemove={removeRowGroup}
                  onAdd={addRowGroup}
                  dark={false}
                  accent={accent}
                  border={border}
                  chipBg={chipBg}
                  chipBorder={chipBorder}
                  textDim={textDim}
                  textMuted={textMuted}
                  textStrong={textStrong}
                />
                <Divider dark={false} />
                <ZoneSection
                  label="PIVOT"
                  cols={pivotCols}
                  available={availForPivot}
                  onRemove={removePivotCol}
                  onAdd={addPivotCol}
                  dark={false}
                  accent={accent}
                  border={border}
                  chipBg={chipBg}
                  chipBorder={chipBorder}
                  textDim={textDim}
                  textMuted={textMuted}
                  textStrong={textStrong}
                />
                <Divider dark={false} />
                <ZoneSection
                  label="VALUES"
                  cols={valueCols}
                  available={availForValues}
                  onRemove={removeValueCol}
                  onAdd={addValueCol}
                  showAggFunc
                  onAggFuncChange={changeValueAggFunc}
                  getAllowedAggFuncs={getAllowedAggFuncs}
                  dark={false}
                  accent={accent}
                  border={border}
                  chipBg={chipBg}
                  chipBorder={chipBorder}
                  textDim={textDim}
                  textMuted={textMuted}
                  textStrong={textStrong}
                />
                <Divider dark={false} />
                <FilterSection
                  filters={pivotFilters}
                  available={availForFilter}
                  onAdd={addFilter}
                  onRemove={removeFilter}
                  startDate={startDate}
                  endDate={endDate}
                  connectionId={activeConnectionId ?? undefined}
                  dark={false}
                  accent={accent}
                  border={border}
                  chipBg={chipBg}
                  chipBorder={chipBorder}
                  textDim={textDim}
                  textMuted={textMuted}
                  textStrong={textStrong}
                />
              </CardContent>
            </Card>
          )}

          {/* Grid */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Toolbar */}
              <div className="flex items-center justify-end gap-1 px-3 py-2 border-b">
                {isQuerying && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mr-1" />}
                <Button
                  variant={showSubtotals ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={handleToggleSubtotals}
                  title={showSubtotals ? 'Hide subtotals' : 'Show subtotals'}
                  className="gap-1.5 h-7 text-xs"
                >
                  <Sigma className="h-3 w-3" />
                  Subtotals
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} aria-label="Reset">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExportCsv} aria-label="Export CSV">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div style={{ height: 'calc(100vh - 196px)' }}>
                {colDefsLoading ? (
                  <div className="h-full flex items-center justify-center gap-2 text-muted-foreground text-xs tracking-widest">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Initializing…
                  </div>
                ) : (
                  <AgGridReact
                    theme={gridTheme}
                    columnDefs={columnDefs}
                    rowModelType="serverSide"
                    onGridReady={handleGridReady}
                    pivotMode={true}
                    defaultColDef={{ sortable: true, resizable: true, minWidth: 100 }}
                    groupDefaultExpanded={0}
                    animateRows={true}
                    suppressAggFuncInHeader={false}
                    aggFuncs={{ countDistinct: ({ values }) => values[0] }}
                    onColumnRowGroupChanged={handleColEvent}
                    onColumnPivotChanged={handleColEvent}
                    onColumnValueChanged={handleColEvent}
                  />
                )}
              </div>
            </CardContent>
          </Card>
      </div>
    </PageTransition>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Divider({ dark: _dark }: { dark: boolean }) {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        background: 'hsl(var(--border))',
        margin: '0 8px',
        flexShrink: 0,
      }}
    />
  )
}

const AGG_FULL: Record<string, string> = {
  sum: 'Sum',
  min: 'Min',
  max: 'Max',
  avg: 'Average',
  count: 'Count',
  countDistinct: 'Count Distinct',
}

function ZoneSection({
  label,
  cols,
  available,
  onRemove,
  onAdd,
  showAggFunc,
  onAggFuncChange,
  getAllowedAggFuncs,
  dark,
  accent,
  border,
  chipBg,
  chipBorder,
  textDim,
  textMuted,
  textStrong,
}: {
  label: string
  cols: ZoneCol[]
  available: LeafMeta[]
  onRemove: (colId: string) => void
  onAdd: (colId: string) => void
  showAggFunc?: boolean
  onAggFuncChange?: (colId: string, aggFunc: string) => void
  getAllowedAggFuncs?: (colId: string) => string[]
  dark: boolean
  accent: string
  border: string
  chipBg: string
  chipBorder: string
  textDim: string
  textMuted: string
  textStrong: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
      <span
        style={{
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: textMuted,
          fontFamily: 'inherit',
          userSelect: 'none' as const,
          flexShrink: 0,
        }}
      >
        {label}
      </span>

      {cols.map((col) => (
        <Chip
          key={col.colId}
          label={col.label}
          aggFunc={showAggFunc ? col.aggFunc : undefined}
          allowedAggFuncs={
            showAggFunc && getAllowedAggFuncs ? getAllowedAggFuncs(col.colId) : undefined
          }
          onAggFuncChange={onAggFuncChange ? (agg) => onAggFuncChange(col.colId, agg) : undefined}
          onRemove={() => onRemove(col.colId)}
          dark={dark}
          accent={accent}
          border={border}
          chipBg={chipBg}
          chipBorder={chipBorder}
          textDim={textDim}
          textStrong={textStrong}
        />
      ))}

      {available.length > 0 && (
        <ColPicker
          available={available}
          onAdd={onAdd}
          dark={dark}
          accent={accent}
          border={border}
          chipBg={chipBg}
          chipBorder={chipBorder}
          textDim={textDim}
          textMuted={textMuted}
          textStrong={textStrong}
        />
      )}
    </div>
  )
}

// ─── Filter section ────────────────────────────────────────────────────────

function FilterSection({
  filters,
  available,
  onAdd,
  onRemove,
  startDate,
  endDate,
  connectionId,
  dark,
  accent,
  border,
  chipBg,
  chipBorder,
  textDim,
  textMuted,
  textStrong,
}: {
  filters: FilterEntry[]
  available: LeafMeta[]
  onAdd: (field: string, fieldLabel: string, value: string) => void
  onRemove: (field: string) => void
  startDate?: string
  endDate?: string
  connectionId?: string
  dark: boolean
  accent: string
  border: string
  chipBg: string
  chipBorder: string
  textDim: string
  textMuted: string
  textStrong: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
      <span
        style={{
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: textMuted,
          fontFamily: 'inherit',
          userSelect: 'none' as const,
          flexShrink: 0,
        }}
      >
        FILTER
      </span>

      {filters.map((f) => (
        <FilterChip
          key={f.field}
          fieldLabel={f.fieldLabel}
          value={f.value}
          onRemove={() => onRemove(f.field)}
          dark={dark}
          accent={accent}
          chipBg={chipBg}
          chipBorder={chipBorder}
          textDim={textDim}
          textStrong={textStrong}
        />
      ))}

      {available.length > 0 && (
        <FilterPicker
          available={available}
          onAdd={onAdd}
          startDate={startDate}
          endDate={endDate}
          connectionId={connectionId}
          dark={dark}
          accent={accent}
          border={border}
          chipBg={chipBg}
          chipBorder={chipBorder}
          textDim={textDim}
          textMuted={textMuted}
          textStrong={textStrong}
        />
      )}
    </div>
  )
}

function FilterChip({
  fieldLabel,
  value,
  onRemove,
  dark,
  accent,
  chipBg,
  chipBorder,
  textDim,
  textStrong,
}: {
  fieldLabel: string
  value: string
  onRemove: () => void
  dark: boolean
  accent: string
  chipBg: string
  chipBorder: string
  textDim: string
  textStrong: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '3px 6px 3px 8px',
        borderRadius: 20,
        background: hovered ? 'hsl(var(--accent))' : chipBg,
        border: `1px solid ${hovered ? accent + '50' : chipBorder}`,
        fontFamily: 'inherit',
        fontSize: 11,
        color: textStrong,
        transition: 'all 0.12s ease',
        cursor: 'default',
        userSelect: 'none' as const,
      }}
    >
      <Filter style={{ width: 8, height: 8, color: accent, flexShrink: 0 }} />
      <span style={{ color: textDim, marginRight: 1 }}>{fieldLabel}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
      <button
        onClick={onRemove}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: 'none',
          background: hovered ? 'hsl(var(--accent))' : 'transparent',
          color: textDim,
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.1s ease',
        }}
      >
        <X style={{ width: 8, height: 8 }} />
      </button>
    </span>
  )
}

function FilterPicker({
  available,
  onAdd,
  startDate,
  endDate,
  connectionId,
  dark,
  accent,
  border,
  chipBg,
  chipBorder,
  textDim,
  textMuted,
  textStrong,
}: {
  available: LeafMeta[]
  onAdd: (field: string, fieldLabel: string, value: string) => void
  startDate?: string
  endDate?: string
  connectionId?: string
  dark: boolean
  accent: string
  border: string
  chipBg: string
  chipBorder: string
  textDim: string
  textMuted: string
  textStrong: string
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'field' | 'value'>('field')
  const [selectedField, setSelectedField] = useState<LeafMeta | null>(null)
  const [fieldValues, setFieldValues] = useState<string[]>([])
  const [valuesLoading, setValuesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setStep('field')
        setSelectedField(null)
        setFieldValues([])
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleFieldSelect = async (field: LeafMeta) => {
    setSelectedField(field)
    setStep('value')
    setValuesLoading(true)
    setSearch('')
    try {
      const data = await fetchPivotGridFilterValues({
        field: field.colId,
        start_date: startDate,
        end_date: endDate,
        connection_id: connectionId,
      })
      setFieldValues((data.values ?? []).map(String))
    } catch {
      setFieldValues([])
    } finally {
      setValuesLoading(false)
    }
  }

  const handleValueSelect = (value: string) => {
    if (selectedField) {
      onAdd(selectedField.colId, selectedField.label, value)
      setOpen(false)
      setStep('field')
      setSelectedField(null)
      setFieldValues([])
      setSearch('')
    }
  }

  const filteredValues = fieldValues.filter((v) => v.toLowerCase().includes(search.toLowerCase()))

  const dropStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    zIndex: 2000,
    background: 'hsl(var(--popover))',
    border: `1px solid ${border}`,
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    minWidth: 190,
    padding: '4px 0',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setOpen((o) => !o)
          setStep('field')
          setSelectedField(null)
          setFieldValues([])
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 9px 3px 7px',
          borderRadius: 20,
          background: open || hovered ? 'hsl(var(--accent))' : chipBg,
          border: `1px solid ${open ? accent + '60' : chipBorder}`,
          fontFamily: 'inherit',
          fontSize: 11,
          color: open ? accent : textDim,
          cursor: 'pointer',
          transition: 'all 0.12s ease',
        }}
      >
        <Plus style={{ width: 9, height: 9 }} />
        Filter
      </button>

      {open && (
        <div style={dropStyle}>
          {step === 'field' && (
            <>
              <div
                style={{
                  padding: '6px 10px 4px',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: textMuted,
                  fontFamily: 'inherit',
                  userSelect: 'none',
                  borderBottom: `1px solid hsl(var(--border))`,
                  marginBottom: 4,
                }}
              >
                Pick a field
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {available.map((col) => (
                  <PickerRow
                    key={col.colId}
                    label={col.label}
                    onClick={() => handleFieldSelect(col)}
                    dark={false}
                    accent={accent}
                    textStrong={textStrong}
                    textMuted={textMuted}
                  />
                ))}
              </div>
            </>
          )}

          {step === 'value' && (
            <>
              <div
                style={{
                  padding: '6px 10px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderBottom: `1px solid hsl(var(--border))`,
                  marginBottom: 4,
                }}
              >
                <button
                  onClick={() => {
                    setStep('field')
                    setSelectedField(null)
                    setFieldValues([])
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: textDim,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontFamily: 'inherit',
                    padding: 0,
                  }}
                >
                  ←
                </button>
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: textMuted,
                    fontFamily: 'inherit',
                    userSelect: 'none',
                  }}
                >
                  {selectedField?.label}
                </span>
              </div>

              {/* Search input */}
              <div style={{ padding: '4px 8px 6px' }}>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search values…"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '5px 8px',
                    border: `1px solid hsl(var(--border))`,
                    borderRadius: 6,
                    background: 'hsl(var(--muted))',
                    color: textStrong,
                    fontFamily: 'inherit',
                    fontSize: 11,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {valuesLoading ? (
                  <div
                    style={{
                      padding: '10px 14px',
                      color: textDim,
                      fontFamily: 'inherit',
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Loader2
                      style={{ width: 10, height: 10, animation: 'pv-spin 0.8s linear infinite' }}
                    />
                    Loading…
                  </div>
                ) : filteredValues.length === 0 ? (
                  <div
                    style={{
                      padding: '10px 14px',
                      color: textDim,
                      fontFamily: 'inherit',
                      fontSize: 11,
                    }}
                  >
                    No values found
                  </div>
                ) : (
                  filteredValues.map((v) => (
                    <PickerRow
                      key={v}
                      label={v}
                      onClick={() => handleValueSelect(v)}
                      dark={false}
                      accent={accent}
                      textStrong={textStrong}
                      textMuted={textMuted}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({
  label,
  aggFunc,
  allowedAggFuncs,
  onAggFuncChange,
  onRemove,
  dark,
  accent,
  border,
  chipBg,
  chipBorder,
  textDim,
  textStrong,
}: {
  label: string
  aggFunc?: string
  allowedAggFuncs?: string[]
  onAggFuncChange?: (aggFunc: string) => void
  onRemove: () => void
  dark: boolean
  accent: string
  border: string
  chipBg: string
  chipBorder: string
  textDim: string
  textStrong: string
}) {
  const [hovered, setHovered] = useState(false)
  const [aggOpen, setAggOpen] = useState(false)
  const aggRef = useRef<HTMLDivElement>(null)
  const canChangeAgg = !!onAggFuncChange && allowedAggFuncs && allowedAggFuncs.length > 1

  useEffect(() => {
    if (!aggOpen) return
    const handler = (e: MouseEvent) => {
      if (aggRef.current && !aggRef.current.contains(e.target as Node)) setAggOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [aggOpen])

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '3px 6px 3px 9px',
        borderRadius: 20,
        background: hovered ? 'hsl(var(--accent))' : chipBg,
        border: `1px solid ${hovered ? accent + '50' : chipBorder}`,
        fontFamily: 'inherit',
        fontSize: 11,
        color: textStrong,
        transition: 'all 0.12s ease',
        cursor: 'default',
        userSelect: 'none' as const,
      }}
    >
      {label}

      {/* Agg func badge — clickable when multiple options exist */}
      {aggFunc && (
        <div ref={aggRef} style={{ position: 'relative' }}>
          <button
            onClick={canChangeAgg ? () => setAggOpen((o) => !o) : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              padding: '1px 5px',
              borderRadius: 10,
              border: 'none',
              background: aggOpen ? accent : 'hsl(var(--primary)/0.12)',
              color: aggOpen ? '#fff' : accent,
              fontFamily: 'inherit',
              fontSize: 9,
              letterSpacing: '0.04em',
              cursor: canChangeAgg ? 'pointer' : 'default',
              transition: 'all 0.12s ease',
            }}
            title={canChangeAgg ? 'Change aggregation' : undefined}
          >
            {AGG_LABELS[aggFunc] ?? aggFunc}
            {canChangeAgg && <span style={{ fontSize: 7, opacity: 0.7 }}>▾</span>}
          </button>

          {/* Agg picker dropdown */}
          {aggOpen && canChangeAgg && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 5px)',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2000,
                background: 'hsl(var(--popover))',
                border: `1px solid ${border}`,
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                minWidth: 140,
                padding: '4px 0',
                overflow: 'hidden',
              }}
            >
              {allowedAggFuncs!.map((agg) => (
                <AggOption
                  key={agg}
                  agg={agg}
                  active={agg === aggFunc}
                  onClick={() => {
                    onAggFuncChange!(agg)
                    setAggOpen(false)
                  }}
                  dark={false}
                  accent={accent}
                  textStrong={textStrong}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: 'none',
          background: hovered ? 'hsl(var(--accent))' : 'transparent',
          color: textDim,
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.1s ease',
        }}
      >
        <X style={{ width: 8, height: 8 }} />
      </button>
    </span>
  )
}

function AggOption({
  agg,
  active,
  onClick,
  dark,
  accent,
  textStrong,
}: {
  agg: string
  active: boolean
  onClick: () => void
  dark: boolean
  accent: string
  textStrong: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '7px 12px',
        border: 'none',
        textAlign: 'left' as const,
        background: active ? 'hsl(var(--primary)/0.1)' : hov ? 'hsl(var(--accent))' : 'transparent',
        color: active ? accent : textStrong,
        fontFamily: 'inherit',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.08s ease',
      }}
    >
      <span>{AGG_FULL[agg] ?? agg}</span>
      <span
        style={{
          fontSize: 10,
          color: active ? accent : 'hsl(var(--muted-foreground))',
          marginLeft: 8,
        }}
      >
        {AGG_LABELS[agg] ?? agg}
      </span>
    </button>
  )
}

function ColPicker({
  available,
  onAdd,
  dark,
  accent,
  border,
  chipBg,
  chipBorder,
  textDim,
  textMuted,
  textStrong,
}: {
  available: LeafMeta[]
  onAdd: (colId: string) => void
  dark: boolean
  accent: string
  border: string
  chipBg: string
  chipBorder: string
  textDim: string
  textMuted: string
  textStrong: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const [hovered, setHovered] = useState(false)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 9px 3px 7px',
          borderRadius: 20,
          background: open || hovered ? 'hsl(var(--accent))' : chipBg,
          border: `1px solid ${open ? accent + '60' : chipBorder}`,
          fontFamily: 'inherit',
          fontSize: 11,
          color: open ? accent : textDim,
          cursor: 'pointer',
          transition: 'all 0.12s ease',
        }}
      >
        <Plus style={{ width: 9, height: 9 }} />
        Field
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            background: 'hsl(var(--popover))',
            border: `1px solid ${border}`,
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: 170,
            maxHeight: 280,
            overflowY: 'auto' as const,
            padding: '4px 0',
          }}
        >
          {available.map((col) => (
            <PickerRow
              key={col.colId}
              label={col.label}
              onClick={() => {
                onAdd(col.colId)
                setOpen(false)
              }}
              dark={dark}
              accent={accent}
              textStrong={textStrong}
              textMuted={textMuted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PickerRow({
  label,
  onClick,
  dark,
  accent,
  textStrong,
  textMuted,
}: {
  label: string
  onClick: () => void
  dark: boolean
  accent: string
  textStrong: string
  textMuted: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left' as const,
        padding: '7px 14px',
        border: 'none',
        background: hov ? 'hsl(var(--accent))' : 'transparent',
        color: hov ? accent : textStrong,
        fontFamily: 'inherit',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.08s ease',
      }}
    >
      {label}
    </button>
  )
}

function GhostBtn({
  children,
  onClick,
  dark,
  accent,
  border,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  dark: boolean
  accent: string
  border: string
  title?: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 6,
        cursor: 'pointer',
        border: `1px solid ${hov ? border : 'transparent'}`,
        background: hov ? 'hsl(var(--accent))' : 'transparent',
        color: hov ? accent : 'hsl(var(--muted-foreground))',
        transition: 'all 0.12s ease',
        outline: 'none',
      }}
    >
      {children}
    </button>
  )
}
