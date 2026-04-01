import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ValuePickerPopover } from '../ValuePickerPopover'
import type { LeafMeta } from '../pivot-table/types'

const leafCols: LeafMeta[] = [
  {
    colId: 'count',
    label: 'Count',
    enableRowGroup: false,
    enablePivot: false,
    enableValue: true,
    allowedAggFuncs: ['sum', 'avg'],
  },
  {
    colId: 'revenue',
    label: 'Revenue',
    enableRowGroup: false,
    enablePivot: false,
    enableValue: true,
    allowedAggFuncs: ['sum', 'avg', 'max'],
  },
  {
    colId: 'country',
    label: 'Country',
    enableRowGroup: true,
    enablePivot: false,
    enableValue: false,
  },
]

describe('ValuePickerPopover', () => {
  it('renders trigger button', () => {
    render(<ValuePickerPopover leafCols={leafCols} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('step 1: shows only enableValue dimensions', async () => {
    render(<ValuePickerPopover leafCols={leafCols} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(await screen.findByText('Count')).toBeInTheDocument()
    expect(await screen.findByText('Revenue')).toBeInTheDocument()
    expect(screen.queryByText('Country')).not.toBeInTheDocument()
  })

  it('step 2: shows agg options after selecting a dimension', async () => {
    render(<ValuePickerPopover leafCols={leafCols} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Count' }))
    expect(await screen.findByRole('button', { name: /sum/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /avg/i })).toBeInTheDocument()
  })

  it('calls onSelect with colId, label, and aggFunc', async () => {
    const onSelect = vi.fn()
    render(<ValuePickerPopover leafCols={leafCols} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Count' }))
    fireEvent.click(await screen.findByRole('button', { name: /sum/i }))
    expect(onSelect).toHaveBeenCalledWith('count', 'Count', 'sum')
  })

  it('back button returns to step 1', async () => {
    render(<ValuePickerPopover leafCols={leafCols} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Count' }))
    fireEvent.click(await screen.findByRole('button', { name: /back/i }))
    expect(await screen.findByText('Revenue')).toBeInTheDocument()
  })

  it('renders custom trigger instead of default Add button', () => {
    render(
      <ValuePickerPopover
        leafCols={leafCols}
        onSelect={vi.fn()}
        trigger={<button>Open picker</button>}
      />
    )
    expect(screen.getByRole('button', { name: /open picker/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
  })

  it('fixedAgg: calls onSelect immediately without step 2', async () => {
    const onSelect = vi.fn()
    const colsWithFixed: LeafMeta[] = [
      {
        colId: 'event_count',
        label: 'Event Count',
        enableValue: true,
        enableRowGroup: false,
        enablePivot: false,
        fixedAgg: 'none',
        category: 'metrics',
      },
    ]
    render(
      <ValuePickerPopover
        leafCols={colsWithFixed}
        onSelect={onSelect}
        trigger={<button>Open picker</button>}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /open picker/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Event Count' }))
    expect(onSelect).toHaveBeenCalledWith('event_count', 'Event Count', 'none')
    expect(screen.queryByText(/aggregation/i)).not.toBeInTheDocument()
  })
})
