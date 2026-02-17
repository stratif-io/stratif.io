import {
  AuthUser,
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
  SandboxDataResponse,
  FilterOptionsResponse,
  Connection,
  ConnectionCreate,
  ConnectionUpdate,
  SchemaConfig,
  SchemaConfigBody,
  FilterConfig,
  FilterConfigBody,
  SchemaDetectResponse,
} from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const headers: HeadersInit = {
  'Content-Type': 'application/json',
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: { ...headers, ...options?.headers },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return response.json()
}

/** Serialize active filters (Record<string, string|null>) to a JSON query param, omitting nulls. */
function serializeFilters(filters?: Record<string, string | null>): string | undefined {
  if (!filters) return undefined
  const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== null))
  return Object.keys(active).length > 0 ? JSON.stringify(active) : undefined
}

export const fetchTrend = (params: {
  event_name?: string
  granularity?: string
  start_date?: string
  end_date?: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.event_name) searchParams.set('event_name', params.event_name)
  if (params.granularity) searchParams.set('granularity', params.granularity)
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<TrendResponse>(`/api/trend?${searchParams}`)
}

export const fetchEvents = (connection_id?: string) => {
  const searchParams = new URLSearchParams()
  if (connection_id) searchParams.set('connection_id', connection_id)
  return fetchApi<EventsResponse>(`/api/events?${searchParams}`)
}

export const fetchTopEvents = (params: {
  limit?: number
  start_date?: string
  end_date?: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<TopEventsResponse>(`/api/events/top?${searchParams}`)
}

export const fetchRawEvents = (params: {
  limit?: number
  offset?: number
  event_name?: string
  start_date?: string
  end_date?: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))
  if (params.event_name) searchParams.set('event_name', params.event_name)
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<RawEventsResponse>(`/api/raw/events?${searchParams}`)
}

export const fetchSessions = (params: { limit?: number; offset?: number; connection_id?: string }) => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<SessionsResponse>(`/api/raw/sessions?${searchParams}`)
}

export const fetchSessionsSummary = (params: { start_date?: string; end_date?: string; connection_id?: string }) => {
  const searchParams = new URLSearchParams()
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<SessionsSummaryResponse>(`/api/sessions/summary?${searchParams}`)
}

export const fetchRetention = (params: {
  start_date?: string
  end_date?: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<RetentionResponse>(`/api/retention?${searchParams}`)
}

export const fetchPaths = (params: {
  target_event: string
  device_type?: string
  limit?: number
  start_date?: string
  end_date?: string
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('target_event', params.target_event)
  if (params.device_type) searchParams.set('device_type', params.device_type)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

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
  filters?: Record<string, string | null>
  event_filters?: Record<string, Record<string, unknown>>
  connection_id?: string
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
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.event_filters) searchParams.set('event_filters', JSON.stringify(params.event_filters))
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<PathAnalysisResponse>(`/api/path-analysis?${searchParams}`)
}

export const fetchPathFunnel = (params: {
  events: string[]
  start_date?: string
  end_date?: string
  device_type?: string
  filters?: Record<string, string | null>
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('events', params.events.join(','))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.device_type) searchParams.set('device_type', params.device_type)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)

  return fetchApi<PathFunnelResponse>(`/api/path-funnel?${searchParams}`)
}

export const fetchConversion = (params: { start_date?: string; end_date?: string; connection_id?: string }) => {
  const searchParams = new URLSearchParams()
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<ConversionResponse>(`/api/conversion?${searchParams}`)
}

export const fetchPivotOptions = (connection_id?: string) => {
  const searchParams = new URLSearchParams()
  if (connection_id) searchParams.set('connection_id', connection_id)
  return fetchApi<PivotOptionsResponse>(`/api/pivot/options?${searchParams}`)
}

export const fetchPivot = (params: {
  row_dimensions: string[]
  column_dimensions?: string[]
  measures: string[]
  start_date?: string
  end_date?: string
  event_filter?: string
  filters?: Record<string, string | null>
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('row_dimensions', params.row_dimensions.join(','))
  searchParams.set('column_dimensions', (params.column_dimensions || []).join(','))
  searchParams.set('measures', params.measures.join(','))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.event_filter) searchParams.set('event_filter', params.event_filter)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)

  return fetchApi<PivotResponse>(`/api/pivot?${searchParams}`)
}

export const fetchSandboxData = (params: { start_date?: string; end_date?: string }) => {
  const searchParams = new URLSearchParams()
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)

  return fetchApi<SandboxDataResponse>(`/api/sandbox/data?${searchParams}`)
}

// Connections

export const fetchConnections = () => fetchApi<Connection[]>('/api/connections')

export const fetchConnection = (id: string) => fetchApi<Connection>(`/api/connections/${id}`)

export const createConnection = (body: ConnectionCreate) =>
  fetchApi<Connection>('/api/connections', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateConnection = (id: string, body: ConnectionUpdate) =>
  fetchApi<Connection>(`/api/connections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteConnection = (id: string) =>
  fetchApi<void>(`/api/connections/${id}`, { method: 'DELETE' })

export const testConnection = (id: string) =>
  fetchApi<{ ok: boolean; db_type: string }>(`/api/connections/${id}/test`, { method: 'POST' })

export const fetchSchemaConfig = (connId: string) =>
  fetchApi<SchemaConfig>(`/api/connections/${connId}/schema`)

export const upsertSchemaConfig = (connId: string, body: SchemaConfigBody) =>
  fetchApi<SchemaConfig>(`/api/connections/${connId}/schema`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const fetchFilterConfig = (connId: string) =>
  fetchApi<FilterConfig>(`/api/connections/${connId}/filters`)

export const upsertFilterConfig = (connId: string, body: FilterConfigBody) =>
  fetchApi<FilterConfig>(`/api/connections/${connId}/filters`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const fetchFilterOptions = (connId: string) =>
  fetchApi<FilterOptionsResponse>(`/api/connections/${connId}/filter-options`)

export const fetchSchemaDetect = (connId: string) =>
  fetchApi<SchemaDetectResponse>(`/api/connections/${connId}/schema/detect`)

// Auth

export const fetchMe = async (): Promise<AuthUser | null> => {
  try {
    return await fetchApi<AuthUser>('/api/auth/me')
  } catch {
    return null
  }
}

export const loginUser = (body: { email: string; password: string }) =>
  fetchApi<AuthUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const registerUser = (body: { email: string; password: string; display_name: string }) =>
  fetchApi<AuthUser>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const logoutUser = () =>
  fetchApi<void>('/api/auth/logout', { method: 'POST' })

export const initiateGoogleAuth = () =>
  fetchApi<{ redirect_url: string }>('/api/auth/google')
