import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FunnelSteps } from '../FunnelSteps'

const makeSteps = () => [
  {
    step: 1,
    event: 'Page View',
    occurrences: 1000,
    users: 1000,
    step_conversion_rate: 100,
    overall_conversion_rate: 100,
    dropoff_users: 0,
    dropoff_rate: 0,
  },
  {
    step: 2,
    event: 'Sign Up',
    occurrences: 150,
    users: 150,
    step_conversion_rate: 15,
    overall_conversion_rate: 15,
    dropoff_users: 850,
    dropoff_rate: 85,
  },
]

describe('FunnelSteps', () => {
  it('applies destructive color to step circle with low conversion rate', () => {
    const steps = makeSteps()
    render(<FunnelSteps steps={steps} />)
    const circles = document.querySelectorAll('[data-step-circle]')
    expect(circles).toHaveLength(2)
    // step 1: always primary
    expect(circles[0].className).toMatch(/primary/)
    // step 2: 15% → destructive
    expect(circles[1].className).toMatch(/destructive/)
  })

  it('applies success color to step circle with high conversion rate', () => {
    const steps = [
      { ...makeSteps()[0] },
      {
        step: 2,
        event: 'Dashboard',
        occurrences: 900,
        users: 900,
        step_conversion_rate: 90,
        overall_conversion_rate: 90,
        dropoff_users: 100,
        dropoff_rate: 10,
      },
    ]
    render(<FunnelSteps steps={steps} />)
    const circles = document.querySelectorAll('[data-step-circle]')
    expect(circles[1].className).toMatch(/success/)
  })

  it('applies count color matching circle color', () => {
    render(<FunnelSteps steps={makeSteps()} />)
    // The user count for step 2 (15% → destructive) should have destructive class
    const counts = document.querySelectorAll('[data-step-count]')
    expect(counts[1].className).toMatch(/destructive/)
  })

  it('renders connector with drop badge showing dropped users', () => {
    render(<FunnelSteps steps={makeSteps()} />)
    expect(screen.getByText(/dropped/)).toBeInTheDocument()
    expect(screen.getByText(/850/)).toBeInTheDocument()
  })

  it('renders "All continued" badge when no dropoff', () => {
    const steps = [
      { ...makeSteps()[0] },
      {
        step: 2,
        event: 'Dashboard',
        occurrences: 1000,
        users: 1000,
        step_conversion_rate: 100,
        overall_conversion_rate: 100,
        dropoff_users: 0,
        dropoff_rate: 0,
      },
    ]
    render(<FunnelSteps steps={steps} />)
    expect(screen.getByText(/All.*continued/)).toBeInTheDocument()
  })

  it('renders rounded bars', () => {
    render(<FunnelSteps steps={makeSteps()} />)
    // The bar track should have rounded-full
    const tracks = document.querySelectorAll('.rounded-full')
    expect(tracks.length).toBeGreaterThan(0)
  })
})
