import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { usePathExplorer } from '../usePathExplorer'

vi.mock('@/lib/api', () => ({
  fetchPathAnalysis: vi.fn(),
  fetchEvents: vi.fn(),
}))

vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({ activeConnectionId: 'conn-1', activeFilters: {} })),
}))

import { fetchPathAnalysis, fetchEvents } from '@/lib/api'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return Wrapper
}

const defaultOptions = {
  dateRange: { from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) },
  startEvent: null,
  endEvent: null,
  minPathLength: 2,
  maxPathLength: 5,
  maxTimeBetweenEvents: null,
  timeUnit: 'seconds' as const,
  groupBy: 'user_id' as const,
  topN: 10,
}

describe('usePathExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty data when dateRange is missing', () => {
    const { result } = renderHook(
      () =>
        usePathExplorer({
          ...defaultOptions,
          dateRange: { from: null as unknown as Date, to: null as unknown as Date },
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.pathData).toEqual([])
  })

  it('fetches path analysis data with correct params', async () => {
    vi.mocked(fetchPathAnalysis).mockResolvedValue({
      start_event: null,
      end_event: null,
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: null,
      time_unit: 'seconds',
      group_by: 'user_id',
      date_range: null,
      event_filters: null,
      total_paths: 2,
      data: [
        {
          path: 'Home -> Products -> Purchase',
          path_length: 3,
          occurrence_count: 100,
          unique_users: 50,
          unique_sessions: 30,
          percentage_of_total: 25.5,
          avg_time_to_complete: 120,
          median_time_to_complete: 100,
        },
      ],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: ['Home', 'Products', 'Purchase'] })

    const { result } = renderHook(() => usePathExplorer(defaultOptions), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.pathData.length).toBe(1))

    expect(fetchPathAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        min_path_length: 2,
        max_path_length: 5,
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      })
    )
  })

  it('returns events list from API', async () => {
    vi.mocked(fetchPathAnalysis).mockResolvedValue({
      start_event: null,
      end_event: null,
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: null,
      time_unit: 'seconds',
      group_by: 'user_id',
      date_range: null,
      event_filters: null,
      total_paths: 0,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: ['Home', 'Products', 'Cart'] })

    const { result } = renderHook(() => usePathExplorer(defaultOptions), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.events).toHaveLength(3))

    expect(result.current.events).toEqual(['Home', 'Products', 'Cart'])
  })

  it('returns totalPaths from response', async () => {
    vi.mocked(fetchPathAnalysis).mockResolvedValue({
      start_event: null,
      end_event: null,
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: null,
      time_unit: 'seconds',
      group_by: 'user_id',
      date_range: null,
      event_filters: null,
      total_paths: 42,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    const { result } = renderHook(() => usePathExplorer(defaultOptions), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.totalPaths).toBe(42))
  })

  it('handles loading state', async () => {
    vi.mocked(fetchPathAnalysis).mockImplementation(() => new Promise(() => {}))
    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    const { result } = renderHook(() => usePathExplorer(defaultOptions), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('passes startEvent and endEvent to API', async () => {
    vi.mocked(fetchPathAnalysis).mockResolvedValue({
      start_event: 'Home',
      end_event: 'Purchase',
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: null,
      time_unit: 'seconds',
      group_by: 'user_id',
      date_range: null,
      event_filters: null,
      total_paths: 0,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    renderHook(
      () =>
        usePathExplorer({
          ...defaultOptions,
          startEvent: 'Home',
          endEvent: 'Purchase',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() =>
      expect(fetchPathAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          start_event: 'Home',
          end_event: 'Purchase',
        })
      )
    )
  })

  it('passes time constraints to API', async () => {
    vi.mocked(fetchPathAnalysis).mockResolvedValue({
      start_event: null,
      end_event: null,
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: 60,
      time_unit: 'minutes',
      group_by: 'user_id',
      date_range: null,
      event_filters: null,
      total_paths: 0,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    renderHook(
      () =>
        usePathExplorer({
          ...defaultOptions,
          maxTimeBetweenEvents: 60,
          timeUnit: 'minutes',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() =>
      expect(fetchPathAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          max_time_between_events: 60,
          time_unit: 'minutes',
        })
      )
    )
  })

  it('passes groupBy to API', async () => {
    vi.mocked(fetchPathAnalysis).mockResolvedValue({
      start_event: null,
      end_event: null,
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: null,
      time_unit: 'seconds',
      group_by: 'session_id',
      date_range: null,
      event_filters: null,
      total_paths: 0,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    renderHook(
      () =>
        usePathExplorer({
          ...defaultOptions,
          groupBy: 'session_id',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() =>
      expect(fetchPathAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({ group_by: 'session_id' })
      )
    )
  })

  it('defaults counting_mode to exact when countingMode is not provided', async () => {
    vi.mocked(fetchPathAnalysis).mockResolvedValue({
      start_event: null,
      end_event: null,
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: null,
      time_unit: 'seconds',
      group_by: 'user_id',
      date_range: null,
      event_filters: null,
      total_paths: 0,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    renderHook(() => usePathExplorer(defaultOptions), { wrapper: createWrapper() })

    await waitFor(() =>
      expect(fetchPathAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({ counting_mode: 'exact' })
      )
    )
  })

  it('passes counting_mode contains to API when countingMode is contains', async () => {
    vi.mocked(fetchPathAnalysis).mockResolvedValue({
      start_event: null,
      end_event: null,
      min_path_length: 2,
      max_path_length: 5,
      max_time_between_events: null,
      time_unit: 'seconds',
      group_by: 'user_id',
      date_range: null,
      event_filters: null,
      total_paths: 0,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    renderHook(
      () =>
        usePathExplorer({
          ...defaultOptions,
          countingMode: 'contains',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() =>
      expect(fetchPathAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({ counting_mode: 'contains' })
      )
    )
  })
})
