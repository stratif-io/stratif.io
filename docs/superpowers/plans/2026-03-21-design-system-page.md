# Design System Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/design-system` route (dev-only) that renders all UI components in a two-column sidebar-nav layout for visual QA and developer reference.

**Architecture:** A new `features/design-system/` feature module with five section components, assembled in a page that has its own inner sticky sidebar. The route and sidebar nav entry are guarded by `import.meta.env.DEV`. Charts and tables use static fixture data — no API calls. The page renders inside `DashboardLayout` and uses the app's real theme.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui, React Router v6, lucide-react, Recharts (via existing chart wrappers), Vitest + @testing-library/react

---

## File Map

**Create:**
- `apps/web/frontend/features/design-system/DesignSystemPage.tsx` — page + inner sidebar nav + section assembly
- `apps/web/frontend/features/design-system/components/ComponentSection.tsx` — reusable section wrapper (heading + rendered content)
- `apps/web/frontend/features/design-system/components/sections/PrimitivesSection.tsx` — Button, Badge, Input, Select, Checkbox, Switch, Slider, Progress, Skeleton, Spinner, Avatar, Separator, Tooltip, Popover, Dialog, DropdownMenu, Card, ScrollArea
- `apps/web/frontend/features/design-system/components/sections/FeedbackSection.tsx` — LoadingState, EmptyState, QueryError, CardLoadingBar, UnderConstruction
- `apps/web/frontend/features/design-system/components/sections/ChartsSection.tsx` — AreaChart, BarChart, LineChart, DonutChart, FunnelChart, HeatmapChart, SparklineChart, ComparisonChart (all with static fixture data)
- `apps/web/frontend/features/design-system/components/sections/DataSection.tsx` — DataTable, EventsDataTable, PivotTable (static fixture data)
- `apps/web/frontend/features/design-system/components/sections/AppComponentsSection.tsx` — DateRangePicker, FilterSelect, DbLogo
- `apps/web/frontend/features/design-system/__tests__/DesignSystemPage.test.tsx` — render test

**Modify:**
- `apps/web/frontend/App.tsx` — add dev-guarded lazy import + route
- `apps/web/frontend/components/layout/Sidebar.tsx` — add `Palette` import + dev-only nav group

---

## Task 1: ComponentSection wrapper

**Files:**
- Create: `apps/web/frontend/features/design-system/components/ComponentSection.tsx`
- Create: `apps/web/frontend/features/design-system/__tests__/DesignSystemPage.test.tsx` (stub — add real assertions in Task 8)

- [ ] **Step 1: Create ComponentSection**

```tsx
// apps/web/frontend/features/design-system/components/ComponentSection.tsx
interface ComponentSectionProps {
  id: string
  title: string
  children: React.ReactNode
}

export function ComponentSection({ id, title, children }: ComponentSectionProps) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-border">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  )
}
```

- [ ] **Step 2: Create ComponentRow** (name label + rendered component, used inside sections)

Add to the same file below `ComponentSection`:
```tsx
interface ComponentRowProps {
  label: string
  children: React.ReactNode
}

export function ComponentRow({ label, children }: ComponentRowProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-mono text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/features/design-system/components/ComponentSection.tsx
git commit -m "feat: add ComponentSection wrapper for design system page"
```

---

## Task 2: PrimitivesSection

**Files:**
- Create: `apps/web/frontend/features/design-system/components/sections/PrimitivesSection.tsx`

- [ ] **Step 1: Write PrimitivesSection**

