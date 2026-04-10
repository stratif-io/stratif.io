import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PageHeader } from './page-header'
import { TYPOGRAPHY } from '@/lib/constants'

describe('PageHeader', () => {
  it('renders an h1 element', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('applies TYPOGRAPHY.pageLabel classes to h1', () => {
    render(<PageHeader title="Dashboard" />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.className).toBe(TYPOGRAPHY.pageLabel)
  })

  it('renders the title text', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="People" subtitle="All tracked users" />)
    expect(screen.getByText('All tracked users')).toBeInTheDocument()
  })

  it('does not render subtitle element when omitted', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.queryByText(/./)).toHaveTextContent('Dashboard')
    // subtitle p element must not exist
    const wrapper = screen.getByRole('heading', { level: 1 }).parentElement!
    expect(wrapper.querySelectorAll('p')).toHaveLength(0)
  })
})
