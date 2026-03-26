import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useQueryStudio } from '../hooks/useQueryStudio'

vi.mock('@/lib/api', () => ({
  executeQueryStudio: vi.fn(),
}))

import { executeQueryStudio } from '@/lib/api'
const mockExecute = vi.mocked(executeQueryStudio)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useQueryStudio', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useQueryStudio())
    expect(result.current.sql).toBe('')
    expect(result.current.result).toBeNull()
    expect(result.current.isRunning).toBe(false)
    expect(result.current.history).toEqual([])
  })

  it('executes query and stores result', async () => {
    mockExecute.mockResolvedValueOnce({
      columns: ['n'],
      rows: [[1]],
      execution_time_ms: 5,
      error: null,
    })
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.setSql('SELECT 1 AS n'))
    await act(async () => { await result.current.execute() })
    expect(result.current.result?.columns).toEqual(['n'])
    expect(result.current.result?.rows).toEqual([[1]])
    expect(result.current.isRunning).toBe(false)
  })

  it('adds executed query to history', async () => {
    mockExecute.mockResolvedValueOnce({ columns: [], rows: [], execution_time_ms: 1, error: null })
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.setSql('SELECT 1'))
    await act(async () => { await result.current.execute() })
    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0]).toBe('SELECT 1')
  })

  it('limits history to 20 entries', async () => {
    const { result } = renderHook(() => useQueryStudio())
    for (let i = 0; i < 22; i++) {
      mockExecute.mockResolvedValueOnce({ columns: [], rows: [], execution_time_ms: 1, error: null })
      act(() => result.current.setSql(`SELECT ${i}`))
      await act(async () => { await result.current.execute() })
    }
    expect(result.current.history).toHaveLength(20)
  })

  it('restoreFromHistory sets sql', () => {
    const { result } = renderHook(() => useQueryStudio())
    act(() => result.current.restoreFromHistory('SELECT COUNT(*) FROM events'))
    expect(result.current.sql).toBe('SELECT COUNT(*) FROM events')
  })
})
