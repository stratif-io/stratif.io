import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PivotToolbar } from './PivotToolbar'
import { ZoneBar } from './ZoneBar'
import { FilterBar } from '../shared/FilterBar'
import * as XLSX from 'xlsx'
import { rowsToCsv, downloadCsv } from './csvExport'
import type { ZoneCol, FilterEntry, PivotTableProps } from './types'
import { buildLeafMeta } from './types'
import { DevCard } from '@/components/dev'
import { EmptyState } from '@/components/ui/empty-state'
import { QueryError } from '@/components/ui/query-error'
import { BarChart2 } from 'lucide-react'
import { useAppStore } from '@/stores'
import type { Granularity } from '@/types'
// FilterEntry used for pivotFilters state

const DEFAULT_ROW_GROUPS: ZoneCol[] = []
const DEFAULT_PIVOT_COLS: ZoneCol[] = []
const DEFAULT_VALUE_COLS: ZoneCol[] = []

const GRANULARITY_TO_DIM: Record<Granularity, string> = {
  hour: 'ts_hour',
  day: 'ts_date',
  week: 'ts_week',
  month: 'ts_month',
  quarter: 'ts_quarter',
  year: 'ts_year',
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
  initialRowGroups,
  initialValueCols,
  initialPivotFilters,
}: PivotTableProps) {
  const [rowGroups, setRowGroups] = useState<ZoneCol[]>(initialRowGroups ?? DEFAULT_ROW_GROUPS)
  const [pivotCols, setPivotCols] = useState<ZoneCol[]>(DEFAULT_PIVOT_COLS)
  const [valueCols, setValueCols] = useState<ZoneCol[]>(initialValueCols ?? DEFAULT_VALUE_COLS)
  const [pivotFilters, setPivotFilters] = useState<FilterEntry[]>(initialPivotFilters ?? [])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [isQuerying, setIsQuerying] = useState(false)
  const [queryError, setQueryError] = useState<Error | null>(null)
  const [lastSql, setLastSql] = useState<string | string[] | undefined>()
  const [filterField, setFilterField] = useState<string | null>(null)
  const [filterOptions, setFilterOptions] = useState<string[]>([])

  const granularity = useAppStore((s) => s.granularity)
  // tracks whether the current sole row group is still the default time dim
  const defaultTimeDimRef = useRef<string | null>(null)

  const fetchIdRef = useRef(0)
  const parentRef = useRef<HTMLDivElement>(null)

  const leafCols = useMemo(
    () =>
      colDefsData
        ? buildLeafMeta(colDefsData.columnDefs as Parameters<typeof buildLeafMeta>[0])
        : [],
    [colDefsData]
  )

  useEffect(() => {
    if (!colDefsData || leafCols.length === 0) return
    if (
      rowGroups.length > 0 ||
      valueCols.length > 0 ||
      initialValueCols?.length ||
      initialRowGroups?.length
    )
      return

    const timeDimId = GRANULARITY_TO_DIM[granularity]
    const timeMeta = leafCols.find((c) => c.colId === timeDimId)
    const eventsMeta = leafCols.find((c) => c.colId === 'event_count')
    const usersMeta = leafCols.find((c) => c.colId === 'user_id')

    if (timeMeta) {
      setRowGroups([{ colId: timeMeta.colId, label: timeMeta.label }])
      defaultTimeDimRef.current = timeMeta.colId
    }

    const defaults: ZoneCol[] = []
    if (eventsMeta)
      defaults.push({
        colId: eventsMeta.colId,
        label: eventsMeta.label,
        aggFunc: eventsMeta.allowedAggFuncs?.[0] ?? 'sum',
        allowedAggFuncs: eventsMeta.allowedAggFuncs,
      })
    if (usersMeta)
      defaults.push({
        colId: usersMeta.colId,
        label: usersMeta.label,
        aggFunc: usersMeta.allowedAggFuncs?.[0] ?? 'sum',
        allowedAggFuncs: usersMeta.allowedAggFuncs,
      })
    if (defaults.length > 0) setValueCols(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colDefsData, leafCols.length])

  useEffect(() => {
    const newDimId = GRANULARITY_TO_DIM[granularity]
    const prev = defaultTimeDimRef.current
    if (!prev || prev === newDimId) return
    const timeMeta = leafCols.find((c) => c.colId === newDimId)
    if (!timeMeta) return

    setRowGroups((current) => {
      if (current.length === 1 && current[0].colId === prev) {
        defaultTimeDimRef.current = newDimId
        return [{ colId: timeMeta.colId, label: timeMeta.label }]
      }
      return current
    })
  }, [granularity, leafCols])

  const runQuery = useCallback(async () => {
    if (rowGroups.length === 0 && valueCols.length === 0) {
      setRows([])
      setHeaders([])
      return
    }
    const id = ++fetchIdRef.current
    setIsQuerying(true)
    setQueryError(null)
    try {
      const res = await fetchRows({
        startDate,
        endDate,
        activeFilters,
        activeConnectionId,
        pivotFilters,
        rowGroups,
        pivotCols,
        valueCols,
      })
      if (id !== fetchIdRef.current) return
      function flattenFields(defs: { field?: string; children?: unknown[] }[]): string[] {
        const out: string[] = []
        for (const c of defs) {
          if (c.children)
            out.push(...flattenFields(c.children as { field?: string; children?: unknown[] }[]))
          else if (c.field) out.push(c.field)
        }
        return out
      }
      const cols = res.columnDefs
        ? [
            ...rowGroups.map((c) => c.colId),
            ...flattenFields(res.columnDefs as { field?: string; children?: unknown[] }[]),
          ]
        : rowGroups.map((c) => c.colId).concat(valueCols.map((c) => c.colId))
      setHeaders(cols)
      setRows(res.rows)
      setLastSql(res.sql)
    } catch (err) {
      if (id === fetchIdRef.current)
        setQueryError(err instanceof Error ? err : new Error('Query failed'))
    } finally {
      if (id === fetchIdRef.current) setIsQuerying(false)
    }
  }, [
    fetchRows,
    startDate,
    endDate,
    activeFilters,
    activeConnectionId,
    pivotFilters,
    rowGroups,
    pivotCols,
    valueCols,
  ])

  useEffect(() => {
    runQuery()
  }, [runQuery])

  function handleReset() {
    setRowGroups(DEFAULT_ROW_GROUPS)
    setPivotCols(DEFAULT_PIVOT_COLS)
    setValueCols(DEFAULT_VALUE_COLS)
    setPivotFilters([])
    defaultTimeDimRef.current = null
  }

  function handleExportCsv() {
    const csv = rowsToCsv(headers, rows)
    downloadCsv('pivot-export.csv', csv)
  }

  function handleExportXlsx() {
    const data = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pivot')
    XLSX.writeFile(wb, 'pivot-export.xlsx')
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
        onExportXlsx={handleExportXlsx}
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
          <Select value={filterField} onValueChange={handleFilterFieldChange}>
            <SelectTrigger className="h-7 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leafCols.map((c) => (
                <SelectItem key={c.colId} value={c.colId}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(v) => {
              if (v) handleFilterApply(filterField, v)
            }}
          >
            <SelectTrigger className="h-7 text-xs w-36">
              <SelectValue placeholder="Select value…" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setFilterField(null)}>
            Cancel
          </Button>
        </div>
      )}

      <DevCard sql={lastSql} className="flex-1 min-h-0">
        <div ref={parentRef} className="h-full overflow-auto">
          {queryError ? (
            <div className="flex items-center justify-center h-full">
              <QueryError error={queryError} onRetry={runQuery} />
            </div>
          ) : rows.length === 0 && !isQuerying ? (
            <div className="flex items-center justify-center h-full">
              {rowGroups.length === 0 && valueCols.length === 0 ? (
                <EmptyState
                  icon={BarChart2}
                  title="No data to display"
                  description="Use + Add in the Rows and Values zones to build a pivot table."
                />
              ) : (
                <EmptyState
                  icon={BarChart2}
                  title="No data to display"
                  description="Try adjusting your filters or selecting a different event."
                />
              )}
            </div>
          ) : (
            <table className="w-full text-sm border-collapse table-fixed">
              <colgroup>
                {headers.map((h) => (
                  <col key={h} style={{ width: `${100 / headers.length}%` }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-medium text-xs text-muted-foreground border-b border-border whitespace-nowrap overflow-hidden text-ellipsis"
                    >
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
                      style={{
                        position: 'absolute',
                        top: vi.start,
                        left: 0,
                        width: '100%',
                        height: `${vi.size}px`,
                        display: 'flex',
                      }}
                      className="hover:bg-muted/40 border-b border-border/50"
                    >
                      {headers.map((h) => (
                        <td
                          key={h}
                          className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ width: `${100 / headers.length}%`, flexShrink: 0 }}
                        >
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
      </DevCard>
    </div>
  )
}
