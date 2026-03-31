import { z } from 'zod'

export const DateRangeSchema = z.object({
  from: z.date(),
  to: z.date(),
})

export const EventSchema = z.object({
  user_id: z.string().min(1),
  event_name: z.string().min(1),
  timestamp: z.string().datetime().or(z.string()),
  properties: z.record(z.unknown()),
})

export const EventsResponseSchema = z.object({
  events: z.array(z.string().min(1)),
})

export const RawEventsResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  data: z.array(EventSchema),
})

export const SessionSchema = z.object({
  session_id: z.string().min(1),
  user_id: z.string().min(1),
  start_time: z.string().datetime().or(z.string()),
  duration_sec: z.number().nonnegative(),
  event_count: z.number().int().nonnegative(),
})

export const SessionsResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  data: z.array(SessionSchema),
})

export const SessionsSummarySchema = z.object({
  avg_duration_sec: z.number().nonnegative(),
  total_sessions: z.number().int().nonnegative(),
  avg_events_per_session: z.number().nonnegative(),
})

export const SessionsSummaryResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  data: z.array(SessionsSummarySchema),
})

export const RetentionCohortSchema = z.object({
  cohort_date: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  cohort_size: z.number().int().nonnegative(),
  retention_series: z.array(z.number()),
  milestone_values: z.array(z.number()),
})

export const RetentionResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  granularity: z.string(),
  milestones: z.array(z.number().int()),
  total_available_cohorts: z.number().int().nonnegative(),
  data: z.array(RetentionCohortSchema),
})

export const PathDataSchema = z.object({
  path: z.string(),
  step_3: z.string(),
  step_2: z.string(),
  step_1: z.string(),
  target: z.string(),
  device_type: z.string(),
  count: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
})

export const PathsResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  target_event: z.string(),
  device_type: z.string().nullable(),
  total_occurrences: z.number().int().nonnegative(),
  data: z.array(PathDataSchema),
})

export const PathAnalysisDataSchema = z.object({
  path: z.string(),
  path_length: z.number().int().min(2),
  occurrence_count: z.number().int().nonnegative(),
  unique_users: z.number().int().nonnegative(),
  unique_sessions: z.number().int().nonnegative(),
  percentage_of_total: z.number().min(0).max(100),
  avg_time_to_complete: z.number().nullable(),
  median_time_to_complete: z.number().nullable(),
})

export const PathAnalysisResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  start_event: z.string().nullable(),
  end_event: z.string().nullable(),
  min_path_length: z.number().int().min(2),
  max_path_length: z.number().int().min(2),
  max_time_between_events: z.number().nullable(),
  time_unit: z.string(),
  group_by: z.string(),
  date_range: z.array(z.string()).length(2).nullable(),
  event_filters: z.record(z.unknown()).nullable(),
  total_paths: z.number().int().nonnegative(),
  data: z.array(PathAnalysisDataSchema),
})

export const FunnelStepDataSchema = z.object({
  step: z.number().int().positive(),
  event: z.string(),
  occurrences: z.number().int().nonnegative(),
  users: z.number().int().nonnegative(),
  step_conversion_rate: z.number().min(0).max(100),
  overall_conversion_rate: z.number().min(0).max(100),
  dropoff_rate: z.number().min(0).max(100),
  dropoff_users: z.number().int().nonnegative(),
})

export const PathFunnelResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  events: z.array(z.string()),
  total_steps: z.number().int().positive(),
  data: z.array(FunnelStepDataSchema),
})

export const ConversionDataSchema = z.object({
  total_users: z.number().int().nonnegative(),
  converted_users: z.number().int().nonnegative(),
  conversion_rate_percent: z.number().min(0).max(100),
})

export const ConversionResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  data: z.array(ConversionDataSchema),
})

export const ApiErrorSchema = z.object({
  detail: z.string(),
})

export const MetricCardSchema = z.object({
  title: z.string(),
  value: z.string(),
  change: z.number(),
  changeType: z.enum(['positive', 'negative', 'neutral']),
  description: z.string(),
})

