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
      />
    )
    expect(screen.getByText('Event Count')).toBeInTheDocument()
  })

  it('renders chip with custom measure label including aggregation', () => {
    render(
      <TrendMetricPicker
        measureField="revenue"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        dimensions={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Revenue (Sum)')).toBeInTheDocument()
  })

  it('renders chip with dimension label including aggregation', () => {
    render(
      <TrendMetricPicker
        measureField="country"
        aggregation="count"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={dimensions}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Country (Count)')).toBeInTheDocument()
  })

  it('renders search input when popover opens', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        dimensions={[]}
        onChange={vi.fn()}
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
      />
    )
    fireEvent.click(screen.getByText('count_events'))
    // Click Country
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
      />
    )
    // open picker, click Country, then # Distinct
    fireEvent.click(screen.getByText('count_events'))
    const leftPanel = document.querySelector('.bg-muted\\/40')!
    fireEvent.click(leftPanel.querySelectorAll('button')[0])
    fireEvent.click(screen.getByText('Country'))
    fireEvent.click(screen.getByText('# Distinct'))
    expect(onChange).toHaveBeenCalledWith('country', 'count_distinct')
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
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    expect(screen.queryByText('Metrics')).not.toBeInTheDocument()
  })
})
