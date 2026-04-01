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
    // Event Count should not appear in the search results list (it may still appear in the trigger chip)
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

  it('shows only Standard category when numericDimensions is empty', () => {
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
    expect(screen.getByText('Standard')).toBeInTheDocument()
    const leftPanelButtons = screen
      .getAllByRole('button')
      .filter((b) => ['Standard'].includes(b.textContent?.trim().replace(/\d+$/, '').trim() ?? ''))
    expect(leftPanelButtons).toHaveLength(1)
  })

  it('shows additional categories from dimension-categories.json when numericDimensions provided', () => {
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
    expect(screen.getByText('Standard')).toBeInTheDocument()
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
    fireEvent.click(catButtons[1])
    fireEvent.click(screen.getByText('Revenue'))
    expect(screen.getByText('Sum')).toBeInTheDocument()
    expect(screen.getByText('Avg')).toBeInTheDocument()
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
    fireEvent.click(screen.getByText('Avg'))
    expect(onChange).toHaveBeenCalledWith('revenue', 'avg')
  })
})
