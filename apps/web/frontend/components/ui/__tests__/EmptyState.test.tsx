import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EmptyState } from '../empty-state'
import { ActivityIcon } from 'lucide-react'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        variant="no-data"
        icon={ActivityIcon}
        title="No data for this period"
        description="No events matched your filters."
      />
    )
    expect(screen.getByText('No data for this period')).toBeInTheDocument()
    expect(screen.getByText('No events matched your filters.')).toBeInTheDocument()
  })

  it('renders primary action button', () => {
    render(
      <EmptyState
        variant="no-data"
        icon={ActivityIcon}
        title="No data"
        description="Try a wider range."
        actions={[{ label: 'Clear filters', onClick: vi.fn() }]}
      />
    )
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('calls action onClick', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        variant="no-data"
        icon={ActivityIcon}
        title="No data"
        description="Try a wider range."
        actions={[{ label: 'Clear filters', onClick }]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('uses teal icon bg for configure variant', () => {
    render(
      <EmptyState
        variant="configure"
        icon={ActivityIcon}
        title="Add funnel steps"
        description="Define at least 2 steps."
      />
    )
    expect(screen.getByTestId('empty-icon-wrapper')).toHaveClass('bg-[hsl(var(--primary)/0.1)]')
  })

  it('uses grey icon bg for no-data variant', () => {
    render(
      <EmptyState variant="no-data" icon={ActivityIcon} title="No data" description="No results." />
    )
    expect(screen.getByTestId('empty-icon-wrapper')).toHaveClass('bg-muted')
  })
})
