import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DateRange } from '@/types'

interface AppState {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  dateRange: DateRange
  setDateRange: (range: DateRange) => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  selectedEvent: string | null
  setSelectedEvent: (event: string | null) => void

  selectedDevice: string | null
  setSelectedDevice: (device: string | null) => void

  selectedCountry: string | null
  setSelectedCountry: (country: string | null) => void

  selectedBrowser: string | null
  setSelectedBrowser: (browser: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      dateRange: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date(),
      },
      setDateRange: (dateRange) => set({ dateRange }),

      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      selectedEvent: null,
      setSelectedEvent: (selectedEvent) => set({ selectedEvent }),

      selectedDevice: null,
      setSelectedDevice: (selectedDevice) => set({ selectedDevice }),

      selectedCountry: null,
      setSelectedCountry: (selectedCountry) => set({ selectedCountry }),

      selectedBrowser: null,
      setSelectedBrowser: (selectedBrowser) => set({ selectedBrowser }),
    }),
    {
      name: 'openflow-storage',
      partialize: (state) => ({
        theme: state.theme,
        dateRange: state.dateRange,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
