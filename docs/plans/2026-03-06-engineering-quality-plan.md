# Engineering Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 pre-existing frontend schema test failures, add error states to all analytics pages, and add API endpoint integration tests.

**Architecture:** Three independent tasks in sequence. Schema fixes are pure test/schema edits. Error states use a new shared `<QueryError>` component. API tests use FastAPI's `TestClient` with `app.dependency_overrides` to inject an in-memory DuckDB and mock auth.

**Tech Stack:** Vitest, Zod, React, TanStack Query, FastAPI TestClient, pytest, DuckDB

---

### Task 1: Fix failing PathAnalysis schema tests

**Files:**
- Modify: `src/lib/schemas/api-schemas.ts:115`
- Modify: `src/lib/schemas/__tests__/api-schemas.test.ts:484-508`

**Background:** Two bugs:
1. `PathAnalysisDataSchema` has `unique_sessions` as required — the backend returns it, but the two passing-test cases forgot to include it in their test data, making them fail.
2. `PathAnalysisResponseSchema` has `.min(2).min(7)` on `max_path_length` — a typo. Zod applies both, effectively enforcing ≥7. The test passes `5`, which fails. Should be `.min(2)` only.

**Step 1: Confirm tests fail**

```bash
npm run test:run 2>&1 | grep -E "fail|pass|PathAnalysis"
```

Expected: 4 failures in `PathAnalysisDataSchema` and `PathAnalysisResponseSchema`.

**Step 2: Fix the schema typo**

In `src/lib/schemas/api-schemas.ts`, change line 115:

```typescript
// Before
max_path_length: z.number().int().min(2).min(7),

// After
max_path_length: z.number().int().min(2),
```

**Step 3: Fix the two test cases missing `unique_sessions`**

In `src/lib/schemas/__tests__/api-schemas.test.ts`, add `unique_sessions` to both `PathAnalysisDataSchema` test cases:

```typescript
// Test 1 "validates valid path analysis data" — add unique_sessions: 40
it('validates valid path analysis data', () => {
  const result = PathAnalysisDataSchema.safeParse({
    path: 'Home -> Products -> Purchase',
    path_length: 3,
    occurrence_count: 100,
    unique_users: 50,
    unique_sessions: 40,
    percentage_of_total: 25.5,
    avg_time_to_complete: 120,
    median_time_to_complete: 100,
  })
  expect(result.success).toBe(true)
})

// Test 2 "accepts null time values" — add unique_sessions: 4
it('accepts null time values', () => {
  const result = PathAnalysisDataSchema.safeParse({
    path: 'Home -> Purchase',
    path_length: 2,
    occurrence_count: 10,
    unique_users: 5,
    unique_sessions: 4,
    percentage_of_total: 10,
    avg_time_to_complete: null,
    median_time_to_complete: null,
  })
  expect(result.success).toBe(true)
})
```

**Step 4: Run tests to confirm 0 failures**

```bash
npm run test:run 2>&1 | tail -5
```

Expected: `153 passed` (previously 4 failed, now all pass — total goes from 153 passed/4 failed to 157 passed/0 failed).

**Step 5: Commit**

```bash
git add src/lib/schemas/api-schemas.ts src/lib/schemas/__tests__/api-schemas.test.ts
git commit -m "fix: correct PathAnalysis schema typo and missing unique_sessions in tests"
```

---

### Task 2: Create `<QueryError>` component and add error states to analytics pages

**Files:**
- Create: `src/components/ui/query-error.tsx`
- Modify: `src/features/analytics/trends/TrendsPage.tsx`
- Modify: `src/features/analytics/trends/hooks/useTrendData.ts`
- Modify: `src/features/analytics/retention/RetentionPage.tsx`
- Modify: `src/features/analytics/paths/PathsPage.tsx`
- Modify: `src/features/events/EventsPage.tsx`
- Modify: `src/features/dashboard/DashboardPage.tsx`

**Background:** No analytics page handles `isError` from TanStack Query. A 503 or API failure renders an empty/broken UI silently. The pattern from Connections (inline `{update.isError && <p className="text-destructive">...`)}) is too minimal for full-page queries — we want something more prominent.

**Step 1: Create `src/components/ui/query-error.tsx`**

```tsx
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QueryErrorProps {
  error: Error | null | unknown
  className?: string
}

export function QueryError({ error, className }: QueryErrorProps) {
  if (!error) return null
  const message =
    error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center gap-3',
        className,
      )}
    >
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive font-medium">{message}</p>
    </div>
  )
}
```

