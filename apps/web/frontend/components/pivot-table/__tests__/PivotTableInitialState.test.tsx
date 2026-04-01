import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { PivotTable } from '../PivotTable'
import type { PivotTableProps, ZoneCol, FilterEntry } from '../types'

function renderInRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

// Minimal stub props — tests only care about initial state
function makeProps(overrides: Partial<PivotTableProps> = {}): PivotTableProps {
  return {
    colDefsData: undefined,
    colDefsLoading: false,
    startDate: undefined,
    endDate: undefined,
    activeFilters: {},
    activeConnectionId: 'conn-1',
    fetchRows: vi.fn().mockResolvedValue({ rows: [], columnDefs: [] }),
    fetchFilterValues: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

describe('PivotTable initial state from Trend handoff', () => {
  it('renders initial value col chip when initialValueCols provided', () => {
    const initialValueCols: ZoneCol[] = [{ colId: 'event_count', label: 'Events', aggFunc: 'sum' }]
    renderInRouter(<PivotTable {...makeProps({ initialValueCols })} />)
    expect(screen.getByText('Events')).toBeInTheDocument()
  })

  it('renders initial row group chip when initialRowGroups provided', () => {
    const initialRowGroups: ZoneCol[] = [{ colId: 'country', label: 'Country' }]
    renderInRouter(<PivotTable {...makeProps({ initialRowGroups })} />)
    expect(screen.getByText('Country')).toBeInTheDocument()
  })

  it('renders initial pivot col chip when initialPivotCols provided', () => {
    const initialPivotCols: ZoneCol[] = [{ colId: 'country', label: 'Country' }]
    renderInRouter(<PivotTable {...makeProps({ initialPivotCols })} />)
    expect(screen.getByText('Country')).toBeInTheDocument()
  })

  it('renders initial pivot filter when initialPivotFilters provided', () => {
    const initialPivotFilters: FilterEntry[] = [
      { field: 'platform', fieldLabel: 'platform', value: 'web' },
    ]
    renderInRouter(<PivotTable {...makeProps({ initialPivotFilters })} />)
    expect(screen.getByText(/web/)).toBeInTheDocument()
  })

  it('skips default-seeding effect when initialValueCols provided', async () => {
    // colDefsData has event_count and user_id — but they must NOT be added
    // because initialValueCols already seeds the state
    const initialValueCols: ZoneCol[] = [{ colId: 'event_count', label: 'Events', aggFunc: 'sum' }]
    const colDefsData = {
      columnDefs: [
        { field: 'event_count', headerName: 'Events', enableValue: true, allowedAggFuncs: ['sum'] },
        {
          field: 'user_id',
          headerName: 'Users',
          enableValue: true,
          allowedAggFuncs: ['count_distinct'],
        },
      ],
    }
    renderInRouter(<PivotTable {...makeProps({ initialValueCols, colDefsData })} />)
    // Only the initial col should be present — NOT the auto-seeded user_id
    const chips = screen.getAllByText(/Events|Users/)
    expect(chips).toHaveLength(1)
    expect(chips[0].textContent).toContain('Events')
  })
})
