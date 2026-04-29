export interface BuildPivotUrlOptions {
  measure: string
  breakdownDimension: string | null
  localFilters: Record<string, string[]>
}

/**
 * Encodes the current Trend page state into a /pivot URL with search params
 * so NewPivotPage can pre-seed the Pivot Explorer.
 *
 * Note: only the first value of each filter array is forwarded — Pivot filters
 * are single-valued, so additional values are intentionally dropped.
 */
export function buildPivotUrl({
  measure,
  breakdownDimension,
  localFilters,
}: BuildPivotUrlOptions): string {
  const params = new URLSearchParams()
  params.set('from_trend', '1')
  params.set('measure', measure)
  if (breakdownDimension) {
    params.set('breakdown', breakdownDimension)
  }
  for (const [field, values] of Object.entries(localFilters)) {
    if (values.length > 0) {
      params.set(`filter_${field}`, values[0])
    }
  }
  return `/pivot?${params.toString()}`
}
