import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DimensionPickerPopover } from '../DimensionPickerPopover'
import type { LeafMeta } from '../types'

const leafCols: LeafMeta[] = [
  { colId: 'country', label: 'Country', enableRowGroup: true, enablePivot: true, enableValue: false },
  { colId: 'device', label: 'Device', enableRowGroup: true, enablePivot: false, enableValue: false },
  { colId: 'count', label: 'Count', enableRowGroup: false, enablePivot: false, enableValue: true },
]

describe('DimensionPickerPopover', () => {
  it('renders trigger button', () => {
    render(
      <DimensionPickerPopover
        leafCols={leafCols}
        usedIds={new Set()}
        canAdd={(m) => m.enableRowGroup}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('opens popover on click and shows eligible dimensions', async () => {
    render(
      <DimensionPickerPopover
        leafCols={leafCols}
        usedIds={new Set()}
        canAdd={(m) => m.enableRowGroup}
        onSelect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(await screen.findByText('Country')).toBeInTheDocument()
    expect(await screen.findByText('Device')).toBeInTheDocument()
    expect(screen.queryByText('Count')).not.toBeInTheDocument()
  })

  it('disables already-used dimensions', async () => {
    render(
      <DimensionPickerPopover
        leafCols={leafCols}
        usedIds={new Set(['country'])}
        canAdd={(m) => m.enableRowGroup}
        onSelect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    const countryBtn = await screen.findByRole('button', { name: 'Country' })
    expect(countryBtn).toBeDisabled()
  })

  it('calls onSelect with colId and closes on click', async () => {
    const onSelect = vi.fn()
    render(
      <DimensionPickerPopover
        leafCols={leafCols}
        usedIds={new Set()}
        canAdd={(m) => m.enableRowGroup}
        onSelect={onSelect}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Country' }))
    expect(onSelect).toHaveBeenCalledWith('country')
  })
})
