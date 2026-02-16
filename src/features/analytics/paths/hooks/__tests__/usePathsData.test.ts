import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { usePathsData } from '../usePathsData'

vi.mock('@/lib/api', () => ({
  fetchPaths: vi.fn(),
  fetchEvents: vi.fn(),
}))

import { fetchPaths, fetchEvents } from '@/lib/api'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return Wrapper
}

describe('usePathsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty data when dateRange is missing', () => {
    const { result } = renderHook(
      () =>
        usePathsData({
          dateRange: { from: null as unknown as Date, to: null as unknown as Date },
          targetEvent: 'purchase',
          deviceType: '',
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.pathData).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches paths data with correct params', async () => {
    vi.mocked(fetchPaths).mockResolvedValue({
      target_event: 'purchase',
      device_type: null,
      total_occurrences: 100,
      data: [
        {
          path: ['Home', 'Products', 'Cart', 'purchase'],
          step_3: 'Home',
          step_2: 'Products',
          step_1: 'Cart',
          target: 'purchase',
          device_type: 'desktop',
          count: 50,
          percentage: 50,
        },
      ],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: ['purchase', 'click'] })

    const { result } = renderHook(
      () =>
        usePathsData({
          dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
          targetEvent: 'purchase',
          deviceType: '',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.pathData.length).toBe(1))

    expect(fetchPaths).toHaveBeenCalledWith(
      expect.objectContaining({
        target_event: 'purchase',
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      })
    )
  })

  it('returns events list from API', async () => {
    vi.mocked(fetchPaths).mockResolvedValue({
      target_event: 'purchase',
      device_type: null,
      total_occurrences: 0,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: ['purchase', 'click', 'view'] })

    const { result } = renderHook(
      () =>
        usePathsData({
          dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
          targetEvent: 'purchase',
          deviceType: '',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.events).toHaveLength(3))

    expect(result.current.events).toEqual(['purchase', 'click', 'view'])
  })

  it('returns totalOccurrences from response', async () => {
    vi.mocked(fetchPaths).mockResolvedValue({
      target_event: 'purchase',
      device_type: null,
      total_occurrences: 250,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    const { result } = renderHook(
      () =>
        usePathsData({
          dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
          targetEvent: 'purchase',
          deviceType: '',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.totalOccurrences).toBe(250))
  })

  it('handles loading state', async () => {
    vi.mocked(fetchPaths).mockImplementation(() => new Promise(() => {}))
    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    const { result } = renderHook(
      () =>
        usePathsData({
          dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
          targetEvent: 'purchase',
          deviceType: '',
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(true)
  })

  it('passes deviceType to API when provided', async () => {
    vi.mocked(fetchPaths).mockResolvedValue({
      target_event: 'purchase',
      device_type: 'mobile',
      total_occurrences: 0,
      data: [],
    })

    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    renderHook(
      () =>
        usePathsData({
          dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
          targetEvent: 'purchase',
          deviceType: 'mobile',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() =>
      expect(fetchPaths).toHaveBeenCalledWith(expect.objectContaining({ device_type: 'mobile' }))
    )
  })
})
