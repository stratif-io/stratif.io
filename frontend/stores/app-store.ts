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

  /** Generic dimension filters keyed by field name, driven by connection filter config. */
  activeFilters: Record<string, string | null>
  setActiveFilter: (field: string, value: string | null) => void
  clearAllFilters: () => void

  activeConnectionId: string | null
  setActiveConnectionId: (id: string | null) => void
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

      activeFilters: {},
      setActiveFilter: (field, value) =>
        set((state) => ({
          activeFilters: { ...state.activeFilters, [field]: value },
        })),
      clearAllFilters: () => set({ activeFilters: {} }),

      activeConnectionId: null,
      setActiveConnectionId: (activeConnectionId) => set({ activeConnectionId, activeFilters: {} }),
    }),
    {
      name: 'openflow-storage',
      partialize: (state) => ({
        theme: state.theme,
        dateRange: state.dateRange,
        sidebarOpen: state.sidebarOpen,
        activeConnectionId: state.activeConnectionId,
        activeFilters: state.activeFilters,
      }),
    }
  )
)