export type DateRangeType = z.infer<typeof DateRangeSchema>
export type EventType = z.infer<typeof EventSchema>
export type EventsResponseType = z.infer<typeof EventsResponseSchema>
export type RawEventsResponseType = z.infer<typeof RawEventsResponseSchema>
export type SessionType = z.infer<typeof SessionSchema>
export type SessionsResponseType = z.infer<typeof SessionsResponseSchema>
export type SessionsSummaryType = z.infer<typeof SessionsSummarySchema>
export type SessionsSummaryResponseType = z.infer<typeof SessionsSummaryResponseSchema>
export type RetentionCohortType = z.infer<typeof RetentionCohortSchema>
export type RetentionResponseType = z.infer<typeof RetentionResponseSchema>
export type PathDataType = z.infer<typeof PathDataSchema>
export type PathsResponseType = z.infer<typeof PathsResponseSchema>
export type PathAnalysisDataType = z.infer<typeof PathAnalysisDataSchema>
export type PathAnalysisResponseType = z.infer<typeof PathAnalysisResponseSchema>
export type FunnelStepDataType = z.infer<typeof FunnelStepDataSchema>
export type PathFunnelResponseType = z.infer<typeof PathFunnelResponseSchema>
export type ConversionDataType = z.infer<typeof ConversionDataSchema>
export type ConversionResponseType = z.infer<typeof ConversionResponseSchema>
export type ApiErrorType = z.infer<typeof ApiErrorSchema>
export type MetricCardType = z.infer<typeof MetricCardSchema>

export const UserSummarySchema = z.object({
  user_id: z.string(),
  event_count: z.number().int().nonnegative(),
  first_seen: z.string(),
  last_seen: z.string(),
})

export const UserListResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  data: z.array(UserSummarySchema),
})

export type UserSummaryType = z.infer<typeof UserSummarySchema>
export type UserListResponseType = z.infer<typeof UserListResponseSchema>

// Connections

export const DbTypeSchema = z.enum(['duckdb', 'databricks', 'postgresql', 'sqlite'])

export const PropertyTypeSchema = z.enum(['string', 'number', 'boolean', 'timestamp'])

export const CustomPropertySchema = z.object({
  name: z.string().min(1),
  path: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_.]*$/),
  type: PropertyTypeSchema,
  flatten: z.boolean().optional(),
  category: z.string().optional(),
})

export const ConnectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  db_type: DbTypeSchema,
  created_at: z.string(),
  updated_at: z.string(),
})

export const SchemaConfigSchema = z.object({
  id: z.string().uuid(),
  connection_id: z.string().uuid(),
  user_id_field: z.string().min(1),
  timestamp_field: z.string().min(1),
  event_name_field: z.string().min(1),
  custom_properties: z.array(CustomPropertySchema),
  updated_at: z.string(),
})

export const FilterFieldSchema = z.object({
  field: z.string(),
  label: z.string(),
  icon: z.string(),
})

export const FilterConfigSchema = z.object({
  id: z.string().uuid(),
  connection_id: z.string().uuid(),
  filter_fields: z.array(FilterFieldSchema),
  updated_at: z.string(),
})

export type ConnectionType = z.infer<typeof ConnectionSchema>
export type SchemaConfigType = z.infer<typeof SchemaConfigSchema>
export type FilterConfigType = z.infer<typeof FilterConfigSchema>
export type CustomPropertyType = z.infer<typeof CustomPropertySchema>

export const MissionControlMetricsSchema = z.object({
  total_events: z.number().int().nonnegative(),
  unique_users: z.number().int().nonnegative(),
  total_sessions: z.number().int().nonnegative(),
  avg_session_duration_sec: z.number().nonnegative(),
  avg_events_per_session: z.number().nonnegative(),
  new_users: z.number().int().nonnegative(),
  returning_users: z.number().int().nonnegative(),
  dau_mau_ratio: z.number().min(0).max(1),
})

export const MissionControlPeriodSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
})

export const MissionControlResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  period: MissionControlPeriodSchema,
  previous_period: MissionControlPeriodSchema,
  current: MissionControlMetricsSchema,
  previous: MissionControlMetricsSchema,
})

export const MissionControlMetricResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  metric: z.string(),
  current: z.number(),
  previous: z.number(),
})

export type MissionControlMetricResponseType = z.infer<typeof MissionControlMetricResponseSchema>

export const MissionControlTrendPointSchema = z.object({
  date: z.string(),
  value: z.number(),
})

export const MissionControlTrendResponseSchema = z.object({
  sql: z.union([z.string(), z.array(z.string())]).optional(),
  metric: z.string(),
  data: z.array(MissionControlTrendPointSchema),
})

export type MissionControlMetricsType = z.infer<typeof MissionControlMetricsSchema>
export type MissionControlResponseType = z.infer<typeof MissionControlResponseSchema>

export const QueryStudioResponseSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())),
  execution_time_ms: z.number().int().nonnegative(),
  error: z.string().nullable().optional(),
})

export type QueryStudioResponseType = z.infer<typeof QueryStudioResponseSchema>
export type MissionControlTrendResponseType = z.infer<typeof MissionControlTrendResponseSchema>
