import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DateRange, Granularity } from '@/types'
import { initSemaphore } from '@/lib/api/semaphore'

function suggestGranularity(range: DateRange): Granularity | null {
  if (!range.from || !range.to) return null
  const days = (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 2) return 'hour'
  if (days <= 60) return 'day'
  if (days <= 183) return 'week'
  if (days <= 730) return 'month'
  return 'year'
}

export type QueryHistoryEntry = {
  id: string
  cardName: string
  querySnippet: string
  startedAt: number
  finishedAt?: number
  status: 'running' | 'done' | 'failed'
}

const QUERY_HISTORY_CAP = 50
const QUERY_HISTORY_PRUNE_MS = 5000

interface AppState {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  granularity: Granularity
  setGranularity: (g: Granularity) => void

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

  /** SQL to pre-populate Query Studio with — ephemeral, cleared after consumption. */
  pendingQueryStudioSql: string | null
  setPendingQueryStudioSql: (sql: string | null) => void

  /** Rolling history of recent queries — ephemeral, capped at 50 entries, pruned 5s after finish. */
  queryHistory: QueryHistoryEntry[]
  addQueryStart: (entry: Omit<QueryHistoryEntry, 'startedAt' | 'status'>) => void
  markQueryFinish: (id: string, status: 'done' | 'failed') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      granularity: 'day',
      setGranularity: (granularity) => set({ granularity }),

      dateRange: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date(),
      },
      setDateRange: (dateRange) => set({ dateRange }),

      presetId: '7d',
      applyPreset: (dateRange, presetId) =>
        set((state) => {
          const suggested = suggestGranularity(dateRange)
          return {
            dateRange,
            presetId,
            granularity: suggested ?? state.granularity,
          }
        }),

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

      pendingQueryStudioSql: null,
      setPendingQueryStudioSql: (sql) => set({ pendingQueryStudioSql: sql }),

      queryHistory: [],
      addQueryStart: (entry) =>
        set((state) => {
          const newEntry: QueryHistoryEntry = {
            ...entry,
            startedAt: Date.now(),
            status: 'running',
          }
          const next = [newEntry, ...state.queryHistory]
          return { queryHistory: next.slice(0, QUERY_HISTORY_CAP) }
        }),
      markQueryFinish: (id, status) => {
        set((state) => ({
          queryHistory: state.queryHistory.map((e) =>
            e.id === id ? { ...e, status, finishedAt: Date.now() } : e
          ),
        }))
        setTimeout(() => {
          set((state) => ({
            queryHistory: state.queryHistory.filter((e) => e.id !== id),
          }))
        }, QUERY_HISTORY_PRUNE_MS)
      },
    }),
    {
      name: 'stratifio-storage',
      partialize: (state) => ({
        theme: state.theme,
        granularity: state.granularity,
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
initSemaphore({
  onCountChange: (running, queued) => useAppStore.getState().setQueryCounts(running, queued),
  onTaskStart: (id, meta) => useAppStore.getState().addQueryStart({ id, ...meta }),
  onTaskFinish: (id, status) => useAppStore.getState().markQueryFinish(id, status),
})
