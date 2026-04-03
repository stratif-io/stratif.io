import { describe, it, expect, beforeEach } from 'vitest'
import { useQueryStore } from '../query-store'

describe('useQueryStore', () => {
  beforeEach(() => {
    useQueryStore.setState({ runningQueries: 0, queuedQueries: 0, queryEverActive: false })
  })

  it('initializes with zero counts and queryEverActive false', () => {
    const { runningQueries, queuedQueries, queryEverActive } = useQueryStore.getState()
    expect(runningQueries).toBe(0)
    expect(queuedQueries).toBe(0)
    expect(queryEverActive).toBe(false)
  })

  it('setQueryCounts updates running and queued', () => {
    useQueryStore.getState().setQueryCounts(3, 2)
    const { runningQueries, queuedQueries } = useQueryStore.getState()
    expect(runningQueries).toBe(3)
    expect(queuedQueries).toBe(2)
  })

  it('sets queryEverActive to true on first non-zero call', () => {
    useQueryStore.getState().setQueryCounts(1, 0)
    expect(useQueryStore.getState().queryEverActive).toBe(true)
  })

  it('keeps queryEverActive true after counts return to zero', () => {
    useQueryStore.getState().setQueryCounts(1, 0)
    useQueryStore.getState().setQueryCounts(0, 0)
    expect(useQueryStore.getState().queryEverActive).toBe(true)
  })

  it('does not set queryEverActive when called with zeros', () => {
    useQueryStore.getState().setQueryCounts(0, 0)
    expect(useQueryStore.getState().queryEverActive).toBe(false)
  })
})
