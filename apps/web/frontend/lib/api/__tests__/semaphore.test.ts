import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuerySemaphore, fetchWithSemaphore, initSemaphore } from '../semaphore'

describe('QuerySemaphore', () => {
  let onCountChange: ReturnType<typeof vi.fn>
  let semaphore: QuerySemaphore

  beforeEach(() => {
    onCountChange = vi.fn()
    semaphore = new QuerySemaphore(2, onCountChange)
  })

  it('runs requests immediately when under the limit', async () => {
    let resolved = false
    const p = semaphore.run(async () => {
      resolved = true
      return 'ok'
    })
    await p
    expect(resolved).toBe(true)
  })

  it('queues requests beyond the limit', async () => {
    const order: number[] = []
    let resolveA!: () => void
    let resolveB!: () => void
    const longA = () =>
      new Promise<void>((res) => {
        resolveA = res
      })
    const longB = () =>
      new Promise<void>((res) => {
        resolveB = res
      })

    const p1 = semaphore.run(async () => {
      await longA()
      order.push(1)
    })
    const p2 = semaphore.run(async () => {
      await longB()
      order.push(2)
    })
    const p3 = semaphore.run(async () => {
      order.push(3)
    })

    expect(order).toEqual([])

    resolveA()
    await p1
    await p3
    expect(order).toContain(3)
    resolveB()
    await p2
  })

  it('calls onCountChange with running and queued counts', async () => {
    let resolveA!: () => void
    let resolveB!: () => void
    const longA = () =>
      new Promise<void>((res) => {
        resolveA = res
      })
    const longB = () =>
      new Promise<void>((res) => {
        resolveB = res
      })

    const p1 = semaphore.run(async () => {
      await longA()
    })
    expect(onCountChange).toHaveBeenCalledWith(1, 0)

    const p2 = semaphore.run(async () => {
      await longB()
    })
    expect(onCountChange).toHaveBeenCalledWith(2, 0)

    const p3 = semaphore.run(async () => {})
    expect(onCountChange).toHaveBeenCalledWith(2, 1)

    resolveA()
    await p1
    await p3
    resolveB()
    await p2
  })

  it('releases slot even when the task throws', async () => {
    const thrower = semaphore.run(async () => {
      throw new Error('boom')
    })
    await expect(thrower).rejects.toThrow('boom')
    const last = onCountChange.mock.calls.at(-1)
    expect(last![0]).toBe(0)
  })
})

describe('QuerySemaphore groupKey ordering', () => {
  it('drains queued tasks of the running groupKey before switching groups', async () => {
    const order: string[] = []
    const sem = new QuerySemaphore(1, () => {})
    const make = (g: string) => () => {
      order.push(g)
      return Promise.resolve()
    }
    const p1 = sem.run(make('A'), { groupKey: 'A' })
    const p2 = sem.run(make('B'), { groupKey: 'B' })
    const p3 = sem.run(make('A'), { groupKey: 'A' })
    await Promise.all([p1, p2, p3])
    expect(order).toEqual(['A', 'A', 'B'])
  })

  it('falls back to FIFO when no queued task matches a running group', async () => {
    const order: string[] = []
    const sem = new QuerySemaphore(1, () => {})
    const make = (g: string) => () => {
      order.push(g)
      return Promise.resolve()
    }
    await Promise.all([
      sem.run(make('A'), { groupKey: 'A' }),
      sem.run(make('B'), { groupKey: 'B' }),
      sem.run(make('C'), { groupKey: 'C' }),
    ])
    expect(order).toEqual(['A', 'B', 'C'])
  })

  it('with max>1, prefers same-group queue entry over FIFO when a slot frees', async () => {
    const order: string[] = []
    const gates: Record<string, () => void> = {}
    const make = (id: string) => () =>
      new Promise<void>((resolve) => {
        order.push(id)
        gates[id] = resolve
      })

    const sem = new QuerySemaphore(2, () => {})
    // Start A1 and B1 simultaneously (both run, fill both slots).
    const pA1 = sem.run(make('A1'), { groupKey: 'A' })
    const pB1 = sem.run(make('B1'), { groupKey: 'B' })
    // Queue in this order: C1 (new group), A2 (same as running A), B2 (same as running B)
    const pC1 = sem.run(make('C1'), { groupKey: 'C' })
    const pA2 = sem.run(make('A2'), { groupKey: 'A' })
    const pB2 = sem.run(make('B2'), { groupKey: 'B' })

    // Let A1 and B1 start executing
    await Promise.resolve()
    expect(order).toEqual(['A1', 'B1'])

    // Finish A1; dispatch should pick A2 (group match) over C1 (FIFO head)
    gates['A1']()
    await pA1
    await Promise.resolve()
    expect(order).toEqual(['A1', 'B1', 'A2'])

    // Finish B1; dispatch should pick B2 over C1
    gates['B1']()
    await pB1
    await Promise.resolve()
    expect(order).toEqual(['A1', 'B1', 'A2', 'B2'])

    // Drain the rest
    gates['A2']()
    gates['B2']()
    await Promise.all([pA2, pB2])
    await Promise.resolve()
    gates['C1']()
    await Promise.all([pC1])

    expect(order).toEqual(['A1', 'B1', 'A2', 'B2', 'C1'])
  })

  it('works with untagged tasks', async () => {
    const order: number[] = []
    const sem = new QuerySemaphore(1, () => {})
    await Promise.all([
      sem.run(() => {
        order.push(1)
        return Promise.resolve()
      }),
      sem.run(() => {
        order.push(2)
        return Promise.resolve()
      }),
    ])
    expect(order).toEqual([1, 2])
  })
})

describe('fetchWithSemaphore', () => {
  beforeEach(() => {
    initSemaphore(vi.fn())
  })

  it('calls global fetch with the same arguments', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchWithSemaphore('/api/test', { method: 'GET' })
    expect(mockFetch).toHaveBeenCalledWith('/api/test', { method: 'GET' })

    vi.unstubAllGlobals()
  })
})
