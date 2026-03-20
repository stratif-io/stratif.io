import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useTrendData } from '../useTrendData'

vi.mock('@/lib/api', () => ({
  fetchTrend: vi.fn(),
  fetchEvents: vi.fn(),
  fetchPivot: vi.fn(),
}))

import { fetchTrend, fetchEvents, fetchPivot } from '@/lib/api'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return Wrapper
}

const dateRange = { from: new Date('2026-01-01'), to: new Date('2026-01-31') }

describe('useTrendData — no breakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchTrend when breakdownDimension is null', async () => {
    vi.mocked(fetchTrend).mockResolvedValue({ total_unique_users: 10, data: [] })
    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    renderHook(
      () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: null }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(fetchTrend).toHaveBeenCalled())
    expect(fetchPivot).not.toHaveBeenCalled()
  })

  it('returns seriesKeys as null when no breakdown', async () => {
    vi.mocked(fetchTrend).mockResolvedValue({
      total_unique_users: 5,
      data: [{ date: '2026-01-01', count: 42, unique_users: 5 }],
    })
    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    const { result } = renderHook(
      () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: null }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.trendData.length).toBe(1))
    expect(result.current.seriesKeys).toBeNull()
  })
})

describe('useTrendData — with breakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchPivot (not fetchTrend) when breakdownDimension is set', async () => {
    vi.mocked(fetchPivot).mockResolvedValue({
      dimensions: ['date', 'device_type'],
      measures: ['count_events'],
      data: [],
    })
    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    renderHook(
      () =>
        useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(fetchPivot).toHaveBeenCalled())
    expect(fetchTrend).not.toHaveBeenCalled()
    expect(fetchPivot).toHaveBeenCalledWith(
      expect.objectContaining({
        row_dimensions: ['date', 'device_type'],
        measures: ['count_events'],
      })
    )
  })

  it('transforms flat pivot rows into wide-format records', async () => {
    vi.mocked(fetchPivot).mockResolvedValue({
      dimensions: ['date', 'device_type'],
      measures: ['count_events'],
      data: [
        { date: '2026-01-01', device_type: 'mobile', count_events: 100 },
        { date: '2026-01-01', device_type: 'desktop', count_events: 200 },
        { date: '2026-01-02', device_type: 'mobile', count_events: 50 },
        { date: '2026-01-02', device_type: 'desktop', count_events: 150 },
      ],
    })
    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    const { result } = renderHook(
      () =>
        useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.trendData.length).toBe(2))

    const jan1 = result.current.trendData[0]
    expect(jan1).toMatchObject({ mobile: 100, desktop: 200 })
    expect(jan1.fullDate).toBe('2026-01-01')
  })

  it('returns seriesKeys sorted by total count descending', async () => {
    vi.mocked(fetchPivot).mockResolvedValue({
      dimensions: ['date', 'device_type'],
      measures: ['count_events'],
      data: [
        { date: '2026-01-01', device_type: 'mobile', count_events: 300 },
        { date: '2026-01-01', device_type: 'desktop', count_events: 100 },
        { date: '2026-01-01', device_type: 'tablet', count_events: 50 },
      ],
    })
    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    const { result } = renderHook(
      () =>
        useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.seriesKeys).not.toBeNull())
    expect(result.current.seriesKeys).toEqual(['mobile', 'desktop', 'tablet'])
  })

  it('caps series at 8 and merges the rest into (other)', async () => {
    // value_0 has count 100 (highest), value_9 has count 91 (lowest)
    const manyValues = Array.from({ length: 10 }, (_, i) => ({
      date: '2026-01-01',
      device_type: `value_${i}`,
      count_events: 100 - i,
    }))
    vi.mocked(fetchPivot).mockResolvedValue({
      dimensions: ['date', 'device_type'],
      measures: ['count_events'],
      data: manyValues,
    })
    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    const { result } = renderHook(
      () =>
        useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.seriesKeys).not.toBeNull())
    // 8 top values + "(other)"
    expect(result.current.seriesKeys).toHaveLength(9)
    expect(result.current.seriesKeys).toContain('(other)')
  })

  it('computes maxValue as the max stacked total per date', async () => {
    vi.mocked(fetchPivot).mockResolvedValue({
      dimensions: ['date', 'device_type'],
      measures: ['count_events'],
      data: [
        { date: '2026-01-01', device_type: 'mobile', count_events: 100 },
        { date: '2026-01-01', device_type: 'desktop', count_events: 200 }, // total 300
        { date: '2026-01-02', device_type: 'mobile', count_events: 50 },
        { date: '2026-01-02', device_type: 'desktop', count_events: 50 }, // total 100
      ],
    })
    vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

    const { result } = renderHook(
      () =>
        useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.trendData.length).toBe(2))
    expect(result.current.maxValue).toBe(300)
  })
})
