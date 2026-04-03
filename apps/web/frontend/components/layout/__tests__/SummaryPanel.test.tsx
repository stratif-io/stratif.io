import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SummaryPanel } from '../SummaryPanel'

describe('SummaryPanel', () => {
  it('renders insight text', () => {
    render(
      <SummaryPanel
        insight="page_view is up 12.4% — strongest growth in 90 days."
        totals={[{ label: 'page_view', value: '84.2k', color: '#0d9488' }]}
      />
    )
    expect(screen.getByText(/page_view is up/)).toBeInTheDocument()
  })

  it('renders totals', () => {
    render(
      <SummaryPanel
        insight="Insight text"
        totals={[{ label: 'sign_up', value: '3.4k', color: '#3b82f6' }]}
      />
    )
    expect(screen.getByText('sign_up')).toBeInTheDocument()
    expect(screen.getByText('3.4k')).toBeInTheDocument()
  })
})
