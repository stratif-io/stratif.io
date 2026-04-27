import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AggBadge } from '../AggBadge'

describe('AggBadge', () => {
  it('renders the symbol for sum', () => {
    render(
      <AggBadge aggFunc="sum" allowedAggFuncs={['sum', 'count', 'avg']} onAggChange={vi.fn()} />
    )
    expect(screen.getByText('Σ')).toBeInTheDocument()
  })

  it('renders the symbol for count', () => {
    render(<AggBadge aggFunc="count" allowedAggFuncs={['sum', 'count']} onAggChange={vi.fn()} />)
    expect(screen.getByText('n')).toBeInTheDocument()
  })

  it('renders the symbol for countDistinct', () => {
    render(
      <AggBadge
        aggFunc="countDistinct"
        allowedAggFuncs={['count', 'countDistinct']}
        onAggChange={vi.fn()}
      />
    )
    expect(screen.getByText('#')).toBeInTheDocument()
  })

  it('renders the symbol for count_distinct', () => {
    render(
      <AggBadge
        aggFunc="count_distinct"
        allowedAggFuncs={['count', 'count_distinct']}
        onAggChange={vi.fn()}
      />
    )
    expect(screen.getByText('#')).toBeInTheDocument()
  })

  it('opens popover showing all allowed agg options on click', () => {
    render(
      <AggBadge aggFunc="sum" allowedAggFuncs={['sum', 'count', 'avg']} onAggChange={vi.fn()} />
    )
    fireEvent.click(screen.getByText('Σ'))
    expect(screen.getByText('n Count')).toBeInTheDocument()
    expect(screen.getByText('avg Avg')).toBeInTheDocument()
  })

  it('calls onAggChange with the selected agg when an option is clicked', () => {
    const onAggChange = vi.fn()
    render(
      <AggBadge aggFunc="sum" allowedAggFuncs={['sum', 'count', 'avg']} onAggChange={onAggChange} />
    )
    fireEvent.click(screen.getByText('Σ'))
    fireEvent.click(screen.getByText('n Count'))
    expect(onAggChange).toHaveBeenCalledWith('count')
  })

  it('does not call onAggChange when the currently selected option is clicked', () => {
    const onAggChange = vi.fn()
    render(<AggBadge aggFunc="sum" allowedAggFuncs={['sum', 'count']} onAggChange={onAggChange} />)
    fireEvent.click(screen.getByText('Σ'))
    // Click the already-active option (Σ Sum in the list)
    fireEvent.click(screen.getByText('Σ Sum'))
    expect(onAggChange).not.toHaveBeenCalled()
  })

  it('stops click propagation', () => {
    const parentClick = vi.fn()
    render(
      <div onClick={parentClick}>
        <AggBadge aggFunc="sum" allowedAggFuncs={['sum', 'count']} onAggChange={vi.fn()} />
      </div>
    )
    fireEvent.click(screen.getByText('Σ'))
    expect(parentClick).not.toHaveBeenCalled()
  })
})
