# stratifio-pivot Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `stratifio-pivot` — a standalone open source React project replacing AG Grid Enterprise with TanStack Table-based `<EventsTable>` and `<PivotTable>` components, then migrate `stratifio-oss` to use them.

**Architecture:** Composable components built on TanStack Table v8 + TanStack Virtual v3, styled with Tailwind CSS v4 + CSS variables (identical to stratifio-oss). Each building block (FilterBar, Pagination, ColumnPanel, ZoneBar, PivotToolbar) is independently usable. A Vite demo app shows both components with mock data.

**Tech Stack:** React 18, Vite 6, TypeScript, Tailwind CSS v4, @tanstack/react-table v8, @tanstack/react-virtual v3, lucide-react, date-fns, vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-17-stratifio-pivot-design.md`

---

## Chunk 1: Project scaffold + shared primitives

### Task 1: Initialize the stratifio-pivot project

**Files:**
- Create: `/Users/carlo/my_work/stratifio/stratifio-pivot/package.json`
- Create: `/Users/carlo/my_work/stratifio/stratifio-pivot/vite.config.ts`
- Create: `/Users/carlo/my_work/stratifio/stratifio-pivot/tsconfig.json`
- Create: `/Users/carlo/my_work/stratifio/stratifio-pivot/index.html`
- Create: `/Users/carlo/my_work/stratifio/stratifio-pivot/README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# stratifio-pivot

AG Grid-free pivot and events table components for stratif.io Analytics.
Built with TanStack Table v8, TanStack Virtual v3, and Tailwind CSS v4.

## Setup

```bash
npm install
npm run dev       # demo app at http://localhost:5173
npm run test:run  # run tests
```

## Usage

Copy `src/components/events-table/` or `src/components/pivot-table/` into your project.
See `src/demo/` for usage examples.
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "stratifio-pivot",
  "version": "0.1.0",
  "description": "AG Grid-free pivot and events table components for stratif.io Analytics",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "@tanstack/react-table": "^8.20.5",
    "@tanstack/react-virtual": "^3.13.18",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.469.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.5"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.14",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^28.1.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>stratifio-pivot demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Install dependencies**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-pivot
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-pivot
git init
git add .
git commit -m "chore: initialize stratifio-pivot project"
```

---

### Task 2: CSS + entry point

**Files:**
- Create: `src/index.css`
- Create: `src/main.tsx`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Create `src/index.css`** (identical CSS variables to stratifio-oss)

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
  --font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
}

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  --card: 224 71% 4%;
  --card-foreground: 213 31% 91%;
  --primary: 217 91% 60%;
  --primary-foreground: 224 71% 4%;
  --secondary: 222 47% 11%;
  --secondary-foreground: 213 31% 91%;
  --muted: 223 47% 11%;
  --muted-foreground: 215 20% 65%;
  --accent: 216 34% 17%;
  --accent-foreground: 213 31% 91%;
  --destructive: 0 63% 31%;
  --border: 216 34% 17%;
  --input: 216 34% 17%;
  --ring: 224 76% 48%;
}

@layer base {
  * { border-color: hsl(var(--border)); }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: var(--font-sans);
  }
}

:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--ring));
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: hsl(var(--muted) / 0.3); }
::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.3); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.5); }
```

- [ ] **Step 2: Create `src/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Create `src/main.tsx`** (stub — routes to demo pages)

```tsx
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { EventsDemo } from './demo/EventsDemo'
import { PivotDemo } from './demo/PivotDemo'

