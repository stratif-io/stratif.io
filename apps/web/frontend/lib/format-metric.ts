/**
 * Format a metric value for display in Mission Control KPI cards.
 * Returns a compact, human-readable string appropriate for the metric type.
 */
export function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'avg_session_duration_sec':
      return formatDuration(value)
    case 'dau_mau_ratio':
      return `${(value * 100).toFixed(1)}%`
    case 'avg_events_per_session':
      return value.toFixed(1)
    default:
      return formatCompactNumber(value)
  }
}

/**
 * Compute period-over-period % change.
 * Returns null if previous is 0 (avoid division by zero → show "—").
 */
export function computePctChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null
  return ((current - previous) / previous) * 100
}

function formatDuration(sec: number): string {
  let m = Math.floor(sec / 60)
  let s = Math.round(sec % 60)
  if (s === 60) {
    m += 1
    s = 0
  }
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.?0+$/, '')}K`
  }
  return String(Math.round(n))
}
