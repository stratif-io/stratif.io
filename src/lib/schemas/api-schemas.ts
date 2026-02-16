import { z } from 'zod'

export const DateRangeSchema = z.object({
  from: z.date(),
  to: z.date(),
})

export const TrendDataSchema = z.object({
  date: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  count: z.number().int().nonnegative(),
})

export const TrendResponseSchema = z.object({
  data: z.array(TrendDataSchema),
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
  data: z.array(SessionsSummarySchema),
})

export const RetentionCohortSchema = z.object({
  cohort_date: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  cohort_size: z.number().int().nonnegative(),
  day_0_percent: z.number().min(0).max(100),
  day_1_percent: z.number().min(0).max(100),
  day_7_percent: z.number().min(0).max(100),
  day_14_percent: z.number().min(0).max(100),
  day_30_percent: z.number().min(0).max(100),
})

export const RetentionResponseSchema = z.object({
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
  target_event: z.string(),
  device_type: z.string().nullable(),
  total_occurrences: z.number().int().nonnegative(),
  data: z.array(PathDataSchema),
})

export const ConversionDataSchema = z.object({
  total_users: z.number().int().nonnegative(),
  converted_users: z.number().int().nonnegative(),
  conversion_rate_percent: z.number().min(0).max(100),
})

export const ConversionResponseSchema = z.object({
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
export type TrendDataType = z.infer<typeof TrendDataSchema>
export type TrendResponseType = z.infer<typeof TrendResponseSchema>
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
export type ConversionDataType = z.infer<typeof ConversionDataSchema>
export type ConversionResponseType = z.infer<typeof ConversionResponseSchema>
export type ApiErrorType = z.infer<typeof ApiErrorSchema>
export type MetricCardType = z.infer<typeof MetricCardSchema>
