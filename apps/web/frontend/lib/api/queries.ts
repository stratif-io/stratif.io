import {

  TrendResponse,
  EventsResponse,
  TopEventsResponse,
  RawEventsResponse,
  UserEventsResponse,
  SessionsResponse,
  SessionsSummaryResponse,
  RetentionResponse,
  PathsResponse,
  PathAnalysisResponse,
  PathFunnelResponse,
  ConversionResponse,
  PivotOptionsResponse,
  PivotResponse,
  PivotGridColDefsResponse,
  PivotGridRowsRequest,
  PivotGridRowsResponse,
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
  TablesResponse,
  MissionControlResponse,
  MissionControlMetricResponse,
  MissionControlTrendResponse,
  QueryStudioResponse,
} from '@/types'
import { fetchWithSemaphore } from './semaphore'

const API_URL = import.meta.env.VITE_API_URL || ''

const headers: HeadersInit = {
  'Content-Type': 'application/json',
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithSemaphore(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: { ...headers, ...options?.headers },
  })

  if (response.status === 503) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Connection lost — please retry.')
  }

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
  user_id?: string
  sort_order?: 'asc' | 'desc'
  sort_field?: string
  start_date?: string
  end_date?: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))
  if (params.event_name) searchParams.set('event_name', params.event_name)
  if (params.user_id) searchParams.set('user_id', params.user_id)
  if (params.sort_order) searchParams.set('sort_order', params.sort_order)
  if (params.sort_field) searchParams.set('sort_field', params.sort_field)
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<RawEventsResponse>(`/api/raw/events?${searchParams}`)
}

export const fetchUserEvents = (params: {
  user_id: string
  limit?: number
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)
  return fetchApi<UserEventsResponse>(
    `/api/users/${encodeURIComponent(params.user_id)}/events?${searchParams}`
  )
}

export const fetchRetention = (params: {
  start_date?: string
  end_date?: string
  granularity?: 'day' | 'week' | 'month'
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.granularity) searchParams.set('granularity', params.granularity)
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
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('events', params.events.join(','))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.device_type) searchParams.set('device_type', params.device_type)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)

  return fetchApi<PathFunnelResponse>(`/api/path-funnel?${searchParams}`)
}

export const fetchSessions = (params: {
  limit?: number
  offset?: number
  start_date?: string
  end_date?: string
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.limit != null) searchParams.set('limit', String(params.limit))
  if (params.offset != null) searchParams.set('offset', String(params.offset))
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)
  return fetchApi<SessionsResponse>(`/api/raw/sessions?${searchParams}`)
}

export const fetchSessionsSummary = (params: {
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

  return fetchApi<SessionsSummaryResponse>(`/api/sessions/summary?${searchParams}`)
}

export const fetchConversion = (params: {
  start_date?: string
  end_date?: string
  connection_id?: string
}) => {
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
  connection_id?: string
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
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<PivotResponse>(`/api/pivot?${searchParams}`)
}

export const fetchPivotGridColDefs = (connection_id?: string) => {
  const searchParams = new URLSearchParams()
  if (connection_id) searchParams.set('connection_id', connection_id)
  return fetchApi<PivotGridColDefsResponse>(`/api/pivot/grid?${searchParams}`)
}

export const fetchPivotGridFilterValues = (params: {
  field: string
  start_date?: string
  end_date?: string
  event_filter?: string
  connection_id?: string
}) => {
  const sp = new URLSearchParams({ field: params.field })
  if (params.start_date) sp.set('start_date', params.start_date)
  if (params.end_date) sp.set('end_date', params.end_date)
  if (params.event_filter) sp.set('event_filter', params.event_filter)
  if (params.connection_id) sp.set('connection_id', params.connection_id)
  return fetchApi<{ field: string; values: unknown[] }>(`/api/pivot/grid/filter-values?${sp}`)
}

export const fetchPivotGridRows = (body: PivotGridRowsRequest & { connection_id?: string }) => {
  const sp = new URLSearchParams()
  if (body.connection_id) sp.set('connection_id', body.connection_id)
  const { connection_id: _cid, ...rest } = body
  return fetchApi<PivotGridRowsResponse>(`/api/pivot/grid/rows?${sp}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rest),
  })
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

export const testConnection = (id: string) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Connection timed out')), 11_000)
  return fetchApi<{ ok: boolean; db_type?: string; error?: string }>(
    `/api/connections/${id}/test`,
    { method: 'POST', signal: controller.signal }
  ).finally(() => clearTimeout(timer))
}

export const fetchConnectionString = (connId: string) =>
  fetchApi<{ connection_string: string | null }>(`/api/connections/${connId}/string`)

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

export const fetchFieldOptions = (connId: string, field: string) =>
  fetchApi<{ field: string; values: string[] }>(`/api/connections/${connId}/field-options?field=${encodeURIComponent(field)}`)

export const fetchSchemaDetect = (connId: string, eventsTable?: string) => {
  const qs = eventsTable ? `?events_table=${encodeURIComponent(eventsTable)}` : ''
  return fetchApi<SchemaDetectResponse>(`/api/connections/${connId}/schema/detect${qs}`)
}

export const fetchConnectionTables = (connId: string) =>
  fetchApi<TablesResponse>(`/api/connections/${connId}/tables`)

export const fetchConnectionColumns = (connId: string, table: string) =>
  fetchApi<{ columns: string[] }>(`/api/connections/${connId}/columns?table=${encodeURIComponent(table)}`)

export const fetchBrowse = (connId: string, catalog?: string, schema?: string) => {
  const params = new URLSearchParams()
  if (catalog) params.set('catalog', catalog)
  if (schema) params.set('schema', schema)
  const qs = params.size ? `?${params}` : ''
  return fetchApi<{ items: Array<{ name: string; full_name: string; kind: string }> }>(
    `/api/connections/${connId}/browse${qs}`,
  )
}

export const fetchConnectionCredentials = (connId: string) =>
  fetchApi<{ fields: Record<string, string | null> }>(`/api/connections/${connId}/credentials`)

export const fetchMissionControl = (params: {
  start_date: string
  end_date: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('start_date', params.start_date)
  searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<MissionControlResponse>(`/api/mission-control?${searchParams}`)
}

export const fetchMissionControlTrend = (params: {
  metric: string
  start_date?: string
  end_date?: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('metric', params.metric)
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<MissionControlTrendResponse>(`/api/mission-control/trend?${searchParams}`)
}

export const fetchMissionControlMetric = (params: {
  metric: string
  start_date?: string
  end_date?: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('metric', params.metric)
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<MissionControlMetricResponse>(`/api/mission-control/metric?${searchParams}`)
}

export const executeQueryStudio = (params: { sql: string; connection_id?: string }) => {
  const searchParams = new URLSearchParams()
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)
  return fetchApi<QueryStudioResponse>(`/api/query-studio/execute?${searchParams}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: params.sql }),
  })
}

