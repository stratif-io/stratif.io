export const DEFAULT_AGG_FUNCS = ['sum', 'count', 'avg', 'min', 'max', 'countDistinct']

// Both camelCase (internal UI) and snake_case (backend API normalization) are mapped
// so AggBadge renders correctly regardless of which format the parent uses.
export const AGG_SYMBOLS: Record<string, string> = {
  sum: 'Σ',
  count: 'n',
  avg: 'avg',
  min: 'min',
  max: 'max',
  countDistinct: '#',
  count_distinct: '#',
}

// Both camelCase (internal UI) and snake_case (backend API normalization) are mapped
// so AggBadge renders correctly regardless of which format the parent uses.
export const AGG_LABELS: Record<string, string> = {
  sum: 'Σ Sum',
  count: 'n Count',
  avg: 'avg Avg',
  min: 'min Min',
  max: 'max Max',
  countDistinct: '# Distinct',
  count_distinct: '# Distinct',
}
