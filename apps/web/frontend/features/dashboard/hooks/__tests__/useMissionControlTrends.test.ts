import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useMissionControlTrends } from '../useMissionControlTrends'
import { formatDateParam } from '@/lib/utils'

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchMissionControlTrend: vi.fn(),
}))

vi.mock('@/features/connections/hooks/useConnectionsData', () => ({
  useSchemaConfig: vi.fn(() => ({ data: undefined })),
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

  it('sql field combines current + previous period SQL into a flat array', async () => {
    // Current period returns sql: 'SELECT current'
    // Previous period returns sql: 'SELECT prev'
    vi.mocked(fetchMissionControlTrend).mockImplementation(({ start_date }) => {
      if (start_date === undefined || start_date === formatDateParam(dateRange.from)) {
        return Promise.resolve({
          metric: 'total_events',
          data: [],
          sql: 'SELECT current',
        })
      }
      return Promise.resolve({
        metric: 'total_events',
        data: [],
        sql: 'SELECT prev',
      })
    })

    const { result } = renderHook(() => useMissionControlTrends({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      const sql = result.current.trends['total_events'].sql
      expect(Array.isArray(sql)).toBe(true)
      expect(sql).toContain('SELECT current')
    })
  })

  it('sql field is empty array when neither period has SQL', async () => {
    // Mock returns no sql field
    vi.mocked(fetchMissionControlTrend).mockResolvedValue({
      metric: 'total_events',
      data: [],
    })

    const { result } = renderHook(() => useMissionControlTrends({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.trends['total_events'].loading).toBe(false)
    })
    expect(result.current.trends['total_events'].sql).toEqual([])
  })
})
