import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MiniMetricCard } from '../MiniMetricCard'

// SparklineChart renders SVG — mock it to keep tests simple
vi.mock('@/components/charts/sparkline-chart', () => ({
  SparklineChart: () => <svg data-testid="sparkline" />,
}))

const baseProps = {
  label: 'Unique Users',
  value: '48.2K',
  pctChange: 8.1,
  sparklineValues: [100, 110, 120, 130, 140],
  color: '#10b981',
}

describe('MiniMetricCard', () => {
  it('renders the label', () => {
    render(<MiniMetricCard {...baseProps} />)
    expect(screen.getByText('Unique Users')).toBeInTheDocument()
  })

  it('renders the formatted value', () => {
    render(<MiniMetricCard {...baseProps} />)
    expect(screen.getByText('48.2K')).toBeInTheDocument()
  })

  it('renders positive % change with up arrow', () => {
    render(<MiniMetricCard {...baseProps} pctChange={8.1} />)
    expect(screen.getByText(/8\.1%/)).toBeInTheDocument()
    expect(screen.getByText(/↑/)).toBeInTheDocument()
  })

  it('renders negative % change with down arrow', () => {
    render(<MiniMetricCard {...baseProps} pctChange={-2.3} />)
    expect(screen.getByText(/2\.3%/)).toBeInTheDocument()
    expect(screen.getByText(/↓/)).toBeInTheDocument()
  })

  it('renders "0.0%" with no directional arrow when pctChange is 0', () => {
    render(<MiniMetricCard {...baseProps} pctChange={0} />)
    expect(screen.getByText('0.0%')).toBeInTheDocument()
    expect(screen.queryByText('↑')).not.toBeInTheDocument()
    expect(screen.queryByText('↓')).not.toBeInTheDocument()
  })

  it('renders "—" when pctChange is null', () => {
    render(<MiniMetricCard {...baseProps} pctChange={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders a sparkline', () => {
    render(<MiniMetricCard {...baseProps} />)
    expect(screen.getByTestId('sparkline')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<MiniMetricCard {...baseProps} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies hero border style when isHero is true', () => {
    render(<MiniMetricCard {...baseProps} isHero />)
    const card = screen.getByRole('button')
    expect(card.className).toMatch(/border-primary/)
  })

  it('renders loading skeleton when loading is true', () => {
    render(<MiniMetricCard {...baseProps} loading />)
    expect(screen.queryByText('48.2K')).not.toBeInTheDocument()
    // Skeleton is rendered instead
    expect(document.querySelector('[class*="animate-pulse"]')).toBeTruthy()
  })
})
