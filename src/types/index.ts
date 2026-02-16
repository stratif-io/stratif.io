export interface DateRange {
  from: Date
  to: Date
}

export interface TrendData {
  date: string
  count: number
}

export interface TrendResponse {
  data: TrendData[]
}

export interface Event {
  user_id: string
  event_name: string
  timestamp: string
  properties: Record<string, unknown>
  session_id?: string
  device_type?: string
}

export interface EventsResponse {
  events: string[]
}

export interface RawEventsResponse {
  total: number
  limit: number
  offset: number
  data: Event[]
}

export interface Session {
  session_id: string
  user_id: string
  start_time: string
  duration_sec: number
  event_count: number
  device_type?: string
}

export interface SessionsResponse {
  total: number
  limit: number
  offset: number
  data: Session[]
}

export interface SessionsSummary {
  avg_duration_sec: number
  total_sessions: number
  avg_events_per_session: number
}

export interface SessionsSummaryResponse {
  data: SessionsSummary[]
}

export interface RetentionCohort {
  cohort_date: string
  cohort_size: number
  total_users?: number
  day_0_percent: number
  day_1_percent: number
  day_7_percent: number
  day_14_percent: number
  day_30_percent: number
  day_1_retention?: number
  day_7_retention?: number
  day_14_retention?: number
  day_30_retention?: number
}

export interface RetentionResponse {
  data: RetentionCohort[]
}

export interface PathData {
  path: string[]
  step_3: string
  step_2: string
  step_1: string
  target: string
  device_type: string
  count: number
  percentage: number
}

export interface PathsResponse {
  target_event: string
  device_type: string | null
  total_occurrences: number
  data: PathData[]
}

export interface ConversionData {
  total_users: number
  converted_users: number
  conversion_rate_percent: number
}

export interface ConversionResponse {
  data: ConversionData[]
}

export interface ApiError {
  detail: string
}

export interface MetricCard {
  title: string
  value: string
  change: number
  changeType: 'positive' | 'negative' | 'neutral'
  description: string
}
