import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ResultsPanel } from '../ResultsPanel'
import type { QueryStudioResponse } from '@/types'

const PAGE_SIZE = 50

function makeRows(n: number): unknown[][] {
  return Array.from({ length: n }, (_, i) => [i + 1, `row-${i + 1}`])
}

function makeResult(rowCount: number, columns = ['id', 'name']): QueryStudioResponse {
  return {
    columns,
    rows: makeRows(rowCount),
    execution_time_ms: 10,
    error: null,
  }
}

function renderPanel(props: Partial<React.ComponentProps<typeof ResultsPanel>> = {}) {
  return render(
    <ResultsPanel
      result={props.result ?? null}
      isRunning={props.isRunning ?? false}
      history={props.history ?? []}
      onRestoreHistory={props.onRestoreHistory ?? vi.fn()}
    />
  )
}

describe('ResultsPanel', () => {
  it('shows placeholder when no result', () => {
    renderPanel()
    expect(screen.getByText('Run a query to see results.')).toBeInTheDocument()
  })

  it('shows Running message when isRunning is true', () => {
    renderPanel({ isRunning: true })
    expect(screen.getByText('Running...')).toBeInTheDocument()
  })

  it('renders column headers from result', () => {
    renderPanel({ result: makeResult(3) })
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('name')).toBeInTheDocument()
  })

  it('renders first PAGE_SIZE rows', () => {
    renderPanel({ result: makeResult(PAGE_SIZE) })
    expect(screen.getByText('row-1')).toBeInTheDocument()
    expect(screen.getByText(`row-${PAGE_SIZE}`)).toBeInTheDocument()
  })

  it('pagination controls appear when totalRows > PAGE_SIZE', () => {
    renderPanel({ result: makeResult(PAGE_SIZE + 1) })
    expect(screen.getByLabelText('Next page')).toBeInTheDocument()
    expect(screen.getByLabelText('Last page')).toBeInTheDocument()
  })

  it('pagination controls do NOT appear when totalRows <= PAGE_SIZE', () => {
    renderPanel({ result: makeResult(PAGE_SIZE) })
    expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument()
  })

  it('next page button shows page 2 rows', () => {
    renderPanel({ result: makeResult(PAGE_SIZE + 5) })
    fireEvent.click(screen.getByLabelText('Next page'))
    // Page 2 should show rows PAGE_SIZE+1 through PAGE_SIZE+5
    expect(screen.getByText(`row-${PAGE_SIZE + 1}`)).toBeInTheDocument()
  })

  it('first page button goes back to page 1', () => {
    renderPanel({ result: makeResult(PAGE_SIZE * 2 + 1) })
    fireEvent.click(screen.getByLabelText('Last page'))
    fireEvent.click(screen.getByLabelText('First page'))
    expect(screen.getByText('row-1')).toBeInTheDocument()
  })

  it('renders error message when result has error', () => {
    renderPanel({
      result: { columns: [], rows: [], execution_time_ms: 0, error: 'Syntax error' },
    })
    expect(screen.getByText('Syntax error')).toBeInTheDocument()
  })

  it('renders JSON cell content compactly by default', () => {
    renderPanel({
      result: {
        columns: ['data'],
        rows: [[{ key: 'value' }]],
        execution_time_ms: 5,
        error: null,
      },
    })
    expect(screen.getByText('{"key":"value"}')).toBeInTheDocument()
  })

  it('expands JSON cell content on toggle click', () => {
    renderPanel({
      result: {
        columns: ['data'],
        rows: [[{ key: 'value' }]],
        execution_time_ms: 5,
        error: null,
      },
    })
    fireEvent.click(screen.getByTitle('Expand'))
    // After expanding, pretty-printed JSON is shown
    expect(screen.getByText(/\{[\s\S]*"key"[\s\S]*"value"[\s\S]*\}/)).toBeInTheDocument()
  })

  it('shows row count in results summary', () => {
    renderPanel({ result: makeResult(42) })
    expect(screen.getByText(/42 rows/)).toBeInTheDocument()
  })

  it('history tab shows empty message when no history', () => {
    renderPanel()
    fireEvent.click(screen.getByText('history'))
    expect(screen.getByText('No queries run yet.')).toBeInTheDocument()
  })

  it('history tab shows past queries', () => {
    renderPanel({ history: ['SELECT 1', 'SELECT 2'] })
    fireEvent.click(screen.getByText('history'))
    expect(screen.getByText('SELECT 1')).toBeInTheDocument()
    expect(screen.getByText('SELECT 2')).toBeInTheDocument()
  })

  it('clicking a history item calls onRestoreHistory', () => {
    const onRestoreHistory = vi.fn()
    renderPanel({ history: ['SELECT 1'], onRestoreHistory })
    fireEvent.click(screen.getByText('history'))
    fireEvent.click(screen.getByText('SELECT 1'))
    expect(onRestoreHistory).toHaveBeenCalledWith('SELECT 1')
  })
})
