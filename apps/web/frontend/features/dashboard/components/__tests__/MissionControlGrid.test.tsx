import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MissionControlGrid } from '../MissionControlGrid'
import type { MissionControlResponse } from '@/types'
import type { TrendMetric, MetricTrend } from '../../hooks/useMissionControlTrends'

vi.mock('@/components/dev', () => ({
  DevCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../MetricPopover', () => ({
  MetricPopover: () => null,
}))

vi.mock('../MiniMetricCard', () => ({
  MiniMetricCard: ({
    label,
    isHero,
    onClick,
    changeLabel,
  }: {
    label: string
    isHero?: boolean
    onClick?: () => void
    changeLabel?: string
  }) => (
    <button
      onClick={onClick}
      data-hero={isHero ? 'true' : 'false'}
      data-testid={`mini-${label}`}
      data-change-label={changeLabel}
    >
      {label}
    </button>
  ),
}))

vi.mock('../HeroMetricCard', () => ({
  HeroMetricCard: ({
    label,
    changeLabel,
    prevPeriodLabel,
  }: {
    label: string
    changeLabel?: string
    prevPeriodLabel?: string
  }) => (
    <div
      data-testid="hero-card"
      data-change-label={changeLabel}
      data-prev-period-label={prevPeriodLabel}
    >
      {label}
    </div>
  ),
}))

vi.mock('@/stores', () => ({
  useAppStore: (selector: (s: { granularity: string }) => unknown) =>
    selector({ granularity: 'day' }),
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
    wau: 15000,
    avg_active_days: 3.2,
    power_users: 5000,
    resurrected_users: 800,
    churned_users: 1200,
    retention_rate: 0.72,
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
    wau: 14000,
    avg_active_days: 3.0,
    power_users: 4500,
    resurrected_users: 700,
    churned_users: 1100,
    retention_rate: 0.68,
  },
}

const allMetricKeys: TrendMetric[] = [
  'total_events',
  'unique_users',
  'wau',
  'total_sessions',
  'avg_session_duration_sec',
  'avg_events_per_session',
  'avg_active_days',
  'power_users',
  'new_users',
  'returning_users',
  'resurrected_users',
  'churned_users',
  'retention_rate',
  'dau_mau_ratio',
]

const emptyTrends = Object.fromEntries(
  allMetricKeys.map((k) => [k, { values: [], loading: false }])
) as Record<TrendMetric, MetricTrend>

const noMetricLoading = Object.fromEntries(allMetricKeys.map((k) => [k, false])) as Record<
  TrendMetric,
  boolean
>

const defaultPinProps = {
  togglePin: vi.fn(),
  isPinned: () => true,
  resetToDefault: vi.fn(),
}

const mockDateRange = {
  from: new Date('2025-01-01'),
  to: new Date('2026-01-01'),
}

const mockDateRangeNoEnd = {
  from: new Date('2025-01-01'),
  to: null,
}

describe('MissionControlGrid', () => {
  it('renders the hero card with Total Events by default', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('hero-card')).toHaveTextContent('Total Events')
  })

  it('renders all 13 supporting mini cards', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('mini-Unique Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-WAU')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Sessions')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Avg Session')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Events / Session')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Active Days')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Power Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-New Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Returning Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Resurrected')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Churned')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Retention Rate')).toBeInTheDocument()
    expect(screen.getByTestId('mini-DAU / MAU')).toBeInTheDocument()
  })

  it('renders all 14 metric labels including new ones', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    // All 14 metrics from METRIC_CONFIG
    const expectedLabels = [
      'Total Events',
      'Unique Users',
      'WAU',
      'Sessions',
      'Avg Session',
      'Events / Session',
      'Active Days',
      'Power Users',
      'New Users',
      'Returning Users',
      'Resurrected',
      'Churned',
      'Retention Rate',
      'DAU / MAU',
    ]

    expectedLabels.forEach((label) => {
      // Total Events is in hero, so it won't have a mini- testid
      if (label === 'Total Events') {
        expect(screen.getByTestId('hero-card')).toHaveTextContent(label)
      } else {
        expect(screen.getByTestId(`mini-${label}`)).toBeInTheDocument()
      }
    })
  })

  it('shows category headers', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    expect(screen.getByText('Volume')).toBeInTheDocument()
    expect(screen.getByText('Engagement')).toBeInTheDocument()
    expect(screen.getByText('Acquisition')).toBeInTheDocument()
    expect(screen.getByText('Stickiness')).toBeInTheDocument()
  })

  it('promotes a mini card to hero when clicked', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
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
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    fireEvent.click(screen.getByTestId('mini-Sessions'))
    expect(screen.getByTestId('mini-Sessions')).toHaveAttribute('data-hero', 'true')
  })

  it('shows Customize metrics button and toggles chips', async () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    const customizeBtn = screen.getByText('Customize metrics')
    expect(customizeBtn).toBeInTheDocument()
    // Click to open
    await userEvent.click(customizeBtn)
    // WAU chip should appear
    expect(screen.getAllByText('WAU').length).toBeGreaterThan(0)
  })
})

describe('MissionControlGrid period labels', () => {
  it('passes changeLabel with prev period dates to HeroMetricCard when data has previous_period', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('hero-card')).toHaveAttribute(
      'data-change-label',
      'Change vs. 2024-01-21 – 2024-02-19'
    )
  })

  it('passes prevPeriodLabel with prev period dates to HeroMetricCard when data has previous_period', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('hero-card')).toHaveAttribute(
      'data-prev-period-label',
      '2024-01-21 – 2024-02-19'
    )
  })

  it('passes changeLabel with prev period dates to MiniMetricCard when data has previous_period', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('mini-Unique Users')).toHaveAttribute(
      'data-change-label',
      'Change vs. 2024-01-21 – 2024-02-19'
    )
  })

  it('passes generic changeLabel when data has no previous_period dates', () => {
    const dataWithoutPrevPeriod = {
      ...mockData,
      previous_period: { start_date: undefined, end_date: undefined },
    }
    render(
      <MissionControlGrid
        data={dataWithoutPrevPeriod}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRangeNoEnd}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('hero-card')).toHaveAttribute(
      'data-change-label',
      'Change vs. previous period'
    )
  })
})
