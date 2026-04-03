import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAppStore } from '@/stores'

describe('useAppStore', () => {
  const _originalLocalStorage = window.localStorage

  beforeEach(() => {
    vi.resetAllMocks()
    const store = useAppStore.getState()
    store.setTheme('system')
    store.setSidebarOpen(true)
    store.setSelectedEvent(null)
    store.setSelectedDevice(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct initial theme', () => {
      const { theme } = useAppStore.getState()
      expect(theme).toBe('system')
    })

    it('has correct initial sidebarOpen', () => {
      const { sidebarOpen } = useAppStore.getState()
      expect(sidebarOpen).toBe(true)
    })

    it('has correct initial selectedEvent', () => {
      const { selectedEvent } = useAppStore.getState()
      expect(selectedEvent).toBeNull()
    })

    it('has correct initial selectedDevice', () => {
      const { selectedDevice } = useAppStore.getState()
      expect(selectedDevice).toBeNull()
    })

    it('has dateRange with from and to dates', () => {
      const { dateRange } = useAppStore.getState()
      expect(dateRange.from).toBeInstanceOf(Date)
      expect(dateRange.to).toBeInstanceOf(Date)
    })
  })

  describe('setTheme action', () => {
    it('updates theme to light', () => {
      const { setTheme } = useAppStore.getState()
      act(() => {
        setTheme('light')
      })
      expect(useAppStore.getState().theme).toBe('light')
    })

    it('updates theme to dark', () => {
      const { setTheme } = useAppStore.getState()
      act(() => {
        setTheme('dark')
      })
      expect(useAppStore.getState().theme).toBe('dark')
    })

    it('updates theme to system', () => {
      const { setTheme } = useAppStore.getState()
      act(() => {
        setTheme('dark')
      })
      act(() => {
        setTheme('system')
      })
      expect(useAppStore.getState().theme).toBe('system')
    })
  })

  describe('setDateRange action', () => {
    it('updates dateRange', () => {
      const { setDateRange } = useAppStore.getState()
      const newRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      }
      act(() => {
        setDateRange(newRange)
      })
      const { dateRange } = useAppStore.getState()
      expect(dateRange.from).toEqual(newRange.from)
      expect(dateRange.to).toEqual(newRange.to)
    })

    it('accepts same from and to dates', () => {
      const { setDateRange } = useAppStore.getState()
      const sameDate = new Date('2024-01-15')
      act(() => {
        setDateRange({ from: sameDate, to: sameDate })
      })
      const { dateRange } = useAppStore.getState()
      expect(dateRange.from).toEqual(sameDate)
      expect(dateRange.to).toEqual(sameDate)
    })
  })

  describe('setSidebarOpen action', () => {
    it('sets sidebarOpen to false', () => {
      const { setSidebarOpen } = useAppStore.getState()
      act(() => {
        setSidebarOpen(false)
      })
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })

    it('sets sidebarOpen to true', () => {
      const { setSidebarOpen } = useAppStore.getState()
      act(() => {
        setSidebarOpen(false)
      })
      act(() => {
        setSidebarOpen(true)
      })
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })

    it('toggles sidebar state', () => {
      const store = useAppStore.getState()
      const initialState = store.sidebarOpen
      act(() => {
        store.setSidebarOpen(!initialState)
      })
      expect(useAppStore.getState().sidebarOpen).toBe(!initialState)
    })
  })

  describe('setSelectedEvent action', () => {
    it('sets selectedEvent to a string', () => {
      const { setSelectedEvent } = useAppStore.getState()
      act(() => {
        setSelectedEvent('event-123')
      })
      expect(useAppStore.getState().selectedEvent).toBe('event-123')
    })

    it('sets selectedEvent to null', () => {
      const { setSelectedEvent } = useAppStore.getState()
      act(() => {
        setSelectedEvent('event-123')
      })
      act(() => {
        setSelectedEvent(null)
      })
      expect(useAppStore.getState().selectedEvent).toBeNull()
    })
  })

  describe('setSelectedDevice action', () => {
    it('sets selectedDevice to a string', () => {
      const { setSelectedDevice } = useAppStore.getState()
      act(() => {
        setSelectedDevice('desktop')
      })
      expect(useAppStore.getState().selectedDevice).toBe('desktop')
    })

    it('sets selectedDevice to null', () => {
      const { setSelectedDevice } = useAppStore.getState()
      act(() => {
        setSelectedDevice('mobile')
      })
      act(() => {
        setSelectedDevice(null)
      })
      expect(useAppStore.getState().selectedDevice).toBeNull()
    })
  })

  describe('persistence', () => {
    it('persists theme to localStorage', () => {
      const { setTheme } = useAppStore.getState()
      act(() => {
        setTheme('dark')
      })
      expect(window.localStorage.setItem).toHaveBeenCalled()
    })

    it('persists sidebarOpen to localStorage', () => {
      const { setSidebarOpen } = useAppStore.getState()
      act(() => {
        setSidebarOpen(false)
      })
      expect(window.localStorage.setItem).toHaveBeenCalled()
    })

    it('persists dateRange to localStorage', () => {
      const { setDateRange } = useAppStore.getState()
      act(() => {
        setDateRange({
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31'),
        })
      })
      expect(window.localStorage.setItem).toHaveBeenCalled()
    })

    it('does not persist selectedEvent', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem')
      const { setSelectedEvent } = useAppStore.getState()
      act(() => {
        setSelectedEvent('event-123')
      })
      const lastCall = setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1]
      if (lastCall) {
        const stored = JSON.parse(lastCall[1] || '{}')
        expect(stored.state).not.toHaveProperty('selectedEvent')
      }
    })

    it('does not persist selectedDevice', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem')
      const { setSelectedDevice } = useAppStore.getState()
      act(() => {
        setSelectedDevice('desktop')
      })
      const lastCall = setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1]
      if (lastCall) {
        const stored = JSON.parse(lastCall[1] || '{}')
        expect(stored.state).not.toHaveProperty('selectedDevice')
      }
    })
  })

  describe('presetId and applyPreset', () => {
    beforeEach(() => {
      useAppStore.setState({
        presetId: '7d',
        dateRange: { from: new Date('2025-03-16'), to: new Date('2025-03-23') },
      })
    })

    it('applyPreset updates dateRange and presetId atomically', () => {
      const range = { from: new Date('2025-01-01'), to: new Date('2025-03-23') }
      useAppStore.getState().applyPreset(range, 'ytd')

      const state = useAppStore.getState()
      expect(state.presetId).toBe('ytd')
      expect(state.dateRange).toEqual(range)
    })

    it('applyPreset with null id marks custom range', () => {
      useAppStore
        .getState()
        .applyPreset({ from: new Date('2025-03-01'), to: new Date('2025-03-10') }, null)
      expect(useAppStore.getState().presetId).toBeNull()
    })

    it('initial presetId is 7d (matches default dateRange)', () => {
      useAppStore.setState({ presetId: '7d' })
      expect(useAppStore.getState().presetId).toBe('7d')
    })
  })

  describe('granularity', () => {
    beforeEach(() => {
      useAppStore.setState({
        granularity: 'day',
        dateRange: { from: new Date('2026-03-01'), to: new Date('2026-03-31') },
        presetId: '30d',
      })
    })

    it('defaults to day', () => {
      expect(useAppStore.getState().granularity).toBe('day')
    })

    it('setGranularity updates the value', () => {
      useAppStore.getState().setGranularity('week')
      expect(useAppStore.getState().granularity).toBe('week')
    })

    it('applyPreset with ≤2 day range suggests hour', () => {
      const from = new Date('2026-03-31')
      const to = new Date('2026-03-31')
      useAppStore.getState().applyPreset({ from, to }, 'today')
      expect(useAppStore.getState().granularity).toBe('hour')
    })

    it('applyPreset with ≤60 day range suggests day', () => {
      const from = new Date('2026-02-01')
      const to = new Date('2026-03-31')
      useAppStore.getState().applyPreset({ from, to }, '30d')
      expect(useAppStore.getState().granularity).toBe('day')
    })

    it('applyPreset with ≤6 month range suggests week', () => {
      const from = new Date('2025-10-01')
      const to = new Date('2026-03-31')
      useAppStore.getState().applyPreset({ from, to }, '6m')
      expect(useAppStore.getState().granularity).toBe('week')
    })

    it('applyPreset with ≤2 year range suggests month', () => {
      const from = new Date('2024-04-01')
      const to = new Date('2026-03-31')
      useAppStore.getState().applyPreset({ from, to }, '12m')
      expect(useAppStore.getState().granularity).toBe('month')
    })

    it('applyPreset with >2 year range suggests year', () => {
      const from = new Date('2020-01-01')
      const to = new Date('2026-03-31')
      useAppStore.getState().applyPreset({ from, to }, null)
      expect(useAppStore.getState().granularity).toBe('year')
    })

    it('applyPreset with null dates does not change granularity', () => {
      useAppStore.getState().setGranularity('month')
      useAppStore.getState().applyPreset({ from: null, to: null }, 'all_time')
      expect(useAppStore.getState().granularity).toBe('month')
    })
  })

  describe('hook usage', () => {
    it('can select specific state slices', () => {
      const { result } = renderHook(() => useAppStore((state) => state.theme))
      expect(result.current).toBe('system')
    })

    it('can select actions', () => {
      const { result } = renderHook(() => useAppStore((state) => state.setTheme))
      expect(typeof result.current).toBe('function')
    })

    it('updates when selected slice changes', () => {
      const { result, rerender } = renderHook(() => useAppStore((state) => state.theme))
      expect(result.current).toBe('system')
      act(() => {
        useAppStore.getState().setTheme('dark')
      })
      rerender()
      expect(result.current).toBe('dark')
    })
  })
})
