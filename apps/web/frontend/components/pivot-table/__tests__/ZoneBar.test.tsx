import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ZoneBar } from '../ZoneBar'
import type { LeafMeta, ZoneCol } from '../types'

const leafCols: LeafMeta[] = [
  {
    colId: 'country',
    label: 'Country',
    enableRowGroup: true,
    enablePivot: true,
    enableValue: false,
  },
  {
    colId: 'count',
    label: 'Count',
    enableRowGroup: false,
    enablePivot: false,
    enableValue: true,
    allowedAggFuncs: ['sum'],
  },
]

function makeProps(overrides = {}) {
  return {
    leafCols,
    rowGroups: [] as ZoneCol[],
    pivotCols: [] as ZoneCol[],
    valueCols: [] as ZoneCol[],
    onRowGroupsChange: vi.fn(),
    onPivotColsChange: vi.fn(),
    onValueColsChange: vi.fn(),
    ...overrides,
  }
}

describe('ZoneBar', () => {
  it('renders three zone labels', () => {
    render(<ZoneBar {...makeProps()} />)
    expect(screen.getByText('Rows')).toBeInTheDocument()
    expect(screen.getByText('Columns')).toBeInTheDocument()
    expect(screen.getByText('Values')).toBeInTheDocument()
  })

  it('renders existing chips', () => {
    render(
      <ZoneBar
        {...makeProps({
          rowGroups: [{ colId: 'country', label: 'Country' }],
        })}
      />
    )
    expect(screen.getByText('Country')).toBeInTheDocument()
  })

  it('remove chip calls onRowGroupsChange without that col', async () => {
    const onRowGroupsChange = vi.fn()
    render(
      <ZoneBar
        {...makeProps({
          rowGroups: [{ colId: 'country', label: 'Country' }],
          onRowGroupsChange,
        })}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /remove country/i }))
    expect(onRowGroupsChange).toHaveBeenCalledWith([])
  })
})
