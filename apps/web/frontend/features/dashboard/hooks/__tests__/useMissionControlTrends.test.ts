import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useMissionControlTrends } from '../useMissionControlTrends'

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchMissionControlTrend: vi.fn(),
}))

// Mock the store
vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({
    activeFilters: {},
    activeConnectionId: 'conn-1',
  })),
}))

import { fetchMissionControlTrend } from '@/lib/api'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const dateRange = {
  from: new Date('2024-02-20'),
  to: new Date('2024-03-21'),
}

describe('useMissionControlTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchMissionControlTrend).mockResolvedValue({
      metric: 'total_events',
      data: [
        { date: '2024-02-20', value: 1000 },
        { date: '2024-02-21', value: 1200 },
      ],
    })
  })

  it('returns trends object with all 8 metric keys', async () => {
    const { result } = renderHook(() => useMissionControlTrends({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      const keys = Object.keys(result.current.trends)
      expect(keys).toContain('total_events')
      expect(keys).toContain('unique_users')
      expect(keys).toContain('total_sessions')
      expect(keys).toContain('avg_session_duration_sec')
      expect(keys).toContain('avg_events_per_session')
      expect(keys).toContain('new_users')
      expect(keys).toContain('returning_users')
      expect(keys).toContain('dau_mau_ratio')
    })
  })

  it('maps trend response data to plain number arrays', async () => {
    const { result } = renderHook(() => useMissionControlTrends({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.trends['total_events'].values).toEqual([1000, 1200])
    })
  })

  it('fires queries without date params for all-time (from/to both null)', async () => {
    const { result } = renderHook(
      () => useMissionControlTrends({ dateRange: { from: null, to: null } }),
      { wrapper: makeWrapper() }
    )
    // Trend queries must fire even with no date range (all-time)
    await waitFor(() => {
      expect(result.current.trends['total_events'].loading).toBe(false)
    })
    expect(fetchMissionControlTrend).toHaveBeenCalled()
    expect(result.current.trends['total_events'].values).toEqual([1000, 1200])
  })
})