**Step 2: Expose `isError` and `error` from `useTrendData`**

In `src/features/analytics/trends/hooks/useTrendData.ts`, find the `useQuery` call that fetches trend data and expose its `isError` and `error`:

```typescript
const { data: trendResponse, isLoading, isError, error } = useQuery({ ... })

// In the return object, add:
return {
  trendData,
  events,
  isLoading,
  isError,
  error,
  totalEvents,
  averageValue,
  maxValue,
}
```

**Step 3: Add error state to `TrendsPage`**

In `src/features/analytics/trends/TrendsPage.tsx`:

1. Import `QueryError`:
   ```typescript
   import { QueryError } from '@/components/ui/query-error'
   ```

2. Destructure `isError` and `error` from `useTrendData`:
   ```typescript
   const { trendData, events, isLoading, isError, error, totalEvents, averageValue, maxValue } = useTrendData(...)
   ```

3. After the `isLoading` check (or wherever `isLoading` renders a skeleton), add:
   ```tsx
   if (isError) return <QueryError error={error} />
   ```

**Step 4: Repeat for remaining pages**

Apply the same pattern to each page below. For each, the hook already returns `isLoading` — just also return `isError` and `error` from the underlying `useQuery`, then add `if (isError) return <QueryError error={error} />` in the page.

- `src/features/analytics/retention/RetentionPage.tsx` — hook: find it in `hooks/` subfolder
- `src/features/analytics/paths/PathsPage.tsx` — hook: find it in `hooks/` subfolder
- `src/features/events/EventsPage.tsx` — may fetch directly with `useQuery` in the page
- `src/features/dashboard/DashboardPage.tsx` — may have multiple queries; add error check for the primary one

For each page, search for the `useQuery` calls and add `isError, error` to the destructuring.

**Step 5: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors.

**Step 6: Commit**

```bash
git add src/components/ui/query-error.tsx \
        src/features/analytics/trends/TrendsPage.tsx \
        src/features/analytics/trends/hooks/useTrendData.ts \
        src/features/analytics/retention/RetentionPage.tsx \
        src/features/analytics/paths/PathsPage.tsx \
        src/features/events/EventsPage.tsx \
        src/features/dashboard/DashboardPage.tsx
git commit -m "feat: add QueryError component and error states to analytics pages"
```

---

### Task 3: API endpoint integration tests

**Files:**
- Create: `openflow/tests/conftest.py`
- Create: `openflow/tests/test_api_trend.py`
- Create: `openflow/tests/test_api_events.py`
- Create: `openflow/tests/test_api_retention.py`
- Create: `openflow/tests/test_api_sessions.py`
- Create: `openflow/tests/test_api_conversion.py`

**Background:** FastAPI's `TestClient` (from `starlette.testclient`, already installed) lets us make real HTTP requests against the app without a running server. Auth uses JWT cookies (`of_session`). The `get_analytics_db` dependency is complex (hits product DB + opens real connections), so we override it via `app.dependency_overrides` to return a seeded in-memory DuckDB. Auth is also overridden to skip cookie validation.

**Step 1: Create `openflow/tests/conftest.py`**

This sets up the shared `client` fixture used by all API test files.

```python
"""Shared fixtures for API integration tests."""

import pytest
import duckdb
from starlette.testclient import TestClient

from openflow.main import app
from openflow.services.connection_executor import AnalyticsDatabase, get_analytics_db
from openflow.core.jwt_auth import AuthUserRow, get_current_auth_user


def _make_fake_user():
    """Create a minimal AuthUserRow-like object for tests."""
    class FakeUser:
        id = "test-user-id"
        email = "test@example.com"
        display_name = "Test User"
        avatar_url = None
        created_at = "2024-01-01T00:00:00"
        last_login_at = None
    return FakeUser()


def _make_test_db() -> AnalyticsDatabase:
    """Create an in-memory DuckDB seeded with minimal analytics data."""
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR,
            timestamp TIMESTAMP,
            event_name VARCHAR,
            properties VARCHAR
        )
    """)
    conn.execute("""
        INSERT INTO events VALUES
            ('user-1', '2024-01-15 10:00:00', 'Home', '{}'),
            ('user-1', '2024-01-15 10:05:00', 'Purchase', '{}'),
            ('user-2', '2024-01-16 11:00:00', 'Home', '{}'),
            ('user-2', '2024-01-16 11:10:00', 'Checkout', '{}')
    """)
    return AnalyticsDatabase(conn=conn, dialect="duckdb", events_cte=None)


@pytest.fixture()
def client():
    """TestClient with auth and analytics DB overridden for testing."""
    fake_user = _make_fake_user()
    test_db = _make_test_db()

    async def override_auth():
        return fake_user

    async def override_db():
        yield test_db

    app.dependency_overrides[get_current_auth_user] = override_auth
    app.dependency_overrides[get_analytics_db] = override_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
```

