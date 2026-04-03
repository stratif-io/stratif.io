import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithSemaphore } from './semaphore'
import { QUERY_STALE_TIME } from '@/lib/constants'

const API_URL = import.meta.env.VITE_API_URL || ''

const headers: HeadersInit = {
  'Content-Type': 'application/json',
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { returnNullOn404?: boolean }
): Promise<T> {
  const returnNullOn404 = options?.returnNullOn404 ?? false
  const { returnNullOn404: _, ...requestOptions } = options ?? {}

  const response = await fetchWithSemaphore(`${API_URL}${endpoint}`, {
    ...requestOptions,
    credentials: 'include',
    headers: { ...headers, ...requestOptions?.headers },
  })

  if (response.status === 503) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Connection lost — please retry.')
  }

  if (response.status === 404 && returnNullOn404) {
    return null as T
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

export interface CreateReportPayload {
  name: string
  page: string
  params: Record<string, unknown>
  access: 'public' | 'authenticated'
  snapshot: boolean
  snapshot_data?: Record<string, unknown> | null
  created_by_username?: string
}

export interface ReportData {
  shortcode: string
  name: string
  page: string
  params: Record<string, unknown>
  access: 'public' | 'authenticated'
  snapshot: boolean
  snapshot_data: Record<string, unknown> | null
  created_at: string
  created_by_username: string
}

export async function createReport(
  payload: CreateReportPayload
): Promise<{ shortcode: string; id: string }> {
  return fetchApi<{ shortcode: string; id: string }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getReport(shortcode: string): Promise<ReportData | null> {
  return fetchApi<ReportData>(`/api/reports/${encodeURIComponent(shortcode)}`, {
    returnNullOn404: true,
  })
}

export function useReport(shortcode: string | undefined) {
  return useQuery({
    queryKey: ['reports', shortcode],
    queryFn: () => getReport(shortcode!),
    enabled: !!shortcode,
    staleTime: QUERY_STALE_TIME.default,
  })
}

export function useCreateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => createReport(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.setQueryData(['reports', data.shortcode], { shortcode: data.shortcode })
    },
  })
}
