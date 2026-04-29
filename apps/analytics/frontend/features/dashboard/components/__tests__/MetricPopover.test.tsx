import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MetricPopover } from '../MetricPopover'
import type { MissionControlMetrics } from '@/types'

const baseMetrics: MissionControlMetrics = {
  total_events: 5000,
  unique_users: 156,
  total_sessions: 300,
  avg_session_duration_sec: 142,
  avg_events_per_session: 13.8,
  new_users: 42,
  returning_users: 92,
  resurrected_users: 22,
  churned_users: 14,
  retention_rate: 0.68,
  wau: 284,
  avg_active_days: 8.3,
  power_users: 89,
  dau_mau_ratio: 0.342,
}

describe('MetricPopover', () => {
  it('renders the info icon trigger', () => {
    render(
      <MetricPopover metricKey="new_users" currentMetrics={baseMetrics} previousMetrics={null} />
    )
    expect(screen.getByRole('button', { name: /info/i })).toBeInTheDocument()
  })

  it('shows formula breakdown on click', async () => {
    const user = userEvent.setup()
    render(
      <MetricPopover metricKey="new_users" currentMetrics={baseMetrics} previousMetrics={null} />
    )
    await user.click(screen.getByRole('button', { name: /info/i }))
    expect(screen.getByText(/42/)).toBeInTheDocument()
    expect(screen.getByText(/156/)).toBeInTheDocument()
  })

  it('shows retention breakdown when available', async () => {
    const user = userEvent.setup()
    render(
      <MetricPopover
        metricKey="retention_rate"
        currentMetrics={baseMetrics}
        previousMetrics={null}
        breakdown={{ retained_count: 138, prev_unique_users: 203 }}
      />
    )
    await user.click(screen.getByRole('button', { name: /info/i }))
    expect(screen.getByText(/138/)).toBeInTheDocument()
    expect(screen.getByText(/203/)).toBeInTheDocument()
  })
})
