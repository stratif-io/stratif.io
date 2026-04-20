import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HeroMetricCard } from '../HeroMetricCard'
import { formatAxisDate, formatTooltipDate } from '../hero-metric-card-formatters'

const renderWithTooltip = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>)

const baseProps = {
  label: 'Total Events',
  value: '1.24M',
  pctChange: 12.4,
  previousValue: '1.10M',
  sparklineValues: [100, 110, 120, 130, 140, 150, 160],
  color: 'hsl(var(--chart-1))',
  granularity: 'day' as const,
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

  it('shows the error reason in parenthesis when errorMessage is provided', () => {
    renderWithTooltip(
      <HeroMetricCard {...baseProps} isError errorMessage="timeout after 10s" onRetry={vi.fn()} />
    )
    expect(screen.getByText(/\(timeout after 10s\)/)).toBeInTheDocument()
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

  it('requires granularity and does not crash at day granularity', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} granularity="day" />)
    expect(screen.getByText('Total Events')).toBeInTheDocument()
  })

  it('requires granularity and does not crash at month granularity', () => {
    renderWithTooltip(<HeroMetricCard {...baseProps} granularity="month" />)
    expect(screen.getByText('Total Events')).toBeInTheDocument()
  })
})

describe('formatAxisDate', () => {
  const d = '2026-03-15T15:00:00Z'

  it('formats hour granularity', () => {
    expect(formatAxisDate(d, 'hour')).toMatch(/Mar 15 \d{1,2}[ap]m/i)
  })
  it('formats day granularity with two-digit year', () => {
    expect(formatAxisDate(d, 'day')).toBe("Mar 15, '26")
  })
  it('formats week granularity with two-digit year', () => {
    expect(formatAxisDate(d, 'week')).toBe("Mar 15, '26")
  })
  it('formats month granularity', () => {
    expect(formatAxisDate(d, 'month')).toBe('Mar 2026')
  })
  it('formats quarter granularity', () => {
    expect(formatAxisDate(d, 'quarter')).toBe('Q1 2026')
  })
  it('formats year granularity', () => {
    expect(formatAxisDate(d, 'year')).toBe('2026')
  })
  it('falls back to raw input on invalid date', () => {
    expect(formatAxisDate('not-a-date', 'day')).toBe('not-a-date')
  })
})

describe('formatTooltipDate', () => {
  const d = '2026-03-15T15:00:00Z'

  it('formats hour granularity with full time', () => {
    expect(formatTooltipDate(d, 'hour')).toMatch(/Mar 15, 2026, \d{1,2}:\d{2} [AP]M/)
  })
  it('formats day granularity with weekday and full year', () => {
    expect(formatTooltipDate(d, 'day')).toBe('Sun, Mar 15, 2026')
  })
  it('formats week granularity with "Week of" prefix', () => {
    expect(formatTooltipDate(d, 'week')).toBe('Week of Mar 15, 2026')
  })
  it('formats month granularity with full month name', () => {
    expect(formatTooltipDate(d, 'month')).toBe('March 2026')
  })
  it('formats quarter granularity', () => {
    expect(formatTooltipDate(d, 'quarter')).toBe('Q1 2026')
  })
  it('formats year granularity', () => {
    expect(formatTooltipDate(d, 'year')).toBe('2026')
  })
  it('falls back to raw input on invalid date', () => {
    expect(formatTooltipDate('not-a-date', 'day')).toBe('not-a-date')
  })
})
