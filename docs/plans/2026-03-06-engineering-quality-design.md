# Engineering Quality Design

## Goal

Three targeted improvements to clean up pre-existing gaps: fix schema test failures, add error states to analytics pages, and add API endpoint integration tests.

## Item 1: Fix Schema Test Failures

Two bugs in `src/lib/schemas/api-schemas.ts`:

- `PathAnalysisDataSchema` — tests are missing `unique_sessions` in test data. The backend does return it (row[4] in `paths.py`), so the schema is correct; the tests are wrong.
- `PathAnalysisResponseSchema` — `.min(2).min(7)` is a typo. Zod applies both, effectively enforcing ≥7, which makes `max_path_length: 5` fail. Fix: remove the erroneous `.min(7)`.

**Fix:** patch the two `PathAnalysisDataSchema` test cases to include `unique_sessions`, and change `min(2).min(7)` → `min(2)` in the schema.

## Item 2: Frontend Error States

No analytics page handles `isError` from TanStack Query. A 503 or any API failure renders a silent empty/broken UI. The Connections feature does this correctly inline.

**Fix:** create a reusable `<QueryError>` component at `src/components/ui/QueryError.tsx` that renders a clear error message from `error.message`. Use it in:
- `TrendsPage`
- `RetentionPage`
- `PathsPage` (and `PathsExplorerPage`, `FunnelDetailPage`)
- `EventsPage`
- `DashboardPage`

The component accepts an `error: Error | null` prop and renders nothing when error is null.

## Item 3: API Endpoint Integration Tests

No tests cover the HTTP layer. The service layer is well-tested but request validation, response shapes, auth middleware, and error codes are untested.

**Fix:** use FastAPI `TestClient` + an in-memory DuckDB as the analytics DB. One `conftest.py` sets up the client and seeds minimal data. One test file per router:
- `test_api_trend.py`
- `test_api_events.py`
- `test_api_retention.py`
- `test_api_sessions.py`
- `test_api_paths.py`
- `test_api_conversion.py`

Each covers: happy path response shape, missing/invalid params (400), missing auth (401/403).

## What Does Not Change

- Backend service logic
- Existing passing tests
- Connection or auth pages (already handle errors correctly)
