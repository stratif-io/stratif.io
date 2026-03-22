import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroMetricCard } from '../HeroMetricCard'

// Mock Recharts AreaChartComponent — it uses ResizeObserver which isn't in jsdom
vi.mock('@/components/charts/area-chart', () => ({
  AreaChartComponent: ({ ariaLabel }: { ariaLabel?: string }) => (
    <div data-testid="area-chart" aria-label={ariaLabel} />
  ),
}))

const baseProps = {
  label: 'Total Events',
  value: '1.24M',
  pctChange: 12.4,
  previousValue: '1.10M',
  sparklineValues: [100, 110, 120, 130, 140, 150, 160],
  color: 'hsl(var(--chart-1))',
}

describe('HeroMetricCard', () => {
  it('renders the metric label', () => {
    render(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText('Total Events')).toBeInTheDocument()
  })

  it('renders the formatted value', () => {
    render(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText('1.24M')).toBeInTheDocument()
  })

  it('renders positive % change', () => {
    render(<HeroMetricCard {...baseProps} pctChange={12.4} />)
    expect(screen.getByText(/12\.4%/)).toBeInTheDocument()
    expect(screen.getByText(/↑/)).toBeInTheDocument()
  })

  it('renders negative % change', () => {
    render(<HeroMetricCard {...baseProps} pctChange={-2.3} />)
    expect(screen.getByText(/2\.3%/)).toBeInTheDocument()
    expect(screen.getByText(/↓/)).toBeInTheDocument()
  })

  it('renders "—" when pctChange is null', () => {
    render(<HeroMetricCard {...baseProps} pctChange={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the previous value', () => {
    render(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText(/prev: 1\.10M/)).toBeInTheDocument()
  })

  it('renders the area chart', () => {
    render(<HeroMetricCard {...baseProps} />)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders loading skeleton when loading is true', () => {
    render(<HeroMetricCard {...baseProps} loading />)
    expect(screen.queryByText('1.24M')).not.toBeInTheDocument()
    expect(document.querySelector('[class*="animate-pulse"]')).toBeTruthy()
  })
})