**Step 2: Create `openflow/tests/test_api_trend.py`**

```python
"""Integration tests for /api/trend endpoint."""


class TestTrendEndpoint:
    def test_happy_path_returns_200_with_data_list(self, client):
        response = client.get("/api/trend", params={
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert isinstance(body["data"], list)

    def test_invalid_date_returns_400(self, client):
        response = client.get("/api/trend", params={
            "start_date": "not-a-date",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 400

    def test_no_auth_returns_401(self):
        # Use a plain client without overrides
        from starlette.testclient import TestClient
        from openflow.main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            response = c.get("/api/trend")
        assert response.status_code == 401
```

**Step 3: Run trend tests to confirm they pass**

```bash
cd /path/to/worktree
uv run pytest openflow/tests/test_api_trend.py -v
```

Expected: 3 passed.

**Step 4: Create `openflow/tests/test_api_events.py`**

```python
"""Integration tests for /api/events, /api/events/top, /api/raw/events endpoints."""


class TestEventsEndpoint:
    def test_top_events_returns_200(self, client):
        response = client.get("/api/events/top", params={
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert isinstance(body["data"], list)

    def test_raw_events_returns_200(self, client):
        response = client.get("/api/raw/events", params={
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 200

    def test_invalid_date_returns_400(self, client):
        response = client.get("/api/events/top", params={
            "start_date": "2024/01/01",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 400
```

**Step 5: Create `openflow/tests/test_api_retention.py`**

```python
"""Integration tests for /api/retention endpoint."""


class TestRetentionEndpoint:
    def test_happy_path_returns_200(self, client):
        response = client.get("/api/retention", params={
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 200
        body = response.json()
        assert "data" in body

    def test_invalid_date_returns_400(self, client):
        response = client.get("/api/retention", params={
            "start_date": "baddate",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 400
```

**Step 6: Create `openflow/tests/test_api_sessions.py`**

```python
"""Integration tests for /api/raw/sessions endpoint."""


class TestSessionsEndpoint:
    def test_happy_path_returns_200(self, client):
        response = client.get("/api/raw/sessions", params={
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 200
        body = response.json()
        assert "data" in body

    def test_invalid_date_returns_400(self, client):
        response = client.get("/api/raw/sessions", params={
            "start_date": "2024-13-01",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 400
```

**Step 7: Create `openflow/tests/test_api_conversion.py`**

```python
"""Integration tests for /api/conversion endpoint."""


class TestConversionEndpoint:
    def test_happy_path_returns_200(self, client):
        response = client.get("/api/conversion", params={
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "entry_event": "Home",
            "goal_event": "Purchase",
        })
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert body["entry_event"] == "Home"
        assert body["goal_event"] == "Purchase"

    def test_invalid_date_returns_400(self, client):
        response = client.get("/api/conversion", params={
            "start_date": "not-a-date",
            "end_date": "2024-01-31",
        })
        assert response.status_code == 400
```

**Step 8: Run all API tests**

```bash
uv run pytest openflow/tests/test_api_trend.py openflow/tests/test_api_events.py \
    openflow/tests/test_api_retention.py openflow/tests/test_api_sessions.py \
    openflow/tests/test_api_conversion.py -v
```

Expected: all pass.

**Step 9: Run full Python test suite to confirm nothing broke**

```bash
uv run pytest openflow/tests/ -v
```

Expected: all existing tests still pass + new API tests pass.

**Step 10: Commit**

```bash
git add openflow/tests/conftest.py \
        openflow/tests/test_api_trend.py \
        openflow/tests/test_api_events.py \
        openflow/tests/test_api_retention.py \
        openflow/tests/test_api_sessions.py \
        openflow/tests/test_api_conversion.py
git commit -m "test: add API endpoint integration tests with TestClient"
```

---

### Task 4: Final verification

```bash
# Python
uv run pytest openflow/tests/ -v

# Frontend
npm run test:run
npm run build
```

Expected:
- All Python tests pass (78 existing + new API tests)
- Frontend: 157 passed, 0 failures (was 153 passed, 4 failed)
- Build: no TypeScript errors
