import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../use-theme'
import { useAppStore } from '@/stores/app-store'

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.classList.remove('light', 'dark')

    useAppStore.setState({ theme: 'system' })

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )
  })

  describe('theme switching', () => {
    it('returns theme from store', () => {
      const { result } = renderHook(() => useTheme())
      expect(result.current.theme).toBe('system')
    })

    it('returns setTheme function', () => {
      const { result } = renderHook(() => useTheme())
      expect(typeof result.current.setTheme).toBe('function')
    })

    it('returns resolvedTheme', () => {
      const { result } = renderHook(() => useTheme())
      expect(['light', 'dark']).toContain(result.current.resolvedTheme)
    })
  })

  describe('dark theme', () => {
    it('applies dark theme when theme is dark', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('light theme', () => {
    it('applies light theme when theme is light', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('light')
      })

      expect(document.documentElement.classList.contains('light')).toBe(true)
    })
  })

  describe('system preference detection', () => {
    it('uses theme from system preference when theme is system', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe('system')
      expect(['light', 'dark']).toContain(result.current.resolvedTheme)
    })

    it('applies a theme class to document element', () => {
      renderHook(() => useTheme())

      const hasThemeClass =
        document.documentElement.classList.contains('light') ||
        document.documentElement.classList.contains('dark')
      expect(hasThemeClass).toBe(true)
    })
  })

  describe('localStorage persistence', () => {
    it('persists theme through store', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })

    it('calls localStorage setItem when theme changes', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem')

      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('light')
      })

      expect(setItemSpy).toHaveBeenCalled()
    })
  })

  describe('theme transitions', () => {
    it('removes previous theme class when switching', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('dark')
      })
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(document.documentElement.classList.contains('light')).toBe(false)

      act(() => {
        result.current.setTheme('light')
      })
      expect(document.documentElement.classList.contains('light')).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  describe('setTheme action', () => {
    it('can set theme to light', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('light')
      })

      expect(result.current.theme).toBe('light')
    })

    it('can set theme to dark', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })

    it('can set theme to system', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('dark')
      })

      act(() => {
        result.current.setTheme('system')
      })

      expect(result.current.theme).toBe('system')
    })
  })
})
