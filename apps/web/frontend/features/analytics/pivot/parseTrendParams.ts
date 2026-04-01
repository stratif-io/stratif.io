import type { ZoneCol, FilterEntry } from '@/components/pivot-table/types'

export interface TrendInitialState {
  initialValueCols: ZoneCol[]
  initialPivotCols?: ZoneCol[]
  initialPivotFilters: FilterEntry[]
}

/**
 * Parses URL search params written by buildPivotUrl() and returns typed
 * initial state for PivotTable. Returns null if the params don't contain
 * the from_trend sentinel (i.e. the user navigated normally).
 */
export function parseTrendParams(params: URLSearchParams): TrendInitialState | null {
  if (params.get('from_trend') !== '1') return null

  const measure = params.get('measure') ?? 'count_events'
  const breakdown = params.get('breakdown')

  // Map measure string → ZoneCol
  let valueCol: ZoneCol
  if (measure === 'count_events') {
    valueCol = { colId: 'event_count', label: 'Events', aggFunc: 'sum' }
  } else if (measure === 'unique_users') {
    valueCol = { colId: 'user_id', label: 'Users', aggFunc: 'count_distinct' }
  } else {
    // Format: "<agg>:<field>"
    const colonIdx = measure.indexOf(':')
    if (colonIdx === -1) return null
    const aggFunc = measure.slice(0, colonIdx)
    const colId = measure.slice(colonIdx + 1)
    valueCol = { colId, label: colId, aggFunc }
  }

  // Map breakdown → pivot column (date stays as default row group)
  const initialPivotCols: ZoneCol[] | undefined = breakdown
    ? [{ colId: breakdown, label: breakdown }]
    : undefined

  // Collect filter_ params
  const initialPivotFilters: FilterEntry[] = []
  for (const [key, value] of params.entries()) {
    if (key.startsWith('filter_')) {
      const field = key.slice('filter_'.length)
      initialPivotFilters.push({ field, fieldLabel: field, value })
    }
  }

  return {
    initialValueCols: [valueCol],
    initialPivotCols,
    initialPivotFilters,
  }
}
