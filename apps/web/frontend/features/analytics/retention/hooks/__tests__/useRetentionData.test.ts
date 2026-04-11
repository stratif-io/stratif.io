import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useRetentionData } from '../useRetentionData'

vi.mock('@/lib/api', () => ({
  fetchRetention: vi.fn(),
}))

vi.mock('@/stores', () => ({
  useAppStore: vi.fn(),
}))

import { fetchRetention } from '@/lib/api'
import { useAppStore } from '@/stores'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return Wrapper
}

describe('useRetentionData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('avgMilestones skips null values when computing average', async () => {
    // cohort 1: milestone_values [30, null, null]  (only D1 reached)
    // cohort 2: milestone_values [20, 40, null]    (D1 and D7 reached)
    // expected avgMilestones: [25, 40, null]

    const mockResponse = {
      sql: undefined,
      granularity: 'day',
      milestones: [1, 7, 30],
      total_available_cohorts: 2,
      data: [
        {
          cohort_date: '2024-01-01',
          cohort_size: 100,
          retention_series: [100, 50, 40],
          milestone_values: [30, null, null],
        },
        {
          cohort_date: '2024-01-02',
          cohort_size: 200,
          retention_series: [100, 60, 50],
          milestone_values: [20, 40, null],
        },
      ],
    }

    vi.mocked(fetchRetention).mockResolvedValue(mockResponse)
    vi.mocked(useAppStore).mockReturnValue({
      activeFilters: {},
      activeConnectionId: null,
    } as unknown as ReturnType<typeof useAppStore>)

    const { result } = renderHook(
      () =>
        useRetentionData({
          dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
          granularity: 'day',
        }),
      { wrapper: createWrapper() }
    )

    // Wait for the hook to settle
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // avgMilestones should be:
    // - milestone 0 (D1): (30 + 20) / 2 = 25
    // - milestone 1 (D7): 40 / 1 = 40 (skip null from cohort 1)
    // - milestone 2 (D30): null (all values are null)
    expect(result.current.avgMilestones).toEqual([25, 40, null])
  })

  it('returns all nulls when no cohorts', async () => {
    const mockResponse = {
      sql: undefined,
      granularity: 'day',
      milestones: [1, 7, 30],
      total_available_cohorts: 0,
      data: [],
    }

    vi.mocked(fetchRetention).mockResolvedValue(mockResponse)
    vi.mocked(useAppStore).mockReturnValue({
      activeFilters: {},
      activeConnectionId: null,
    } as unknown as ReturnType<typeof useAppStore>)

    const { result } = renderHook(
      () =>
        useRetentionData({
          dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
          granularity: 'day',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.avgMilestones).toEqual([null, null, null])
  })
})
