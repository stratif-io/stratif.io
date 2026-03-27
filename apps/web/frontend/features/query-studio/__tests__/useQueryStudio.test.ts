import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppStore } from '@/stores'

vi.mock('@/lib/api', () => ({
  executeQueryStudio: vi.fn(),
}))

import { executeQueryStudio } from '@/lib/api'
const mockExecute = vi.mocked(executeQueryStudio)

beforeEach(() => {
  vi.clearAllMocks()
  // Reset store state
  useAppStore.setState({ pendingQueryStudioSql: null, activeConnectionId: null })
})

// Import after mocks
import { useQueryStudio } from '../hooks/useQueryStudio'

describe('useQueryStudio', () => {
  it('starts with empty SQL state', () => {
    const { result } = renderHook(() => useQueryStudio())
    expect(result.current.sql).toBe('')
    expect(result.current.result).toBeNull()
    expect(result.current.isRunning).toBe(false)
    expect(result.current.history).toEqual([])
  })

  it('initializes SQL from pendingQueryStudioSql in store', () => {
    useAppStore.setState({ pendingQueryStudioSql: 'SELECT * FROM events' })
    const { result } = renderHook(() => useQueryStudio())
    expect(result.current.sql).toBe('SELECT * FROM events')
  })

  it('clears pendingQueryStudioSql from store after consuming it', async () => {
    useAppStore.setState({ pendingQueryStudioSql: 'SELECT 1' })
    renderHook(() => useQueryStudio())
    // After mount, useEffect should clear it
    await act(async () => {})
    expect(useAppStore.getState().pendingQueryStudioSql).toBeNull()
  })

  it('execute(1000) appends LIMIT 1000 when SQL has no LIMIT clause', async () => {
    mockExecute.mockResolvedValueOnce({
      columns: ['n'],
      rows: [[1]],
      execution_time_ms: 5,
      error: null,
    })
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.setSql('SELECT * FROM events'))
    await act(async () => {
      await result.current.execute(1000)
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ sql: 'SELECT * FROM events\nLIMIT 1000' })
    )
  })

  it('execute(1000) does NOT append LIMIT if SQL already contains LIMIT', async () => {
    mockExecute.mockResolvedValueOnce({ columns: [], rows: [], execution_time_ms: 1, error: null })
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.setSql('SELECT * FROM events LIMIT 50'))
    await act(async () => {
      await result.current.execute(1000)
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ sql: 'SELECT * FROM events LIMIT 50' })
    )
  })

  it('execute(null) runs SQL as-is without appending LIMIT', async () => {
    mockExecute.mockResolvedValueOnce({ columns: [], rows: [], execution_time_ms: 1, error: null })
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.setSql('SELECT COUNT(*) FROM events'))
    await act(async () => {
      await result.current.execute(null)
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ sql: 'SELECT COUNT(*) FROM events' })
    )
  })

  it('execute(1000) treats case-insensitive LIMIT keyword', async () => {
    mockExecute.mockResolvedValueOnce({ columns: [], rows: [], execution_time_ms: 1, error: null })
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.setSql('SELECT 1 limit 10'))
    await act(async () => {
      await result.current.execute(1000)
    })
    // Should NOT append another LIMIT
    const calledSql = mockExecute.mock.calls[0][0].sql as string
    expect(calledSql.match(/limit/gi)?.length).toBe(1)
  })

  it('stores result after successful execution', async () => {
    mockExecute.mockResolvedValueOnce({
      columns: ['n'],
      rows: [[42]],
      execution_time_ms: 10,
      error: null,
    })
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.setSql('SELECT 42 AS n'))
    await act(async () => {
      await result.current.execute(1000)
    })
    expect(result.current.result?.columns).toEqual(['n'])
    expect(result.current.result?.rows).toEqual([[42]])
    expect(result.current.isRunning).toBe(false)
  })

  it('adds executed query (trimmed) to history', async () => {
    mockExecute.mockResolvedValueOnce({ columns: [], rows: [], execution_time_ms: 1, error: null })
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.setSql('SELECT 1'))
    await act(async () => {
      await result.current.execute(1000)
    })
    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0]).toBe('SELECT 1')
  })

  it('limits history to 20 entries', async () => {
    const { result } = renderHook(() => useQueryStudio())
    for (let i = 0; i < 22; i++) {
      mockExecute.mockResolvedValueOnce({
        columns: [],
        rows: [],
        execution_time_ms: 1,
        error: null,
      })
      act(() => result.current.setSql(`SELECT ${i}`))
      await act(async () => {
        await result.current.execute(1000)
      })
    }
    expect(result.current.history).toHaveLength(20)
  })

  it('restoreFromHistory sets sql', () => {
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.restoreFromHistory('SELECT COUNT(*) FROM events'))
    expect(result.current.sql).toBe('SELECT COUNT(*) FROM events')
  })
})
