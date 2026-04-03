import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Header } from '../Header'

describe('Header', () => {
  it('renders page title', () => {
    render(<Header title="Dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<Header title="Trends" subtitle="Event counts over time" />)
    expect(screen.getByText('Event counts over time')).toBeInTheDocument()
  })

  it('renders Share button when showShare is true', () => {
    render(<Header title="Dashboard" showShare onShare={vi.fn()} />)
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })

  it('does not render Share button by default', () => {
    render(<Header title="Connections" />)
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
  })

  it('renders children (slot for date picker / filters)', () => {
    render(
      <Header title="Trends">
        <button>Date picker</button>
      </Header>
    )
    expect(screen.getByText('Date picker')).toBeInTheDocument()
  })
})