```tsx
// apps/web/frontend/features/design-system/components/sections/PrimitivesSection.tsx
import { useState } from 'react'
import { ComponentSection, ComponentRow } from '../ComponentSection'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export function PrimitivesSection() {
  const [sliderValue, setSliderValue] = useState([40])

  return (
    <ComponentSection id="primitives" title="UI Primitives">
      <ComponentRow label="Button">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </ComponentRow>

      <ComponentRow label="Badge">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </ComponentRow>

      <ComponentRow label="Input">
        <Input placeholder="Placeholder text" className="w-48" />
        <Input value="With value" readOnly className="w-48" />
        <Input disabled placeholder="Disabled" className="w-48" />
      </ComponentRow>

      <ComponentRow label="Select">
        <Select>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
            <SelectItem value="b">Option B</SelectItem>
            <SelectItem value="c">Option C</SelectItem>
          </SelectContent>
        </Select>
      </ComponentRow>

      <ComponentRow label="Checkbox">
        <div className="flex items-center gap-2">
          <Checkbox id="cb-unchecked" />
          <Label htmlFor="cb-unchecked">Unchecked</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="cb-checked" defaultChecked />
          <Label htmlFor="cb-checked">Checked</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="cb-disabled" disabled />
          <Label htmlFor="cb-disabled">Disabled</Label>
        </div>
      </ComponentRow>

      <ComponentRow label="Switch">
        <div className="flex items-center gap-2">
          <Switch id="sw-off" />
          <Label htmlFor="sw-off">Off</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="sw-on" defaultChecked />
          <Label htmlFor="sw-on">On</Label>
        </div>
      </ComponentRow>

      <ComponentRow label="Slider">
        <Slider
          value={sliderValue}
          onValueChange={setSliderValue}
          min={0}
          max={100}
          step={1}
          className="w-48"
        />
        <span className="text-sm text-muted-foreground">{sliderValue[0]}%</span>
      </ComponentRow>

      <ComponentRow label="Progress">
        <Progress value={30} className="w-48" />
        <Progress value={65} className="w-48" />
        <Progress value={100} className="w-48" />
      </ComponentRow>

      <ComponentRow label="Skeleton">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </ComponentRow>

      <ComponentRow label="Spinner">
        <Spinner />
      </ComponentRow>

      <ComponentRow label="Avatar">
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>CD</AvatarFallback>
        </Avatar>
      </ComponentRow>

      <ComponentRow label="Separator">
        <div className="w-48">
          <p className="text-sm">Above</p>
          <Separator className="my-2" />
          <p className="text-sm">Below</p>
        </div>
      </ComponentRow>

      <ComponentRow label="Tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      </ComponentRow>

      <ComponentRow label="Popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <p className="text-sm">Popover content here.</p>
          </PopoverContent>
        </Popover>
      </ComponentRow>

      <ComponentRow label="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog title</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Dialog body content.</p>
          </DialogContent>
        </Dialog>
      </ComponentRow>

      <ComponentRow label="DropdownMenu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Action one</DropdownMenuItem>
            <DropdownMenuItem>Action two</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ComponentRow>

      <ComponentRow label="Card">
        <Card className="w-48">
          <CardHeader>
            <CardTitle className="text-sm">Card title</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Card body content.</p>
          </CardContent>
        </Card>
      </ComponentRow>

      <ComponentRow label="ScrollArea">
        <ScrollArea className="h-24 w-48 border rounded-md p-2">
          {Array.from({ length: 10 }, (_, i) => (
            <p key={i} className="text-sm py-1">Item {i + 1}</p>
          ))}
        </ScrollArea>
      </ComponentRow>
    </ComponentSection>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/frontend/features/design-system/components/sections/PrimitivesSection.tsx
git commit -m "feat: add PrimitivesSection for design system page"
```

---

## Task 3: FeedbackSection

**Files:**
- Create: `apps/web/frontend/features/design-system/components/sections/FeedbackSection.tsx`

Before writing, check the props of these components:
- `apps/web/frontend/components/ui/loading-state.tsx`
- `apps/web/frontend/components/ui/empty-state.tsx`
- `apps/web/frontend/components/ui/query-error.tsx`
- `apps/web/frontend/components/ui/card-loading-bar.tsx`
- `apps/web/frontend/components/UnderConstruction.tsx`

- [ ] **Step 1: Read the feedback component files** to understand their props

- [ ] **Step 2: Write FeedbackSection**

