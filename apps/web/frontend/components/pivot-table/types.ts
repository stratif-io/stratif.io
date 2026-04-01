export interface ZoneCol {
  colId: string
  label: string
  aggFunc?: string
  allowedAggFuncs?: string[]
}

export interface LeafMeta {
  colId: string
  label: string
  enableRowGroup: boolean
  enablePivot: boolean
  enableValue: boolean
  allowedAggFuncs?: string[]
  /** If set, clicking this item skips the aggregation step and calls onSelect immediately. */
  fixedAgg?: string
  /** Category id override for groupDimensionsByCategory (bypasses pattern matching). */
  category?: string
}

export interface FilterEntry {
  field: string
  fieldLabel: string
  value: string
}

export interface PivotColDefsResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columnDefs: any[]
}

export interface PivotRowsRequest {
  startDate?: string
  endDate?: string
  activeFilters: Record<string, string>
  activeConnectionId?: string | null
  pivotFilters: FilterEntry[]
  rowGroups: ZoneCol[]
  pivotCols: ZoneCol[]
  valueCols: ZoneCol[]
}

export interface PivotRowsResponse {
  rows: Record<string, unknown>[]
  columnDefs?: Record<string, unknown>[]
  sql?: string | string[]
}

export interface PivotTableProps {
  colDefsData: PivotColDefsResponse | undefined
  colDefsLoading: boolean
  startDate?: string
  endDate?: string
  activeFilters: Record<string, string>
  activeConnectionId?: string | null
  fetchRows: (params: PivotRowsRequest) => Promise<PivotRowsResponse>
  fetchFilterValues: (field: string) => Promise<string[]>
}

type ColDefInput = {
  field?: string
  headerName?: string
  enableRowGroup?: boolean
  enablePivot?: boolean
  enableValue?: boolean
  allowedAggFuncs?: string[]
  children?: ColDefInput[]
}

export function buildLeafMeta(colDefs: ColDefInput[]): LeafMeta[] {
  const result: LeafMeta[] = []
  const walk = (cols: ColDefInput[]) => {
    for (const c of cols) {
      if (c.children) {
        walk(c.children)
        continue
      }
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
