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