```tsx
// apps/web/frontend/features/design-system/components/sections/FeedbackSection.tsx
import { ComponentSection, ComponentRow } from '../ComponentSection'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { QueryError } from '@/components/ui/query-error'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { UnderConstruction } from '@/components/UnderConstruction'

export function FeedbackSection() {
  return (
    <ComponentSection id="feedback" title="Feedback States">
      <ComponentRow label="LoadingState">
        <div className="border rounded-md w-64 h-32 relative overflow-hidden">
          <LoadingState message="Loading data..." size="sm" />
        </div>
      </ComponentRow>

      <ComponentRow label="EmptyState">
        <div className="border rounded-md w-64">
          <EmptyState
            title="No data"
            description="Nothing to display yet."
          />
        </div>
      </ComponentRow>

      <ComponentRow label="QueryError">
        <div className="border rounded-md w-64">
          <QueryError message="Failed to load data." />
        </div>
      </ComponentRow>

      <ComponentRow label="CardLoadingBar">
        <div className="border rounded-md w-64 p-4 relative overflow-hidden">
          <p className="text-sm">Card with loading bar</p>
          <CardLoadingBar loading />
        </div>
      </ComponentRow>

      <ComponentRow label="UnderConstruction">
        <div className="border rounded-md w-64">
          <UnderConstruction />
        </div>
      </ComponentRow>
    </ComponentSection>
  )
}
```

> **Note:** Adjust props above to match what you find after reading the component files in Step 1. The prop names shown are guesses based on component naming conventions.

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/features/design-system/components/sections/FeedbackSection.tsx
git commit -m "feat: add FeedbackSection for design system page"
```

---

## Task 4: ChartsSection

**Files:**
- Create: `apps/web/frontend/features/design-system/components/sections/ChartsSection.tsx`

Before writing, read the prop interfaces from:
- `apps/web/frontend/components/charts/area-chart.tsx`
- `apps/web/frontend/components/charts/bar-chart.tsx`
- `apps/web/frontend/components/charts/line-chart.tsx`
- `apps/web/frontend/components/charts/donut-chart.tsx`
- `apps/web/frontend/components/charts/funnel-chart.tsx`
- `apps/web/frontend/components/charts/heatmap-chart.tsx`
- `apps/web/frontend/components/charts/sparkline-chart.tsx`
- `apps/web/frontend/components/charts/comparison-chart.tsx`

- [ ] **Step 1: Read all chart component files** and note the required props and data shape for each

- [ ] **Step 2: Write ChartsSection with static fixture data**

Use this as a starting template — adjust data shapes to match what you find in Step 1:

```tsx
// apps/web/frontend/features/design-system/components/sections/ChartsSection.tsx
import { ComponentSection, ComponentRow } from '../ComponentSection'
import {
  AreaChartComponent,
  BarChartComponent,
  LineChartComponent,
  DonutChart,
  FunnelChart,
  HeatmapChart,
  SparklineChart,
  ComparisonChart,
} from '@/components/charts'

// Static fixture data — shapes must match chart prop interfaces (verify in Step 1)
const timeSeriesData = [
  { date: '2024-01-01', value: 120 },
  { date: '2024-01-02', value: 95 },
  { date: '2024-01-03', value: 140 },
  { date: '2024-01-04', value: 88 },
  { date: '2024-01-05', value: 165 },
  { date: '2024-01-06', value: 130 },
  { date: '2024-01-07', value: 175 },
]

const donutData = [
  { name: 'Direct', value: 40 },
  { name: 'Organic', value: 30 },
  { name: 'Referral', value: 20 },
  { name: 'Social', value: 10 },
]

const funnelData = [
  { name: 'Visited', value: 1000 },
  { name: 'Signed up', value: 600 },
  { name: 'Activated', value: 300 },
  { name: 'Paid', value: 100 },
]

