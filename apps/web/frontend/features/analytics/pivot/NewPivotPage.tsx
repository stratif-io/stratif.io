import { useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageTransition } from '@/components/layout/PageTransition'
import { useAppStore } from '@/stores'
import { formatDateParam } from '@/lib/utils'
import {
  fetchPivotGridColDefs,
  fetchPivotGridRows,
  fetchPivotGridFilterValues,
  fetchFilterConfig,
} from '@/lib/api'
import { PivotTable } from '@/components/pivot-table/PivotTable'
import type { PivotRowsRequest, PivotRowsResponse } from '@/components/pivot-table/types'

// ── Helper: map PivotRowsRequest ZoneCol → fetchPivotGridRows shape ─────────

type GridCol = { id: string; field: string; aggFunc: string; displayName: string }

function toGridCol(c: { colId: string; label: string; aggFunc?: string }): GridCol {
  return { id: c.colId, field: c.colId, aggFunc: c.aggFunc ?? 'sum', displayName: c.label }
}

// ─── Main page ─────────────────────────────────────────────────────────────

export function NewPivotPage() {
  useEffect(() => {
    document.title = 'Pivot — stratif.io'
  }, [])

  const { dateRange, activeFilters, activeConnectionId, setActiveFilter } = useAppStore()

  const startDate = dateRange.from ? formatDateParam(dateRange.from) : undefined
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : undefined

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
    () => new Set((filterConfig?.filter_fields ?? []).map((f: { field: string }) => f.field)),
    [filterConfig],
  )

  useEffect(() => {
    if (!filterConfig) return
    Object.keys(activeFilters).forEach((key) => {
      if (!validFilterIds.has(key)) setActiveFilter(key, null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterConfig])

  const validActiveFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(activeFilters).filter(([key]) => validFilterIds.has(key)),
      ),
    [activeFilters, validFilterIds],
  )

  const fetchRows = useCallback(
    async (params: PivotRowsRequest): Promise<PivotRowsResponse> => {
      const res = await fetchPivotGridRows({
        rowGroupCols: params.rowGroups.map(toGridCol),
        pivotCols: params.pivotCols.map(toGridCol),
        valueCols: params.valueCols.map(toGridCol),
        pivotMode: params.pivotCols.length > 0,
        groupKeys: [],
        filterModel: {},
        sortModel: [],
        startRow: 0,
        endRow: 500,
        start_date: params.startDate,
        end_date: params.endDate,
        extra_filters: {
          ...validActiveFilters,
          ...Object.fromEntries(params.pivotFilters.map((f) => [f.field, f.value])),
        },
        connection_id: params.activeConnectionId ?? undefined,
      })
      return { rows: res.rows, columnDefs: res.secondaryColDefs as Record<string, unknown>[] | undefined }
    },
    [validActiveFilters],
  )

  const fetchFilterValues = useCallback(
    async (field: string): Promise<string[]> => {
      const res = await fetchPivotGridFilterValues({
        field,
        start_date: startDate,
        end_date: endDate,
        connection_id: activeConnectionId ?? undefined,
      })
      return res.values.map(String)
    },
    [startDate, endDate, activeConnectionId],
  )

  return (
    <PageTransition>
      <div style={{ height: 'calc(100vh - 52px)' }} className="flex flex-col">
        <PivotTable
          colDefsData={colDefsData}
          colDefsLoading={colDefsLoading}
          startDate={startDate}
          endDate={endDate}
          activeFilters={validActiveFilters as Record<string, string>}
          activeConnectionId={activeConnectionId}
          fetchRows={fetchRows}
          fetchFilterValues={fetchFilterValues}
        />
      </div>
    </PageTransition>
  )
}
