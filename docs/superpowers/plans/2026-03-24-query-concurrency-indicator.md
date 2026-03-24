# Query Concurrency Limit & Status Indicator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit the frontend to 5 concurrent API requests with a queueing mechanism and a header pill indicator showing running/queued counts that fades out after completion.

**Architecture:** A `QuerySemaphore` class in `lib/api/semaphore.ts` wraps `fetch` via a `fetchWithSemaphore` utility. All calls in `lib/api/queries.ts` swap `fetch` for `fetchWithSemaphore`. Three ephemeral Zustand fields track counts. A new `QueryStatusIndicator` component in the header reads those fields and manages its own dismiss timer.

**Tech Stack:** TypeScript, React 18, Zustand, TanStack Query v5, Tailwind CSS v4, shadcn/ui, Vitest + Testing Library

---

## File Map

| File | Change |
|------|--------|
| `apps/web/frontend/lib/api/semaphore.ts` | **Create** — `QuerySemaphore` class + `fetchWithSemaphore` utility |
| `apps/web/frontend/lib/api/__tests__/semaphore.test.ts` | **Create** — unit tests for semaphore |
| `apps/web/frontend/lib/api/queries.ts` | **Modify** — replace `fetch(...)` with `fetchWithSemaphore(...)` inside `fetchApi` |
| `apps/web/frontend/stores/app-store.ts` | **Modify** — add `runningQueries`, `queuedQueries`, `queryEverActive`, `setQueryCounts` |
| `apps/web/frontend/stores/__tests__/app-store.test.ts` | **Modify** — add tests for new store fields |
| `apps/web/frontend/components/layout/QueryStatusIndicator.tsx` | **Create** — pill component with dismiss logic |
| `apps/web/frontend/components/layout/__tests__/QueryStatusIndicator.test.tsx` | **Create** — component tests |
| `apps/web/frontend/components/layout/Header.tsx` | **Modify** — mount `QueryStatusIndicator` in right actions area |

---

## Task 1: `QuerySemaphore` class + `fetchWithSemaphore`

**Files:**
- Create: `apps/web/frontend/lib/api/semaphore.ts`
- Create: `apps/web/frontend/lib/api/__tests__/semaphore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/frontend/lib/api/__tests__/semaphore.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuerySemaphore, fetchWithSemaphore } from '../semaphore'

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
    // Fill 2 slots with long-running tasks
    let resolveA!: () => void
    let resolveB!: () => void
    const longA = () => new Promise<void>((res) => { resolveA = res })
    const longB = () => new Promise<void>((res) => { resolveB = res })

    const p1 = semaphore.run(async () => { await longA(); order.push(1) })
    const p2 = semaphore.run(async () => { await longB(); order.push(2) })
    // This one should queue
    const p3 = semaphore.run(async () => { order.push(3) })

    // p3 hasn't run yet
    expect(order).toEqual([])

    resolveA()
    await p1
    // After slot freed, p3 should run
    await p3
    expect(order).toContain(3)
    resolveB()
    await p2
  })

  it('calls onCountChange with running and queued counts', async () => {
    let resolveA!: () => void
    const longA = () => new Promise<void>((res) => { resolveA = res })

    const p1 = semaphore.run(async () => { await longA() })
    // running=1, queued=0
    expect(onCountChange).toHaveBeenCalledWith(1, 0)

    const p2 = semaphore.run(async () => { await longA() })
    // running=2, queued=0
    expect(onCountChange).toHaveBeenCalledWith(2, 0)

    const p3 = semaphore.run(async () => {})
    // running=2, queued=1
    expect(onCountChange).toHaveBeenCalledWith(2, 1)

    resolveA()
    await p1
    await p3
    resolveA()
    await p2
  })

  it('releases slot even when the task throws', async () => {
    const thrower = semaphore.run(async () => { throw new Error('boom') })
    await expect(thrower).rejects.toThrow('boom')
    // Slot should be free; running=0
    const last = onCountChange.mock.calls.at(-1)
    expect(last![0]).toBe(0)
  })
})

describe('fetchWithSemaphore', () => {
  it('calls global fetch with the same arguments', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchWithSemaphore('/api/test', { method: 'GET' })
    expect(mockFetch).toHaveBeenCalledWith('/api/test', { method: 'GET' })

    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- apps/web/frontend/lib/api/__tests__/semaphore.test.ts
```
Expected: FAIL — `Cannot find module '../semaphore'`

