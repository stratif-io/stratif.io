import { describe, it, expect } from 'vitest'
import {
  DateRangeSchema,
  TrendDataSchema,
  TrendResponseSchema,
  EventSchema,
  EventsResponseSchema,
  RawEventsResponseSchema,
  SessionSchema,
  SessionsResponseSchema,
  SessionsSummarySchema,
  RetentionCohortSchema,
  PathDataSchema,
  PathsResponseSchema,
  PathAnalysisDataSchema,
  PathAnalysisResponseSchema,
  FunnelStepDataSchema,
  PathFunnelResponseSchema,
  ConversionDataSchema,
  ApiErrorSchema,
  MetricCardSchema,
} from '../api-schemas'

describe('DateRangeSchema', () => {
  it('validates valid date range', () => {
    const result = DateRangeSchema.safeParse({
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31'),
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing from date', () => {
    const result = DateRangeSchema.safeParse({
      to: new Date('2024-01-31'),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing to date', () => {
    const result = DateRangeSchema.safeParse({
      from: new Date('2024-01-01'),
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date type', () => {
    const result = DateRangeSchema.safeParse({
      from: 'not a date',
      to: new Date(),
    })
    expect(result.success).toBe(false)
  })
})

describe('TrendDataSchema', () => {
  it('validates valid trend data with datetime string', () => {
    const result = TrendDataSchema.safeParse({
      date: '2024-01-01T00:00:00Z',
      count: 100,
      unique_users: 50,
    })
    expect(result.success).toBe(true)
  })

  it('validates valid trend data with date string', () => {
    const result = TrendDataSchema.safeParse({
      date: '2024-01-01',
      count: 50,
      unique_users: 25,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = TrendDataSchema.safeParse({
      date: '01/01/2024',
      count: 100,
      unique_users: 50,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative count', () => {
    const result = TrendDataSchema.safeParse({
      date: '2024-01-01',
      count: -1,
      unique_users: 50,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer count', () => {
    const result = TrendDataSchema.safeParse({
      date: '2024-01-01',
      count: 1.5,
      unique_users: 50,
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero count', () => {
    const result = TrendDataSchema.safeParse({
      date: '2024-01-01',
      count: 0,
      unique_users: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('TrendResponseSchema', () => {
  it('validates valid trend response', () => {
    const result = TrendResponseSchema.safeParse({
      total_unique_users: 100,
      data: [
        { date: '2024-01-01', count: 100, unique_users: 50 },
        { date: '2024-01-02', count: 150, unique_users: 75 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('validates empty data array', () => {
    const result = TrendResponseSchema.safeParse({ total_unique_users: 0, data: [] })
    expect(result.success).toBe(true)
  })

  it('rejects invalid data in array', () => {
    const result = TrendResponseSchema.safeParse({
      data: [{ date: '2024-01-01', count: -1 }],
    })
    expect(result.success).toBe(false)
  })
})

describe('EventSchema', () => {
  it('validates valid event', () => {
    const result = EventSchema.safeParse({
      user_id: 'user-123',
      event_name: 'click',
      timestamp: '2024-01-01T00:00:00Z',
      properties: { button: 'submit' },
    })
    expect(result.success).toBe(true)
  })

  it('validates event with empty properties', () => {
    const result = EventSchema.safeParse({
      user_id: 'user-123',
      event_name: 'click',
      timestamp: '2024-01-01T00:00:00Z',
      properties: {},
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty user_id', () => {
    const result = EventSchema.safeParse({
      user_id: '',
      event_name: 'click',
      timestamp: '2024-01-01T00:00:00Z',
      properties: {},
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty event_name', () => {
    const result = EventSchema.safeParse({
      user_id: 'user-123',
      event_name: '',
      timestamp: '2024-01-01T00:00:00Z',
      properties: {},
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing properties', () => {
    const result = EventSchema.safeParse({
      user_id: 'user-123',
      event_name: 'click',
      timestamp: '2024-01-01T00:00:00Z',
    })
    expect(result.success).toBe(false)
  })
})

describe('EventsResponseSchema', () => {
  it('validates valid events response', () => {
    const result = EventsResponseSchema.safeParse({
      events: ['click', 'view', 'submit'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty event names', () => {
    const result = EventsResponseSchema.safeParse({
      events: ['click', '', 'submit'],
    })
    expect(result.success).toBe(false)
  })

  it('validates empty events array', () => {
    const result = EventsResponseSchema.safeParse({ events: [] })
    expect(result.success).toBe(true)
  })
})

describe('RawEventsResponseSchema', () => {
  it('validates valid raw events response', () => {
    const result = RawEventsResponseSchema.safeParse({
      total: 100,
      limit: 50,
      offset: 0,
      data: [
        {
          user_id: 'user-1',
          event_name: 'click',
          timestamp: '2024-01-01T00:00:00Z',
          properties: {},
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative total', () => {
    const result = RawEventsResponseSchema.safeParse({
      total: -1,
      limit: 50,
      offset: 0,
      data: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero limit', () => {
    const result = RawEventsResponseSchema.safeParse({
      total: 100,
      limit: 0,
      offset: 0,
      data: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative offset', () => {
    const result = RawEventsResponseSchema.safeParse({
      total: 100,
      limit: 50,
      offset: -1,
      data: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero offset', () => {
    const result = RawEventsResponseSchema.safeParse({
      total: 100,
      limit: 50,
      offset: 0,
      data: [],
    })
    expect(result.success).toBe(true)
  })
})

describe('SessionSchema', () => {
  it('validates valid session', () => {
    const result = SessionSchema.safeParse({
      session_id: 'session-123',
      user_id: 'user-123',
      start_time: '2024-01-01T00:00:00Z',
      duration_sec: 300,
      event_count: 10,
    })
    expect(result.success).toBe(true)
  })

  it('accepts zero duration', () => {
    const result = SessionSchema.safeParse({
      session_id: 'session-123',
      user_id: 'user-123',
      start_time: '2024-01-01T00:00:00Z',
      duration_sec: 0,
      event_count: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative duration', () => {
    const result = SessionSchema.safeParse({
      session_id: 'session-123',
      user_id: 'user-123',
      start_time: '2024-01-01T00:00:00Z',
      duration_sec: -1,
      event_count: 10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative event_count', () => {
    const result = SessionSchema.safeParse({
      session_id: 'session-123',
      user_id: 'user-123',
      start_time: '2024-01-01T00:00:00Z',
      duration_sec: 300,
      event_count: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer event_count', () => {
    const result = SessionSchema.safeParse({
      session_id: 'session-123',
      user_id: 'user-123',
      start_time: '2024-01-01T00:00:00Z',
      duration_sec: 300,
      event_count: 1.5,
    })
    expect(result.success).toBe(false)
  })
})

describe('SessionsResponseSchema', () => {
  it('validates valid sessions response', () => {
    const result = SessionsResponseSchema.safeParse({
      total: 100,
      limit: 50,
      offset: 0,
      data: [
        {
          session_id: 'session-1',
          user_id: 'user-1',
          start_time: '2024-01-01T00:00:00Z',
          duration_sec: 300,
          event_count: 10,
        },
      ],
    })
    expect(result.success).toBe(true)
  })
})

describe('SessionsSummarySchema', () => {
  it('validates valid sessions summary', () => {
    const result = SessionsSummarySchema.safeParse({
      avg_duration_sec: 150.5,
      total_sessions: 1000,
      avg_events_per_session: 12.3,
    })
    expect(result.success).toBe(true)
  })

  it('accepts zero values', () => {
    const result = SessionsSummarySchema.safeParse({
      avg_duration_sec: 0,
      total_sessions: 0,
      avg_events_per_session: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative values', () => {
    const result = SessionsSummarySchema.safeParse({
      avg_duration_sec: -1,
      total_sessions: 100,
      avg_events_per_session: 10,
    })
    expect(result.success).toBe(false)
  })
})

describe('RetentionCohortSchema', () => {
  it('validates valid retention cohort', () => {
    const result = RetentionCohortSchema.safeParse({
      cohort_date: '2024-01-01',
      cohort_size: 100,
      retention_series: [100, 80, 70, 60, 50, 40, 30],
      milestone_values: [80, 50, 30, 20],
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty series arrays', () => {
    const result = RetentionCohortSchema.safeParse({
      cohort_date: '2024-01-01',
      cohort_size: 100,
      retention_series: [],
      milestone_values: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative cohort_size', () => {
    const result = RetentionCohortSchema.safeParse({
      cohort_date: '2024-01-01',
      cohort_size: -1,
      retention_series: [100],
      milestone_values: [80],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing retention_series', () => {
    const result = RetentionCohortSchema.safeParse({
      cohort_date: '2024-01-01',
      cohort_size: 100,
      milestone_values: [80],
    })
    expect(result.success).toBe(false)
  })
})

describe('PathDataSchema', () => {
  it('validates valid path data', () => {
    const result = PathDataSchema.safeParse({
      path: '/home',
      step_3: '/products',
      step_2: '/cart',
      step_1: '/checkout',
      target: '/purchase',
      device_type: 'desktop',
      count: 100,
      percentage: 25.5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects percentage over 100', () => {
    const result = PathDataSchema.safeParse({
      path: '/home',
      step_3: '/products',
      step_2: '/cart',
      step_1: '/checkout',
      target: '/purchase',
      device_type: 'desktop',
      count: 100,
      percentage: 101,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative count', () => {
    const result = PathDataSchema.safeParse({
      path: '/home',
      step_3: '/products',
      step_2: '/cart',
      step_1: '/checkout',
      target: '/purchase',
      device_type: 'desktop',
      count: -1,
      percentage: 25,
    })
    expect(result.success).toBe(false)
  })
})

describe('PathsResponseSchema', () => {
  it('validates valid paths response', () => {
    const result = PathsResponseSchema.safeParse({
      target_event: 'purchase',
      device_type: 'desktop',
      total_occurrences: 1000,
      data: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts null device_type', () => {
    const result = PathsResponseSchema.safeParse({
      target_event: 'purchase',
      device_type: null,
      total_occurrences: 1000,
      data: [],
    })
    expect(result.success).toBe(true)
  })
})

describe('PathAnalysisDataSchema', () => {
  it('validates valid path analysis data', () => {
    const result = PathAnalysisDataSchema.safeParse({
      path: 'Home -> Products -> Purchase',
      path_length: 3,
      occurrence_count: 100,
      unique_users: 50,
      unique_sessions: 40,
      percentage_of_total: 25.5,
      avg_time_to_complete: 120,
      median_time_to_complete: 100,
    })
    expect(result.success).toBe(true)
  })

  it('accepts null time values', () => {
    const result = PathAnalysisDataSchema.safeParse({
      path: 'Home -> Purchase',
      path_length: 2,
      occurrence_count: 10,
      unique_users: 5,
      unique_sessions: 4,
      percentage_of_total: 10,
      avg_time_to_complete: null,
      median_time_to_complete: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects path_length less than 2', () => {
    const result = PathAnalysisDataSchema.safeParse({
      path: 'Home',
      path_length: 1,
      occurrence_count: 10,
      unique_users: 5,
      percentage_of_total: 10,
      avg_time_to_complete: null,
      median_time_to_complete: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative occurrence_count', () => {
    const result = PathAnalysisDataSchema.safeParse({
      path: 'Home -> Purchase',
      path_length: 2,
      occurrence_count: -1,
      unique_users: 5,
      percentage_of_total: 10,
      avg_time_to_complete: null,
      median_time_to_complete: null,
    })
    expect(result.success).toBe(false)
  })
})

describe('PathAnalysisResponseSchema', () => {
  it('validates valid path analysis response', () => {
    const result = PathAnalysisResponseSchema.safeParse({
      start_event: 'Home',
      end_event: 'Purchase',
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: 60,
      time_unit: 'minutes',
      group_by: 'user_id',
      date_range: ['2026-01-01', '2026-01-31'],
      event_filters: null,
      total_paths: 10,
      data: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts null values for optional fields', () => {
    const result = PathAnalysisResponseSchema.safeParse({
      start_event: null,
      end_event: null,
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: null,
      time_unit: 'seconds',
      group_by: 'user_id',
      date_range: null,
      event_filters: null,
      total_paths: 0,
      data: [],
    })
    expect(result.success).toBe(true)
  })
})

describe('FunnelStepDataSchema', () => {
  it('validates valid funnel step data', () => {
    const result = FunnelStepDataSchema.safeParse({
      step: 1,
      event: 'Home',
      occurrences: 100,
      users: 50,
      step_conversion_rate: 100,
      overall_conversion_rate: 100,
      dropoff_rate: 0,
      dropoff_users: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects conversion rate over 100', () => {
    const result = FunnelStepDataSchema.safeParse({
      step: 1,
      event: 'Home',
      occurrences: 100,
      users: 50,
      step_conversion_rate: 101,
      overall_conversion_rate: 100,
      dropoff_rate: 0,
      dropoff_users: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects step zero', () => {
    const result = FunnelStepDataSchema.safeParse({
      step: 0,
      event: 'Home',
      occurrences: 100,
      users: 50,
      step_conversion_rate: 100,
      overall_conversion_rate: 100,
      dropoff_rate: 0,
      dropoff_users: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('PathFunnelResponseSchema', () => {
  it('validates valid path funnel response', () => {
    const result = PathFunnelResponseSchema.safeParse({
      events: ['Home', 'Products', 'Purchase'],
      total_steps: 3,
      data: [
        {
          step: 1,
          event: 'Home',
          occurrences: 100,
          users: 50,
          step_conversion_rate: 100,
          overall_conversion_rate: 100,
          dropoff_rate: 0,
          dropoff_users: 0,
        },
        {
          step: 2,
          event: 'Products',
          occurrences: 60,
          users: 30,
          step_conversion_rate: 60,
          overall_conversion_rate: 60,
          dropoff_rate: 40,
          dropoff_users: 20,
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('requires at least one step', () => {
    const result = PathFunnelResponseSchema.safeParse({
      events: ['Home'],
      total_steps: 0,
      data: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('ConversionDataSchema', () => {
  it('validates valid conversion data', () => {
    const result = ConversionDataSchema.safeParse({
      total_users: 1000,
      converted_users: 250,
      conversion_rate_percent: 25,
    })
    expect(result.success).toBe(true)
  })

  it('accepts zero conversion rate', () => {
    const result = ConversionDataSchema.safeParse({
      total_users: 1000,
      converted_users: 0,
      conversion_rate_percent: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts 100% conversion rate', () => {
    const result = ConversionDataSchema.safeParse({
      total_users: 100,
      converted_users: 100,
      conversion_rate_percent: 100,
    })
    expect(result.success).toBe(true)
  })

  it('rejects conversion rate over 100', () => {
    const result = ConversionDataSchema.safeParse({
      total_users: 100,
      converted_users: 100,
      conversion_rate_percent: 101,
    })
    expect(result.success).toBe(false)
  })
})

describe('ApiErrorSchema', () => {
  it('validates valid api error', () => {
    const result = ApiErrorSchema.safeParse({
      detail: 'Not found',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing detail', () => {
    const result = ApiErrorSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('MetricCardSchema', () => {
  it('validates valid metric card', () => {
    const result = MetricCardSchema.safeParse({
      title: 'Total Users',
      value: '1,234',
      change: 12.5,
      changeType: 'positive',
      description: 'from last week',
    })
    expect(result.success).toBe(true)
  })

  it('accepts negative change', () => {
    const result = MetricCardSchema.safeParse({
      title: 'Total Users',
      value: '1,234',
      change: -5.2,
      changeType: 'negative',
      description: 'from last week',
    })
    expect(result.success).toBe(true)
  })

  it('accepts neutral changeType', () => {
    const result = MetricCardSchema.safeParse({
      title: 'Total Users',
      value: '1,234',
      change: 0,
      changeType: 'neutral',
      description: 'from last week',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid changeType', () => {
    const result = MetricCardSchema.safeParse({
      title: 'Total Users',
      value: '1,234',
      change: 0,
      changeType: 'invalid',
      description: 'from last week',
    })
    expect(result.success).toBe(false)
  })
})