export function ChartsSection() {
  return (
    <ComponentSection id="charts" title="Charts">
      <ComponentRow label="AreaChartComponent">
        <div className="w-full h-48 border rounded-md p-2">
          <AreaChartComponent data={timeSeriesData} />
        </div>
      </ComponentRow>

      <ComponentRow label="BarChartComponent">
        <div className="w-full h-48 border rounded-md p-2">
          <BarChartComponent data={timeSeriesData} />
        </div>
      </ComponentRow>

      <ComponentRow label="LineChartComponent">
        <div className="w-full h-48 border rounded-md p-2">
          <LineChartComponent data={timeSeriesData} />
        </div>
      </ComponentRow>

      <ComponentRow label="DonutChart">
        <div className="w-64 h-48 border rounded-md p-2">
          <DonutChart data={donutData} />
        </div>
      </ComponentRow>

      <ComponentRow label="FunnelChart">
        <div className="w-full h-48 border rounded-md p-2">
          <FunnelChart data={funnelData} />
        </div>
      </ComponentRow>

      <ComponentRow label="SparklineChart">
        <SparklineChart data={timeSeriesData} />
      </ComponentRow>

      {/* After reading HeatmapChart and ComparisonChart prop interfaces in Step 1, add them here.
          This is required before committing — do not skip. See Step 2b below. */}
    </ComponentSection>
  )
}
```

- [ ] **Step 2b: Add HeatmapChart and ComparisonChart rows** (required — do not skip)

After reading the prop interfaces from Step 1, add `HeatmapChart` and `ComparisonChart` to the section using the same `<ComponentRow>` + bordered div pattern. Both exports exist in `@/components/charts`. `generateHeatmapData` is also exported and can be used to produce fixture data for `HeatmapChart`. `transformPeriodData` is exported for `ComparisonChart`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/features/design-system/components/sections/ChartsSection.tsx
git commit -m "feat: add ChartsSection for design system page"
```

---

## Task 5: DataSection

**Files:**
- Create: `apps/web/frontend/features/design-system/components/sections/DataSection.tsx`

Before writing, read:
- `apps/web/frontend/components/data-table/DataTable.tsx` — prop interface + column shape
- `apps/web/frontend/components/data-table/EventsDataTable.tsx` — prop interface
- `apps/web/frontend/components/pivot-table/PivotTable.tsx` — prop interface

- [ ] **Step 1: Read the data table component files** to understand required props and column/row shapes

- [ ] **Step 2: Write DataSection with static fixture rows**

```tsx
// apps/web/frontend/features/design-system/components/sections/DataSection.tsx
import { ComponentSection, ComponentRow } from '../ComponentSection'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@tanstack/react-table'

// Simple fixture for DataTable — adjust column/row shape to match DataTable's generic props
interface SampleRow {
  id: string
  name: string
  value: number
  status: string
}

const sampleColumns: ColumnDef<SampleRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'value', header: 'Value' },
  { accessorKey: 'status', header: 'Status' },
]

const sampleRows: SampleRow[] = [
  { id: '1', name: 'page_view', value: 1240, status: 'active' },
  { id: '2', name: 'click', value: 830, status: 'active' },
  { id: '3', name: 'signup', value: 142, status: 'active' },
  { id: '4', name: 'purchase', value: 38, status: 'inactive' },
]

export function DataSection() {
  return (
    <ComponentSection id="data" title="Data Display">
      <ComponentRow label="DataTable">
        <div className="w-full border rounded-md overflow-hidden">
          <DataTable columns={sampleColumns} data={sampleRows} />
        </div>
      </ComponentRow>

      {/* EventsDataTable and PivotTable: add after reading their prop interfaces in Step 1 */}
      {/* They may require more complex fixture data or context providers */}
    </ComponentSection>
  )
}
```

