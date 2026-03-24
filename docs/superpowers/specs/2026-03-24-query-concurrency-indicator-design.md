# Query Concurrency Limit & Status Indicator

**Date:** 2026-03-24
**Status:** Approved

## Overview

Limit the frontend to a maximum of 5 concurrent TanStack Query requests at any time. Excess requests queue and execute as slots free up. A small pill indicator in the header shows running and queued counts while active, briefly shows "all done", then fades out.

## Goals

- No more than 5 simultaneous in-flight API requests from the frontend
- Excess requests queue transparently — no changes to existing query hooks
- Users get lightweight feedback on query activity via a header indicator
- Indicator disappears automatically ~3 seconds after all queries complete

## Architecture

### 1. Concurrency Semaphore (`lib/api/semaphore.ts`)

A `QuerySemaphore` class that gates actual network requests.

**Behavior:**
- Maintains a `running` counter and a `queue` of pending `resolve` callbacks
- `acquire()`: if `running < MAX_CONCURRENT` (5), increments `running` and returns immediately; otherwise pushes a resolve callback onto `queue` and returns a promise that resolves when a slot opens
- `release()`: decrements `running`, then dequeues and calls the next waiter's resolve if any
- Always call `release()` in a `finally` block to prevent slot leaks on network errors or thrown exceptions
- After every state change, calls `store.setQueryCounts(running, queue.length)`

**Integration point:** A single `fetchWithSemaphore(input, init)` utility function in `lib/api/semaphore.ts` that calls `semaphore.acquire()`, then `fetch(input, init)`, then `semaphore.release()` in `finally`. Every API call function in `lib/api/queries.ts` uses `fetchWithSemaphore` instead of `fetch` directly. This is the only integration point — no QueryClient internals are patched.

**Mutations:** `useMutation` calls in `lib/api/queries.ts` also use `fetchWithSemaphore`, so they count against the 5-slot limit. This prevents bypass via write operations.

**Constants (in `lib/api/semaphore.ts`):**
```ts
export const MAX_CONCURRENT_QUERIES = 5
export const IDLE_DISMISS_DELAY_MS = 3000
```

### 2. Zustand State (`stores/app-store.ts`)

Three new ephemeral (non-persisted) fields:

```ts
runningQueries: number        // currently in-flight
queuedQueries: number         // waiting for a slot
queryEverActive: boolean      // true once any query has been dispatched; never resets to false
setQueryCounts: (running: number, queued: number) => void
```

`queryEverActive` is set to `true` the first time `setQueryCounts` is called with `running > 0` or `queued > 0`. It is never reset. This lets the component distinguish "idle at page load" (never render) from "finished" (render "all done" then fade).

All three fields are excluded from the localStorage persistence config.

### 3. `QueryStatusIndicator` Component (`components/layout/QueryStatusIndicator.tsx`)

Reads `runningQueries`, `queuedQueries`, and `queryEverActive` from the Zustand store.

**Display states:**

| Condition | Display |
|-----------|---------|
| `!queryEverActive` | Nothing rendered (initial idle) |
| `running > 0` or `queued > 0` | Indigo pulsing dot · "N running · N queued" |
| `queryEverActive && running === 0 && queued === 0` | Green dot · "all done" → start 3s dismiss timer |
| Timer elapsed | Begin CSS opacity fade-out (300ms transition), then unmount via `onTransitionEnd` |

**Fade-out sequence:**
1. Timer fires → set local state `fading = true` → CSS class `opacity-0 transition-opacity duration-300` applied
2. `onTransitionEnd` → set local state `dismissed = true` → component returns `null`
3. `dismissed` resets to `false` when `running > 0` or `queued > 0` (query activity resumes)

**Visual:** Pill (`rounded-full`), `border border-border`, `bg-background` or `bg-muted`, matches shadcn/ui token style. Indigo dot uses `animate-pulse`. Font size `text-xs`.

**Placement:** Inside `Header.tsx`, in the right actions `div`, before the theme toggle button.

## Component Boundaries

- `QuerySemaphore` — pure class, no React dependency, lives in `lib/api/semaphore.ts`
- `fetchWithSemaphore` — thin wrapper around `fetch`, exported from `lib/api/semaphore.ts`
- Zustand counts — ephemeral, not persisted, updated only by the semaphore
- `QueryStatusIndicator` — reads store + manages local fade timer; no side effects beyond rendering

## Out of Scope

- Per-query priority levels
- Cancellation of queued requests
- Showing which specific queries are running
- Persisting queue state across page reloads