- [ ] **Step 3: Implement `semaphore.ts`**

Create `apps/web/frontend/lib/api/semaphore.ts`:

```typescript
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

// Singleton instance — wired to the Zustand store in app-store.ts
// The store sets this up after initialization to avoid circular imports.
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- apps/web/frontend/lib/api/__tests__/semaphore.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/lib/api/semaphore.ts apps/web/frontend/lib/api/__tests__/semaphore.test.ts
git commit -m "feat: add QuerySemaphore with fetchWithSemaphore utility"
```

---

## Task 2: Zustand store additions

**Files:**
- Modify: `apps/web/frontend/stores/app-store.ts`
- Modify (or create): `apps/web/frontend/stores/__tests__/app-store.test.ts`

- [ ] **Step 1: Write failing tests**

Check if a test file already exists:
```bash
ls apps/web/frontend/stores/__tests__/ 2>/dev/null || echo "no dir"
```

Create/append `apps/web/frontend/stores/__tests__/app-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../app-store'

// Reset store state between tests
beforeEach(() => {
  useAppStore.setState({
    runningQueries: 0,
    queuedQueries: 0,
    queryEverActive: false,
  })
})

describe('query count state', () => {
  it('initializes with zero counts and queryEverActive false', () => {
    const { runningQueries, queuedQueries, queryEverActive } = useAppStore.getState()
    expect(runningQueries).toBe(0)
    expect(queuedQueries).toBe(0)
    expect(queryEverActive).toBe(false)
  })

  it('setQueryCounts updates running and queued', () => {
    useAppStore.getState().setQueryCounts(3, 2)
    const { runningQueries, queuedQueries } = useAppStore.getState()
    expect(runningQueries).toBe(3)
    expect(queuedQueries).toBe(2)
  })

  it('sets queryEverActive to true on first non-zero call', () => {
    useAppStore.getState().setQueryCounts(1, 0)
    expect(useAppStore.getState().queryEverActive).toBe(true)
  })

  it('keeps queryEverActive true after counts return to zero', () => {
    useAppStore.getState().setQueryCounts(1, 0)
    useAppStore.getState().setQueryCounts(0, 0)
    expect(useAppStore.getState().queryEverActive).toBe(true)
  })

  it('does not set queryEverActive when called with zeros', () => {
    useAppStore.getState().setQueryCounts(0, 0)
    expect(useAppStore.getState().queryEverActive).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- apps/web/frontend/stores/__tests__/app-store.test.ts
```
Expected: FAIL — fields/action not found on store

- [ ] **Step 3: Add fields and action to `app-store.ts`**

In `apps/web/frontend/stores/app-store.ts`, add to the `AppState` interface (after `activeConnectionId`):

```typescript
  // Query concurrency tracking — ephemeral, not persisted
  runningQueries: number
  queuedQueries: number
  queryEverActive: boolean
  setQueryCounts: (running: number, queued: number) => void
```

Add the implementations inside `create()(persist((set) => ({`:

```typescript
      runningQueries: 0,
      queuedQueries: 0,
      queryEverActive: false,
      setQueryCounts: (running, queued) =>
        set((state) => ({
          runningQueries: running,
          queuedQueries: queued,
          queryEverActive: state.queryEverActive || running > 0 || queued > 0,
        })),
```

