# AGENTS.md

Quick reference for AI agents working on this codebase.

## Project Overview

OpenFlow Analytics is a "Bare Metal" Product Analytics Dashboard with React frontend and Python/FastAPI backend using DuckDB.

## Tech Stack

**Frontend:** React 18, TypeScript, Vite 6, Tailwind CSS v4, TanStack Query v5, TanStack Table v8, Zustand, Recharts, shadcn/ui, React Router v6

**Backend:** FastAPI, DuckDB, Python 3.9+

## Essential Commands

```bash
# Development
npm run dev           # Start frontend dev server (port 5173)
uv run serve          # Start backend server (port 8000)

# Testing
npm run test:run      # Run unit tests (Vitest)
npm run test:e2e      # Run E2E tests (Playwright)

# Quality
npm run lint          # ESLint check
npm run format:check  # Prettier check
npm run build         # Type-check and build

# Run before committing
npm run lint && npm run test:run && npm run format:check
```

## Project Structure

```
src/
├── components/          # Shared UI components
│   ├── ui/              # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── layout/          # Sidebar, Header, DashboardLayout
│   ├── charts/          # Recharts wrappers (line, bar, area, donut, etc.)
│   └── data-table/      # DataTable with sorting, filtering, pagination
├── features/            # Feature modules (self-contained)
│   ├── dashboard/       # Dashboard feature
│   │   ├── components/  # MetricCard, ActivityChart, TopEvents
│   │   ├── hooks/       # useDashboardMetrics
│   │   └── DashboardPage.tsx
│   ├── events/          # Events feature
│   └── analytics/       # Analytics features
│       ├── trends/      # Trend analysis
│       │   ├── components/  # TrendChart
│       │   ├── hooks/       # useTrendData
│       │   └── TrendsPage.tsx
│       ├── retention/   # Retention cohorts
│       │   ├── components/  # RetentionChart, RetentionTable
│       │   ├── hooks/       # useRetentionData
│       │   └── RetentionPage.tsx
│       └── paths/       # Path analysis
│           ├── components/  # PathsChart, PathsTable
│           ├── hooks/       # usePathsData
│           └── PathsPage.tsx
├── hooks/               # Global hooks (use-theme, use-websocket, etc.)
├── lib/
│   ├── api/             # API client and TanStack Query queries
│   ├── websocket/       # WebSocket client
│   ├── schemas/         # Zod validation schemas
│   └── utils.ts         # Utility functions (cn, etc.)
├── stores/              # Zustand stores (app-store)
├── contexts/            # React contexts (WebSocketContext)
├── pages/               # Placeholder pages (under construction)
└── types/               # TypeScript type definitions

openflow/                # Python backend
├── api/                 # FastAPI endpoints
├── db/                  # DuckDB connection and views
├── services/            # Business logic
└── main.py              # FastAPI app entry point
```

## Architecture Patterns

### Feature-Based Structure

Each feature is self-contained with the following structure:

```
src/features/<feature>/
├── components/          # Feature-specific UI components
├── hooks/               # Feature-specific data hooks
└── <Feature>Page.tsx    # Main page component
```

### State Management

- **Server state:** TanStack Query via hooks in `src/features/<feature>/hooks/`
- **Client state:** Zustand store in `src/stores/app-store.ts`
  - `theme`, `dateRange`, `sidebarOpen`, `selectedEvent`, `selectedDevice`

### Data Fetching Pattern

ALWAYS use TanStack Query hooks, never raw fetch:

```typescript
// CORRECT - Use custom hook with TanStack Query
const { data, isLoading } = useTrendData({ dateRange, selectedEvent, granularity })

// WRONG - Never use raw fetch in components
useEffect(() => {
  fetch('/api/trend')
    .then((res) => res.json())
    .then(setData)
}, [])
```

### API Layer

- Fetch functions in `src/lib/api/queries.ts`
- Types in `src/types/index.ts`
- Feature hooks wrap fetch functions with TanStack Query

### Styling

- Tailwind CSS v4 with shadcn/ui components
- Use `cn()` utility from `src/lib/utils.ts` for conditional classes
- Dark mode via `useAppStore()` hook

### Testing

- Unit tests co-located in `__tests__` directories
- Use `@testing-library/react` for component tests
- Test file pattern: `*.test.ts(x)`

## Code Conventions

1. **Imports:** Use `@/` alias for src imports
2. **Components:** Functional components with TypeScript
3. **Types:** Define in `src/types/` or co-locate with feature
4. **Validation:** Use Zod schemas for API responses
5. **Comments:** Avoid comments unless explaining complex logic
6. **Data fetching:** Always use TanStack Query hooks, never raw fetch

## Adding a New Feature

1. Create `src/features/<feature>/` directory
2. Create subdirectories: `components/` and `hooks/`
3. Create data hook in `hooks/useXxxData.ts` using TanStack Query
4. Create components in `components/`
5. Create page component `<Feature>Page.tsx`
6. Export all from feature `index.ts`
7. Add route in `src/App.tsx` (import from features)
8. Add nav item in `src/components/layout/Sidebar.tsx`
9. Add fetch function in `src/lib/api/queries.ts` if needed
10. Add types in `src/types/index.ts` if needed

## Adding a New Chart

1. Create component in `src/features/<feature>/components/` (if feature-specific)
   OR `src/components/charts/` (if shared)
2. Use Recharts primitives
3. Follow existing patterns for tooltip and styling
4. Export from feature index or `src/components/charts/index.ts`

## Environment Variables

```env
VITE_API_URL=http://localhost:8000
VITE_API_KEY=your-secret-key
VITE_WS_URL=ws://localhost:8000/ws
VITE_WS_ENABLED=true
VITE_ENABLE_REALTIME=true
```

## API Endpoints

| Endpoint                | Description                |
| ----------------------- | -------------------------- |
| `GET /api/trend`        | Event trends               |
| `GET /api/retention`    | N-day retention cohorts    |
| `GET /api/events`       | Distinct event names       |
| `GET /api/raw/events`   | Raw events with pagination |
| `GET /api/raw/sessions` | Session data               |
| `GET /api/paths`        | User path analysis         |
| `GET /api/conversion`   | Conversion funnel          |
| `WS /ws`                | Real-time updates          |
