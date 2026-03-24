export const MAX_CONCURRENT_QUERIES = 5
export const IDLE_DISMISS_DELAY_MS = 3000

type CountChangeCallback = (running: number, queued: number) => void

export class QuerySemaphore {
  private running = 0
  private queue: Array<() => void> = []
  private readonly max: number
  private readonly onCountChange: CountChangeCallback

  constructor(max: number, onCountChange: CountChangeCallback) {
    this.max = max
    this.onCountChange = onCountChange
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running < this.max) {
      this.running++
      this.onCountChange(this.running, this.queue.length)
    } else {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve)
        this.onCountChange(this.running, this.queue.length)
      })
    }

    try {
      return await task()
    } finally {
      this.running--
      const next = this.queue.shift()
      if (next) {
        this.running++
        next()
      }
      this.onCountChange(this.running, this.queue.length)
    }
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
