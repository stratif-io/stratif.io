import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RetentionTable } from '../RetentionTable'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { RetentionCohort } from '@/types'

const makeCohort = (
  date: string,
  size: number,
  milestoneValues: (number | null)[]
): RetentionCohort => ({
  cohort_date: date,
  cohort_size: size,
  retention_series: milestoneValues.map((v) => v ?? 0),
  milestone_values: milestoneValues,
})

const BASE_PROPS = {
  granularity: 'day' as const,
  milestones: [1, 7, 30],
}

const renderTable = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>)

describe('RetentionTable', () => {
  it('renders cohorts in chronological order (oldest first)', () => {
    const data = [
      makeCohort('2024-03-01', 100, [40, 20, 10]),
      makeCohort('2024-01-01', 100, [35, 15, 8]),
      makeCohort('2024-02-01', 100, [38, 18, 9]),
    ]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    const rows = screen.getAllByRole('row')
    // First data row (index 1, after header) should be January
    expect(rows[1]).toHaveTextContent('Jan')
    // Last data row before average should be March
    expect(rows[3]).toHaveTextContent('Mar')
  })

  it('renders "soon" for null milestone values', () => {
    const data = [makeCohort('2024-01-01', 100, [40, null, null])]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    const soons = screen.getAllByText('soon')
    expect(soons.length).toBeGreaterThanOrEqual(2)
  })

  it('does not render "soon" for non-null milestone values', () => {
    const data = [makeCohort('2024-01-01', 100, [40, 20, 10])]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    expect(screen.queryByText('soon')).toBeNull()
  })

  it('renders cohort size as formatted number', () => {
    const data = [makeCohort('2024-01-01', 1240, [40, 20, 10])]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    expect(screen.getByText('1,240')).toBeInTheDocument()
  })

  it('renders Average row when there are multiple cohorts', () => {
    const data = [
      makeCohort('2024-01-01', 100, [40, 20, 10]),
      makeCohort('2024-02-01', 100, [50, 25, 12]),
    ]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    expect(screen.getByText('Average')).toBeInTheDocument()
  })

  it('does not render Average row for a single cohort', () => {
    const data = [makeCohort('2024-01-01', 100, [40, 20, 10])]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    expect(screen.queryByText('Average')).toBeNull()
  })

  it('renders Δ column header with the second milestone label', () => {
    const data = [
      makeCohort('2024-01-01', 100, [40, 20, 10]),
      makeCohort('2024-02-01', 100, [50, 25, 12]),
    ]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    expect(screen.getByText(/Δ/)).toBeInTheDocument()
  })

  it('shows delta as positive when later cohort has higher D7', () => {
    const data = [
      makeCohort('2024-01-01', 100, [40, 20, 10]), // baseline
      makeCohort('2024-02-01', 100, [50, 25, 12]), // D7: 25 > 20 → +5.0%
    ]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    expect(screen.getByText('+5.0%')).toBeInTheDocument()
  })

  it('shows delta as negative when later cohort has lower D7', () => {
    const data = [
      makeCohort('2024-01-01', 100, [40, 25, 10]), // baseline
      makeCohort('2024-02-01', 100, [50, 20, 12]), // D7: 20 < 25 → -5.0%
    ]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    expect(screen.getByText('−5.0%')).toBeInTheDocument()
  })

  it('shows — for delta when previous cohort has null D7', () => {
    const data = [
      makeCohort('2024-01-01', 100, [40, null, null]),
      makeCohort('2024-02-01', 100, [50, null, null]),
    ]
    renderTable(<RetentionTable {...BASE_PROPS} data={data} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })
})
