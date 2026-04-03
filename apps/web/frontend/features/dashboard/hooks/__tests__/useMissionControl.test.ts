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
  useAppStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = { activeFilters: {}, activeConnectionId: 'conn-1' }
    return selector ? selector(state) : state
  }),
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

const dateRange = { from: new Date(2024, 0, 15), to: new Date(2024, 0, 16) }

const METRICS = [
  'total_events',
  'unique_users',
  'total_sessions',
  'avg_session_duration_sec',
  'avg_events_per_session',
  'new_users',
  'returning_users',
  'resurrected_users',
  'churned_users',
  'retention_rate',
  'wau',
  'avg_active_days',
  'power_users',
  'dau_mau_ratio',
] as const

describe('useMissionControl', () => {
  function mockStore(
    overrides: {
      activeFilters?: Record<string, string | null>
      activeConnectionId?: string | null
    } = {}
  ) {
    const state = { activeFilters: {}, activeConnectionId: 'conn-1', ...overrides }
    vi.mocked(useAppStore).mockImplementation((selector?: (s: unknown) => unknown) =>
      selector ? selector(state) : (state as ReturnType<typeof useAppStore>)
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore()
    vi.mocked(fetchMissionControlMetric).mockImplementation(({ metric }) =>
      Promise.resolve({ metric, current: 42, previous: 30 })
    )
    vi.mocked(fetchTopEvents).mockResolvedValue({ data: [] })
  })

  it('is loading while queries are in flight, data populated with zeros', () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })
    expect(result.current.isLoading).toBe(true)
    // data is immediately available (zeros) for progressive rendering
    expect(result.current.data).toBeDefined()
    expect(result.current.data!.current.total_events).toBe(0)
  })

  it('reconstructs MissionControlResponse from 14 individual results', async () => {
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
  })

  it('does not fire queries when activeConnectionId is missing', () => {
    mockStore({ activeConnectionId: null })

    renderHook(() => useMissionControl({ dateRange }), { wrapper: makeWrapper() })
    expect(fetchMissionControlMetric).not.toHaveBeenCalled()
  })

  it('fires queries without date params for all-time (from/to both null)', async () => {
    const { result } = renderHook(
      () => useMissionControl({ dateRange: { from: null, to: null } }),
      { wrapper: makeWrapper() }
    )
    // Queries must fire even when no date range is selected (all-time)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(fetchMissionControlMetric).toHaveBeenCalledTimes(14)
    // Data must be populated, not undefined
    expect(result.current.data).toBeDefined()
    expect(result.current.data!.current.total_events).toBe(42)
  })

  it('does not fire queries when activeConnectionId is missing and dates are also null', () => {
    mockStore({ activeConnectionId: null })

    renderHook(() => useMissionControl({ dateRange: { from: null, to: null } }), {
      wrapper: makeWrapper(),
    })
    expect(fetchMissionControlMetric).not.toHaveBeenCalled()
  })

  it('exposes per-metric loading flags', async () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })
    // Initially all metrics are loading
    for (const m of METRICS) {
      expect(result.current.metricLoading[m]).toBe(true)
    }
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    for (const m of METRICS) {
      expect(result.current.metricLoading[m]).toBe(false)
    }
  })

  it('calls fetchMissionControlMetric once per metric (14 times)', async () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(fetchMissionControlMetric).toHaveBeenCalledTimes(14)
  })
})
