import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useMissionControl } from '../useMissionControl'

vi.mock('@/lib/api', () => ({
  fetchMissionControlMetric: vi.fn(),
  fetchTopEvents: vi.fn(),
}))

vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({
    activeFilters: {},
    activeConnectionId: 'conn-1',
  })),
}))

import { fetchMissionControlMetric, fetchTopEvents } from '@/lib/api'
import { useAppStore } from '@/stores'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const dateRange = { from: new Date('2024-01-15'), to: new Date('2024-01-16') }

const METRICS = [
  'total_events',
  'unique_users',
  'total_sessions',
  'avg_session_duration_sec',
  'avg_events_per_session',
  'new_users',
  'returning_users',
  'dau_mau_ratio',
] as const

describe('useMissionControl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppStore).mockReturnValue({
      activeFilters: {},
      activeConnectionId: 'conn-1',
    } as ReturnType<typeof useAppStore>)
    vi.mocked(fetchMissionControlMetric).mockImplementation(({ metric }) =>
      Promise.resolve({ metric, current: 42, previous: 30 })
    )
    vi.mocked(fetchTopEvents).mockResolvedValue({ data: [] })
  })

  it('returns undefined data while queries are loading', () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('reconstructs MissionControlResponse from 8 individual results', async () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const data = result.current.data
    expect(data).toBeDefined()
    for (const m of METRICS) {
      expect(data!.current[m]).toBe(42)
      expect(data!.previous[m]).toBe(30)
    }
  })

  it('reconstructs period and previous_period date ranges', async () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data!.period.start_date).toBe('2024-01-15')
    expect(result.current.data!.period.end_date).toBe('2024-01-16')
    // Previous period: 2-day window before 2024-01-15 → 2024-01-13 to 2024-01-14
    expect(result.current.data!.previous_period.start_date).toBe('2024-01-13')
    expect(result.current.data!.previous_period.end_date).toBe('2024-01-14')
  })

  it('sets isError and error when any query fails', async () => {
    vi.mocked(fetchMissionControlMetric).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.data).toBeUndefined()
  })

  it('does not fire queries when activeConnectionId is missing', () => {
    vi.mocked(useAppStore).mockReturnValue({
      activeFilters: {},
      activeConnectionId: null,
    } as ReturnType<typeof useAppStore>)

    renderHook(() => useMissionControl({ dateRange }), { wrapper: makeWrapper() })
    expect(fetchMissionControlMetric).not.toHaveBeenCalled()
  })

  it('calls fetchMissionControlMetric once per metric (8 times)', async () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(fetchMissionControlMetric).toHaveBeenCalledTimes(8)
  })
})
