import { useState, useEffect, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PivotToolbar } from './PivotToolbar'
import { ZoneBar } from './ZoneBar'
import { FilterBar } from '../shared/FilterBar'
import { rowsToCsv, downloadCsv } from './csvExport'
import type { ZoneCol, LeafMeta, FilterEntry, PivotTableProps } from './types'
// FilterEntry used for pivotFilters state

const DEFAULT_ROW_GROUPS: ZoneCol[] = []
const DEFAULT_PIVOT_COLS: ZoneCol[] = []
const DEFAULT_VALUE_COLS: ZoneCol[] = []

type ColDefInput = { field?: string; headerName?: string; enableRowGroup?: boolean; enablePivot?: boolean; enableValue?: boolean; allowedAggFuncs?: string[]; children?: ColDefInput[] }

function buildLeafMeta(colDefs: ColDefInput[]): LeafMeta[] {
  const result: LeafMeta[] = []
  const walk = (cols: ColDefInput[]) => {
    for (const c of cols) {
      if (c.children) { walk(c.children); continue }
      if (!c.field) continue
      result.push({
        colId: c.field,
        label: c.headerName ?? c.field,
        enableRowGroup: c.enableRowGroup ?? false,
        enablePivot: c.enablePivot ?? false,
        enableValue: c.enableValue ?? false,
        allowedAggFuncs: c.allowedAggFuncs,
      })
    }
  }
  walk(colDefs)
  return result
}


export function PivotTable({
  colDefsData,
  colDefsLoading,
  startDate,
  endDate,
  activeFilters,
  activeConnectionId,
  fetchRows,
  fetchFilterValues,
}: PivotTableProps) {
  const [rowGroups, setRowGroups] = useState<ZoneCol[]>(DEFAULT_ROW_GROUPS)
  const [pivotCols, setPivotCols] = useState<ZoneCol[]>(DEFAULT_PIVOT_COLS)
  const [valueCols, setValueCols] = useState<ZoneCol[]>(DEFAULT_VALUE_COLS)
  const [pivotFilters, setPivotFilters] = useState<FilterEntry[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [isQuerying, setIsQuerying] = useState(false)
  const [filterField, setFilterField] = useState<string | null>(null)
  const [filterOptions, setFilterOptions] = useState<string[]>([])

  const fetchIdRef = useRef(0)
  const parentRef = useRef<HTMLDivElement>(null)

  const leafCols = colDefsData ? buildLeafMeta(colDefsData.columnDefs as Parameters<typeof buildLeafMeta>[0]) : []

  const runQuery = useCallback(async () => {
    if (rowGroups.length === 0 && valueCols.length === 0) {
      setRows([])
      setHeaders([])
      return
    }
    const id = ++fetchIdRef.current
    setIsQuerying(true)
    try {
      const res = await fetchRows({ startDate, endDate, activeFilters, activeConnectionId, pivotFilters, rowGroups, pivotCols, valueCols })
      if (id !== fetchIdRef.current) return
      const cols = res.columnDefs
        ? (res.columnDefs as { field?: string }[]).map((c) => c.field ?? '').filter(Boolean)
        : rowGroups.map((c) => c.colId).concat(valueCols.map((c) => c.colId))
      setHeaders(cols)
      setRows(res.rows)
    } finally {
      if (id === fetchIdRef.current) setIsQuerying(false)
    }
  }, [fetchRows, startDate, endDate, activeFilters, activeConnectionId, pivotFilters, rowGroups, pivotCols, valueCols])

  useEffect(() => { runQuery() }, [runQuery])

  function handleReset() {
    setRowGroups(DEFAULT_ROW_GROUPS)
    setPivotCols(DEFAULT_PIVOT_COLS)
    setValueCols(DEFAULT_VALUE_COLS)
    setPivotFilters([])
  }

  function handleExportCsv() {
    const csv = rowsToCsv(headers, rows)
    downloadCsv('pivot-export.csv', csv)
  }

  async function handleAddFilter() {
    if (leafCols.length === 0) return
    const field = leafCols[0].colId
    setFilterField(field)
    const opts = await fetchFilterValues(field)
    setFilterOptions(opts)
  }

  function handleFilterFieldChange(field: string) {
    setFilterField(field)
    fetchFilterValues(field).then(setFilterOptions)
  }

  function handleFilterApply(field: string, value: string) {
    const fieldLabel = leafCols.find((c) => c.colId === field)?.label ?? field
    setPivotFilters((prev) => {
      const without = prev.filter((f) => f.field !== field)
      return [...without, { field, fieldLabel, value }]
    })
    setFilterField(null)
  }

  function handleFilterRemove(field: string) {
    setPivotFilters((prev) => prev.filter((f) => f.field !== field))
  }

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  if (colDefsLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading column definitions…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PivotToolbar
        isQuerying={isQuerying}
        onReset={handleReset}
        onExportCsv={handleExportCsv}
        onAddFilter={handleAddFilter}
      />
      <ZoneBar
        leafCols={leafCols}
        rowGroups={rowGroups}
        pivotCols={pivotCols}
        valueCols={valueCols}
        onRowGroupsChange={setRowGroups}
        onPivotColsChange={setPivotCols}
        onValueColsChange={setValueCols}
      />
      {pivotFilters.length > 0 && (
        <FilterBar
          filters={pivotFilters.map((f) => ({
            label: f.fieldLabel,
            value: f.value,
            onClear: () => handleFilterRemove(f.field),
          }))}
        />
      )}
      {filterField !== null && (
        <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Add filter:</span>
          <select
            value={filterField}
            onChange={(e) => handleFilterFieldChange(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1 bg-background"
          >
            {leafCols.map((c) => (
              <option key={c.colId} value={c.colId}>{c.label}</option>
            ))}
          </select>
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) handleFilterApply(filterField, e.target.value) }}
            className="text-xs border border-border rounded px-2 py-1 bg-background"
          >
            <option value="" disabled>Select value…</option>
            {filterOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button onClick={() => setFilterField(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      <div ref={parentRef} className="flex-1 overflow-auto">
        {rows.length === 0 && !isQuerying ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {rowGroups.length === 0 && valueCols.length === 0
              ? 'Drag columns to Rows and Values to build a pivot table.'
              : 'No data for current selection.'}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-xs text-muted-foreground border-b border-border whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualItems.map((vi) => {
                const row = rows[vi.index]
                return (
                  <tr
                    key={vi.index}
                    style={{ position: 'absolute', top: vi.start, left: 0, width: '100%', height: `${vi.size}px` }}
                    className="hover:bg-muted/40 border-b border-border/50"
                  >
                    {headers.map((h) => (
                      <td key={h} className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                        {row[h] == null ? '' : String(row[h])}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
