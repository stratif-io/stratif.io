export const MAX_CONCURRENT_QUERIES = 5
export const IDLE_DISMISS_DELAY_MS = 3000

type CountChangeCallback = (running: number, queued: number) => void

export type TaskOpts = { groupKey?: string }

type QueueEntry = { resolve: () => void; groupKey?: string }

export class QuerySemaphore {
  private running = 0
  private queue: QueueEntry[] = []
  private activeGroups = new Map<string, number>()
  private readonly max: number
  private readonly onCountChange: CountChangeCallback

  constructor(max: number, onCountChange: CountChangeCallback) {
    this.max = max
    this.onCountChange = onCountChange
  }

  async run<T>(task: () => Promise<T>, opts?: TaskOpts): Promise<T> {
    const groupKey = opts?.groupKey

    if (this.running < this.max) {
      this.running++
      if (groupKey) this.incGroup(groupKey)
      this.onCountChange(this.running, this.queue.length)
    } else {
      await new Promise<void>((resolve) => {
        this.queue.push({ resolve, groupKey })
        this.onCountChange(this.running, this.queue.length)
      })
      // Slot already accounted for by dispatcher (running++ and group inc done there).
    }

    try {
      return await task()
    } finally {
      this.running--
      // Dispatch BEFORE decrementing the finishing task's group so a queued task
      // with the same groupKey is preferred over an unrelated FIFO head.
      this.dispatchNext()
      if (groupKey) this.decGroup(groupKey)
      this.onCountChange(this.running, this.queue.length)
    }
  }

  private incGroup(key: string): void {
    this.activeGroups.set(key, (this.activeGroups.get(key) ?? 0) + 1)
  }

  private decGroup(key: string): void {
    const n = (this.activeGroups.get(key) ?? 0) - 1
    if (n <= 0) this.activeGroups.delete(key)
    else this.activeGroups.set(key, n)
  }

  private dispatchNext(): void {
    if (this.queue.length === 0) return
    if (this.running >= this.max) return

    // Prefer a queued task whose groupKey matches a currently-running group.
    let idx = -1
    for (let i = 0; i < this.queue.length; i++) {
      const g = this.queue[i].groupKey
      if (g && this.activeGroups.has(g)) {
        idx = i
        break
      }
    }
    if (idx === -1) idx = 0

    const [entry] = this.queue.splice(idx, 1)
    this.running++
    if (entry.groupKey) this.incGroup(entry.groupKey)
    entry.resolve()
  }
}

let _semaphore: QuerySemaphore | null = null

export function getSemaphore(): QuerySemaphore {
  if (!_semaphore) {
    throw new Error('QuerySemaphore not initialized. Call initSemaphore() first.')
  }
  return _semaphore
}

export function initSemaphore(onCountChange: CountChangeCallback): void {
  _semaphore = new QuerySemaphore(MAX_CONCURRENT_QUERIES, onCountChange)
}

export async function fetchWithSemaphore(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return getSemaphore().run(() => fetch(input, init))
}
