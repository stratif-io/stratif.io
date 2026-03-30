export interface AuthUser {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  email_verified: boolean
  created_at: string
  last_login_at: string | null
}

export interface DateRange {
  from: Date | null
  to: Date | null
}

export interface TrendData {
  date: string
  count: number
  unique_users: number
}

export interface TrendResponse {
  sql?: string | string[]
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
  sql?: string | string[]
  data: Array<{ name: string; count: number }>
}

export interface RawEventsResponse {
  sql?: string | string[]
  total: number
  limit: number
  offset: number
  data: Event[]
}

export interface UserEventsResponse {
  sql?: string | string[]
  user_id: string
  limit: number
  offset: number
  data: Event[]
}

export interface UserSummary {
  user_id: string
  event_count: number
  first_seen: string
  last_seen: string
}

export interface UserListResponse {
  sql?: string | string[]
  limit: number
  offset: number
  data: UserSummary[]
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
  sql?: string | string[]
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
  sql?: string | string[]
  data: SessionsSummary[]
}

export interface RetentionCohort {
  cohort_date: string
  cohort_size: number
  retention_series: number[]
  milestone_values: number[]
}

export interface RetentionResponse {
  sql?: string | string[]
  granularity: string
  milestones: number[]
  total_available_cohorts: number
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
  sql?: string | string[]
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
  unique_sessions: number
  percentage_of_total: number
  avg_time_to_complete: number | null
  median_time_to_complete: number | null
}

export interface PathAnalysisResponse {
  sql?: string | string[]
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
  sql?: string | string[]
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
  sql?: string | string[]
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

export interface DimensionOption {
  value: string
  label: string
  category?: string
}

export interface DimensionCategoryConfig {
  id: string
  label: string // includes emoji, e.g. "🕐 Time"
  icon: string // Lucide icon name key for ICON_MAP, e.g. "Globe"
  emoji: string // emoji character, e.g. "👤"
  patterns: string[] // raw regex strings
}

export interface DimensionGroup {
  category: DimensionCategoryConfig
  dimensions: DimensionOption[]
}

export interface PivotOptionsResponse {
  dimensions: DimensionOption[]
  measures: DimensionOption[]
  numeric_dimensions?: DimensionOption[]
  event_names: string[]
  /** Dynamic filter options keyed by field name, e.g. { country: [...], browser: [...] } */
  [key: string]: string[] | DimensionOption[] | undefined
}

export interface PivotResponse {
  sql?: string | string[]
  dimensions: string[]
  column_dimensions?: string[]
  column_headers?: Array<Record<string, unknown>>
  measures: string[]
  data: Array<Record<string, unknown>>
  pivoted?: boolean
  error?: string
}

export interface PivotGridColDefsResponse {
  columnDefs: unknown[]
  error?: string
}

export interface PivotGridRowsRequest {
  rowGroupCols: Array<{ id: string; field: string; aggFunc: string; displayName: string }>
  valueCols: Array<{ id: string; field: string; aggFunc: string; displayName: string }>
  pivotCols: Array<{ id: string; field: string; aggFunc: string; displayName: string }>
  pivotMode: boolean
  groupKeys: (string | number)[]
  filterModel: Record<string, unknown>
  sortModel: Array<{ colId: string; sort: string }>
  startRow: number
  endRow: number
  start_date?: string
  end_date?: string
  event_filter?: string
  extra_filters?: Record<string, string | null>
}

export interface PivotGridRowsResponse {
  rows: Array<Record<string, unknown>>
  rowCount: number
  secondaryColDefs?: unknown[]
  error?: string
  sql?: string | string[]
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

export type DbType =
  | 'duckdb'
  | 'databricks'
  | 'postgresql'
  | 'sqlite'
  | 'snowflake'
  | 'clickhouse'
  | 'bigquery'
  | 'redshift'
  | 'mysql'
export type PropertyType = 'string' | 'number' | 'boolean' | 'timestamp'

export interface CustomProperty {
  id?: string
  name: string
  path: string
  type: PropertyType
  category?: string
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
    email_field?: string
    first_name_field?: string
    last_name_field?: string
    date_of_birth_field?: string
    phone_field?: string
  }
  proposed_custom_properties: Array<{
    name: string
    path: string
    type: PropertyType
    category?: string
  }>
}

export interface Connection {
  id: string
  name: string
  db_type: DbType
  created_at: string
  updated_at: string
  schema_config: SchemaConfig | null
}

export interface SchemaConfig {
  id: string
  connection_id: string
  user_id_field: string
  timestamp_field: string
  event_name_field: string
  events_table: string
  custom_properties: CustomProperty[]
  session_timeout_minutes: number
  resurrection_window_days?: number
  power_user_threshold_days?: number
  email_field?: string | null
  first_name_field?: string | null
  last_name_field?: string | null
  date_of_birth_field?: string | null
  phone_field?: string | null
  updated_at: string
}

export interface TableEntry {
  catalog: string | null
  table_schema: string | null
  name: string
  full_name: string
}

export interface TablesResponse {
  tables: TableEntry[]
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
  events_table: string
  custom_properties: CustomProperty[]
  session_timeout_minutes: number
  resurrection_window_days?: number
  power_user_threshold_days?: number
  email_field?: string | null
  first_name_field?: string | null
  last_name_field?: string | null
  date_of_birth_field?: string | null
  phone_field?: string | null
}

export interface FilterConfigBody {
  filter_fields: FilterField[]
}

export interface MissionControlMetrics {
  total_events: number
  unique_users: number
  total_sessions: number
  avg_session_duration_sec: number
  avg_events_per_session: number
  new_users: number
  returning_users: number
  resurrected_users: number
  churned_users: number
  retention_rate: number
  wau: number
  avg_active_days: number
  power_users: number
  dau_mau_ratio: number
}

export interface MissionControlPeriod {
  start_date?: string
  end_date?: string
}

export type MissionControlMetricsNullable = { [K in keyof MissionControlMetrics]: number | null }

export interface MetricBreakdown {
  retained_count?: number
  prev_unique_users?: number
  avg_dau?: number
  mau_28d?: number
}

export interface MissionControlResponse {
  sql?: string | string[]
  period: MissionControlPeriod
  previous_period: MissionControlPeriod
  current: MissionControlMetrics
  previous: MissionControlMetricsNullable
}

export interface MissionControlMetricResponse {
  sql?: string | string[]
  metric: string
  current: number
  previous: number | null
  breakdown?: MetricBreakdown
}

export interface MissionControlTrendPoint {
  date: string
  value: number
}

export interface MissionControlTrendResponse {
  sql?: string | string[]
  metric: string
  data: MissionControlTrendPoint[]
}

export interface QueryStudioResponse {
  columns: string[]
  rows: unknown[][]
  execution_time_ms: number
  error?: string | null
}
