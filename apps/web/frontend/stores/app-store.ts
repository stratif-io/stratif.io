import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DateRange } from '@/types'
import { initSemaphore } from '@/lib/api/semaphore'

interface AppState {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  dateRange: DateRange
  setDateRange: (range: DateRange) => void

  /** Stable preset key (e.g. '7d', 'ytd', 'all_time') or null for custom range. */
  presetId: string | null
  /** Atomically sets dateRange + presetId in one store update. Use for all preset/custom applications. */
  applyPreset: (range: DateRange, id: string | null) => void

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

  // Query concurrency tracking — ephemeral, not persisted
  runningQueries: number
  queuedQueries: number
  queryEverActive: boolean
  setQueryCounts: (running: number, queued: number) => void
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

      presetId: '7d',
      applyPreset: (dateRange, presetId) => set({ dateRange, presetId }),

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

      runningQueries: 0,
      queuedQueries: 0,
      queryEverActive: false,
      setQueryCounts: (running, queued) =>
        set((state) => ({
          runningQueries: running,
          queuedQueries: queued,
          queryEverActive: state.queryEverActive || running > 0 || queued > 0,
        })),
    }),
    {
      name: 'stratifio-storage',
      partialize: (state) => ({
        theme: state.theme,
        dateRange: state.dateRange,
        presetId: state.presetId,
        sidebarOpen: state.sidebarOpen,
        activeConnectionId: state.activeConnectionId,
        activeFilters: state.activeFilters,
      }),
      // JSON serialization turns Date objects into strings — revive them on load.
      onRehydrateStorage: () => (state) => {
        if (state?.dateRange) {
          state.dateRange = {
            from: state.dateRange.from ? new Date(state.dateRange.from as unknown as string) : null,
            to: state.dateRange.to ? new Date(state.dateRange.to as unknown as string) : null,
          }
        }
      },
    }
  )
)

// Initialize the global query semaphore, wired to the Zustand store.
// Must run after store creation to avoid circular dependency.
initSemaphore((running, queued) => {
  useAppStore.getState().setQueryCounts(running, queued)
})
