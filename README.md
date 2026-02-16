# OpenFlow Analytics

A modern Product Analytics Dashboard built with React 18, TypeScript, and a carefully selected stack of modern tools. Features real-time metrics, interactive data tables, and beautiful visualizations.

## Project Overview

OpenFlow Analytics is a "Bare Metal" Product Analytics POC that provides full ownership of your analytics pipeline with zero licensing costs. It offers:

- **Real-time Dashboard** - Live metrics with WebSocket support
- **Interactive Analytics** - Trends, retention cohorts, user paths, and funnels
- **Advanced Data Tables** - Sorting, filtering, pagination, and virtualization
- **Beautiful Charts** - Multiple chart types powered by Recharts
- **Dark Mode** - Full theme support with system preference detection
- **Responsive Design** - Works seamlessly on desktop and mobile

## Tech Stack

| Category | Technology |
|----------|-------------|
| **Framework** | React 18 with TypeScript |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS v4 |
| **State Management** | Zustand (client state), TanStack Query v5 (server state) |
| **Validation** | Zod |
| **Tables** | TanStack Table v8, TanStack Virtual |
| **Charts** | Recharts |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Routing** | React Router v6 |
| **Date Handling** | date-fns |
| **Testing** | Vitest (unit), Playwright (E2E) |

## Project Structure

```
openflow/
├── src/
│   ├── components/           # Shared UI components
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── layout/           # Layout components (Sidebar, Header)
│   │   ├── charts/           # Chart components (Line, Bar, Area, etc.)
│   │   ├── data-table/       # DataTable with sorting, filtering, pagination
│   │   └── virtual-list/     # Virtualized list component
│   ├── features/             # Feature-based modules
│   │   ├── dashboard/        # Dashboard feature
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   ├── events/           # Events feature
│   │   └── analytics/        # Analytics features
│   │       ├── retention/
│   │       ├── paths/
│   │       └── trends/
│   ├── hooks/                # Global custom hooks
│   ├── stores/               # Zustand stores
│   ├── lib/                  # Utilities and core libraries
│   │   ├── api/              # API client and queries
│   │   ├── websocket/        # WebSocket client
│   │   └── schemas/          # Zod validation schemas
│   ├── contexts/             # React contexts
│   ├── pages/                # Route page components
│   ├── types/                # TypeScript type definitions
│   └── test/                 # Test setup and utilities
├── openflow/                 # Python backend (FastAPI + DuckDB)
├── public/                   # Static assets
└── e2e/                      # Playwright E2E tests
```

### Feature-Based Architecture

Each feature is self-contained with its own components, hooks, and logic. This structure:

- Improves code discoverability
- Enables independent feature development
- Simplifies testing and maintenance
- Scales naturally as the application grows

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Python 3.11+ (for backend)
- uv (Python package manager)

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies (optional, for full-stack development)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv
uv pip install -e .
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_API_KEY=your-secret-key

# WebSocket Configuration (optional)
VITE_WS_URL=ws://localhost:8000/ws
VITE_WS_ENABLED=true

# Feature Flags (optional)
VITE_ENABLE_REALTIME=true
```

### Running the Application

```bash
# Start the backend server
uv run serve

# In another terminal, start the frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run test` | Run unit tests with Vitest in watch mode |
| `npm run test:run` | Run unit tests once |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with interactive UI |
| `npm run lint` | Lint TypeScript/TSX files with ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run bundle:analyze` | Visualize bundle composition |

## Features

### Dashboard

- Real-time metrics with live updates
- Key performance indicators (KPIs)
- Quick access to all analytics modules
- Customizable date range filtering

### Analytics Pages

- **Trends**: Event trends with day/week granularity
- **Retention**: N-day retention cohorts visualization
- **Paths**: User journey analysis
- **Conversion**: Funnel analysis

### Data Tables

- Column sorting (ascending/descending)
- Global search filtering
- Column-specific filters
- Pagination with configurable page size
- Row selection and actions
- Virtualized rendering for large datasets

### Charts

- Line charts for time-series data
- Area charts for cumulative metrics
- Bar charts for comparisons
- Donut charts for distributions
- Funnel charts for conversions
- Heatmaps for correlation analysis
- Sparklines for inline metrics

### Dark Mode

- System preference detection
- Manual toggle with persistence
- Smooth transitions between themes

### Responsive Design

- Mobile-first approach
- Collapsible sidebar navigation
- Touch-friendly interactions
- Optimized chart rendering for all screen sizes

## Testing

### Unit Tests (Vitest)

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Generate coverage report
npm run test:coverage
```