> **Note:** `EventsDataTable` and `PivotTable` may require context, stores, or complex prop shapes. If they can't be rendered in isolation with static data, show a placeholder note in the section rather than forcing a render.

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/features/design-system/components/sections/DataSection.tsx
git commit -m "feat: add DataSection for design system page"
```

---

## Task 6: AppComponentsSection

**Files:**
- Create: `apps/web/frontend/features/design-system/components/sections/AppComponentsSection.tsx`

Before writing, read:
- `apps/web/frontend/components/DateRangePicker.tsx`
- `apps/web/frontend/components/FilterSelect.tsx`
- `apps/web/frontend/components/DbLogo.tsx`
- `apps/web/frontend/components/shared/FilterBar.tsx`
- `apps/web/frontend/components/GlobalFilters.tsx`

- [ ] **Step 1: Read the app component files** to understand their props

- [ ] **Step 2: Write AppComponentsSection**

```tsx
// apps/web/frontend/features/design-system/components/sections/AppComponentsSection.tsx
import { ComponentSection, ComponentRow } from '../ComponentSection'
import { DateRangePicker } from '@/components/DateRangePicker'
import { FilterSelect } from '@/components/FilterSelect'
import { DbLogo } from '@/components/DbLogo'

export function AppComponentsSection() {
  return (
    <ComponentSection id="app" title="App Components">
      <ComponentRow label="DateRangePicker">
        {/* DateRangePicker likely reads/writes from Zustand store — render without extra props */}
        <DateRangePicker />
      </ComponentRow>

      <ComponentRow label="FilterSelect">
        <FilterSelect
          options={['page_view', 'click', 'signup', 'purchase']}
          value="page_view"
          onChange={() => {}}
          placeholder="Select event…"
        />
      </ComponentRow>

      <ComponentRow label="DbLogo">
        <DbLogo type="duckdb" />
        <DbLogo type="postgres" />
        <DbLogo type="bigquery" />
      </ComponentRow>

      {/* Add FilterBar here after reading its props in Step 1.
          Import from '@/components/shared/FilterBar'. It likely reads from Zustand store — render without extra props. */}

      {/* Add GlobalFilters here after reading its props in Step 1.
          Import from '@/components/GlobalFilters'. It reads from Zustand store — render without extra props. */}
    </ComponentSection>
  )
}
```

> **Note:** Adjust `FilterSelect` and `DbLogo` props to match what you find in Step 1. `DateRangePicker`, `FilterBar`, and `GlobalFilters` likely connect to the Zustand store directly — render without extra props.

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/features/design-system/components/sections/AppComponentsSection.tsx
git commit -m "feat: add AppComponentsSection for design system page"
```

---

## Task 7: DesignSystemPage assembly

**Files:**
- Create: `apps/web/frontend/features/design-system/DesignSystemPage.tsx`

- [ ] **Step 1: Write DesignSystemPage**

```tsx
// apps/web/frontend/features/design-system/DesignSystemPage.tsx
import { PageTransition } from '@/components/layout/PageTransition'
import { PrimitivesSection } from './components/sections/PrimitivesSection'
import { FeedbackSection } from './components/sections/FeedbackSection'
import { ChartsSection } from './components/sections/ChartsSection'
import { DataSection } from './components/sections/DataSection'
import { AppComponentsSection } from './components/sections/AppComponentsSection'

const NAV_SECTIONS = [
  { id: 'primitives', label: 'UI Primitives' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'charts', label: 'Charts' },
  { id: 'data', label: 'Data Display' },
  { id: 'app', label: 'App Components' },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export function DesignSystemPage() {
  return (
    <PageTransition>
      <div className="flex gap-8">
        {/* Inner sticky sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-6 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 pb-2">
              Components
            </p>
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="w-full text-left text-sm px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-12 pb-16">
          <div>
            <h1 className="text-2xl font-bold">Design System</h1>
            <p className="text-muted-foreground mt-1">All UI components rendered in the app theme.</p>
          </div>

          <PrimitivesSection />
          <FeedbackSection />
          <ChartsSection />
          <DataSection />
          <AppComponentsSection />
        </div>
      </div>
    </PageTransition>
  )
}
```

- [ ] **Step 2: Write a render test**

