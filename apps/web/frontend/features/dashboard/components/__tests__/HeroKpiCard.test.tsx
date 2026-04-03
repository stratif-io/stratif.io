import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HeroKpiCard } from '../HeroKpiCard'

describe('HeroKpiCard', () => {
  it('renders the label', () => {
    render(
      <HeroKpiCard label="Active Users" value="24,891" delta={12.4} sparkline={[1, 2, 3, 4, 5]} />
    )
    expect(screen.getByText('Active Users')).toBeInTheDocument()
  })

  it('renders the formatted value', () => {
    render(
      <HeroKpiCard label="Active Users" value="24,891" delta={12.4} sparkline={[1, 2, 3, 4, 5]} />
    )
    expect(screen.getByText('24,891')).toBeInTheDocument()
  })

  it('shows positive delta in teal', () => {
    render(
      <HeroKpiCard label="Active Users" value="24,891" delta={12.4} sparkline={[1, 2, 3, 4, 5]} />
    )
    const delta = screen.getByText(/12\.4%/)
    expect(delta).toBeInTheDocument()
    expect(delta.closest('[data-testid="delta-badge"]')).not.toHaveClass('bg-red-100')
  })

  it('shows negative delta in red', () => {
    render(
      <HeroKpiCard label="Retention D7" value="38.2%" delta={-2.1} sparkline={[5, 4, 3, 2, 1]} />
    )
    const delta = screen.getByText(/2\.1%/)
    expect(delta.closest('[data-testid="delta-badge"]')).toHaveClass('bg-red-100')
  })
})
