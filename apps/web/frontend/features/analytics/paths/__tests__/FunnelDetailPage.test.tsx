import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FunnelDetailPage } from '../FunnelDetailPage'
import { useAppStore } from '@/stores'
import * as apiModule from '@/lib/api'
import type { PathFunnelResponse, EventsResponse } from '@/types'

vi.mock('@/lib/api')

// Prevent infinite re-render loops caused by setSearchParams in jsdom
const mockSetSearchParams = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [
      new URLSearchParams('events=page_view,button_click,form_submit'),
      mockSetSearchParams,
    ],
  }
})

const mockFunnelData = {
  data: [
    {
      event: 'page_view',
      step: 1,
      users: 1000,
      step_conversion_rate: 100,
      overall_conversion_rate: 100,
      dropoff_users: 0,
      dropoff_rate: 0,
    },
    {
      event: 'button_click',
      step: 2,
      users: 750,
      step_conversion_rate: 75,
      overall_conversion_rate: 75,
      dropoff_users: 250,
      dropoff_rate: 25,
    },
    {
      event: 'form_submit',
      step: 3,
      users: 600,
      step_conversion_rate: 80,
      overall_conversion_rate: 60,
      dropoff_users: 150,
      dropoff_rate: 20,
    },
  ],
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/paths?events=page_view,button_click,form_submit']}>
        <TooltipProvider>
          <FunnelDetailPage />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('FunnelDetailPage summary cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetSearchParams.mockImplementation(() => {})
    useAppStore.setState({
      dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
      activeConnectionId: 'conn-1',
      activeFilters: [],
    })
    vi.mocked(apiModule.fetchPathFunnel).mockResolvedValue(mockFunnelData as PathFunnelResponse)
    vi.mocked(apiModule.fetchEvents).mockResolvedValue({
      events: ['page_view', 'button_click', 'form_submit'],
    } as EventsResponse)
  })

  it('renders Started card with primary color', async () => {
    renderPage()
    await waitFor(() => {
      const startedText = screen.getByText('Started')
      expect(startedText).toBeInTheDocument()
      const card = startedText.closest('[class*="bg-primary"]')
      expect(card).toBeInTheDocument()
    })
  })

  it('renders Completed all steps card with success color', async () => {
    renderPage()
    await waitFor(() => {
      const completedText = screen.getByText('Completed all steps')
      expect(completedText).toBeInTheDocument()
      const card = completedText.closest('[class*="bg-success"]')
      expect(card).toBeInTheDocument()
    })
  })

  it('renders Biggest drop card with destructive color', async () => {
    renderPage()
    await waitFor(() => {
      const dropText = screen.getByText('Biggest drop')
      expect(dropText).toBeInTheDocument()
      const card = dropText.closest('[class*="bg-destructive"]')
      expect(card).toBeInTheDocument()
    })
  })
})
