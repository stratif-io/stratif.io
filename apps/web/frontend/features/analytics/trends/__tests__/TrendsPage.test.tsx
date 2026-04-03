import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TrendsPage } from '../TrendsPage'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: () => ({ data: undefined, isLoading: false, isError: false }),
    useQueryClient: () => ({}),
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  }
})

vi.mock('@/stores', () => ({
  useAppStore: () => ({
    dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
    activeFilters: {},
    activeConnectionId: null,
    granularity: 'day',
    dashboardView: 'summary',
  }),
}))

vi.mock('../hooks/useTrendData', () => ({
  useTrendData: () => ({
    trendData: [],
    isLoading: false,
    isError: false,
    error: null,
    totalEvents: 0,
    averageValue: 0,
    maxValue: 0,
    seriesKeys: [],
    measureKey: 'count_events',
    sql: null,
  }),
}))

vi.mock('@/components/ui/no-connection-guard', () => ({
  NoConnectionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/dev', () => ({
  DevCard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('TrendsPage', () => {
  beforeEach(() => {
    document.title = ''
  })

  it('renders the Header with title', () => {
    render(<TrendsPage />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Trends')).toBeInTheDocument()
  })

  it('renders PageConfigBar', () => {
    render(<TrendsPage />)
    // PageConfigBar wraps the metric picker and chart type controls
    // TrendMetricPicker is mocked but PageConfigBar itself should be in the DOM
    // We check for the config bar region by looking for the chart type buttons
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('renders SummaryPanel when dashboardView is summary', () => {
    render(<TrendsPage />)
    expect(screen.getByText('Summary')).toBeInTheDocument()
  })
})
