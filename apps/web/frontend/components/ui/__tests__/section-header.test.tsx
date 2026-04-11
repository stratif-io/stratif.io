import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SectionHeader } from '../section-header'
import { TYPOGRAPHY } from '@/lib/constants'

describe('SectionHeader', () => {
  it('renders an h2 element (not h1)', () => {
    render(<SectionHeader title="Configuration" />)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('applies TYPOGRAPHY.sectionTitle classes to h2', () => {
    render(<SectionHeader title="Configuration" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2.className).toBe(TYPOGRAPHY.sectionTitle)
  })

  it('renders the title text', () => {
    render(<SectionHeader title="Configuration" />)
    expect(screen.getByText('Configuration')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<SectionHeader title="Schema" subtitle="Define your event fields" />)
    expect(screen.getByText('Define your event fields')).toBeInTheDocument()
  })

  it('does not render subtitle element when omitted', () => {
    render(<SectionHeader title="Configuration" />)
    const wrapper = screen.getByRole('heading', { level: 2 }).parentElement!
    expect(wrapper.querySelectorAll('p')).toHaveLength(0)
  })
})
