import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { AnalyticsProvider, useAnalytics } from '../index'
import type { AnalyticsAdapter } from '../index'

describe('useAnalytics', () => {
  it('returns no-op adapter by default — track does not throw', () => {
    const { result } = renderHook(() => useAnalytics())
    expect(() => result.current.track('test_event', { foo: 'bar' })).not.toThrow()
  })

  it('returns no-op adapter by default — page does not throw', () => {
    const { result } = renderHook(() => useAnalytics())
    expect(() => result.current.page('/dashboard')).not.toThrow()
  })

  it('calls custom adapter track when provided', () => {
    const adapter: AnalyticsAdapter = { track: vi.fn(), page: vi.fn() }
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: ({ children }) => (
        <AnalyticsProvider adapter={adapter}>{children}</AnalyticsProvider>
      ),
    })
    result.current.track('chart_viewed', { chart_type: 'trend' })
    expect(adapter.track).toHaveBeenCalledWith('chart_viewed', { chart_type: 'trend' })
  })

  it('calls custom adapter page when provided', () => {
    const adapter: AnalyticsAdapter = { track: vi.fn(), page: vi.fn() }
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: ({ children }) => (
        <AnalyticsProvider adapter={adapter}>{children}</AnalyticsProvider>
      ),
    })
    result.current.page('/trends')
    expect(adapter.page).toHaveBeenCalledWith('/trends')
  })
})
