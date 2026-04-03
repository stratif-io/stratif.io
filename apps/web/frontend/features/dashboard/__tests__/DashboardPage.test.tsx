import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DashboardPage } from '../DashboardPage'
import { useAppStore } from '@/stores'
import * as missionControlHook from '../hooks/useMissionControl'
import * as trendsHook from '../hooks/useMissionControlTrends'
import type { UseMissionControlReturn } from '../hooks/useMissionControl'

vi.mock('../hooks/useMissionControl')
vi.mock('../hooks/useMissionControlTrends')

const metricLoadingAllFalse = {
  total_events: false,
  unique_users: false,
  total_sessions: false,
  avg_session_duration_sec: false,
  avg_events_per_session: false,
  new_users: false,
  returning_users: false,
  dau_mau_ratio: false,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TooltipProvider>
          <DashboardPage />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DashboardPage greeting and toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
      activeConnectionId: 'conn-1',
      dashboardView: 'summary',
    })
    vi.mocked(trendsHook.useMissionControlTrends).mockReturnValue({ trends: {} } as ReturnType<
      typeof trendsHook.useMissionControlTrends
    >)
    vi.mocked(missionControlHook.useMissionControl).mockReturnValue({
      data: undefined,
      metricLoading: metricLoadingAllFalse,
      isError: false,
      error: null,
      topEvents: [{ name: 'page_view', count: 100 }],
      eventsLoading: false,
      topEventsSql: undefined,
      isLoading: false,
    } as UseMissionControlReturn)
  })

  it('shows greeting with username', () => {
    renderPage()
    expect(screen.getByText(/Good (morning|afternoon|evening)/i)).toBeInTheDocument()
  })

  it('shows Summary/Detail toggle buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /summary/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /detail/i })).toBeInTheDocument()
  })
})

describe('DashboardPage empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
      activeConnectionId: 'conn-1',
    })
    vi.mocked(trendsHook.useMissionControlTrends).mockReturnValue({ trends: {} } as ReturnType<
      typeof trendsHook.useMissionControlTrends
    >)
  })

  it('shows empty state when loaded and no events', () => {
    vi.mocked(missionControlHook.useMissionControl).mockReturnValue({
      data: undefined,
      metricLoading: metricLoadingAllFalse,
      isError: false,
      error: null,
      topEvents: [],
      eventsLoading: false,
      topEventsSql: undefined,
      isLoading: false,
    } as UseMissionControlReturn)

    renderPage()

    expect(screen.getByText('No events yet')).toBeInTheDocument()
    expect(screen.getByText(/Try expanding the date range/i)).toBeInTheDocument()
  })

  it('does not show empty state while metrics are still loading', () => {
    vi.mocked(missionControlHook.useMissionControl).mockReturnValue({
      data: undefined,
      metricLoading: { ...metricLoadingAllFalse, total_events: true },
      isError: false,
      error: null,
      topEvents: [],
      eventsLoading: false,
      topEventsSql: undefined,
      isLoading: true,
    } as UseMissionControlReturn)

    renderPage()

    expect(screen.queryByText('No events yet')).not.toBeInTheDocument()
  })

  it('does not show empty state when events exist', () => {
    vi.mocked(missionControlHook.useMissionControl).mockReturnValue({
      data: undefined,
      metricLoading: metricLoadingAllFalse,
      isError: false,
      error: null,
      topEvents: [{ name: 'page_view', count: 100 }],
      eventsLoading: false,
      topEventsSql: undefined,
      isLoading: false,
    } as UseMissionControlReturn)

    renderPage()

    expect(screen.queryByText('No events yet')).not.toBeInTheDocument()
  })
})
