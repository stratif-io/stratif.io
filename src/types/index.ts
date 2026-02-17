export interface AuthUser {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  last_login_at: string | null
}

export interface DateRange {
  from: Date
  to: Date
}

export interface TrendData {
  date: string
  count: number
  unique_users: number
}

export interface TrendResponse {
  total_unique_users: number
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

export interface TopEventsResponse {
  data: Array<{ name: string; count: number }>
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

export interface PathAnalysisData {
  path: string
  path_length: number
  occurrence_count: number
  unique_users: number
  percentage_of_total: number
  avg_time_to_complete: number | null
  median_time_to_complete: number | null
}

export interface PathAnalysisResponse {
  start_event: string | null
  end_event: string | null
  min_path_length: number
  max_path_length: number
  max_time_between_events: number | null
  time_unit: string
  group_by: string
  date_range: [string, string] | null
  event_filters: Record<string, Record<string, unknown>> | null
  total_paths: number
  data: PathAnalysisData[]
}

export interface FunnelStepData {
  step: number
  event: string
  occurrences: number
  users: number
  step_conversion_rate: number
  overall_conversion_rate: number
  dropoff_rate: number
  dropoff_users: number
}

export interface PathFunnelResponse {
  events: string[]
  total_steps: number
  data: FunnelStepData[]
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

export interface PivotOptionsResponse {
  dimensions: Array<{ value: string; label: string }>
  measures: Array<{ value: string; label: string }>
  event_names: string[]
  /** Dynamic filter options keyed by field name, e.g. { country: [...], browser: [...] } */
  [key: string]: string[] | Array<{ value: string; label: string }>
}

export interface PivotResponse {
  dimensions: string[]
  column_dimensions?: string[]
  column_headers?: Array<Record<string, unknown>>
  measures: string[]
  data: Array<Record<string, unknown>>
  pivoted?: boolean
  error?: string
}

export interface SandboxField {
  fid: string
  name: string
  semanticType: 'nominal' | 'temporal' | 'quantitative' | 'ordinal'
  analyticType: 'dimension' | 'measure'
}

export interface SandboxDataResponse {
  data: Array<Record<string, unknown>>
  fields: SandboxField[]
}

// Connections

export type DbType = 'duckdb' | 'databricks' | 'postgresql' | 'sqlite'
export type PropertyType = 'string' | 'number' | 'boolean' | 'timestamp'

export interface CustomProperty {
  name: string
  path: string
  type: PropertyType
}

export interface SchemaDetectColumn {
  name: string
  type: string
}

export interface SchemaDetectResponse {
  tables: string[]
  events_table?: string
  columns: SchemaDetectColumn[]
  suggestions: {
    user_id_field?: string
    timestamp_field?: string
    event_name_field?: string
  }
  proposed_custom_properties: Array<{ name: string; path: string; type: PropertyType }>
}

export interface Connection {
  id: string
  name: string
  db_type: DbType
  created_at: string
  updated_at: string
}

export interface SchemaConfig {
  id: string
  connection_id: string
  user_id_field: string
  timestamp_field: string
  event_name_field: string
  custom_properties: CustomProperty[]
  updated_at: string
}

export interface FilterField {
  field: string
  label: string
  icon: string
}

export type FilterOptionsResponse = Record<string, string[]>

export interface FilterConfig {
  id: string
  connection_id: string
  filter_fields: FilterField[]
  updated_at: string
}

export interface ConnectionCreate {
  name: string
  db_type: DbType
  credentials: Record<string, unknown>
}

export interface ConnectionUpdate {
  name?: string
  credentials?: Record<string, unknown>
}

export interface SchemaConfigBody {
  user_id_field: string
  timestamp_field: string
  event_name_field: string
  custom_properties: CustomProperty[]
}

export interface FilterConfigBody {
  filter_fields: FilterField[]
}
