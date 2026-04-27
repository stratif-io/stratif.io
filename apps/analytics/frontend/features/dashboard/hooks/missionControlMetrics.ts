// Shared mission-control metric metadata: human-readable labels used for
// query telemetry (groupKey + meta.cardName) and UI display.

export const METRIC_LABELS: Record<string, string> = {
  total_events: 'Total Events',
  unique_users: 'Unique Users',
  wau: 'WAU',
  total_sessions: 'Sessions',
  avg_session_duration_sec: 'Avg Session',
  avg_events_per_session: 'Events / Session',
  avg_active_days: 'Active Days',
  power_users: 'Power Users',
  new_users: 'New Users',
  returning_users: 'Returning Users',
  resurrected_users: 'Resurrected',
  churned_users: 'Churned',
  retention_rate: 'Retention Rate',
  dau_mau_ratio: 'DAU / MAU',
}

export function metricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? metric
}
