import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock stores and hooks before importing the component
const mockActiveFilters: Record<string, string | null> = {}
const mockSetActiveFilter = vi.fn()

const mockStore = {
  activeFilters: mockActiveFilters,
  setActiveFilter: mockSetActiveFilter,
  dateRange: { from: new Date('2024-01-01'), to: new Date('2024-12-31') },
  setDateRange: vi.fn(),
  activeConnectionId: 'conn-1',
  granularity: 'day' as const,
  setGranularity: vi.fn(),
}

vi.mock('@/stores', () => ({
  useAppStore: (selector?: (s: typeof mockStore) => unknown) => {
    return selector ? selector(mockStore) : mockStore
  },
}))

vi.mock('@/features/connections/hooks/useConnectionsData', () => ({
  useFilterConfig: vi.fn(),
  useFilterOptions: vi.fn(),
}))

vi.mock('@/components/DateRangePicker', () => ({
  DateRangePicker: () => <div data-testid="date-range-picker" />,
}))

import { GlobalFilters } from '../GlobalFilters'
import { useFilterConfig, useFilterOptions } from '@/features/connections/hooks/useConnectionsData'

const mockUseFilterConfig = vi.mocked(useFilterConfig)
const mockUseFilterOptions = vi.mocked(useFilterOptions)

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(mockActiveFilters).forEach((k) => delete mockActiveFilters[k])
})

describe('GlobalFilters — filter pills visible while options loading', () => {
  it('renders filter pills when filterConfig is ready even if filterOptions is still loading', () => {
    mockUseFilterConfig.mockReturnValue({
      data: {
        id: 'cfg-1',
        connection_id: 'conn-1',
        filter_fields: [{ ref: 'abc-123', field: '', label: 'Country', icon: 'globe' }],
        updated_at: '',
      },
      isLoading: false,
    } as ReturnType<typeof useFilterConfig>)

    // Filter options still loading — should not hide the pills
    mockUseFilterOptions.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useFilterOptions>)

    render(<GlobalFilters />)

    // The pill must be visible even while options are loading
    expect(screen.getByRole('button', { name: /all countries/i })).toBeInTheDocument()
  })
})

describe('GlobalFilters — filter key resolution', () => {
  it('uses field.ref as lookup key when ref is set', async () => {
    mockUseFilterConfig.mockReturnValue({
      data: {
        id: 'cfg-1',
        connection_id: 'conn-1',
        filter_fields: [{ ref: 'abc-123', field: '', label: 'Country', icon: 'globe' }],
        updated_at: '',
      },
      isLoading: false,
    } as ReturnType<typeof useFilterConfig>)

    mockUseFilterOptions.mockReturnValue({
      data: { 'abc-123': ['US', 'UK'] },
      isLoading: false,
    } as ReturnType<typeof useFilterOptions>)

    render(<GlobalFilters />)

    // Open the Country filter popover
    const trigger = screen.getByRole('button', { name: /all countries/i })
    await userEvent.click(trigger)

    expect(screen.getByRole('button', { name: 'US' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'UK' })).toBeInTheDocument()
  })

  it('falls back to field.field as lookup key when ref is empty (legacy)', async () => {
    mockUseFilterConfig.mockReturnValue({
      data: {
        id: 'cfg-1',
        connection_id: 'conn-1',
        filter_fields: [{ ref: '', field: 'country', label: 'Country', icon: 'globe' }],
        updated_at: '',
      },
      isLoading: false,
    } as ReturnType<typeof useFilterConfig>)

    mockUseFilterOptions.mockReturnValue({
      data: { country: ['US', 'UK'] },
      isLoading: false,
    } as ReturnType<typeof useFilterOptions>)

    render(<GlobalFilters />)

    const trigger = screen.getByRole('button', { name: /all countries/i })
    await userEvent.click(trigger)

    expect(screen.getByRole('button', { name: 'US' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'UK' })).toBeInTheDocument()
  })
})