The `partialize` config already excludes these fields (they're not listed), so no change needed there.

- [ ] **Step 4: Initialize semaphore wired to store**

At the bottom of `app-store.ts`, after `export const useAppStore = create(...)`, add:

```typescript
import { initSemaphore } from '@/lib/api/semaphore'

// Initialize the global semaphore, wired to the Zustand store.
// Must run after store creation to avoid circular dependency.
initSemaphore((running, queued) => {
  useAppStore.getState().setQueryCounts(running, queued)
})
```

Note: move the import to the top of the file with other imports.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:run -- apps/web/frontend/stores/__tests__/app-store.test.ts
```
Expected: All tests PASS

- [ ] **Step 6: Run full test suite to check for regressions**

```bash
npm run test:run
```
Expected: All 254+ tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/frontend/stores/app-store.ts apps/web/frontend/stores/__tests__/app-store.test.ts
git commit -m "feat: add query concurrency counts to Zustand store"
```

---

## Task 3: Wire `fetchWithSemaphore` into `queries.ts`

**Files:**
- Modify: `apps/web/frontend/lib/api/queries.ts`

- [ ] **Step 1: Replace `fetch` with `fetchWithSemaphore` in `fetchApi`**

In `apps/web/frontend/lib/api/queries.ts`, find the `fetchApi` function. It currently calls `fetch(...)`. Replace the import and the call:

Add import at top of file:
```typescript
import { fetchWithSemaphore } from './semaphore'
```

Change the `fetch(...)` call in `fetchApi`:
```typescript
// Before:
const response = await fetch(`${API_URL}${endpoint}`, {
// After:
const response = await fetchWithSemaphore(`${API_URL}${endpoint}`, {
```

That's the only change needed. All query and mutation calls go through `fetchApi`, so this covers everything.

- [ ] **Step 2: Run the full test suite**

```bash
npm run test:run
```
Expected: All tests PASS (no behavior change, just routing through semaphore)

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/lib/api/queries.ts
git commit -m "feat: route all API calls through query semaphore"
```

---

## Task 4: `QueryStatusIndicator` component

**Files:**
- Create: `apps/web/frontend/components/layout/QueryStatusIndicator.tsx`
- Create: `apps/web/frontend/components/layout/__tests__/QueryStatusIndicator.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/frontend/components/layout/__tests__/QueryStatusIndicator.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { QueryStatusIndicator } from '../QueryStatusIndicator'
import { useAppStore } from '@/stores'
import { IDLE_DISMISS_DELAY_MS } from '@/lib/api/semaphore'

beforeEach(() => {
  vi.useFakeTimers()
  useAppStore.setState({
    runningQueries: 0,
    queuedQueries: 0,
    queryEverActive: false,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('QueryStatusIndicator', () => {
  it('renders nothing when never active', () => {
    const { container } = render(<QueryStatusIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('shows running and queued counts when active', () => {
    useAppStore.setState({ runningQueries: 3, queuedQueries: 2, queryEverActive: true })
    render(<QueryStatusIndicator />)
    expect(screen.getByText(/3 running/)).toBeInTheDocument()
    expect(screen.getByText(/2 queued/)).toBeInTheDocument()
  })

  it('shows "all done" when counts drop to zero after being active', () => {
    useAppStore.setState({ runningQueries: 1, queuedQueries: 0, queryEverActive: true })
    render(<QueryStatusIndicator />)
    act(() => {
      useAppStore.setState({ runningQueries: 0, queuedQueries: 0 })
    })
    expect(screen.getByText(/all done/i)).toBeInTheDocument()
  })

  it('starts fading after IDLE_DISMISS_DELAY_MS when done', () => {
    useAppStore.setState({ runningQueries: 0, queuedQueries: 0, queryEverActive: true })
    render(<QueryStatusIndicator />)
    // Pill is visible (all done state)
    expect(screen.getByText(/all done/i)).toBeInTheDocument()
    // Advance timer past dismiss delay
    act(() => { vi.advanceTimersByTime(IDLE_DISMISS_DELAY_MS + 10) })
    // Element should have opacity-0 class (fading)
    const pill = screen.getByRole('status')
    expect(pill.className).toContain('opacity-0')
  })

  it('reappears when queries become active again after dismissal', () => {
    useAppStore.setState({ runningQueries: 0, queuedQueries: 0, queryEverActive: true })
    const { rerender } = render(<QueryStatusIndicator />)
    act(() => { vi.advanceTimersByTime(IDLE_DISMISS_DELAY_MS + 400) }) // past fade
    // Simulate new query activity
    act(() => {
      useAppStore.setState({ runningQueries: 1, queuedQueries: 0 })
    })
    rerender(<QueryStatusIndicator />)
    expect(screen.getByText(/1 running/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- apps/web/frontend/components/layout/__tests__/QueryStatusIndicator.test.tsx
```
Expected: FAIL — `Cannot find module '../QueryStatusIndicator'`

- [ ] **Step 3: Implement `QueryStatusIndicator.tsx`**

Create `apps/web/frontend/components/layout/QueryStatusIndicator.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores'
import { IDLE_DISMISS_DELAY_MS } from '@/lib/api/semaphore'
import { cn } from '@/lib/utils'

export function QueryStatusIndicator() {
  const runningQueries = useAppStore((s) => s.runningQueries)
  const queuedQueries = useAppStore((s) => s.queuedQueries)
  const queryEverActive = useAppStore((s) => s.queryEverActive)

  const isActive = runningQueries > 0 || queuedQueries > 0
  const isDone = queryEverActive && !isActive

  const [fading, setFading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // When queries become active again, reset dismissed state
  useEffect(() => {
    if (isActive) {
      setFading(false)
      setDismissed(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isActive])

  // Start dismiss timer when done
  useEffect(() => {
    if (isDone && !fading && !dismissed) {
      timerRef.current = setTimeout(() => {
        setFading(true)
      }, IDLE_DISMISS_DELAY_MS)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isDone, fading, dismissed])

  if (!queryEverActive || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      onTransitionEnd={() => { if (fading) setDismissed(true) }}
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs transition-opacity duration-300',
        fading && 'opacity-0'
      )}
    >
      {isActive ? (
        <>
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
          <span className="text-indigo-400 font-semibold">{runningQueries} running</span>
          {queuedQueries > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{queuedQueries} queued</span>
            </>
          )}
        </>
      ) : (
        <>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-muted-foreground">all done</span>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- apps/web/frontend/components/layout/__tests__/QueryStatusIndicator.test.tsx
```
Expected: All tests PASS

- [ ] **Step 5: Run full test suite**

```bash
npm run test:run
```
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/frontend/components/layout/QueryStatusIndicator.tsx apps/web/frontend/components/layout/__tests__/QueryStatusIndicator.test.tsx
git commit -m "feat: add QueryStatusIndicator component"
```

---

## Task 5: Mount in `Header.tsx`

**Files:**
- Modify: `apps/web/frontend/components/layout/Header.tsx`

- [ ] **Step 1: Add `QueryStatusIndicator` to the header**

In `apps/web/frontend/components/layout/Header.tsx`, add the import:

```typescript
import { QueryStatusIndicator } from './QueryStatusIndicator'
```

In the JSX, find the right actions `div`:
```tsx
{/* Right actions */}
<div className="flex items-center gap-1 shrink-0">
```

Insert `<QueryStatusIndicator />` as the first child:
```tsx
{/* Right actions */}
<div className="flex items-center gap-2 shrink-0">
  <QueryStatusIndicator />
  <DropdownMenu>
    ...
```

(Also change `gap-1` to `gap-2` for slightly more breathing room with the pill.)

- [ ] **Step 2: Run the full test suite**

```bash
npm run test:run
```
Expected: All tests PASS

- [ ] **Step 3: Run lint and type-check**

```bash
npm run lint && npm run build
```
Expected: Zero warnings, build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/components/layout/Header.tsx
git commit -m "feat: mount QueryStatusIndicator in header"
```

---

## Task 6: Manual smoke test

- [ ] **Step 1: Start the dev server in the worktree**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser.

- [ ] **Step 2: Verify the indicator appears during page load**

Navigate between dashboard pages. Watch the header — the indigo pill should appear briefly while queries run, show "all done" in green, then fade out after ~3 seconds.

- [ ] **Step 3: Verify concurrency cap in browser DevTools**

Open Network tab → filter by `Fetch/XHR`. Navigate to a page that fires many queries (e.g. Mission Control which fires 8). Verify no more than 5 requests are in-flight simultaneously (check the Waterfall view).

- [ ] **Step 4: Final full suite + lint**

```bash
npm run test:run && npm run lint && npm run build
```
Expected: All pass, zero warnings.
