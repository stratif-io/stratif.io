import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TrendMetricPicker } from '../TrendMetricPicker'

const standardMeasures = [
  { value: 'count_events', label: 'Event Count' },
  { value: 'unique_users', label: 'Unique Users' },
]

const numericDimensions = [{ value: 'revenue', label: 'Revenue' }]

describe('TrendMetricPicker', () => {
  it('renders chip with standard measure label', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
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
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Revenue (Sum)')).toBeInTheDocument()
  })

  it('renders search input when popover opens', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
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
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    fireEvent.change(screen.getByPlaceholderText('Search metrics…'), {
      target: { value: 'zzznomatch' },
    })
    expect(screen.getByText('No metrics match')).toBeInTheDocument()
  })

  it('calls onChange immediately when standard measure clicked via search', () => {
    const onChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    fireEvent.change(screen.getByPlaceholderText('Search metrics…'), {
      target: { value: 'unique' },
    })
    fireEvent.click(screen.getByText('Unique Users'))
    expect(onChange).toHaveBeenCalledWith('unique_users', 'sum')
  })

  it('calls onChange immediately when standard measure clicked in two-panel mode', () => {
    const onChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    const buttons = screen.getAllByText('Unique Users')
    fireEvent.click(buttons[0])
    expect(onChange).toHaveBeenCalledWith('unique_users', 'sum')
  })

  it('shows Metrics category in left panel', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    expect(screen.getByText('Metrics')).toBeInTheDocument()
  })

  it('shows additional categories when numericDimensions provided', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    expect(screen.getByText('Metrics')).toBeInTheDocument()
    const categoryRegion = document.querySelector('.bg-muted\\/40')
    expect(categoryRegion?.querySelectorAll('button').length).toBeGreaterThan(1)
  })

  it('opens step 2 aggregation picker when custom metric clicked', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    const leftPanel = document.querySelector('.bg-muted\\/40')!
    const catButtons = leftPanel.querySelectorAll('button')
    // Click the second category (first non-Metrics category)
    fireEvent.click(catButtons[1])
    fireEvent.click(screen.getByText('Revenue'))
    // ValuePickerPopover shows "Σ Sum", "avg Avg" etc.
    expect(screen.getByText('Σ Sum')).toBeInTheDocument()
    expect(screen.getByText('avg Avg')).toBeInTheDocument()
  })

  it('calls onChange with field and agg when aggregation selected for custom metric', () => {
    const onChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    const leftPanel = document.querySelector('.bg-muted\\/40')!
    fireEvent.click(leftPanel.querySelectorAll('button')[1])
    fireEvent.click(screen.getByText('Revenue'))
    fireEvent.click(screen.getByText('avg Avg'))
    expect(onChange).toHaveBeenCalledWith('revenue', 'avg')
  })
})
