import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { usePinnedMetrics } from '../usePinnedMetrics'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('usePinnedMetrics', () => {
  beforeEach(() => localStorageMock.clear())

  it('returns default pinned metrics when no localStorage entry', () => {
    const { result } = renderHook(() => usePinnedMetrics('conn-1'))
    expect(result.current.pinned).toHaveLength(8)
    expect(result.current.pinned).toContain('total_events')
    expect(result.current.pinned).toContain('dau_mau_ratio')
  })

  it('togglePin adds an unpinned metric', () => {
    const { result } = renderHook(() => usePinnedMetrics('conn-1'))
    act(() => result.current.togglePin('wau'))
    expect(result.current.isPinned('wau')).toBe(true)
  })

  it('togglePin removes a pinned metric', () => {
    const { result } = renderHook(() => usePinnedMetrics('conn-1'))
    act(() => result.current.togglePin('total_events'))
    expect(result.current.isPinned('total_events')).toBe(false)
  })

  it('persists to localStorage on toggle', () => {
    const { result } = renderHook(() => usePinnedMetrics('conn-1'))
    act(() => result.current.togglePin('wau'))
    const stored = JSON.parse(localStorageMock.getItem('stratifio_pinned_metrics_conn-1')!)
    expect(stored).toContain('wau')
  })

  it('loads from localStorage on mount', () => {
    localStorageMock.setItem(
      'stratifio_pinned_metrics_conn-2',
      JSON.stringify(['total_events', 'wau'])
    )
    const { result } = renderHook(() => usePinnedMetrics('conn-2'))
    expect(result.current.pinned).toEqual(['total_events', 'wau'])
  })
})
