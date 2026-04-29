import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { TrendFilters } from '../TrendFilters'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('TrendFilters', () => {
  it('renders nothing when dimensions is empty (default mode)', () => {
    const { container } = render(
      <TrendFilters dimensions={[]} filters={{}} connectionId={undefined} onChange={vi.fn()} />,
      { wrapper }
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the collapsible trigger in default mode', () => {
    render(
      <TrendFilters
        dimensions={[{ value: 'country', label: 'Country' }]}
        filters={{}}
        connectionId={undefined}
        onChange={vi.fn()}
      />,
      { wrapper }
    )
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('renders active filters as chips in compact mode', () => {
    const filters = { country: ['US'] }
    const onChange = vi.fn()
    render(
      <TrendFilters
        dimensions={[{ value: 'country', label: 'Country' }]}
        filters={filters}
        connectionId={undefined}
        onChange={onChange}
        compact
      />,
      { wrapper }
    )
    expect(screen.getByText(/country/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove country filter/i })).toBeInTheDocument()
  })

  it('renders + Filter button in compact mode', () => {
    render(
      <TrendFilters
        dimensions={[{ value: 'country', label: 'Country' }]}
        filters={{}}
        connectionId={undefined}
        onChange={vi.fn()}
        compact
      />,
      { wrapper }
    )
    expect(screen.getByRole('button', { name: /\+ filter/i })).toBeInTheDocument()
  })

  it('does not render chips in default (non-compact) mode', () => {
    render(
      <TrendFilters
        dimensions={[{ value: 'country', label: 'Country' }]}
        filters={{ country: ['US'] }}
        connectionId={undefined}
        onChange={vi.fn()}
      />,
      { wrapper }
    )
    // In default mode, chips are not rendered — the collapsible trigger is shown instead
    expect(screen.queryByRole('button', { name: /remove country filter/i })).not.toBeInTheDocument()
  })
})