```tsx
// apps/web/frontend/features/design-system/__tests__/DesignSystemPage.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DesignSystemPage } from '../DesignSystemPage'

// Wrap with minimal router context (page uses Link/NavLink descendants internally via PageTransition)
function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('DesignSystemPage', () => {
  it('renders all section headings', () => {
    render(<DesignSystemPage />, { wrapper })
    expect(screen.getByText('UI Primitives')).toBeInTheDocument()
    expect(screen.getByText('Feedback States')).toBeInTheDocument()
    expect(screen.getByText('Charts')).toBeInTheDocument()
    expect(screen.getByText('Data Display')).toBeInTheDocument()
    expect(screen.getByText('App Components')).toBeInTheDocument()
  })

  it('renders the inner nav links', () => {
    render(<DesignSystemPage />, { wrapper })
    expect(screen.getByRole('button', { name: 'UI Primitives' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Charts' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the tests**

```bash
npm run test:run -- features/design-system
```

Expected: tests pass. If chart or data table components throw during render (e.g. missing ResizeObserver, canvas not available in jsdom), mock the heavy sections at the top of the test file:

```tsx
vi.mock('../components/sections/ChartsSection', () => ({
  ChartsSection: () => <div>Charts</div>,
}))
vi.mock('../components/sections/DataSection', () => ({
  DataSection: () => <div>Data Display</div>,
}))
```

This is acceptable — the sections have their own render paths; the page test only needs to verify assembly and navigation.

- [ ] **Step 4: Fix any import or prop errors** surfaced by the test run

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/design-system/
git commit -m "feat: add DesignSystemPage with inner sidebar nav"
```

---

## Task 8: Wire up route and sidebar

**Files:**
- Modify: `apps/web/frontend/App.tsx`
- Modify: `apps/web/frontend/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add dev-guarded lazy import to App.tsx**

After the last existing `const ... = lazy(...)` declaration (before the `PageLoader` function), add:

```tsx
const DesignSystemPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/features/design-system/DesignSystemPage').then((m) => ({
        default: m.DesignSystemPage,
      }))
    )
  : null
```

- [ ] **Step 2: Add the route inside the DashboardLayout Route block in App.tsx**

After the `/connections/:id` route line, add:

```tsx
{import.meta.env.DEV && DesignSystemPage && (
  <Route path="/design-system" element={<DesignSystemPage />} />
)}
```

- [ ] **Step 3: Add Palette to Sidebar.tsx icon imports**

In `Sidebar.tsx`, add `Palette` to the existing lucide-react import block:

```tsx
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  TrendingUp,
  Users,
  Route,
  Activity,
  Settings,
  Table,
  Database,
  Palette,   // add this
} from 'lucide-react'
```

- [ ] **Step 4: Add dev-only nav group to navGroups in Sidebar.tsx**

The `navGroups` array is a `const` declaration. Append a conditional spread at the end:

```tsx
const navGroups: NavGroup[] = [
  // ... existing groups unchanged ...
  ...(import.meta.env.DEV
    ? [
        {
          title: 'Developer',
          icon: Palette,
          items: [{ title: 'Design System', href: '/design-system', icon: Palette }],
        } satisfies NavGroup,
      ]
    : []),
]
```

- [ ] **Step 5: Build to verify TypeScript**

```bash
npm run build
```

Expected: no TypeScript errors. If there are errors, fix them.

- [ ] **Step 6: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/frontend/App.tsx apps/web/frontend/components/layout/Sidebar.tsx
git commit -m "feat: add /design-system route and sidebar entry (dev-only)"
```

---

## Task 9: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open http://localhost:5173 and verify:**
  - "Design System" appears at the bottom of the sidebar in dev mode
  - Clicking it navigates to `/design-system`
  - All five section headings appear
  - Inner sidebar nav buttons scroll to sections
  - Dark/light mode toggle affects all components correctly
  - No console errors

- [ ] **Step 3: Final commit if any small fixes were needed**

```bash
git add -p
git commit -m "fix: design system page smoke test fixes"
```
