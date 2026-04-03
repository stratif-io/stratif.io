import { create } from 'zustand'

interface QueryState {
  runningQueries: number
  queuedQueries: number
  queryEverActive: boolean
  setQueryCounts: (running: number, queued: number) => void
}

export const useQueryStore = create<QueryState>()((set) => ({
  runningQueries: 0,
  queuedQueries: 0,
  queryEverActive: false,
  setQueryCounts: (running, queued) =>
    set((state) => ({
      runningQueries: running,
      queuedQueries: queued,
      queryEverActive: state.queryEverActive || running > 0 || queued > 0,
    })),
}))
