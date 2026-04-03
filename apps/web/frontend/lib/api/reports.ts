import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Report } from '@/types'
import { fetchWithSemaphore } from './semaphore'

const API_URL = import.meta.env.VITE_API_URL || ''

const headers: HeadersInit = {
  'Content-Type': 'application/json',
}

interface ApiError extends Error {
  status?: number
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { expect404?: boolean }
): Promise<T> {
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
    const errorObj: ApiError = new Error(error.detail || `HTTP ${response.status}`)
    errorObj.status = response.status
    throw errorObj
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return response.json()
}

export const createReport = (payload: {
  name: string
  page: string
  params: Record<string, unknown>
  access: 'public' | 'authenticated' | 'private'
  snapshot: boolean
}) =>
  fetchApi<{ shortcode: string; id: string }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const getReport = async (shortcode: string): Promise<Report | null> => {
  try {
    return await fetchApi<Report>(`/api/reports/${encodeURIComponent(shortcode)}`)
  } catch (error) {
    if (error instanceof Error && (error as ApiError).status === 404) {
      return null
    }
    throw error
  }
}

export const useReport = (shortcode: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', shortcode],
    queryFn: () => getReport(shortcode),
    enabled: !!shortcode,
    retry: false,
  })

  return {
    data,
    isLoading,
    error,
  }
}

export const useCreateReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      name: string
      page: string
      params: Record<string, unknown>
      access: 'public' | 'authenticated' | 'private'
      snapshot: boolean
    }) => createReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] })
    },
  })
}
