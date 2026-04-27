import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TrendsPage } from '../TrendsPage'
import { useAppStore } from '@/stores'
import * as useTrendDataModule from '../hooks/useTrendData'

vi.mock('../hooks/useTrendData')
vi.mock('@/lib/api', () => ({
  fetchPivotOptions: vi
    .fn()
    .mockResolvedValue({ dimensions: [], measures: [], numeric_dimensions: [] }),
  fetchPivotGridFilterValues: vi.fn().mockResolvedValue({ values: [] }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TooltipProvider>
          <TrendsPage />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TrendsPage', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeConnectionId: 'conn-1',
      dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
      granularity: 'day',
    })
    vi.mocked(useTrendDataModule.useTrendData).mockReturnValue({
      trendData: [],
      isLoading: false,
      isError: false,
      error: null,
      totalEvents: 0,
      averageValue: 0,
      maxValue: 0,
      seriesKeys: [],
      measureKey: 'count_events',
    })
  })

  it('renders TrendMetricPicker', () => {
    renderPage()
    const metricPicker = screen.getByTestId('trend-metric-picker')
    expect(metricPicker).toBeInTheDocument()
  })

  it('renders TrendMetricPicker outside the card', () => {
    renderPage()
    const metricPicker = screen.getByTestId('trend-metric-picker')
    const card = document.querySelector('[data-card]')
    // metricPicker should not be inside the card
    expect(metricPicker).toBeInTheDocument()
    if (card) {
      expect(card.contains(metricPicker)).toBe(false)
    }
  })

  it('renders chart type toggle in the toolbar', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /area/i })).toBeInTheDocument()
  })

  it('renders Run in Pivot Explorer button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /run in pivot explorer/i })).toBeInTheDocument()
  })

  it('renders stats strip inside card', () => {
    renderPage()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText(/avg/i)).toBeInTheDocument()
    expect(screen.getByText('Peak')).toBeInTheDocument()
  })
})
