import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { AgGridReact } from 'ag-grid-react'
import {
  AllEnterpriseModule,
  LicenseManager,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-enterprise'
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  IServerSideDatasource,
  IServerSideGetRowsParams,
} from 'ag-grid-community'
import { RotateCcw, Download, Loader2, Plus, X, Filter, Sigma } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { useAppStore } from '@/stores'
import { fetchPivotGridColDefs, fetchPivotGridRows, fetchPivotGridFilterValues } from '@/lib/api'

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

function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

// ─── AG Grid theme params ──────────────────────────────────────────────────

const DARK_PARAMS = {
  backgroundColor: '#0A0C13',
  foregroundColor: '#C8CDD8',
  headerBackgroundColor: '#0D0F18',
  headerTextColor: '#525870',
  borderColor: '#181C27',
  rowHoverColor: '#0F1119',
  selectedRowBackgroundColor: '#141720',
  accentColor: '#818CF8',
  oddRowBackgroundColor: '#0C0E16',
  cellTextColor: '#A8AEBB',
  fontFamily: '"SF Mono", "Fira Code", ui-monospace, monospace',
  fontSize: 13,
  rowHeight: 42,
  headerHeight: 38,
  cellHorizontalPaddingScale: 1.2,
}
const LIGHT_PARAMS = {
  backgroundColor: '#FFFFFF',
  foregroundColor: '#0F1729',
  headerBackgroundColor: '#F6F7FB',
  headerTextColor: '#8892A8',
  borderColor: '#EAECF4',
  rowHoverColor: '#F8F9FC',
  selectedRowBackgroundColor: '#EEF0FA',
  accentColor: '#6366F1',
  oddRowBackgroundColor: '#FAFBFD',
  cellTextColor: '#2D3552',
  fontFamily: '"SF Mono", "Fira Code", ui-monospace, monospace',
  fontSize: 13,
  rowHeight: 42,
  headerHeight: 38,
  cellHorizontalPaddingScale: 1.2,
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
  const { dateRange, activeFilters, activeConnectionId } = useAppStore()
  const [dark, setDark] = useState(isDarkMode)
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

  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDarkMode()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const gridTheme = useMemo(() => themeQuartz.withParams(dark ? DARK_PARAMS : LIGHT_PARAMS), [dark])

  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  const requestParamsRef = useRef({
    startDate,
    endDate,
    activeFilters,
    activeConnectionId,
    pivotFilters,
  })
  requestParamsRef.current = { startDate, endDate, activeFilters, activeConnectionId, pivotFilters }

  const { data: colDefsData, isLoading: colDefsLoading } = useQuery({
    queryKey: ['pivot-grid-col-defs', activeConnectionId],
    queryFn: () => fetchPivotGridColDefs(activeConnectionId ?? undefined),
  })

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

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const accent = dark ? '#818CF8' : '#6366F1'
  const border = dark ? '#181C27' : '#EAECF4'
  const bg = dark ? '#0A0C13' : '#FFFFFF'
  const bgHeader = dark ? '#0D0F18' : '#F6F7FB'
  const textStrong = dark ? '#E2E5F0' : '#0F1729'
  const textMuted = dark ? '#353A50' : '#C0C8DA'
  const textDim = dark ? '#525870' : '#9098B0'
  const chipBg = dark ? '#13161F' : '#F0F2FA'
  const chipBorder = dark ? '#1E2230' : '#DDE1F0'

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* ── Config bar (outside grid) ───────────────────────────────── */}
        {columnDefs.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap' as const,
              gap: 6,
              padding: '10px 14px',
              borderRadius: 10,
              background: bg,
              border: `1px solid ${border}`,
              boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <ZoneSection
              label="GROUP BY"
              cols={rowGroups}
              available={availForRowGroup}
              onRemove={removeRowGroup}
              onAdd={addRowGroup}
              dark={dark}
              accent={accent}
              border={border}
              chipBg={chipBg}
              chipBorder={chipBorder}
              textDim={textDim}
              textMuted={textMuted}
              textStrong={textStrong}
            />
            <Divider dark={dark} />
            <ZoneSection
              label="PIVOT"
              cols={pivotCols}
              available={availForPivot}
              onRemove={removePivotCol}
              onAdd={addPivotCol}
              dark={dark}
              accent={accent}
              border={border}
              chipBg={chipBg}
              chipBorder={chipBorder}
              textDim={textDim}
              textMuted={textMuted}
              textStrong={textStrong}
            />
            <Divider dark={dark} />
            <ZoneSection
              label="VALUES"
              cols={valueCols}
              available={availForValues}
              onRemove={removeValueCol}
              onAdd={addValueCol}
              showAggFunc
              onAggFuncChange={changeValueAggFunc}
              getAllowedAggFuncs={getAllowedAggFuncs}
              dark={dark}
              accent={accent}
              border={border}
              chipBg={chipBg}
              chipBorder={chipBorder}
              textDim={textDim}
              textMuted={textMuted}
              textStrong={textStrong}
            />
            <Divider dark={dark} />
            <FilterSection
              filters={pivotFilters}
              available={availForFilter}
              onAdd={addFilter}
              onRemove={removeFilter}
              startDate={startDate}
              endDate={endDate}
              connectionId={activeConnectionId ?? undefined}
              dark={dark}
              accent={accent}
              border={border}
              chipBg={chipBg}
              chipBorder={chipBorder}
              textDim={textDim}
              textMuted={textMuted}
              textStrong={textStrong}
            />
          </div>
        )}

        {/* ── Grid card ───────────────────────────────────────────────── */}
        <div
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            border: `1px solid ${border}`,
            background: bg,
            boxShadow: dark
              ? '0 0 0 1px #181C27, 0 8px 32px rgba(0,0,0,0.4)'
              : '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 18px 12px',
              background: bgHeader,
              borderBottom: `1px solid ${border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: accent,
                    opacity: 0.5,
                    animation: 'pv-ping 2.2s cubic-bezier(0,0,0.2,1) infinite',
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    display: 'block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: accent,
                  }}
                />
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: textStrong,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                Pivot Explorer
              </span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: textMuted,
                  fontFamily: 'ui-monospace, monospace',
                  textTransform: 'uppercase' as const,
                  userSelect: 'none' as const,
                }}
              >
                Server-side aggregation
              </span>
              {isQuerying && (
                <Loader2
                  style={{
                    width: 11,
                    height: 11,
                    color: accent,
                    animation: 'pv-spin 0.8s linear infinite',
                  }}
                />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={handleToggleSubtotals}
                title={showSubtotals ? 'Hide subtotals' : 'Show subtotals'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${showSubtotals ? accent + '60' : border}`,
                  background: showSubtotals ? (dark ? '#1A1E2E' : '#EEF0FA') : 'transparent',
                  color: showSubtotals ? accent : (dark ? '#40475E' : '#C0C8DA'),
                  fontFamily: 'ui-monospace, monospace', fontSize: 10,
                  letterSpacing: '0.06em', transition: 'all 0.12s ease',
                }}
              >
                <Sigma style={{ width: 11, height: 11 }} />
                SUBTOTALS
              </button>
              <GhostBtn
                onClick={handleReset}
                title="Reset"
                dark={dark}
                accent={accent}
                border={border}
              >
                <RotateCcw style={{ width: 12, height: 12 }} />
              </GhostBtn>
              <GhostBtn
                onClick={handleExportCsv}
                title="Export CSV"
                dark={dark}
                accent={accent}
                border={border}
              >
                <Download style={{ width: 12, height: 12 }} />
              </GhostBtn>
            </div>
          </div>

          {/* Grid */}
          <div style={{ height: 'calc(100vh - 290px)', minHeight: 400 }}>
            {colDefsLoading ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  color: textMuted,
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                }}
              >
                <Loader2
                  style={{ width: 13, height: 13, animation: 'pv-spin 0.8s linear infinite' }}
                />
                INITIALIZING
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
        </div>
      </div>

      <style>{`
        @keyframes pv-ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes pv-spin { to { transform: rotate(360deg); } }
      `}</style>
    </PageTransition>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Divider({ dark }: { dark: boolean }) {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        background: dark ? '#1E2230' : '#E4E8F4',
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
          fontFamily: 'ui-monospace, monospace',
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
          fontFamily: 'ui-monospace, monospace',
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
        background: hovered ? (dark ? '#1A1E2E' : '#E8ECFA') : chipBg,
        border: `1px solid ${hovered ? accent + '50' : chipBorder}`,
        fontFamily: 'ui-monospace, monospace',
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
          background: hovered ? (dark ? '#282E42' : '#D8DCEE') : 'transparent',
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
    background: dark ? '#0D0F18' : '#FFFFFF',
    border: `1px solid ${border}`,
    borderRadius: 8,
    boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.12)',
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
          background: open || hovered ? (dark ? '#1A1E2E' : '#E8ECFA') : chipBg,
          border: `1px solid ${open ? accent + '60' : chipBorder}`,
          fontFamily: 'ui-monospace, monospace',
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
                  fontFamily: 'ui-monospace, monospace',
                  userSelect: 'none',
                  borderBottom: `1px solid ${dark ? '#181C27' : '#EAECF4'}`,
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
                    dark={dark}
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
                  borderBottom: `1px solid ${dark ? '#181C27' : '#EAECF4'}`,
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
                    fontFamily: 'ui-monospace, monospace',
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
                    fontFamily: 'ui-monospace, monospace',
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
                    border: `1px solid ${dark ? '#1E2230' : '#E4E8F4'}`,
                    borderRadius: 6,
                    background: dark ? '#13161F' : '#F8F9FC',
                    color: textStrong,
                    fontFamily: 'ui-monospace, monospace',
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
                      fontFamily: 'ui-monospace, monospace',
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
                      fontFamily: 'ui-monospace, monospace',
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
                      dark={dark}
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
        background: hovered ? (dark ? '#1A1E2E' : '#E8ECFA') : chipBg,
        border: `1px solid ${hovered ? accent + '50' : chipBorder}`,
        fontFamily: 'ui-monospace, monospace',
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
              background: aggOpen ? accent : dark ? '#1E2338' : '#E0E4F8',
              color: aggOpen ? '#fff' : accent,
              fontFamily: 'ui-monospace, monospace',
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
                background: dark ? '#0D0F18' : '#FFFFFF',
                border: `1px solid ${border}`,
                borderRadius: 8,
                boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.12)',
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
                  dark={dark}
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
          background: hovered ? (dark ? '#282E42' : '#D8DCEE') : 'transparent',
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
        background: active
          ? dark
            ? '#1A1E2E'
            : '#EEF0FA'
          : hov
            ? dark
              ? '#13161F'
              : '#F5F6FC'
            : 'transparent',
        color: active ? accent : textStrong,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.08s ease',
      }}
    >
      <span>{AGG_FULL[agg] ?? agg}</span>
      <span
        style={{
          fontSize: 10,
          color: active ? accent : dark ? '#525870' : '#B0B8CC',
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
          background: open || hovered ? (dark ? '#1A1E2E' : '#E8ECFA') : chipBg,
          border: `1px solid ${open ? accent + '60' : chipBorder}`,
          fontFamily: 'ui-monospace, monospace',
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
            background: dark ? '#0D0F18' : '#FFFFFF',
            border: `1px solid ${border}`,
            borderRadius: 8,
            boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.12)',
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
        background: hov ? (dark ? '#13161F' : '#F5F6FC') : 'transparent',
        color: hov ? (dark ? accent : accent) : textStrong,
        fontFamily: 'ui-monospace, monospace',
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
        background: hov ? (dark ? '#0F1119' : '#EEF0FA') : 'transparent',
        color: hov ? accent : dark ? '#40475E' : '#C0C8DA',
        transition: 'all 0.12s ease',
        outline: 'none',
      }}
    >
      {children}
    </button>
  )
}
