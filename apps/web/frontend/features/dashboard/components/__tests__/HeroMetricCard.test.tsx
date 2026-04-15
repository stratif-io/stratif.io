import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HeroMetricCard } from '../HeroMetricCard'

const renderWithTooltip = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>)

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
    renderWithTooltip(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText('Total Events')).toBeInTheDocument()
  })

  it('renders the formatted value', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText('1.24M')).toBeInTheDocument()
  })

  it('renders positive % change', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} pctChange={12.4} />)
    expect(screen.getByText(/12\.4%/)).toBeInTheDocument()
    expect(screen.getByText(/↑/)).toBeInTheDocument()
  })

  it('renders negative % change', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} pctChange={-2.3} />)
    expect(screen.getByText(/2\.3%/)).toBeInTheDocument()
    expect(screen.getByText(/↓/)).toBeInTheDocument()
  })

  it('renders "—" when pctChange is null', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} pctChange={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders "0.0%" with no directional arrow when pctChange is 0', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} pctChange={0} />)
    expect(screen.getByText('0.0%')).toBeInTheDocument()
    expect(screen.queryByText('↑')).not.toBeInTheDocument()
    expect(screen.queryByText('↓')).not.toBeInTheDocument()
  })

  it('renders the previous value', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText('1.10M')).toBeInTheDocument()
  })

  it('renders the area chart', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} />)
    expect(document.querySelector('.recharts-responsive-container')).toBeTruthy()
  })

  it('renders loading bar when loading is true', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} loading />)
    // Content is opacity-0 but still in DOM; loading bar is rendered
    expect(document.querySelector('.bg-primary\\/50')).toBeTruthy()
  })

  it('renders "prev. period:" label when prevPeriodLabel is not provided', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText(/prev\. period:/)).toBeInTheDocument()
  })

  it('renders prevPeriodLabel when provided', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} prevPeriodLabel="2025-01-01 – 2025-12-31" />)
    expect(screen.getByText(/prev\. \(2025-01-01 – 2025-12-31\):/)).toBeInTheDocument()
    expect(screen.queryByText(/prev\. period:/)).not.toBeInTheDocument()
  })

  it('shows a retry button when isError is true', () => {
    const onRetry = vi.fn()
    renderWithTooltip(<HeroMetricCard {...baseProps} isError onRetry={onRetry} />)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    renderWithTooltip(<HeroMetricCard {...baseProps} isError onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('applies error border style when isError is true', () => {
    const onRetry = vi.fn()
    renderWithTooltip(<HeroMetricCard {...baseProps} isError onRetry={onRetry} />)
    const card = document.querySelector('[data-error="true"]')
    expect(card).toBeTruthy()
    expect(card?.className).toMatch(/destructive/)
  })
})
