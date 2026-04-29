import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PathFunnelDialog } from '../PathFunnelDialog'
import type { PathAnalysisData } from '@/types'

vi.mock('@/lib/api', () => ({
  fetchPathFunnel: vi.fn().mockResolvedValue({
    data: [
      {
        step: 1,
        event: 'Sign Up',
        occurrences: 1000,
        users: 1000,
        step_conversion_rate: 100,
        overall_conversion_rate: 100,
        dropoff_rate: 0,
        dropoff_users: 0,
      },
      {
        step: 2,
        event: 'Onboarding',
        occurrences: 600,
        users: 600,
        step_conversion_rate: 60,
        overall_conversion_rate: 60,
        dropoff_rate: 40,
        dropoff_users: 400,
      },
      {
        step: 3,
        event: 'Purchase',
        occurrences: 300,
        users: 300,
        step_conversion_rate: 50,
        overall_conversion_rate: 30,
        dropoff_rate: 50,
        dropoff_users: 300,
      },
    ],
  }),
}))

vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({ activeFilters: {} })),
}))

const mockPath: PathAnalysisData = {
  path: 'Sign Up -> Onboarding -> Purchase',
  path_length: 3,
  occurrence_count: 300,
  unique_users: 280,
  unique_sessions: 300,
  percentage_of_total: 12.5,
  avg_time_to_complete: null,
  median_time_to_complete: null,
}

const dateRange = { from: new Date('2026-01-01'), to: new Date('2026-01-31') }

function renderDialog(open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PathFunnelDialog
          path={mockPath}
          dateRange={dateRange}
          open={open}
          onOpenChange={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PathFunnelDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render device type selector', () => {
    renderDialog()
    expect(screen.queryByRole('combobox', { name: /device/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/all devices/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/mobile/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/desktop/i)).not.toBeInTheDocument()
  })

  it('renders path events as pill chips', async () => {
    renderDialog()
    await waitFor(() => {
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
      expect(screen.getByText('Onboarding')).toBeInTheDocument()
      expect(screen.getByText('Purchase')).toBeInTheDocument()
    })
    // Chips should have the pill styling class
    const chip = screen.getByText('Sign Up')
    expect(chip.className).toContain('rounded-full')
  })

  it('renders colored summary cards', async () => {
    renderDialog()
    await waitFor(() => {
      expect(screen.getByText('Started')).toBeInTheDocument()
      expect(screen.getByText('Completed all')).toBeInTheDocument()
      expect(screen.getByText('Biggest drop')).toBeInTheDocument()
    })
    // Started card should have primary coloring
    const startedLabel = screen.getByText('Started')
    expect(startedLabel.className).toContain('text-primary')
    // Completed card should have success coloring
    const completedLabel = screen.getByText('Completed all')
    expect(completedLabel.className).toContain('text-success')
    // Biggest drop card should have destructive coloring
    const dropLabel = screen.getByText('Biggest drop')
    expect(dropLabel.className).toContain('text-destructive')
  })
})
