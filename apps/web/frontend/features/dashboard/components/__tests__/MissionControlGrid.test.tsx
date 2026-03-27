import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MissionControlGrid } from '../MissionControlGrid'
import type { MissionControlResponse } from '@/types'
import type { TrendMetric, MetricTrend } from '../../hooks/useMissionControlTrends'

vi.mock('@/components/dev', () => ({
  DevCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../MiniMetricCard', () => ({
  MiniMetricCard: ({
    label,
    isHero,
    onClick,
  }: {
    label: string
    isHero?: boolean
    onClick?: () => void
  }) => (
    <button onClick={onClick} data-hero={isHero ? 'true' : 'false'} data-testid={`mini-${label}`}>
      {label}
    </button>
  ),
}))

vi.mock('../HeroMetricCard', () => ({
  HeroMetricCard: ({ label }: { label: string }) => <div data-testid="hero-card">{label}</div>,
}))

const mockData: MissionControlResponse = {
  period: { start_date: '2024-02-20', end_date: '2024-03-21' },
  previous_period: { start_date: '2024-01-21', end_date: '2024-02-19' },
  current: {
    total_events: 1240000,
    unique_users: 48200,
    total_sessions: 89700,
    avg_session_duration_sec: 142.5,
    avg_events_per_session: 13.8,
    new_users: 12400,
    returning_users: 35800,
    dau_mau_ratio: 0.34,
  },
  previous: {
    total_events: 1100000,
    unique_users: 44500,
    total_sessions: 91000,
    avg_session_duration_sec: 138.2,
    avg_events_per_session: 12.1,
    new_users: 11200,
    returning_users: 33300,
    dau_mau_ratio: 0.31,
  },
}

const emptyTrends = Object.fromEntries(
  [
    'total_events',
    'unique_users',
    'total_sessions',
    'avg_session_duration_sec',
    'avg_events_per_session',
    'new_users',
    'returning_users',
    'dau_mau_ratio',
  ].map((k) => [k, { values: [], loading: false }])
) as Record<TrendMetric, MetricTrend>

const noMetricLoading = Object.fromEntries(
  [
    'total_events',
    'unique_users',
    'total_sessions',
    'avg_session_duration_sec',
    'avg_events_per_session',
    'new_users',
    'returning_users',
    'dau_mau_ratio',
  ].map((k) => [k, false])
) as Record<TrendMetric, boolean>

describe('MissionControlGrid', () => {
  it('renders the hero card with Total Events by default', () => {
    render(
      <MissionControlGrid data={mockData} trends={emptyTrends} metricLoading={noMetricLoading} />
    )
    expect(screen.getByTestId('hero-card')).toHaveTextContent('Total Events')
  })

  it('renders all 7 supporting mini cards', () => {
    render(
      <MissionControlGrid data={mockData} trends={emptyTrends} metricLoading={noMetricLoading} />
    )
    expect(screen.getByTestId('mini-Unique Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Sessions')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Avg Session')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Events / Session')).toBeInTheDocument()
    expect(screen.getByTestId('mini-New Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Returning Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-DAU / MAU')).toBeInTheDocument()
  })

  it('shows category headers', () => {
    render(
      <MissionControlGrid data={mockData} trends={emptyTrends} metricLoading={noMetricLoading} />
    )
    expect(screen.getByText('Volume')).toBeInTheDocument()
    expect(screen.getByText('Engagement')).toBeInTheDocument()
    expect(screen.getByText('Acquisition')).toBeInTheDocument()
    expect(screen.getByText('Stickiness')).toBeInTheDocument()
  })

  it('promotes a mini card to hero when clicked', () => {
    render(
      <MissionControlGrid data={mockData} trends={emptyTrends} metricLoading={noMetricLoading} />
    )

    // Initially hero is Total Events
    expect(screen.getByTestId('hero-card')).toHaveTextContent('Total Events')

    // Click Unique Users mini card
    fireEvent.click(screen.getByTestId('mini-Unique Users'))

    // Hero should now be Unique Users
    expect(screen.getByTestId('hero-card')).toHaveTextContent('Unique Users')
  })

  it('marks the promoted mini card with isHero', () => {
    render(
      <MissionControlGrid data={mockData} trends={emptyTrends} metricLoading={noMetricLoading} />
    )
    fireEvent.click(screen.getByTestId('mini-Sessions'))
    expect(screen.getByTestId('mini-Sessions')).toHaveAttribute('data-hero', 'true')
  })
})
