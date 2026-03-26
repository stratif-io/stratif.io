# Auto-Activate Connection on Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When navigating to a connection detail page, automatically test the connection and set it as the active connection if the test passes.

**Architecture:** Modify `ConnectionDetailPage` to trigger `useTestConnection` once the connection loads. A `useEffect` fires the mutation; `onSuccess` calls `setActiveConnectionId`, `onError` leaves it unchanged. A compact status indicator is rendered inline with the header.

**Tech Stack:** React 18, TanStack Query v5 (`useMutation`), Zustand (`useAppStore`), Vitest + Testing Library

---

### Task 1: Write tests for `ConnectionDetailPage` auto-test behavior

**Files:**

- Create: `apps/web/frontend/features/connections/__tests__/ConnectionDetailPage.test.tsx`

- [ ] **Step 1: Create the test file with mocks**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectionDetailPage } from '../ConnectionDetailPage'
import { useAppStore } from '@/stores'

// Mock the hooks used by ConnectionDetailPage and its children
vi.mock('../hooks/useConnectionsData', () => ({
  useConnection: vi.fn(),
  useTestConnection: vi.fn(),
  useUpdateConnection: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
  })),
  useConnectionCredentials: vi.fn(() => ({ data: { fields: {} } })),
  useConnectionString: vi.fn(() => ({ data: null })),
  useSchemaConfig: vi.fn(() => ({ data: null, isLoading: false })),
  useUpsertSchemaConfig: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useFilterConfig: vi.fn(() => ({ data: null, isLoading: false })),
  useUpsertFilterConfig: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useFilterOptions: vi.fn(() => ({ data: null })),
  useConnectionTables: vi.fn(() => ({ data: null })),
  useDetectSchema: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useConnections: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useDeleteConnection: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

import { useConnection, useTestConnection } from '../hooks/useConnectionsData'

const mockConnection = {
  id: 'conn-1',
  name: 'My DB',
  db_type: 'postgresql',
  created_at: '2024-01-01T00:00:00Z',
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/connections/conn-1']}>
        <Routes>
          <Route path="/connections/:id" element={<ConnectionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(useConnection).mockReturnValue({
    data: mockConnection,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useConnection>)
  useAppStore.setState({ activeConnectionId: null })
})
```

- [ ] **Step 2: Write test — shows "Verifying…" while test is in flight**

```tsx
it('shows verifying indicator while test is pending', () => {
  vi.mocked(useTestConnection).mockReturnValue({
    mutate: vi.fn(),
    isPending: true,
    data: undefined,
    error: null,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useTestConnection>)

  renderPage()
  expect(screen.getByText(/verifying/i)).toBeInTheDocument()
})
```

- [ ] **Step 3: Write test — sets active connection on success**

```tsx
it('sets active connection when test passes', async () => {
  let capturedCallbacks: { onSuccess?: (data: unknown) => void } = {}
  vi.mocked(useTestConnection).mockReturnValue({
    mutate: vi.fn((_id, callbacks) => {
      capturedCallbacks = callbacks ?? {}
    }),
    isPending: false,
    data: { ok: true },
    error: null,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useTestConnection>)

  renderPage()

  // Simulate the onSuccess callback firing
  capturedCallbacks.onSuccess?.({ ok: true })

  await waitFor(() => {
    expect(useAppStore.getState().activeConnectionId).toBe('conn-1')
  })
  expect(screen.getByText(/active/i)).toBeInTheDocument()
})
```

- [ ] **Step 4: Write test — shows "Connection failed" when test returns ok=false**

```tsx
it('shows connection failed when test returns ok=false', async () => {
  vi.mocked(useTestConnection).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    data: { ok: false },
    error: null,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useTestConnection>)

  renderPage()
  expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
  expect(useAppStore.getState().activeConnectionId).toBeNull()
})
```

- [ ] **Step 5: Write test — does not change active connection on network error**

```tsx
it('does not change active connection when test fails', async () => {
  useAppStore.setState({ activeConnectionId: 'other-conn' })
  let capturedCallbacks: { onError?: (err: unknown) => void } = {}
  vi.mocked(useTestConnection).mockReturnValue({
    mutate: vi.fn((_id, callbacks) => {
      capturedCallbacks = callbacks ?? {}
    }),
    isPending: false,
    data: undefined,
    error: new Error('connection refused'),
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useTestConnection>)

  renderPage()
  capturedCallbacks.onError?.(new Error('connection refused'))

  await waitFor(() => {
    expect(useAppStore.getState().activeConnectionId).toBe('other-conn')
  })
  expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
})
```

- [ ] **Step 6: Run tests to confirm they fail (not yet implemented)**

```bash
npm run test:run -- ConnectionDetailPage
```

Expected: 3 failing tests (component doesn't yet have the feature).

---

### Task 2: Implement auto-test in `ConnectionDetailPage`

**Files:**

- Modify: `apps/web/frontend/features/connections/ConnectionDetailPage.tsx`

- [ ] **Step 1: Add imports for `useTestConnection`, `useAppStore`, and icons**

At the top of `ConnectionDetailPage.tsx`, add to existing imports:

```tsx
import { useTestConnection } from './hooks/useConnectionsData'
import { useAppStore } from '@/stores'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
```

- [ ] **Step 2: Add auto-test logic inside `ConnectionDetailPage`**

Inside `ConnectionDetailPage`, after the `useConnection` call and before the loading/error guards:

```tsx
const setActiveConnectionId = useAppStore((s) => s.setActiveConnectionId)
const autoTest = useTestConnection()

useEffect(() => {
  if (!connection) return
  autoTest.mutate(connection.id, {
    onSuccess: (data) => {
      if (data.ok) setActiveConnectionId(connection.id)
    },
  })
  // Run once when connection data first becomes available
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [connection?.id])
```

- [ ] **Step 3: Add status indicator to the header**

In the JSX, find the section that renders the connection name and db type label:

```tsx
<p className={TYPOGRAPHY.muted}>{DB_TYPE_LABELS[connection.db_type] ?? connection.db_type}</p>
```

Add the status indicator directly after this `<p>`:

```tsx
<div className="mt-1">
  {autoTest.isPending && (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Verifying…
    </span>
  )}
  {!autoTest.isPending && autoTest.data?.ok && (
    <span className="flex items-center gap-1 text-xs text-success">
      <CheckCircle className="h-3 w-3" />
      Active
    </span>
  )}
  {!autoTest.isPending && (autoTest.error || autoTest.data?.ok === false) && (
    <span className="flex items-center gap-1 text-xs text-destructive">
      <XCircle className="h-3 w-3" />
      Connection failed
    </span>
  )}
</div>
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- ConnectionDetailPage
```

Expected: 4 passing tests.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npm run test:run
```

Expected: all passing.

- [ ] **Step 6: Run lint and type-check**

```bash
npm run lint && npm run build
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/frontend/features/connections/ConnectionDetailPage.tsx \
        apps/web/frontend/features/connections/__tests__/ConnectionDetailPage.test.tsx
git commit -m "feat(connections): auto-test and activate connection on detail page visit"
```
