import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TrendMetricPicker } from '../TrendMetricPicker'

const standardMeasures = [
  { value: 'count_events', label: 'Event Count' },
  { value: 'unique_users', label: 'Unique Users' },
]

const numericDimensions = [{ value: 'revenue', label: 'Revenue' }]
const dimensions = [{ value: 'country', label: 'Country' }]

describe('TrendMetricPicker', () => {
  it('renders chip with standard measure label', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    expect(screen.getByText('Event Count')).toBeInTheDocument()
  })

  it('renders chip with custom measure label without agg suffix', () => {
    render(
      <TrendMetricPicker
        measureField="revenue"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })

  it('shows no AggBadge for standard measure', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    expect(screen.queryByTitle('Change aggregation')).not.toBeInTheDocument()
  })

  it('shows AggBadge with correct symbol for numeric dimension', () => {
    render(
      <TrendMetricPicker
        measureField="revenue"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    expect(screen.getByTitle('Change aggregation')).toBeInTheDocument()
    expect(screen.getByTitle('Change aggregation').textContent).toBe('Σ')
  })

  it('shows AggBadge with correct symbol for categorical dimension', () => {
    render(
      <TrendMetricPicker
        measureField="country"
        aggregation="count"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={dimensions}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    expect(screen.getByTitle('Change aggregation').textContent).toBe('n')
  })

  it('calls onAggChange when agg is changed via badge, not onChange', () => {
    const onChange = vi.fn()
    const onAggChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="revenue"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        dimensions={[]}
        onChange={onChange}
        onAggChange={onAggChange}
      />
    )
    fireEvent.click(screen.getByTitle('Change aggregation'))
    fireEvent.click(screen.getByText('n Count'))
    expect(onAggChange).toHaveBeenCalledWith('count')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('agg badge click does not open the metric picker', () => {
    render(
      <TrendMetricPicker
        measureField="revenue"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByTitle('Change aggregation'))
    // The metric picker search input should NOT appear
    expect(screen.queryByPlaceholderText('Search metrics…')).not.toBeInTheDocument()
  })

  it('renders search input when main chip clicked', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    expect(screen.getByPlaceholderText('Search metrics…')).toBeInTheDocument()
  })

  it('filters metrics when searching', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    fireEvent.change(screen.getByPlaceholderText('Search metrics…'), {
      target: { value: 'unique' },
    })
    expect(screen.getByText('Unique Users')).toBeInTheDocument()
    const searchResults = document.querySelector('.max-h-52')
    expect(searchResults?.textContent).not.toContain('Event Count')
  })

  it('shows "No metrics match" when search has no results', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    fireEvent.change(screen.getByPlaceholderText('Search metrics…'), {
      target: { value: 'zzznomatch' },
    })
    expect(screen.getByText('No metrics match')).toBeInTheDocument()
  })

  it('opens agg step when any metric clicked', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    const buttons = screen.getAllByText('Unique Users')
    fireEvent.click(buttons[0])
    expect(screen.getByText('Σ Sum')).toBeInTheDocument()
  })

  it('calls onChange when metric and agg selected', () => {
    const onChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={[]}
        onChange={onChange}
        onAggChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    const buttons = screen.getAllByText('Unique Users')
    fireEvent.click(buttons[0])
    fireEvent.click(screen.getByText('Σ Sum'))
    expect(onChange).toHaveBeenCalledWith('unique_users', 'sum')
  })

  it('shows only count/countDistinct for categorical dimensions', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={[]}
        numericDimensions={[]}
        dimensions={dimensions}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('count_events'))
    const leftPanel = document.querySelector('.bg-muted\\/40')!
    fireEvent.click(leftPanel.querySelectorAll('button')[0])
    fireEvent.click(screen.getByText('Country'))
    expect(screen.getByText('n Count')).toBeInTheDocument()
    expect(screen.getByText('# Distinct')).toBeInTheDocument()
    expect(screen.queryByText('Σ Sum')).not.toBeInTheDocument()
  })

  it('normalizes countDistinct to count_distinct for onChange', () => {
    const onChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={[]}
        numericDimensions={[]}
        dimensions={dimensions}
        onChange={onChange}
        onAggChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('count_events'))
    const leftPanel = document.querySelector('.bg-muted\\/40')!
    fireEvent.click(leftPanel.querySelectorAll('button')[0])
    fireEvent.click(screen.getByText('Country'))
    fireEvent.click(screen.getByText('# Distinct'))
    expect(onChange).toHaveBeenCalledWith('country', 'count_distinct')
  })

  it('passes countDistinct as-is via onAggChange (no normalization)', () => {
    const onAggChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="country"
        aggregation="count"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={dimensions}
        onChange={vi.fn()}
        onAggChange={onAggChange}
      />
    )
    fireEvent.click(screen.getByTitle('Change aggregation'))
    fireEvent.click(screen.getByText('# Distinct'))
    expect(onAggChange).toHaveBeenCalledWith('countDistinct')
  })

  it('shows no special Metrics category', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={[]}
        onChange={vi.fn()}
        onAggChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    expect(screen.queryByText('Metrics')).not.toBeInTheDocument()
  })
})