Tests are co-located with source files in `__tests__` directories. Testing utilities include:

- `@testing-library/react` for component testing
- `@testing-library/jest-dom` for DOM assertions
- `jsdom` for DOM simulation

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui
```

## WebSocket Integration

The application supports real-time updates via WebSocket connections.

### Configuration

```env
VITE_WS_URL=ws://localhost:8000/ws
VITE_WS_ENABLED=true
VITE_ENABLE_REALTIME=true
```

### Features

- Automatic reconnection with exponential backoff
- Connection status indicators
- Graceful degradation when WebSocket is unavailable
- Real-time metric updates on dashboard

### Usage in Components

```tsx
import { useWebSocket } from '@/hooks/use-websocket';
import { useRealtimeMetrics } from '@/hooks/use-realtime-metrics';

function Dashboard() {
  const { isConnected } = useWebSocket();
  const { metrics, isLoading } = useRealtimeMetrics();
  
  // Component logic
}
```

## Architecture Decisions

### Why Feature-Based Structure?

Features are organized as self-contained modules rather than by file type. Benefits:

1. **Co-location**: Related code stays together
2. **Scalability**: Easy to add/remove features
3. **Team autonomy**: Teams can own entire features
4. **Refactoring**: Changes are localized

### Why TanStack Query for Server State?

TanStack Query (React Query) provides:

1. **Automatic caching** with smart invalidation
2. **Background refetching** for stale data
3. **Deduplication** of identical requests
4. **Optimistic updates** for better UX
5. **DevTools** for debugging

Server state is fundamentally different from client state—it's asynchronous, cached, and needs synchronization. TanStack Query handles these concerns elegantly.

### Why Zustand for Client State?

Zustand offers:

1. **Minimal boilerplate** compared to Redux
2. **TypeScript-first** with excellent inference
3. **No providers** needed (simpler than Context)
4. **Middleware support** for persistence, logging
5. **Small bundle size** (~1KB gzipped)

Client state (theme, sidebar state, filters) doesn't need the complexity of server state management.

## Backend Architecture

```
┌─────────────┐     HTTP/WS     ┌──────────────┐     SQL      ┌─────────────┐
│   React     │ ◄──────────────►│   FastAPI    │ ◄───────────►│   DuckDB    │
│  Frontend   │                 │   + Python   │               │  (embedded) │
└─────────────┘                 └──────────────┘               └─────────────┘
```

### Key Benefits

1. **IP Ownership**: Own the entire query engine—no middleware or black boxes
2. **Zero Cost**: Runs on minimal infrastructure with no licensing fees
3. **Flexibility**: Swap DuckDB for Snowflake/ClickHouse by changing one connection string
4. **Code is Configuration**: Metrics defined in pure SQL
5. **Modular**: Clean architecture with separate API, DB, Services, and Core layers

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info |
| `GET /api/trend` | Event trends (day/week granularity) |
| `GET /api/retention` | N-day retention cohorts |
| `GET /api/events` | List distinct event names |
| `GET /api/raw/events` | Raw events with pagination |
| `GET /api/raw/sessions` | Session data |
| `GET /api/sessions/summary` | Session statistics |
| `GET /api/paths` | User path analysis |
| `GET /api/conversion` | Conversion funnel |
| `WS /ws` | WebSocket for real-time updates |

## Extending the Application

### Adding a New Metric

1. Add SQL view to `openflow/db/views.py`
2. Create API endpoint in `openflow/api/`
3. Add Zod schema in `src/lib/schemas/`
4. Create TanStack Query hook in `src/lib/api/queries.ts`
5. Add visualization component in `src/features/` or `src/components/charts/`

### Adding a New Feature

1. Create directory in `src/features/your-feature/`
2. Add `components/` and `hooks/` subdirectories
3. Create page component in `src/pages/`
4. Add route in `src/App.tsx`
5. Add navigation item in `src/components/layout/Sidebar.tsx`

## Contributing

1. Create a feature branch from `main`
2. Make your changes with appropriate tests
3. Run `npm run lint` and `npm run test:run`
4. Submit a pull request

## License

MIT