function App() {
  const [page, setPage] = useState<'events' | 'pivot'>('events')
  const [dark, setDark] = useState(false)

  const toggle = () => {
    setDark((d) => {
      document.documentElement.classList.toggle('dark', !d)
      return !d
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-4 px-6 py-3 border-b border-border">
        <span className="font-semibold text-sm">stratifio-pivot demo</span>
        <button
          onClick={() => setPage('events')}
          className={`text-sm px-3 py-1 rounded ${page === 'events' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          EventsTable
        </button>
        <button
          onClick={() => setPage('pivot')}
          className={`text-sm px-3 py-1 rounded ${page === 'pivot' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          PivotTable
        </button>
        <button onClick={toggle} className="ml-auto text-sm text-muted-foreground hover:text-foreground">
          {dark ? 'Light' : 'Dark'} mode
        </button>
      </header>
      <main>{page === 'events' ? <EventsDemo /> : <PivotDemo />}</main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 4: Commit**

```bash
git commit -am "chore: add CSS variables, utils, and app entry point"
```

---

### Task 3: Shared UI primitives

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/spinner.tsx`

- [ ] **Step 1: Create `src/components/ui/button.tsx`**

```tsx
import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
          variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
          variant === 'outline' && 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
          variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
          size === 'sm' && 'h-7 px-2 text-xs',
          size === 'md' && 'h-9 px-4 text-sm',
          className,
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
```

- [ ] **Step 2: Create `src/components/ui/badge.tsx`**

```tsx
import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'accent'
}

export function Badge({ className, variant = 'primary', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variant === 'primary' && 'bg-primary/10 text-primary',
        variant === 'accent' && 'bg-accent text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Create `src/components/ui/spinner.tsx`**

```tsx
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin h-4 w-4 text-muted-foreground', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: add Button, Badge, Spinner UI primitives"
```

---

### Task 4: FilterBar + tests

**Files:**
- Create: `src/components/shared/FilterBar.tsx`
- Create: `src/components/shared/__tests__/FilterBar.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/shared/__tests__/FilterBar.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from '../FilterBar'

test('renders filter chips', () => {
  render(
    <FilterBar
      filters={[
        { label: 'event', value: 'page_view', onClear: () => {} },
        { label: 'user', value: 'abc123', onClear: () => {} },
      ]}
    />
  )
  expect(screen.getByText('event: page_view')).toBeInTheDocument()
  expect(screen.getByText('user: abc123')).toBeInTheDocument()
})

test('calls onClear when × clicked', async () => {
  const onClear = vi.fn()
  render(
    <FilterBar filters={[{ label: 'event', value: 'page_view', onClear }]} />
  )
  await userEvent.click(screen.getByLabelText('Clear event filter'))
  expect(onClear).toHaveBeenCalledTimes(1)
})

test('renders nothing when filters array is empty', () => {
  const { container } = render(<FilterBar filters={[]} />)
  expect(container.firstChild).toBeNull()
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-pivot
npm run test:run -- src/components/shared/__tests__/FilterBar.test.tsx
```

Expected: FAIL — `FilterBar` not found.

- [ ] **Step 3: Create `src/components/shared/FilterBar.tsx`**

```tsx
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterEntry {
  label: string
  value: string
  onClear: () => void
  variant?: 'primary' | 'accent'
}

interface FilterBarProps {
  filters: FilterEntry[]
  className?: string
}

export function FilterBar({ filters, className }: FilterBarProps) {
  if (filters.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {filters.map((f) => (
        <span
          key={`${f.label}:${f.value}`}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            f.variant === 'accent'
              ? 'bg-accent text-accent-foreground'
              : 'bg-primary/10 text-primary',
          )}
        >
          {f.label}: {f.value}
          <button
            onClick={f.onClear}
            className="hover:opacity-70"
            aria-label={`Clear ${f.label} filter`}
          >
            <X className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test:run -- src/components/shared/__tests__/FilterBar.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: add FilterBar component with tests"
```

---

### Task 5: Pagination + tests

**Files:**
- Create: `src/components/shared/Pagination.tsx`
- Create: `src/components/shared/__tests__/Pagination.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/shared/__tests__/Pagination.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from '../Pagination'

function setup(overrides = {}) {
  const onPageChange = vi.fn()
  render(
    <Pagination
      page={2}
      totalPages={5}
      from={11}
      to={20}
      total={50}
      onPageChange={onPageChange}
      {...overrides}
    />
  )
  return { onPageChange }
}

test('shows range label', () => {
  setup()
  expect(screen.getByText('11–20 of 50 events')).toBeInTheDocument()
})

test('calls onPageChange with prev page', async () => {
  const { onPageChange } = setup()
  await userEvent.click(screen.getByLabelText('Previous page'))
  expect(onPageChange).toHaveBeenCalledWith(1)
})

test('calls onPageChange with next page', async () => {
  const { onPageChange } = setup()
  await userEvent.click(screen.getByLabelText('Next page'))
  expect(onPageChange).toHaveBeenCalledWith(3)
})

test('first/prev disabled on page 1', () => {
  setup({ page: 1 })
  expect(screen.getByLabelText('First page')).toBeDisabled()
  expect(screen.getByLabelText('Previous page')).toBeDisabled()
})

test('next/last disabled on last page', () => {
  setup({ page: 5 })
  expect(screen.getByLabelText('Next page')).toBeDisabled()
  expect(screen.getByLabelText('Last page')).toBeDisabled()
})

test('shows No events when total is 0', () => {
  setup({ total: 0, from: 0, to: 0 })
  expect(screen.getByText('No events')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test:run -- src/components/shared/__tests__/Pagination.test.tsx
```

- [ ] **Step 3: Create `src/components/shared/Pagination.tsx`**

```tsx
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  from: number
  to: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, from, to, total, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
      <span className="text-xs text-muted-foreground">
        {total === 0
          ? 'No events'
          : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} events`}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onPageChange(1)} disabled={page === 1} aria-label="First page">
          <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <span className="text-xs px-2.5 py-1 rounded border border-border/50 bg-muted/30 tabular-nums min-w-[60px] text-center">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} aria-label="Last page">
          <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test:run -- src/components/shared/__tests__/Pagination.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: add Pagination component with tests"
```

---

## Chunk 2: EventsTable

### Task 6: EventsTable types + ColumnPanel

**Files:**
- Create: `src/components/events-table/types.ts`
- Create: `src/components/events-table/ColumnPanel.tsx`

- [ ] **Step 1: Create `src/components/events-table/types.ts`**

```ts
export interface RawEvent {
  event_id: string
  user_id: string
  event_name: string
  timestamp: string
  properties?: Record<string, unknown>
}

export interface FilterField {
  field: string
  label: string
}

export interface CustomProperty {
  name: string
  path: string
}

export interface EventsTableProps {
  data: RawEvent[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  isFetching?: boolean
  sortField: string
  sortOrder: 'asc' | 'desc'
  onSortChange: (field: string, order: 'asc' | 'desc') => void
  filterFields: FilterField[]
  customProperties: CustomProperty[]
  filterOptions: Record<string, string[]>  // accepted for API compatibility; dim columns use click-to-filter, not a header dropdown
  allEventNames: string[]
  columnFilters: Record<string, string>
  onColumnFilterChange: (field: string, value: string) => void
  onColumnFilterClear: (field: string) => void
  eventNameFilter: string
  onEventNameFilterChange: (v: string) => void
  userIdFilter: string
  onUserIdFilterChange: (v: string) => void
  onPageChange: (page: number) => void
  onUserClick: (userId: string) => void
  connectionId?: string | null
}
```

- [ ] **Step 2: Create `src/components/events-table/ColumnPanel.tsx`**

```tsx
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ColumnEntry {
  id: string
  label: string
  visible: boolean
}

interface ColumnPanelProps {
  columns: ColumnEntry[]
  onToggle: (id: string) => void
  onClose: () => void
}

export function ColumnPanel({ columns, onToggle, onClose }: ColumnPanelProps) {
  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-border bg-background shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Columns</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close column panel">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {columns.map((col) => (
          <label
            key={col.id}
            className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent/50"
          >
            <input
              type="checkbox"
              checked={col.visible}
              onChange={() => onToggle(col.id)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span className={cn(!col.visible && 'text-muted-foreground')}>{col.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: add EventsTable types and ColumnPanel"
```

---

### Task 7: EventsTable main component

**Files:**
- Create: `src/components/events-table/EventsTable.tsx`

- [ ] **Step 1: Create `src/components/events-table/EventsTable.tsx`**

```tsx
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format } from 'date-fns'
import { User, Columns3, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FilterBar } from '@/components/shared/FilterBar'
import { Pagination } from '@/components/shared/Pagination'
import { ColumnPanel } from './ColumnPanel'
import { Spinner } from '@/components/ui/spinner'
import type { EventsTableProps, RawEvent, FilterField, CustomProperty } from './types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseProperties(raw: unknown): Record<string, unknown> {
  if (raw == null) return {}
  if (Array.isArray(raw)) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      return typeof p === 'object' && p !== null ? p : {}
    } catch { return {} }
  }
  return {}
}

function extractFromPath(props: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  const keys = parts[0] === 'properties' ? parts.slice(1) : parts
  let cur: unknown = props
  for (const key of keys) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

interface DimCol { id: string; label: string; getValue: (props: Record<string, unknown>) => unknown }

function buildDimCols(fields: FilterField[], custom: CustomProperty[]): DimCol[] {
  const seen = new Set<string>()
  const STANDARD = new Set(['user_id', 'event_name', 'timestamp', 'session_id'])
  const result: DimCol[] = []
  for (const cp of custom) {
    seen.add(cp.name)
    result.push({ id: cp.name, label: cp.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), getValue: (p) => extractFromPath(p, cp.path) })
  }
  for (const ff of fields) {
    if (!seen.has(ff.field) && !STANDARD.has(ff.field)) {
      seen.add(ff.field)
      result.push({ id: ff.field, label: ff.label, getValue: (p) => p[ff.field] })
    }
  }
  return result
}

function loadColVisibility(key: string): VisibilityState | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null } catch { return null }
}

function saveColVisibility(key: string, state: VisibilityState) {
  try { localStorage.setItem(key, JSON.stringify(state)) } catch {}
}

// ── EventsTable ─────────────────────────────────────────────────────────────

export function EventsTable({
  data, total, page, pageSize, loading, isFetching,
  sortField, sortOrder, onSortChange,
  filterFields, customProperties, allEventNames,
  columnFilters, onColumnFilterChange, onColumnFilterClear,
  eventNameFilter, onEventNameFilterChange,
  userIdFilter, onUserIdFilterChange,
  onPageChange, onUserClick, connectionId,
  filterOptions: _filterOptions, // accepted for API compat; dim cols use click-to-filter, not a header dropdown
}: EventsTableProps) {
  const storageKey = `of_events_colstate_v2_${connectionId ?? 'default'}`
  const [showColumnPanel, setShowColumnPanel] = useState(false)
  const [userIdInput, setUserIdInput] = useState(userIdFilter)
  const [colVisibility, setColVisibility] = useState<VisibilityState>(() => loadColVisibility(storageKey) ?? {})
  const [showEventFilter, setShowEventFilter] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync userIdInput when parent resets it
  useEffect(() => { setUserIdInput(userIdFilter) }, [userIdFilter])

  const dimCols = useMemo(() => buildDimCols(filterFields, customProperties), [filterFields, customProperties])

  const rowData = useMemo(() =>
    data.map((event) => {
      const props = parseProperties(event.properties)
      const row: Record<string, unknown> = { event_id: event.event_id, user_id: event.user_id, event_name: event.event_name, timestamp: event.timestamp }
      for (const col of dimCols) row[col.id] = col.getValue(props)
      return row
    }),
    [data, dimCols]
  )

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => [
    {
      id: 'user_id', accessorKey: 'user_id', header: 'User ID', size: 220, enableSorting: true,
      cell: ({ getValue }) => {
        const v = String(getValue() ?? '')
        return (
          <div className="flex items-center gap-1.5 h-full cursor-pointer" onClick={() => v && onUserClick(v)}>
            <span className="font-mono text-xs">{v}</span>
            <User size={11} className="opacity-40 shrink-0" />
          </div>
        )
      },
    },
    {
      id: 'event_name', accessorKey: 'event_name', header: 'Event Name', size: 180, enableSorting: true,
      cell: ({ getValue }) => {
        const name = String(getValue() ?? '')
        return (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary cursor-pointer"
            onClick={() => onEventNameFilterChange(name)}
          >
            {name}
          </span>
        )
      },
    },
    ...dimCols.map<ColumnDef<Record<string, unknown>>>((col) => ({
      id: col.id, accessorKey: col.id, header: col.label, size: 150, enableSorting: false,
      cell: ({ getValue }) => {
        const v = getValue()
        if (v == null || v === '') return <span className="opacity-30 text-xs">—</span>
        const str = String(v)
        return (
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground cursor-pointer"
            onClick={() => onColumnFilterChange(col.id, str)}
          >
            {str}
          </span>
        )
      },
    })),
    {
      id: 'timestamp', accessorKey: 'timestamp', header: 'Timestamp', size: 210, enableSorting: true,
      cell: ({ getValue }) => {
        const v = getValue() as string
        return <span className="text-xs text-muted-foreground tabular-nums">{v ? format(new Date(v), 'MMM d, yyyy HH:mm:ss') : '—'}</span>
      },
    },
  ], [dimCols, onUserClick, onEventNameFilterChange, onColumnFilterChange])

  const [sorting, setSorting] = useState<SortingState>([{ id: sortField, desc: sortOrder === 'desc' }])

  const table = useReactTable({
    data: rowData,
    columns,
    state: { sorting, columnVisibility: colVisibility },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      if (next.length > 0) onSortChange(next[0].id, next[0].desc ? 'desc' : 'asc')
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(colVisibility) : updater
      setColVisibility(next)
      saveColVisibility(storageKey, next)
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  })

  const ROW_HEIGHT_PX = 40

  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 10,
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const activeFilters = [
    ...(eventNameFilter ? [{ label: 'event', value: eventNameFilter, onClear: () => onEventNameFilterChange('') }] : []),
    ...(userIdFilter ? [{ label: 'user', value: userIdFilter, onClear: () => onUserIdFilterChange(''), variant: 'primary' as const }] : []),
    ...Object.entries(columnFilters).filter(([, v]) => v).map(([field, value]) => ({
      label: field, value, variant: 'accent' as const, onClear: () => onColumnFilterClear(field),
    })),
  ]

  const columnPanelEntries = table.getAllColumns().map((col) => ({
    id: col.id,
    label: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id,
    visible: col.getIsVisible(),
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        {/* User ID filter */}
        <input
          type="text"
          placeholder="Filter by user ID..."
          value={userIdInput}
          onChange={(e) => {
            setUserIdInput(e.target.value)
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => onUserIdFilterChange(e.target.value), 400)
          }}
          className="h-7 text-xs px-2.5 rounded border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-44"
        />
        {/* Event name filter */}
        <div className="relative">
          <button
            onClick={() => setShowEventFilter((s) => !s)}
            className="h-7 text-xs px-2.5 rounded border border-border bg-background hover:bg-accent"
          >
            {eventNameFilter || 'All events'}
          </button>
          {showEventFilter && (
            <div className="absolute top-full left-0 mt-1 z-20 w-56 max-h-60 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
              <button
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50"
                onClick={() => { onEventNameFilterChange(''); setShowEventFilter(false) }}
              >
                All events
              </button>
              {allEventNames.map((name) => (
                <button
                  key={name}
                  className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50', eventNameFilter === name && 'bg-primary/10 text-primary')}
                  onClick={() => { onEventNameFilterChange(name); setShowEventFilter(false) }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto relative">
          <button
            onClick={() => setShowColumnPanel((s) => !s)}
            className="h-7 text-xs px-2.5 rounded border border-border bg-background hover:bg-accent flex items-center gap-1.5"
            aria-label="Show/hide columns"
          >
            <Columns3 size={13} />
            Columns
          </button>
          {showColumnPanel && (
            <ColumnPanel
              columns={columnPanelEntries}
              onToggle={(id) => table.getColumn(id)?.toggleVisibility()}
              onClose={() => setShowColumnPanel(false)}
            />
          )}
        </div>
        {isFetching && <Spinner className="h-3.5 w-3.5" />}
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="px-4 pt-2">
          <FilterBar filters={activeFilters} />
        </div>
      )}

      {/* Table */}
      <div ref={parentRef} className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <table className="w-full border-collapse text-sm" style={{ opacity: isFetching ? 0.6 : 1 }}>
            <thead className="sticky top-0 z-10 bg-background border-b border-border">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sortDir = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={cn('px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap', canSort && 'cursor-pointer select-none hover:text-foreground')}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <span className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (sortDir === 'desc' ? <ArrowDown size={11} /> : sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowUpDown size={11} className="opacity-30" />)}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const row = rows[vi.index]
                return (
                  <tr
                    key={row.id}
                    style={{ position: 'absolute', top: vi.start, left: 0, width: '100%', height: ROW_HEIGHT_PX }}
                    className="border-b border-border/50 hover:bg-accent/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={{ width: cell.column.getSize() }} className="px-3 overflow-hidden text-ellipsis whitespace-nowrap align-middle h-10">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={onPageChange} />
    </div>
  )
}
```

- [ ] **Step 2: Write EventsTable behavioral tests**

Create `src/components/events-table/__tests__/EventsTable.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { EventsTable } from '../EventsTable'
import type { RawEvent } from '../types'

const EVENTS: RawEvent[] = [
  { event_id: '1', user_id: 'user_001', event_name: 'page_view', timestamp: '2026-01-01T10:00:00Z', properties: {} },
  { event_id: '2', user_id: 'user_002', event_name: 'click', timestamp: '2026-01-01T11:00:00Z', properties: {} },
]

const BASE_PROPS = {
  data: EVENTS,
  total: 2,
  page: 1,
  pageSize: 50,
  loading: false,
  sortField: 'timestamp',
  sortOrder: 'desc' as const,
  onSortChange: vi.fn(),
  filterFields: [],
  customProperties: [],
  filterOptions: {},
  allEventNames: ['page_view', 'click'],
  columnFilters: {},
  onColumnFilterChange: vi.fn(),
  onColumnFilterClear: vi.fn(),
  eventNameFilter: '',
  onEventNameFilterChange: vi.fn(),
  userIdFilter: '',
  onUserIdFilterChange: vi.fn(),
  onPageChange: vi.fn(),
  onUserClick: vi.fn(),
  connectionId: 'test',
}

test('renders user_id and event_name cells', () => {
  render(<EventsTable {...BASE_PROPS} />)
  expect(screen.getByText('user_001')).toBeInTheDocument()
  expect(screen.getAllByText('page_view')[0]).toBeInTheDocument()
})

test('calls onUserClick when user_id cell clicked', () => {
  render(<EventsTable {...BASE_PROPS} />)
  fireEvent.click(screen.getByText('user_001'))
  expect(BASE_PROPS.onUserClick).toHaveBeenCalledWith('user_001')
})

test('shows spinner when loading=true', () => {
  render(<EventsTable {...BASE_PROPS} loading={true} />)
  expect(document.querySelector('svg.animate-spin')).toBeInTheDocument()
})

test('applies reduced opacity when isFetching=true', () => {
  render(<EventsTable {...BASE_PROPS} isFetching={true} />)
  const table = document.querySelector('table')
  expect(table).toHaveStyle({ opacity: '0.6' })
})

test('shows filter chip for active eventNameFilter', () => {
  render(<EventsTable {...BASE_PROPS} eventNameFilter="page_view" />)
  expect(screen.getByText('event: page_view')).toBeInTheDocument()
})

test('calls onEventNameFilterChange with empty string when event filter chip cleared', () => {
  render(<EventsTable {...BASE_PROPS} eventNameFilter="page_view" />)
  fireEvent.click(screen.getByLabelText('Clear event filter'))
  expect(BASE_PROPS.onEventNameFilterChange).toHaveBeenCalledWith('')
})
```

- [ ] **Step 3: Run tests — expect PASS**

```bash
npm run test:run -- src/components/events-table/__tests__/EventsTable.test.tsx
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-pivot
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/events-table/EventsTable.tsx src/components/events-table/__tests__/EventsTable.test.tsx
git commit -m "feat: add EventsTable component with behavioral tests"
```

---

### Task 8: EventsDemo

**Files:**
- Create: `src/demo/EventsDemo.tsx`

- [ ] **Step 1: Create `src/demo/EventsDemo.tsx`**

```tsx
import { useState, useMemo } from 'react'
import { EventsTable } from '@/components/events-table/EventsTable'
import type { RawEvent } from '@/components/events-table/types'

const EVENT_NAMES = ['page_view', 'button_click', 'form_submit', 'checkout', 'signup', 'login', 'logout', 'search']
const USER_IDS = Array.from({ length: 20 }, (_, i) => `user_${String(i + 1).padStart(3, '0')}`)
const PLANS = ['free', 'pro', 'enterprise']
const COUNTRIES = ['US', 'UK', 'DE', 'FR', 'JP', 'BR']

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

const ALL_EVENTS: RawEvent[] = Array.from({ length: 500 }, (_, i) => ({
  event_id: `evt_${i + 1}`,
  user_id: randomItem(USER_IDS),
  event_name: randomItem(EVENT_NAMES),
  timestamp: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
  properties: { plan: randomItem(PLANS), country: randomItem(COUNTRIES), page: `/page-${Math.floor(Math.random() * 10)}` },
}))

const PAGE_SIZE = 50
const FILTER_FIELDS = [
  { field: 'plan', label: 'Plan' },
  { field: 'country', label: 'Country' },
]
const FILTER_OPTIONS = {
  plan: PLANS,
  country: COUNTRIES,
}

export function EventsDemo() {
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [eventNameFilter, setEventNameFilter] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [isFetching, setIsFetching] = useState(false)

  // Simulate a brief isFetching flash on filter/sort/page changes
  const simulateFetch = (fn: () => void) => {
    setIsFetching(true)
    fn()
    setTimeout(() => setIsFetching(false), 400)
  }

  const filtered = useMemo(() => {
    let rows = [...ALL_EVENTS]
    if (eventNameFilter) rows = rows.filter((e) => e.event_name === eventNameFilter)
    if (userIdFilter) rows = rows.filter((e) => e.user_id.includes(userIdFilter))
    Object.entries(columnFilters).forEach(([field, value]) => {
      if (value) rows = rows.filter((e) => {
        const props = e.properties as Record<string, unknown>
        return String(props?.[field] ?? '') === value
      })
    })
    rows.sort((a, b) => {
      const av = a[sortField as keyof RawEvent] as string
      const bv = b[sortField as keyof RawEvent] as string
      return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return rows
  }, [eventNameFilter, userIdFilter, columnFilters, sortField, sortOrder])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ height: 'calc(100vh - 52px)' }} className="flex flex-col">
      <EventsTable
        data={paginated}
        total={filtered.length}
        page={page}
        pageSize={PAGE_SIZE}
        loading={false}
        sortField={sortField}
        sortOrder={sortOrder}
        isFetching={isFetching}
        onSortChange={(f, o) => simulateFetch(() => { setSortField(f); setSortOrder(o); setPage(1) })}
        filterFields={FILTER_FIELDS}
        customProperties={[]}
        filterOptions={FILTER_OPTIONS}
        allEventNames={EVENT_NAMES}
        columnFilters={columnFilters}
        onColumnFilterChange={(f, v) => { setColumnFilters((p) => ({ ...p, [f]: v })); setPage(1) }}
        onColumnFilterClear={(f) => { setColumnFilters((p) => { const n = { ...p }; delete n[f]; return n }) }}
        eventNameFilter={eventNameFilter}
        onEventNameFilterChange={(v) => { setEventNameFilter(v); setPage(1) }}
        userIdFilter={userIdFilter}
        onUserIdFilterChange={(v) => { setUserIdFilter(v); setPage(1) }}
        onPageChange={setPage}
        onUserClick={(uid) => alert(`Navigate to user: ${uid}`)}
        connectionId="demo"
      />
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and verify EventsTable renders**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-pivot
npm run dev
```

Open http://localhost:5173. Click "EventsTable" tab. Verify:
- Table renders with data
- Sort arrows on User ID / Event Name / Timestamp headers work
- Event name dropdown filter works
- User ID text filter works
- Column panel shows dim columns
- Filter chips appear and clear correctly
- Pagination works
- Dark mode toggle works

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: add EventsDemo with mock data"
```

---

## Chunk 3: PivotTable

### Task 9: PivotTable types + helpers

**Files:**
- Create: `src/components/pivot-table/types.ts`
- Create: `src/components/pivot-table/csvExport.ts`
- Create: `src/components/pivot-table/__tests__/csvExport.test.ts`

- [ ] **Step 1: Write failing test for CSV export**

```ts
// src/components/pivot-table/__tests__/csvExport.test.ts
import { rowsToCsv } from '../csvExport'

test('converts rows to CSV string', () => {
  const csv = rowsToCsv(
    ['name', 'count'],
    [{ name: 'page_view', count: 42 }, { name: 'click', count: 10 }]
  )
  expect(csv).toBe('name,count\npage_view,42\nclick,10')
})

test('wraps values with commas in quotes', () => {
  const csv = rowsToCsv(['label'], [{ label: 'hello, world' }])
  expect(csv).toBe('label\n"hello, world"')
})

test('wraps values with quotes by escaping them', () => {
  const csv = rowsToCsv(['label'], [{ label: 'say "hi"' }])
  expect(csv).toBe('label\n"say ""hi"""')
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test:run -- src/components/pivot-table/__tests__/csvExport.test.ts
```

- [ ] **Step 3: Create `src/components/pivot-table/csvExport.ts`**

```ts
function escapeCell(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(','))
  }
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test:run -- src/components/pivot-table/__tests__/csvExport.test.ts
```

- [ ] **Step 5: Create `src/components/pivot-table/types.ts`**

```ts
export interface ZoneCol {
  colId: string
  label: string
  aggFunc?: string
  allowedAggFuncs?: string[]
}

export interface LeafMeta {
  colId: string
  label: string
  enableRowGroup: boolean
  enablePivot: boolean
  enableValue: boolean
  allowedAggFuncs?: string[]
}

export interface FilterEntry {
  field: string
  fieldLabel: string
  value: string
}

export interface PivotColDefsResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columnDefs: any[]
}

export interface PivotRowsRequest {
  startDate?: string
  endDate?: string
  activeFilters: Record<string, string>
  activeConnectionId?: string | null
  pivotFilters: FilterEntry[]
  rowGroups: ZoneCol[]
  pivotCols: ZoneCol[]
  valueCols: ZoneCol[]
}

export interface PivotRowsResponse {
  rows: Record<string, unknown>[]
  columnDefs?: Record<string, unknown>[]
}

export interface PivotTableProps {
  colDefsData: PivotColDefsResponse | undefined
  colDefsLoading: boolean
  startDate?: string
  endDate?: string
  activeFilters: Record<string, string>
  activeConnectionId?: string | null
  fetchRows: (params: PivotRowsRequest) => Promise<PivotRowsResponse>
  fetchFilterValues: (field: string) => Promise<string[]>
}
```

- [ ] **Step 6: Commit**

```bash
git commit -am "feat: add PivotTable types and CSV export utility with tests"
```

---

### Task 10: ZoneBar + PivotToolbar

**Files:**
- Create: `src/components/pivot-table/ZoneBar.tsx`
- Create: `src/components/pivot-table/PivotToolbar.tsx`

- [ ] **Step 1: Create `src/components/pivot-table/ZoneBar.tsx`**

The ZoneBar renders three drop zones (Rows / Columns / Values) and an available columns picker above them. Users drag columns from the picker into zones. Value zone pills show a clickable agg func badge that cycles through allowed funcs.

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ZoneCol, LeafMeta } from './types'

const DEFAULT_AGG_CYCLE = ['sum', 'count', 'avg', 'min', 'max', 'countDistinct']
const AGG_LABELS: Record<string, string> = { sum: 'Σ', count: 'n', avg: 'avg', min: 'min', max: 'max', countDistinct: '#' }

interface ZoneBarProps {
  leafCols: LeafMeta[]
  rowGroups: ZoneCol[]
  pivotCols: ZoneCol[]
  valueCols: ZoneCol[]
  onRowGroupsChange: (cols: ZoneCol[]) => void
  onPivotColsChange: (cols: ZoneCol[]) => void
  onValueColsChange: (cols: ZoneCol[]) => void
}

type ZoneName = 'rowGroups' | 'pivotCols' | 'valueCols'

export function ZoneBar({ leafCols, rowGroups, pivotCols, valueCols, onRowGroupsChange, onPivotColsChange, onValueColsChange }: ZoneBarProps) {
  const [dragging, setDragging] = useState<{ colId: string; from: ZoneName | 'picker' } | null>(null)

  const usedIds = new Set([...rowGroups, ...pivotCols, ...valueCols].map((c) => c.colId))
  const available = leafCols.filter((c) => !usedIds.has(c.colId))

  function getZone(name: ZoneName) {
    if (name === 'rowGroups') return { cols: rowGroups, setter: onRowGroupsChange, canAdd: (m: LeafMeta) => m.enableRowGroup }
    if (name === 'pivotCols') return { cols: pivotCols, setter: onPivotColsChange, canAdd: (m: LeafMeta) => m.enablePivot }
    return { cols: valueCols, setter: onValueColsChange, canAdd: (m: LeafMeta) => m.enableValue }
  }

  function removeFromZone(name: ZoneName, colId: string) {
    const { cols, setter } = getZone(name)
    setter(cols.filter((c) => c.colId !== colId))
  }

  function addToZone(name: ZoneName, meta: LeafMeta) {
    const { cols, setter, canAdd } = getZone(name)
    if (!canAdd(meta)) return
    if (cols.some((c) => c.colId === meta.colId)) return  // guard against duplicates
    setter([...cols, { colId: meta.colId, label: meta.label, aggFunc: meta.allowedAggFuncs?.[0] ?? 'sum', allowedAggFuncs: meta.allowedAggFuncs }])
  }

  function handleDrop(e: React.DragEvent, targetZone: ZoneName) {
    e.preventDefault()
    if (!dragging) return
    const meta = leafCols.find((c) => c.colId === dragging.colId)
    if (!meta) return
    // Remove from source zone if dragging from a zone
    if (dragging.from !== 'picker') removeFromZone(dragging.from, dragging.colId)
    addToZone(targetZone, meta)
    setDragging(null)
  }

  function cycleAggFunc(colId: string) {
    const col = valueCols.find((c) => c.colId === colId)
    if (!col) return
    const cycle = col.allowedAggFuncs ?? DEFAULT_AGG_CYCLE
    const idx = cycle.indexOf(col.aggFunc ?? cycle[0])
    const next = cycle[(idx + 1) % cycle.length]
    onValueColsChange(valueCols.map((c) => c.colId === colId ? { ...c, aggFunc: next } : c))
  }

  return (
    <div className="border-b border-border bg-muted/20 px-4 py-2 space-y-2">
      {/* Available columns */}
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-1">Available:</span>
          {available.map((col) => (
            <span
              key={col.colId}
              draggable
              onDragStart={() => setDragging({ colId: col.colId, from: 'picker' })}
              className="text-xs px-2 py-0.5 rounded border border-border bg-background cursor-grab active:cursor-grabbing hover:bg-accent/50"
            >
              {col.label}
            </span>
          ))}
        </div>
      )}
      {/* Drop zones */}
      <div className="flex gap-3">
        {(['rowGroups', 'pivotCols', 'valueCols'] as ZoneName[]).map((zoneName) => {
          const labels: Record<ZoneName, string> = { rowGroups: 'Rows', pivotCols: 'Columns', valueCols: 'Values' }
          const { cols } = getZone(zoneName)
          return (
            <div
              key={zoneName}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, zoneName)}
              className={cn(
                'flex-1 min-h-[36px] rounded border border-dashed border-border px-2 py-1 flex flex-wrap gap-1 items-center',
                'transition-colors',
                dragging && 'border-primary/40 bg-primary/5',
              )}
            >
              <span className="text-xs text-muted-foreground mr-1 shrink-0">{labels[zoneName]}:</span>
              {cols.map((col) => (
                <span
                  key={col.colId}
                  draggable
                  onDragStart={() => setDragging({ colId: col.colId, from: zoneName })}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary cursor-grab"
                >
                  {col.label}
                  {zoneName === 'valueCols' && col.aggFunc && (
                    <button
                      onClick={(e) => { e.stopPropagation(); cycleAggFunc(col.colId) }}
                      className="ml-0.5 px-1 rounded text-[10px] bg-primary/20 hover:bg-primary/30"
                      title="Click to cycle agg function"
                    >
                      {AGG_LABELS[col.aggFunc] ?? col.aggFunc}
                    </button>
                  )}
                  <button
                    onClick={() => removeFromZone(zoneName, col.colId)}
                    className="hover:opacity-70"
                    aria-label={`Remove ${col.label}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {cols.length === 0 && (
                <span className="text-xs text-muted-foreground/50 italic">drag here</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/pivot-table/PivotToolbar.tsx`**

```tsx
import { RotateCcw, Download, Plus, Sigma } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface PivotToolbarProps {
  isQuerying: boolean
  onReset: () => void
  onExportCsv: () => void
  onAddFilter: () => void
  onAddMeasure: () => void
}

export function PivotToolbar({ isQuerying, onReset, onExportCsv, onAddFilter, onAddMeasure }: PivotToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
      <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
        <RotateCcw size={13} />
        Reset
      </Button>
      <Button variant="outline" size="sm" onClick={onExportCsv} className="gap-1.5">
        <Download size={13} />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={onAddFilter} className="gap-1.5">
        <Plus size={13} />
        Filter
      </Button>
      <Button variant="outline" size="sm" onClick={onAddMeasure} className="gap-1.5">
        <Sigma size={13} />
        Measure
      </Button>
      {isQuerying && <Spinner className="ml-2" />}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: add ZoneBar and PivotToolbar components"
```

---

### Task 11: PivotTable main component

**Files:**
- Create: `src/components/pivot-table/PivotTable.tsx`

- [ ] **Step 1: Create `src/components/pivot-table/PivotTable.tsx`**

```tsx
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { FilterBar } from '@/components/shared/FilterBar'
import { ZoneBar } from './ZoneBar'
import { PivotToolbar } from './PivotToolbar'
import { Spinner } from '@/components/ui/spinner'
import { rowsToCsv, downloadCsv } from './csvExport'
import type { PivotTableProps, ZoneCol, LeafMeta, FilterEntry, PivotRowsResponse } from './types'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function formatDimValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (field === 'ts_year') return String(value)
  if (field === 'ts_quarter') return `Q${value}`
  if (field === 'ts_month') {
    try { const d = new Date(String(value)); return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}` } catch { return String(value) }
  }
  if (field === 'ts_week') {
    try {
      const d = new Date(String(value))
      const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
      const w = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getUTCDay() + 1) / 7)
      return `W${w} ${d.getUTCFullYear()}`
    } catch { return String(value) }
  }
  if (field === 'ts_date') {
    try {
      const d = new Date(String(value))
      return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    } catch { return String(value) }
  }
  if (field === 'ts_hour') return `${String(value).padStart(2, '0')}:00`
  if (field === 'day_of_week' && typeof value === 'number') return DAY_NAMES[value] ?? String(value)
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenColDefs(cols: any[]): LeafMeta[] {
  const result: LeafMeta[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (arr: any[]) => arr.forEach((c) => {
    if (c.children) walk(c.children)
    else if (c.field) result.push({ colId: c.field, label: c.headerName ?? c.field, enableRowGroup: !!c.enableRowGroup, enablePivot: !!c.enablePivot, enableValue: !!c.enableValue, allowedAggFuncs: c.allowedAggFuncs })
  })
  walk(cols)
  return result
}

// ── AddFilterDialog (inline) ─────────────────────────────────────────────────

interface AddFilterDialogProps {
  leafCols: LeafMeta[]
  fetchFilterValues: (field: string) => Promise<string[]>
  onAdd: (entry: FilterEntry) => void
  onClose: () => void
}

function AddFilterDialog({ leafCols, fetchFilterValues, onAdd, onClose }: AddFilterDialogProps) {
  const [field, setField] = useState(leafCols[0]?.colId ?? '')
  const [values, setValues] = useState<string[]>([])
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!field) return
    fetchFilterValues(field).then((v) => { setValues(v); setValue(v[0] ?? '') })
  }, [field, fetchFilterValues])

  const meta = leafCols.find((c) => c.colId === field)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-background border border-border rounded-lg shadow-xl p-4 w-72 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold">Add filter</p>
        <select value={field} onChange={(e) => setField(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1 bg-background">
          {leafCols.map((c) => <option key={c.colId} value={c.colId}>{c.label}</option>)}
        </select>
        <select value={value} onChange={(e) => setValue(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1 bg-background">
          {values.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={() => { onAdd({ field, fieldLabel: meta?.label ?? field, value }); onClose() }}
            className="text-sm px-3 py-1 rounded bg-primary text-primary-foreground"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PivotTable ───────────────────────────────────────────────────────────────

export function PivotTable({ colDefsData, colDefsLoading, startDate, endDate, activeFilters, activeConnectionId, fetchRows, fetchFilterValues }: PivotTableProps) {
  const [rowGroups, setRowGroups] = useState<ZoneCol[]>([])
  const [pivotCols, setPivotCols] = useState<ZoneCol[]>([])
  const [valueCols, setValueCols] = useState<ZoneCol[]>([])
  const [pivotFilters, setPivotFilters] = useState<FilterEntry[]>([])
  const [isQuerying, setIsQuerying] = useState(false)
  const [result, setResult] = useState<PivotRowsResponse>({ rows: [] })
  const [showAddFilter, setShowAddFilter] = useState(false)
  const fetchIdRef = useRef(0)

  const leafCols = useMemo(() => flattenColDefs(colDefsData?.columnDefs ?? []), [colDefsData])

  const doFetch = useCallback(async (
    rg: ZoneCol[], pc: ZoneCol[], vc: ZoneCol[], pf: FilterEntry[]
  ) => {
    if (vc.length === 0 && rg.length === 0) { setResult({ rows: [] }); return }
    const id = ++fetchIdRef.current
    setIsQuerying(true)
    try {
      const res = await fetchRows({ startDate, endDate, activeFilters, activeConnectionId, pivotFilters: pf, rowGroups: rg, pivotCols: pc, valueCols: vc })
      if (fetchIdRef.current === id) setResult(res)
    } finally {
      if (fetchIdRef.current === id) setIsQuerying(false)
    }
  }, [fetchRows, startDate, endDate, activeFilters, activeConnectionId])

  // Refetch when zones or filters change
  useEffect(() => { doFetch(rowGroups, pivotCols, valueCols, pivotFilters) }, [rowGroups, pivotCols, valueCols, pivotFilters, doFetch])

  const handleReset = () => {
    setRowGroups([]); setPivotCols([]); setValueCols([]); setPivotFilters([])
  }

  // Build TanStack column defs from result
  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (result.rows.length === 0 && rowGroups.length === 0) return []
    const keys = result.columnDefs
      ? result.columnDefs.map((c: Record<string, unknown>) => ({ id: String(c.field ?? c.colId), label: String(c.headerName ?? c.field ?? c.colId) }))
      : Object.keys(result.rows[0] ?? {}).map((k) => ({ id: k, label: k }))
    return keys.map(({ id, label }) => ({
      id,
      accessorKey: id,
      header: label,
      cell: ({ getValue, column }) => (
        <span className="text-xs tabular-nums">{formatDimValue(column.id, getValue())}</span>
      ),
    }))
  }, [result, rowGroups.length])

  const table = useReactTable({
    data: result.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleExportCsv = () => {
    const headers = table.getVisibleLeafColumns().map((c) => c.id)
    const rows = table.getRowModel().rows.map((r) =>
      Object.fromEntries(r.getVisibleCells().map((cell) => [cell.column.id, cell.getValue()]))
    )
    downloadCsv('pivot-export.csv', rowsToCsv(headers, rows))
  }

  const filterBarEntries = pivotFilters.map((f) => ({
    label: f.fieldLabel,
    value: f.value,
    onClear: () => setPivotFilters((prev) => prev.filter((pf) => pf.field !== f.field)),
  }))

  if (colDefsLoading) {
    return <div className="flex items-center justify-center h-32"><Spinner className="h-5 w-5" /></div>
  }

  return (
    <div className="flex flex-col h-full">
      <PivotToolbar
        isQuerying={isQuerying}
        onReset={handleReset}
        onExportCsv={handleExportCsv}
        onAddFilter={() => setShowAddFilter(true)}
        onAddMeasure={() => {
          // v1 known limitation: no dedicated measure-picker UI.
          // Measures are added by dragging columns with enableValue=true into the Values zone.
          // The "Measure" button is a no-op placeholder for future implementation.
        }}
      />

      <ZoneBar
        leafCols={leafCols}
        rowGroups={rowGroups}
        pivotCols={pivotCols}
        valueCols={valueCols}
        onRowGroupsChange={setRowGroups}
        onPivotColsChange={setPivotCols}
        onValueColsChange={setValueCols}
      />

      {filterBarEntries.length > 0 && (
        <div className="px-4 py-2 border-b border-border">
          <FilterBar filters={filterBarEntries} />
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        {result.rows.length === 0 && !isQuerying ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            {rowGroups.length === 0 && valueCols.length === 0
              ? 'Drag columns into the Rows and Values zones to build a pivot table.'
              : 'No data for the current selection.'}
          </div>
        ) : (
          <table className={cn('w-full border-collapse text-sm', isQuerying && 'opacity-60')}>
            <thead className="sticky top-0 bg-background border-b border-border">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-accent/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddFilter && (
        <AddFilterDialog
          leafCols={leafCols}
          fetchFilterValues={fetchFilterValues}
          onAdd={(entry) => setPivotFilters((prev) => [...prev.filter((f) => f.field !== entry.field), entry])}
          onClose={() => setShowAddFilter(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: add PivotTable component"
```

---

### Task 12: PivotDemo

**Files:**
- Create: `src/demo/PivotDemo.tsx`

- [ ] **Step 1: Create `src/demo/PivotDemo.tsx`**

```tsx
import { PivotTable } from '@/components/pivot-table/PivotTable'
import type { PivotColDefsResponse, PivotRowsRequest, PivotRowsResponse } from '@/components/pivot-table/types'

const COL_DEFS: PivotColDefsResponse = {
  columnDefs: [
    {
      headerName: 'Time',
      children: [
        { field: 'ts_date', headerName: 'Date', enableRowGroup: true, enablePivot: true, enableValue: false },
        { field: 'ts_month', headerName: 'Month', enableRowGroup: true, enablePivot: true, enableValue: false },
      ],
    },
    {
      headerName: 'Dimensions',
      children: [
        { field: 'event_name', headerName: 'Event', enableRowGroup: true, enablePivot: true, enableValue: false },
        { field: 'plan', headerName: 'Plan', enableRowGroup: true, enablePivot: true, enableValue: false },
        { field: 'country', headerName: 'Country', enableRowGroup: true, enablePivot: true, enableValue: false },
      ],
    },
    {
      headerName: 'Measures',
      children: [
        { field: 'event_count', headerName: 'Event Count', enableRowGroup: false, enablePivot: false, enableValue: true, allowedAggFuncs: ['sum', 'count', 'avg'] },
        { field: 'user_count', headerName: 'Unique Users', enableRowGroup: false, enablePivot: false, enableValue: true, allowedAggFuncs: ['countDistinct', 'count'] },
      ],
    },
  ],
}

const MOCK_DATA: Record<string, Record<string, unknown>[]> = {
  'event_name+event_count': [
    { event_name: 'page_view', event_count: 1240 },
    { event_name: 'button_click', event_count: 830 },
    { event_name: 'form_submit', event_count: 412 },
    { event_name: 'checkout', event_count: 198 },
    { event_name: 'signup', event_count: 95 },
  ],
  'plan+event_count': [
    { plan: 'free', event_count: 2100 },
    { plan: 'pro', event_count: 980 },
    { plan: 'enterprise', event_count: 320 },
  ],
  'country+event_count': [
    { country: 'US', event_count: 1450 },
    { country: 'UK', event_count: 620 },
    { country: 'DE', event_count: 480 },
    { country: 'FR', event_count: 310 },
    { country: 'JP', event_count: 290 },
    { country: 'BR', event_count: 250 },
  ],
}

async function mockFetchRows(params: PivotRowsRequest): Promise<PivotRowsResponse> {
  await new Promise((r) => setTimeout(r, 300))
  const key = `${params.rowGroups[0]?.colId ?? ''}+${params.valueCols[0]?.colId ?? ''}`
  const rows = MOCK_DATA[key] ?? [{ info: 'No mock data for this combination. Try event_name + event_count or plan + event_count.' }]
  return { rows }
}

async function mockFetchFilterValues(field: string): Promise<string[]> {
  const values: Record<string, string[]> = {
    event_name: ['page_view', 'button_click', 'form_submit', 'checkout', 'signup'],
    plan: ['free', 'pro', 'enterprise'],
    country: ['US', 'UK', 'DE', 'FR', 'JP', 'BR'],
  }
  return values[field] ?? []
}

export function PivotDemo() {
  return (
    <div style={{ height: 'calc(100vh - 52px)' }} className="flex flex-col">
      <PivotTable
        colDefsData={COL_DEFS}
        colDefsLoading={false}
        startDate="2026-01-01"
        endDate="2026-03-17"
        activeFilters={{}}
        activeConnectionId="demo"
        fetchRows={mockFetchRows}
        fetchFilterValues={mockFetchFilterValues}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify in dev server**

```bash
npm run dev
```

Open http://localhost:5173. Click "PivotTable" tab. Verify:
- Available columns shown (Date, Month, Event, Plan, Country, Event Count, Unique Users)
- Drag "Event" to Rows zone → drag "Event Count" to Values → table shows data after ~300ms
- Agg func badge on value pill cycles through allowed funcs on click
- "Add Filter" opens dialog with field/value dropdowns
- Filter chip appears after adding, clears on ×
- CSV export downloads a file
- Reset clears all zones
- Dark mode works

- [ ] **Step 3: Run all tests**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: add PivotDemo with mock data — stratifio-pivot complete"
```

---

## Chunk 4: Migrate stratifio-oss

### Task 13: Migrate EventsTable in stratifio-oss

**Files:**
- Copy: `stratifio-pivot/src/components/shared/` → `stratifio-oss/frontend/components/shared/`
- Copy: `stratifio-pivot/src/components/ui/button.tsx` → `stratifio-oss/frontend/components/ui/` (skip if Button already exists)
- Copy: `stratifio-pivot/src/components/ui/spinner.tsx` → `stratifio-oss/frontend/components/ui/spinner.tsx`
- Copy: `stratifio-pivot/src/components/events-table/` → `stratifio-oss/frontend/features/events/components/events-table/`
- Modify: the file that currently imports `EventsTable` from `ag-grid-react` path

- [ ] **Step 1: Find the parent component that renders EventsTable in stratifio-oss**

```bash
grep -r "EventsTable" /Users/carlo/my_work/stratifio/stratifio-oss/frontend --include="*.tsx" -l
```

Note the file(s) found — these need their import updated.

- [ ] **Step 2: Copy shared components**

```bash
cp -r /Users/carlo/my_work/stratifio/stratifio-pivot/src/components/shared /Users/carlo/my_work/stratifio/stratifio-oss/frontend/components/shared
cp /Users/carlo/my_work/stratifio/stratifio-pivot/src/components/ui/spinner.tsx /Users/carlo/my_work/stratifio/stratifio-oss/frontend/components/ui/spinner.tsx
```

- [ ] **Step 3: Copy events-table components**

```bash
cp -r /Users/carlo/my_work/stratifio/stratifio-pivot/src/components/events-table /Users/carlo/my_work/stratifio/stratifio-oss/frontend/features/events/components/events-table
```

- [ ] **Step 4: Update import in parent component**

In the file(s) found in Step 1, change:
```tsx
// OLD
import { EventsTable } from './EventsTable'  // or wherever it was imported from
```
to:
```tsx
// NEW
import { EventsTable } from './events-table/EventsTable'
```

The props are identical — no other changes needed.

- [ ] **Step 5: Verify build**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss
npm run build
```

Expected: no TypeScript errors related to EventsTable.

- [ ] **Step 6: Commit**

```bash
git commit -am "feat: replace ag-grid EventsTable with stratifio-pivot component"
```

---

### Task 14: Migrate PivotTable in stratifio-oss

**Files:**
- Copy: `stratifio-pivot/src/components/pivot-table/` → `stratifio-oss/frontend/features/analytics/pivot/components/`
- Modify: `stratifio-oss/frontend/features/analytics/pivot/NewPivotPage.tsx`

- [ ] **Step 1: Copy pivot-table components**

```bash
cp -r /Users/carlo/my_work/stratifio/stratifio-pivot/src/components/pivot-table /Users/carlo/my_work/stratifio/stratifio-oss/frontend/features/analytics/pivot/components
```

- [ ] **Step 2: Refactor `NewPivotPage.tsx`**

Replace the AG Grid `<AgGridReact>` usage with the new `<PivotTable>`. The page keeps all Zustand reads and TanStack Query calls. Add the `fetchRows` and `fetchFilterValues` wrappers. Remove the `gridApiRef`, `syncFromApi`, `handleGridReady` and related AG Grid callbacks.

The new `NewPivotPage.tsx` structure:

```tsx
// Keep these imports:
import { useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAppStore } from '@/stores'
import { fetchPivotGridColDefs, fetchPivotGridRows, fetchPivotGridFilterValues, fetchFilterConfig } from '@/lib/api'
import { PageTransition } from '@/components/layout/PageTransition'
import { Card, CardContent } from '@/components/ui/card'
import { PivotTable } from './components/PivotTable'
import type { PivotRowsRequest } from './components/types'

// Remove ALL ag-grid imports
// Remove: AgGridReact, AllEnterpriseModule, LicenseManager, ModuleRegistry, useAgGridTheme, useAgGridTheme

export function NewPivotPage() {
  const { dateRange, activeFilters, activeConnectionId, setActiveFilter } = useAppStore()

  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  const { data: colDefsData, isLoading: colDefsLoading } = useQuery({
    queryKey: ['pivot-grid-col-defs', activeConnectionId],
    queryFn: () => fetchPivotGridColDefs(activeConnectionId ?? undefined),
  })

  const { data: filterConfig } = useQuery({
    queryKey: ['filter-config', activeConnectionId],
    queryFn: () => fetchFilterConfig(activeConnectionId!),
    enabled: !!activeConnectionId,
  })

  const validFilterIds = useMemo(
    () => new Set((filterConfig?.filter_fields ?? []).map((f) => f.field)),
    [filterConfig],
  )

  useEffect(() => {
    if (!filterConfig) return
    Object.keys(activeFilters).forEach((key) => {
      if (!validFilterIds.has(key)) setActiveFilter(key, null)
    })
  }, [filterConfig, activeFilters, validFilterIds, setActiveFilter])

  const validActiveFilters = useMemo(
    () => Object.fromEntries(Object.entries(activeFilters).filter(([key]) => validFilterIds.has(key))),
    [activeFilters, validFilterIds],
  )

  // Map stratifio-pivot's PivotRowsRequest shape to stratifio-oss's PivotGridRowsRequest shape.
  // The two are structurally different: ZoneCol[] vs Array<{id,field,aggFunc,displayName}>.
  const fetchRows = async (params: PivotRowsRequest) => {
    const toGridCol = (c: { colId: string; label: string; aggFunc?: string }) => ({
      id: c.colId, field: c.colId, aggFunc: c.aggFunc ?? 'sum', displayName: c.label,
    })
    const extra_filters = Object.fromEntries(
      params.pivotFilters.map((f) => [f.field, f.value])
    ) as Record<string, string | null>

    const res = await fetchPivotGridRows({
      rowGroupCols: params.rowGroups.map(toGridCol),
      pivotCols: params.pivotCols.map(toGridCol),
      valueCols: params.valueCols.map(toGridCol),
      pivotMode: params.pivotCols.length > 0,
      groupKeys: [],
      filterModel: {},
      sortModel: [],
      startRow: 0,
      endRow: 500,
      start_date: startDate,
      end_date: endDate,
      extra_filters: { ...validActiveFilters, ...extra_filters },
      connection_id: activeConnectionId ?? undefined,
    })

    // Map PivotGridRowsResponse → PivotRowsResponse
    // secondaryColDefs (AG Grid naming) → columnDefs (stratifio-pivot naming)
    return { rows: res.rows, columnDefs: res.secondaryColDefs }
  }

  const fetchFilterValues = (field: string) =>
    fetchPivotGridFilterValues({
      field,
      start_date: startDate,
      end_date: endDate,
      connection_id: activeConnectionId ?? undefined,
    }).then((r) => r.values.map(String))

  return (
    <PageTransition>
      <Card className="flex flex-col" style={{ height: 'calc(100vh - 96px)' }}>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <PivotTable
            colDefsData={colDefsData}
            colDefsLoading={colDefsLoading}
            startDate={startDate}
            endDate={endDate}
            activeFilters={validActiveFilters}
            activeConnectionId={activeConnectionId}
            fetchRows={fetchRows}
            fetchFilterValues={fetchFilterValues}
          />
        </CardContent>
      </Card>
    </PageTransition>
  )
}
```

**Note:** `fetchPivotGridRows` in `stratifio-oss/frontend/lib/api/queries.ts` may need its signature updated to accept the `PivotRowsRequest` shape. Check the existing signature and adapt the wrapper function accordingly.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss
npx tsc --noEmit
```

Fix any type errors before proceeding.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: replace ag-grid PivotTable with stratifio-pivot component"
```

---

### Task 15: Remove ag-grid dependencies

**Files:**
- Modify: `stratifio-oss/package.json`
- Delete: `stratifio-oss/frontend/lib/ag-grid-theme.ts`

- [ ] **Step 1: Remove ag-grid packages**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss
npm uninstall ag-grid-community ag-grid-enterprise ag-grid-react
```

- [ ] **Step 2: Delete the theme file**

```bash
rm /Users/carlo/my_work/stratifio/stratifio-oss/frontend/lib/ag-grid-theme.ts
```

- [ ] **Step 3: Verify build is clean**

```bash
npm run build
```

Expected: successful build with no ag-grid references.

- [ ] **Step 4: Start dev server and do a final smoke test**

```bash
npm run dev
```

Navigate to:
- Events explorer → table renders, no "AG Grid Trial" watermark
- Pivot explorer → zone bar renders, drag columns, data loads, no watermark

- [ ] **Step 5: Final commit**

```bash
git commit -am "chore: remove ag-grid-enterprise dependency — replaced by stratifio-pivot"
```

---

## Summary

| Chunk | Tasks | Outcome |
|---|---|---|
| 1 | 1–5 | stratifio-pivot scaffolded, shared components with tests |
| 2 | 6–8 | EventsTable built and demoed |
| 3 | 9–12 | PivotTable built and demoed |
| 4 | 13–15 | stratifio-oss migrated, ag-grid removed |
