import {
  TrendResponse,
  EventsResponse,
  TopEventsResponse,
  RawEventsResponse,
  SessionsResponse,
  SessionsSummaryResponse,
  RetentionResponse,
  PathsResponse,
  PathAnalysisResponse,
  PathFunnelResponse,
  ConversionResponse,
  PivotOptionsResponse,
  PivotResponse,
} from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || ''

const headers: HeadersInit = {
  'Content-Type': 'application/json',
  ...(API_KEY && { 'X-Api-Key': API_KEY }),
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export const fetchTrend = (params: {
  event_name?: string
  granularity?: string
  start_date?: string
  end_date?: string
  country?: string
  browser?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.event_name) searchParams.set('event_name', params.event_name)
  if (params.granularity) searchParams.set('granularity', params.granularity)
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.country) searchParams.set('country', params.country)
  if (params.browser) searchParams.set('browser', params.browser)

  return fetchApi<TrendResponse>(`/api/trend?${searchParams}`)
}

export const fetchEvents = () => fetchApi<EventsResponse>('/api/events')

export const fetchTopEvents = (params: {
  limit?: number
  start_date?: string
  end_date?: string
  country?: string
  browser?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.country) searchParams.set('country', params.country)
  if (params.browser) searchParams.set('browser', params.browser)

  return fetchApi<TopEventsResponse>(`/api/events/top?${searchParams}`)
}

export const fetchRawEvents = (params: {
  limit?: number
  offset?: number
  event_name?: string
  start_date?: string
  end_date?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))
  if (params.event_name) searchParams.set('event_name', params.event_name)
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)

  return fetchApi<RawEventsResponse>(`/api/raw/events?${searchParams}`)
}

export const fetchSessions = (params: { limit?: number; offset?: number }) => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  return fetchApi<SessionsResponse>(`/api/raw/sessions?${searchParams}`)
}

export const fetchSessionsSummary = (params: { start_date?: string; end_date?: string }) => {
  const searchParams = new URLSearchParams()
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)

  return fetchApi<SessionsSummaryResponse>(`/api/sessions/summary?${searchParams}`)
}

export const fetchRetention = (params: { start_date?: string; end_date?: string }) => {
  const searchParams = new URLSearchParams()
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)

  return fetchApi<RetentionResponse>(`/api/retention?${searchParams}`)
}

export const fetchPaths = (params: {
  target_event: string
  device_type?: string
  limit?: number
  start_date?: string
  end_date?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('target_event', params.target_event)
  if (params.device_type) searchParams.set('device_type', params.device_type)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)

  return fetchApi<PathsResponse>(`/api/paths?${searchParams}`)
}

export const fetchPathAnalysis = (params: {
  start_event?: string
  end_event?: string
  min_path_length?: number
  max_path_length?: number
  max_time_between_events?: number
  time_unit?: string
  top_n?: number
  group_by?: string
  start_date?: string
  end_date?: string
  event_filters?: Record<string, Record<string, unknown>>
}) => {
  const searchParams = new URLSearchParams()
  if (params.start_event) searchParams.set('start_event', params.start_event)
  if (params.end_event) searchParams.set('end_event', params.end_event)
  if (params.min_path_length) searchParams.set('min_path_length', String(params.min_path_length))
  if (params.max_path_length) searchParams.set('max_path_length', String(params.max_path_length))
  if (params.max_time_between_events)
    searchParams.set('max_time_between_events', String(params.max_time_between_events))
  if (params.time_unit) searchParams.set('time_unit', params.time_unit)
  if (params.top_n) searchParams.set('top_n', String(params.top_n))
  if (params.group_by) searchParams.set('group_by', params.group_by)
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.event_filters) searchParams.set('event_filters', JSON.stringify(params.event_filters))

  return fetchApi<PathAnalysisResponse>(`/api/path-analysis?${searchParams}`)
}

export const fetchPathFunnel = (params: {
  events: string[]
  start_date?: string
  end_date?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('events', params.events.join(','))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)

  return fetchApi<PathFunnelResponse>(`/api/path-funnel?${searchParams}`)
}

export const fetchConversion = (params: { start_date?: string; end_date?: string }) => {
  const searchParams = new URLSearchParams()
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)

  return fetchApi<ConversionResponse>(`/api/conversion?${searchParams}`)
}

export const fetchPivotOptions = () => fetchApi<PivotOptionsResponse>('/api/pivot/options')

export const fetchPivot = (params: {
  row_dimensions: string[]
  measures: string[]
  start_date?: string
  end_date?: string
  event_filter?: string
  country_filter?: string
  browser_filter?: string
  product_category_filter?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('row_dimensions', params.row_dimensions.join(','))
  searchParams.set('measures', params.measures.join(','))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.event_filter) searchParams.set('event_filter', params.event_filter)
  if (params.country_filter) searchParams.set('country_filter', params.country_filter)
  if (params.browser_filter) searchParams.set('browser_filter', params.browser_filter)
  if (params.product_category_filter)
    searchParams.set('product_category_filter', params.product_category_filter)

  return fetchApi<PivotResponse>(`/api/pivot?${searchParams}`)
}
