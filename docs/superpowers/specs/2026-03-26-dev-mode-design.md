# Dev Mode Design

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Dev Mode is a runtime toggle (inspired by Looker's Development Mode) available to any user at any time. When active it shifts the UI into a developer-friendly state: a warm beige background signals the mode is on, every data container gains a SQL flip badge, and a full Query Studio page becomes accessible from the sidebar.

Dev mode state is persisted in the Zustand store (localStorage) so it survives page reloads.

---

## 1. State Management

Add to `apps/web/frontend/stores/app-store.ts`:

```typescript
devMode: boolean
setDevMode: (enabled: boolean) => void
```

Persisted to localStorage alongside existing fields.

---

## 2. Visual Indicator

When `devMode === true` and the theme is light:

- Page background shifts to `#fdf8f0` (warm beige) — applied via a CSS class on `<body>` or the root layout wrapper
- A small amber badge `⌗ Development Mode` appears in the Header (right side, next to theme switcher)
- Sidebar footer shows the toggle in an active/amber state

Dark mode: no background change (dark background already provides sufficient distinction). The header badge still appears.

---

## 3. Dev Mode Toggle

Location: **Sidebar footer**, left of the collapse button.

- Renders a small pill toggle labeled "Dev Mode"
- Amber color scheme (`fef3c7` / `f59e0b`) matching Looker's convention of a warm warning color
- On click: calls `setDevMode(!devMode)`
- Tooltip on hover: "Toggle Development Mode"

---

## 4. Backend — SQL in Responses

All API response models gain an optional `sql` field:

```python
class BaseAnalyticsResponse(BaseModel):
    sql: str | list[str] | None = None
```

- Single query → `sql: str`
- Multiple queries composed together → `sql: list[str]`
- Each service method populates `sql` by capturing the rendered SQL string before execution
- The field is always returned (never omitted), so the frontend can reliably read it

Affected routers: `trend`, `retention`, `events`, `paths`, `conversion`, `pivot`, `sessions`, `raw/events`, `raw/sessions`, `sessions/summary`.

---

## 5. DevCard Wrapper Component

**File:** `apps/web/frontend/components/dev/DevCard.tsx`

```typescript
interface DevCardProps {
  sql: string | string[] | null | undefined
  children: React.ReactNode
  className?: string
}
```

Behavior:

- When `devMode === false`: renders `children` as-is, no overhead
- When `devMode === true`:
  - Wraps `children` in a flip container (CSS 3D transform)
  - Shows an amber `SQL` badge in the top-right corner
  - Clicking the badge (or the badge area) flips the card 180° on the Y axis
  - Back face: dark code surface (`#1e1e2e`) with formatted, syntax-highlighted SQL using a lightweight highlighter (Prism.js or a small custom tokenizer for `SELECT / FROM / WHERE / GROUP BY / ORDER BY / LIMIT / JOIN / WITH`)
  - If `sql` is `string[]`: renders multiple SQL blocks separated by a labeled divider (e.g. `-- Query 1`, `-- Query 2`)
  - Flip is per-container (not global)
  - A small `✕` button on the back face flips back

The component reads `devMode` directly from the Zustand store — no prop needed for the mode.

**Export:** from `apps/web/frontend/components/dev/index.ts`

---

## 6. Wrapping Existing Data Containers

Every component that displays data fetched from the DB gets wrapped:

```tsx
// Before
<MetricCard value={data.total} label="Total Users" />

// After
<DevCard sql={data.sql}>
  <MetricCard value={data.total} label="Total Users" />
</DevCard>
```

The `sql` prop is threaded from the TanStack Query hook response (`useXxxData` → component). Each hook's return type gains `sql: string | string[] | null`.

Scope: all feature pages — Mission Control, Trends, Retention, Paths, Events, Pivot Explorer, Sessions.

---

## 7. Query Studio Page

**Route:** `/query-studio`
**Sidebar:** New nav item `⌗ Query Studio` in a "Developer" group, above Connections. Visible only when `devMode === true`.
**Lazy-loaded** with Suspense, same pattern as other pages.

### Layout

Three-panel layout:

```
┌─────────────┬──────────────────────────┐
│   Catalog   │       Toolbar            │
│   Browser   ├──────────────────────────┤
│             │                          │
│  schema     │    CodeMirror Editor     │
│  └ table    │                          │
│    └ col    │                          │
│             ├──────────────────────────┤
│             │   Results / Plan / Hist  │
└─────────────┴──────────────────────────┘
```

### Catalog Browser (left panel, ~200px)

- Populated via existing `fetchConnectionTables()` and `fetchBrowse()` API calls
- Tree: Connection → Schema → Table → Columns (with type badges)
- Search/filter input at top
- Clicking a table inserts its name at cursor in the editor
- Uses the active connection from Zustand (`activeConnectionId`)

### Editor (center panel)

**Library:** CodeMirror 6 (`@codemirror/lang-sql`, `@codemirror/theme-one-dark`)

Features:

- SQL syntax highlighting
- Autocomplete: table names + column names from the catalog, SQL keywords
- `Cmd+Enter` / `Ctrl+Enter` to run query
- `Cmd+Shift+F` / `Ctrl+Shift+F` to format (using `sql-formatter` package)
- Line numbers, bracket matching, active line highlight

### Toolbar

- **Run** button (teal, `▶ Run`) — executes query
- **Format** button — formats SQL in place
- **Clear** button — clears editor
- Active connection badge (read-only, links back to Connections page)

### Results Panel (bottom, resizable)

Three tabs:

1. **Results** — paginated data table (max 1000 rows client-side, same AG Grid component used in Pivot Explorer). Shows row count + execution time.
2. **Query Plan** — raw `EXPLAIN` output rendered as preformatted text
3. **History** — last 20 queries (session-only, not persisted), clickable to restore in editor

### Execution

- Calls a new backend endpoint: `POST /api/query-studio/execute`
- Request: `{ connection_id, sql }`
- Response: `{ columns: string[], rows: unknown[][], execution_time_ms: number, error?: string }`
- Errors shown inline below the editor (not as a toast)
- No row limit enforced server-side for Query Studio (user is a developer); client truncates display to 1000 rows with a notice

---

## 8. New Backend Endpoint

`POST /api/query-studio/execute`

- Auth: requires valid session (same as all other endpoints)
- Runs the provided SQL against the specified connection using the existing connection pool
- Returns columns + rows as JSON
- No SQL injection risk beyond the user's own connection credentials (user is already authenticated and owns the connection)

---

## 9. Dependencies

| Package                      | Purpose              | License |
| ---------------------------- | -------------------- | ------- |
| `@codemirror/lang-sql`       | SQL language support | MIT     |
| `@codemirror/theme-one-dark` | Dark editor theme    | MIT     |
| `sql-formatter`              | SQL formatting       | MIT     |

All MIT — no viral licensing.

---

## 10. What's Out of Scope

- Saved queries / query persistence across sessions
- Multi-tab editor
- Query sharing
- Export to CSV (can be added later)
- Dev mode access control (any authenticated user can toggle it)
