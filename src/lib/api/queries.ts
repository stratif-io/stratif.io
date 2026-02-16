import {
  TrendResponse,
  EventsResponse,
  RawEventsResponse,
  SessionsResponse,
  SessionsSummaryResponse,
  RetentionResponse,
  PathsResponse,
  ConversionResponse,
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
}) => {
  const searchParams = new URLSearchParams()
  if (params.event_name) searchParams.set('event_name', params.event_name)
  if (params.granularity) searchParams.set('granularity', params.granularity)
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)

  return fetchApi<TrendResponse>(`/api/trend?${searchParams}`)
}

export const fetchEvents = () => fetchApi<EventsResponse>('/api/events')

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

export const fetchConversion = (params: { start_date?: string; end_date?: string }) => {
  const searchParams = new URLSearchParams()
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)

  return fetchApi<ConversionResponse>(`/api/conversion?${searchParams}`)
}
