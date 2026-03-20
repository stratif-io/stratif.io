# UI Coherence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify UI primitives across all analytics pages — standardise select/dropdown heights, button sizes, typography, and table components, replacing duplicated implementations with shared components.

**Architecture:** Phase 1 builds shared primitives (FilterSelect component, DataTable improvements). Phase 2 sweeps all affected pages using those primitives. All work is in the worktree at `.worktrees/ui-coherence`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui (Radix primitives), TanStack Query v5, TanStack Table v8, Vitest + Testing Library

---

## Context and Key Observations

Before diving into tasks, here is what the codebase audit revealed:

**Current violations of the spec standards:**

- `DimensionTreeSelect` trigger is `h-9` (should be `h-10`), popover list is `max-h-72` (should be `max-h-60`)
- `GlobalFilters` `DimensionFilter` trigger is `h-9` (should be `h-10`), list is `max-h-56` (should be `max-h-60`), popover is `w-52` (should be `w-56`)
- `TrendFilters.ValueMultiSelect` popover is `w-52` and list is `max-h-56` (non-standard)
- `TrendsPage` chart-type toggle buttons have `className="h-8"` override
- `RetentionPage` granularity toggle buttons have `className="h-8"` override
- `PathsExplorerPage` has `className="h-8 ..."` on `<Input>` fields and a `<SelectTrigger>` inside compact popovers — drop `h-8`, keep other classes
- `SessionsPage` uses `text-3xl font-bold tracking-tight` (should be `TYPOGRAPHY.pageTitle`) and `text-muted-foreground` (should be `TYPOGRAPHY.muted`), vanilla `<button>` for pagination, manual `Table`/`Skeleton` instead of `DataTable`
- `DataTable` prop is named `loading` (should be `isLoading`); uses inline `Skeleton` rows and plain text empty cell instead of `TableSkeleton`/`EmptyState`
- `EventsDataTable` in `data-table/` is a demo fixture unrelated to the real `components/events-table/EventsTable.tsx` which uses its own virtualised TanStack Table — the spec's "EventsTable migration" targets `components/events-table/EventsTable.tsx`

---

## Phase 1 — Shared Primitives

### Task 1 — FilterSelect component

**Write the failing tests first, then implement.**

**Files:**
- Create: `apps/web/frontend/components/FilterSelect.tsx`
- Create: `apps/web/frontend/components/__tests__/FilterSelect.test.tsx`

- [ ] **1.1 — Write failing unit tests**

  Create `.worktrees/ui-coherence/apps/web/frontend/components/__tests__/FilterSelect.test.tsx`:

  ```tsx
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { describe, it, expect, vi } from 'vitest'
  import { FilterSelect } from '../FilterSelect'

  const baseOptions = [
    { value: 'country', label: 'Country', category: 'geography' },
    { value: 'browser', label: 'Browser', category: 'device' },
    { value: 'utm_source', label: 'UTM Source', category: 'marketing' },
  ]

  describe('FilterSelect', () => {
    it('single mode closes popover on selection', async () => {
      const onChange = vi.fn()
      render(
        <FilterSelect
          mode="single"
          options={baseOptions}
          value={null}
          onChange={onChange}
          placeholder="Pick one"
        />
      )
      await userEvent.click(screen.getByRole('button', { name: /pick one/i }))
      await userEvent.click(screen.getByText('Country'))
      expect(onChange).toHaveBeenCalledWith('country')
      expect(screen.queryByText('Browser')).not.toBeInTheDocument()
    })

    it('multi mode shows "N values" count label when multiple items selected', async () => {
      render(
        <FilterSelect
          mode="multi"
          options={baseOptions}
          value={['country', 'browser']}
          onChange={vi.fn()}
        />
      )
      expect(screen.getByRole('button')).toHaveTextContent('2 values')
    })

    it('tree mode opens to the group containing the active value', async () => {
      render(
        <FilterSelect
          mode="single"
          tree
          options={baseOptions}
          value="browser"
          onChange={vi.fn()}
        />
      )
      await userEvent.click(screen.getByRole('button'))
      // Implementation uses conditional rendering — collapsed items are not in the DOM at all
      expect(screen.getByText('Browser')).toBeInTheDocument()
      expect(screen.queryByText('Country')).not.toBeInTheDocument()
    })

    it('searchable mode filters options client-side case-insensitively', async () => {
      render(
        <FilterSelect
          mode="single"
          searchable
          options={baseOptions}
          value={null}
          onChange={vi.fn()}
        />
      )
      await userEvent.click(screen.getByRole('button'))
      const input = screen.getByPlaceholderText(/search/i)
      await userEvent.type(input, 'utm')
      expect(screen.getByText('UTM Source')).toBeInTheDocument()
      expect(screen.queryByText('Country')).not.toBeInTheDocument()
      expect(screen.queryByText('Browser')).not.toBeInTheDocument()
    })

    it('isLoading={true} renders loading state instead of option list', async () => {
      render(
        <FilterSelect
          mode="single"
          options={[]}
          isLoading
          value={null}
          onChange={vi.fn()}
        />
      )
      await userEvent.click(screen.getByRole('button'))
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByText(/no options/i)).not.toBeInTheDocument()
    })

    it('disabled={true} prevents opening the popover', async () => {
      render(
        <FilterSelect
          mode="single"
          options={baseOptions}
          value={null}
          onChange={vi.fn()}
          disabled
        />
      )
      const trigger = screen.getByRole('button')
      expect(trigger).toBeDisabled()
      await userEvent.click(trigger)
      expect(screen.queryByText('Country')).not.toBeInTheDocument()
    })
  })
  ```

- [ ] **1.2 — Run tests to confirm they fail**

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-coherence
  npm run test:run -- --reporter=verbose apps/web/frontend/components/__tests__/FilterSelect.test.tsx
  # Expected: 6 failing (component does not exist yet)
  ```

- [ ] **1.3 — Implement FilterSelect**

  Create `.worktrees/ui-coherence/apps/web/frontend/components/FilterSelect.tsx`:

  ```tsx
  import { useState } from 'react'
  import { ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react'
  import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
  import { Input } from '@/components/ui/input'
  import { cn } from '@/lib/utils'
  import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
  import categoriesConfig from '@/config/dimension-categories.json'
  import type { DimensionCategoryConfig } from '@/types'

  const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

  export interface FilterSelectOption {
    value: string
    label: string
    category?: string
  }

  export interface FilterSelectProps {
    mode: 'single' | 'multi'
    options: FilterSelectOption[]
    isLoading?: boolean
    value: string | string[] | null
    onChange: (value: string | string[]) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    /** 'default' = h-10 (standard controls). 'sm' = h-7 (compact paired filter rows).
     *  Note: FilterSelect size="sm" is h-7, distinct from Button size="sm" which is h-9. */
    size?: 'default' | 'sm'
    searchable?: boolean
    /** Enables category accordion grouping using dimension-categories.json config. */
    tree?: boolean
  }

  export function FilterSelect({
    mode,
    options,
    isLoading = false,
    value,
    onChange,
    placeholder = 'Select…',
    disabled = false,
    className,
    size = 'default',
    searchable = false,
    tree = false,
  }: FilterSelectProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    const selectedValues: string[] =
      value === null ? [] : Array.isArray(value) ? value : [value]

    const triggerLabel = (() => {
      if (selectedValues.length === 0) return null
      if (mode === 'multi') {
        if (selectedValues.length === 1) return selectedValues[0]
        return `${selectedValues.length} values`
      }
      return options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
    })()

    const groups = tree
      ? groupDimensionsByCategory(
          options.map((o) => ({ value: o.value, label: o.label, category: o.category })),
          CATEGORIES
        )
      : []

    function handleOpenChange(next: boolean) {
      if (next && tree) {
        const activeValue = selectedValues[0] ?? null
        const activeGroupId =
          activeValue != null
            ? (groups.find((g) => g.dimensions.some((d) => d.value === activeValue))?.category.id ??
               groups[0]?.category.id)
            : groups[0]?.category.id
        setExpandedIds(new Set(activeGroupId ? [activeGroupId] : []))
      }
      if (!next) setSearch('')
      setOpen(next)
    }

    function toggleGroup(id: string) {
      setExpandedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    function handleSelect(optValue: string) {
      if (mode === 'single') {
        onChange(optValue)
        setOpen(false)
      } else {
        const next = selectedValues.includes(optValue)
          ? selectedValues.filter((v) => v !== optValue)
          : [...selectedValues, optValue]
        onChange(next)
      }
    }

    const filteredFlat = search
      ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
      : options

    const triggerHeight = size === 'sm' ? 'h-7 text-xs px-2' : 'h-10 text-sm px-3'
    const hasValue = selectedValues.length > 0

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background',
              'hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              triggerHeight,
              hasValue && 'border-primary text-primary',
              className,
            )}
          >
            <span className="truncate">
              {triggerLabel ?? <span className="text-muted-foreground">{placeholder}</span>}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-56 p-0" align="start">
          {searchable && (
            <div className="p-2 border-b">
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-sm"
                autoFocus
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div role="status" className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : tree ? (
              <div className="p-1">
                {groups.map((group) => {
                  const isExpanded = expandedIds.has(group.category.id)
                  return (
                    <div key={group.category.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-1.5 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                        onClick={() => toggleGroup(group.category.id)}
                      >
                        {isExpanded
                          ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                          : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {group.category.label}
                        </span>
                      </button>
                      {isExpanded && group.dimensions.map((dim) => {
                        const isSelected = selectedValues.includes(dim.value)
                        return (
                          <button
                            key={dim.value}
                            type="button"
                            className={cn(
                              'w-full text-left px-3 py-1.5 pl-8 text-sm truncate flex items-center gap-2',
                              'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                              isSelected && 'bg-accent font-medium text-accent-foreground',
                            )}
                            onClick={() => handleSelect(dim.value)}
                          >
                            {mode === 'multi' && (
                              <span className={cn(
                                'h-3.5 w-3.5 shrink-0 rounded-sm border',
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                              )} />
                            )}
                            {mode === 'single' && isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                            {dim.label}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
                {groups.length === 0 && (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">No options available</p>
                )}
              </div>
            ) : (
              <div className="p-1">
                {filteredFlat.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground text-center">No options</p>
                ) : (
                  filteredFlat.map((opt) => {
                    const isSelected = selectedValues.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded text-sm truncate flex items-center gap-2',
                          'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                          isSelected && 'font-medium',
                        )}
                        onClick={() => handleSelect(opt.value)}
                      >
                        {mode === 'multi' && (
                          <span className={cn(
                            'h-3.5 w-3.5 shrink-0 rounded-sm border',
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                          )} />
                        )}
                        {mode === 'single' && isSelected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                        )}
                        {opt.label}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {mode === 'multi' && selectedValues.length > 0 && (
            <div className="p-2 border-t">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground w-full text-left"
                onClick={() => onChange([])}
              >
                Clear selection
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  }
  ```

- [ ] **1.4 — Run tests to confirm they pass**

  ```bash
  npm run test:run -- --reporter=verbose apps/web/frontend/components/__tests__/FilterSelect.test.tsx
  # Expected: 6 passing
  ```

- [ ] **1.5 — Lint and type-check**

  ```bash
  npm run lint && npm run build
  # Expected: 0 errors, 0 warnings
  ```

- [ ] **1.6 — Commit**

  ```bash
  git add apps/web/frontend/components/FilterSelect.tsx \
          apps/web/frontend/components/__tests__/FilterSelect.test.tsx
  git commit -m "feat: add FilterSelect shared Popover-based select component with unit tests"
  ```

---

### Task 2 — DimensionTreeSelect wrapper

**Files:**
- Modify: `apps/web/frontend/components/DimensionTreeSelect.tsx`

- [ ] **2.1 — Replace DimensionTreeSelect with a thin wrapper**

  Replace the entire content of `.worktrees/ui-coherence/apps/web/frontend/components/DimensionTreeSelect.tsx`:

  ```tsx
  /**
   * @deprecated Use FilterSelect with tree={true} mode="single" directly.
   * This wrapper exists so call sites outside TrendFilters need no immediate changes.
   */
  import { FilterSelect } from '@/components/FilterSelect'
  import type { DimensionOption } from '@/types'

  interface DimensionTreeSelectProps {
    value: string | null
    onChange: (value: string) => void
    dimensions: DimensionOption[]
    placeholder?: string
    disabled?: boolean
    className?: string
    size?: 'default' | 'sm'
  }

  export function DimensionTreeSelect({
    value,
    onChange,
    dimensions,
    placeholder = 'Select dimension…',
    disabled = false,
    className,
    size = 'default',
  }: DimensionTreeSelectProps) {
    return (
      <FilterSelect
        mode="single"
        tree
        options={dimensions.map((d) => ({ value: d.value, label: d.label, category: d.category }))}
        value={value}
        onChange={(v) => onChange(v as string)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        size={size}
      />
    )
  }
  ```

  **Note:** If `DimensionOption` in `apps/web/frontend/types/index.ts` does not already have a `category?: string` field, add it now.

- [ ] **2.2 — Run full test suite**

  ```bash
  npm run test:run
  # Expected: all passing, no regressions
  ```

- [ ] **2.3 — Lint and type-check**

  ```bash
  npm run lint && npm run build
  ```

- [ ] **2.4 — Commit**

  ```bash
  git add apps/web/frontend/components/DimensionTreeSelect.tsx \
          apps/web/frontend/types/index.ts
  git commit -m "refactor: DimensionTreeSelect — thin wrapper over FilterSelect"
  ```

---

### Task 3 — DataTable: rename loading → isLoading, swap inline skeletons and empty cell

**Files:**
- Modify: `apps/web/frontend/components/data-table/DataTable.tsx`
- Modify: `apps/web/frontend/components/data-table/EventsDataTable.tsx`
- Modify: any other call site found by grep

- [ ] **3.1 — Find all call sites of the loading prop**

  ```bash
  grep -rn 'loading={' \
    /Users/carlo/my_work/stratifio/stratifio-oss/apps/web/frontend \
    --include="*.tsx"
  # Review and note every DataTable caller that passes loading={...}
  ```

- [ ] **3.2 — Update DataTable.tsx**

  In `.worktrees/ui-coherence/apps/web/frontend/components/data-table/DataTable.tsx`:

  a) In `DataTableProps`: rename `loading?: boolean` → `isLoading?: boolean`

  b) In function signature: rename `loading = false` → `isLoading = false`

  c) Update internal usage: `!loading` → `!isLoading`, `loading ?` → `isLoading ?`

  d) Update imports — remove `Skeleton`, add `TableSkeleton` and `EmptyState`:
  ```tsx
  // Remove:
  import { Skeleton } from '@/components/ui/skeleton'
  // Add:
  import { TableSkeleton } from '@/components/ui/loading-state'
  import { EmptyState } from '@/components/ui/empty-state'
  ```

  e) Replace the desktop loading/empty block:
  ```tsx
  // BEFORE — inline Skeleton rows
  {loading ? (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {tableColumns.map((_, j) => (
          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
        ))}
      </TableRow>
    ))
  ) : isEmpty ? (
    <TableRow>
      <TableCell colSpan={tableColumns.length} className="h-24 text-center">
        {emptyMessage}
      </TableCell>
    </TableRow>
  ) : null}

  // AFTER
  {isLoading ? (
    <TableRow>
      <TableCell colSpan={tableColumns.length} className="py-6">
        <TableSkeleton />
      </TableCell>
    </TableRow>
  ) : isEmpty ? (
    <TableRow>
      <TableCell colSpan={tableColumns.length}>
        <EmptyState title={emptyMessage} />
      </TableCell>
    </TableRow>
  ) : null}
  ```

  f) Replace the mobile loading/empty block:
  ```tsx
  // BEFORE
  {loading ? (
    Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-lg border bg-card p-4 mb-3">
        <Skeleton className="h-20 w-full" />
      </div>
    ))
  ) : isEmpty ? (
    <div className="text-center py-10 text-muted-foreground">{emptyMessage}</div>
  ) : null}

  // AFTER
  {isLoading ? (
    <div className="p-4"><TableSkeleton /></div>
  ) : isEmpty ? (
    <EmptyState title={emptyMessage} />
  ) : null}
  ```

- [ ] **3.3 — Update call sites found in 3.1**

  Known files to update (verify against grep output from 3.1):
  - `apps/web/frontend/components/data-table/EventsDataTable.tsx` — rename `loading` prop to `isLoading` in interface, signature, and the `<DataTable loading={loading}>` JSX
  - Any other file that passes `loading={...}` directly to `<DataTable>`

  **⚠️ Do NOT rename `loading=` on `<CardLoadingBar>` components** — `CardLoadingBar` is a different component with its own `loading` prop. Only rename on direct `<DataTable>` call sites.

- [ ] **3.4 — Run tests, lint, build**

  ```bash
  npm run test:run
  npm run lint && npm run build
  # Expected: 0 errors
  ```

- [ ] **3.5 — Commit**

  ```bash
  # Stage DataTable, EventsDataTable, and every other call-site file updated in 3.3
  git add apps/web/frontend/components/data-table/DataTable.tsx \
          apps/web/frontend/components/data-table/EventsDataTable.tsx
  # Add any additional call-site files found in 3.1 before committing
  git commit -m "refactor: DataTable — rename loading→isLoading, use TableSkeleton and EmptyState"
  ```

---

## Phase 2 — Page Sweep

### Task 4 — GlobalFilters height fix

**Files:**
- Modify: `apps/web/frontend/components/GlobalFilters.tsx`

- [ ] **4.1 — Update GlobalFilters.tsx**

  In `.worktrees/ui-coherence/apps/web/frontend/components/GlobalFilters.tsx`:

  a) Container `div` that has `h-9`: change to `h-10`

  b) `DimensionFilter` trigger `<button>` className: `h-9` → `h-10`

  c) `<PopoverContent className="w-52 p-0">` → `<PopoverContent className="w-56 p-0">`

  d) `<div className="max-h-56 overflow-y-auto">` → `<div className="max-h-60 overflow-y-auto">`

- [ ] **4.2 — Lint, build, commit**

  ```bash
  npm run lint && npm run build
  git add apps/web/frontend/components/GlobalFilters.tsx
  git commit -m "fix: GlobalFilters — h-10 trigger, max-h-60 w-56 popover"
  ```

---

### Task 5 — TrendFilters migration + TrendsPage toggle fix

**Files:**
- Modify: `apps/web/frontend/features/analytics/trends/components/TrendFilters.tsx`
- Modify: `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`

- [ ] **5.1 — Refactor TrendFilters.tsx**

  a) Delete the `ValueMultiSelect` function entirely (the big inline component at the top of the file).

  b) Replace imports — keep `useState`, `useQuery`, `X`, `Plus`, `Filter`, `ChevronDown`, `ChevronRight`, `Collapsible*`, `Badge`, `fetchPivotGridFilterValues`, `QUERY_STALE_TIME`. Add `FilterSelect`. Remove `Popover*`, `Input`, `useRef`.

  c) Add a small internal-only `FilterValueSelect` sub-component (not exported) that owns the lazy query and renders a `FilterSelect`:

  ```tsx
  function FilterValueSelect({
    field,
    selected,
    connectionId,
    onChange,
  }: {
    field: string
    selected: string[]
    connectionId: string | undefined
    onChange: (values: string[]) => void
  }) {
    const [open, setOpen] = useState(false)

    const { data, isLoading } = useQuery({
      queryKey: ['trend-filter-values', field, connectionId],
      queryFn: () => fetchPivotGridFilterValues({ field, connection_id: connectionId }),
      staleTime: QUERY_STALE_TIME.default,
      enabled: open,
    })

    const options = (data?.values ?? [])
      .map(String)
      .filter(Boolean)
      .map((v) => ({ value: v, label: v }))

    return (
      <div onClickCapture={() => setOpen(true)}>
        <FilterSelect
          mode="multi"
          searchable
          options={options}
          isLoading={isLoading}
          value={selected}
          onChange={(v) => onChange(v as string[])}
          placeholder="Any value"
          size="sm"
          className="rounded-l-none rounded-r-md border-l-0"
        />
      </div>
    )
  }
  ```

  **Note on architecture:** The spec described `TrendFilters` owning the query and passing `options`/`isLoading` as props to `FilterSelect`. This plan deliberately keeps the query inside an internal `FilterValueSelect` sub-component instead, because it preserves the lazy-load pattern (`enabled: open`) without requiring `TrendFilters` to manage per-row open state. The result is equivalent: the query fires on first open, options are cached by TanStack Query, and `FilterSelect` receives `isLoading` as a prop. This is an intentional deviation from the spec's wording, justified by cleaner encapsulation.

  d) In the `TrendFilters` JSX, replace the `<DimensionTreeSelect>` + old `<ValueMultiSelect>` row with:

  ```tsx
  {rows.map((row) => (
    <div key={row.field} className="flex items-center gap-2">
      <div className="w-48">
        <FilterSelect
          mode="single"
          tree
          options={dimensions
            .filter((d) => d.value === row.field || !usedFields.includes(d.value))
            .map((d) => ({ value: d.value, label: d.label, category: (d as any).category }))}
          value={row.field}
          onChange={(newField) => changeField(row.field, newField as string)}
          size="sm"
          className="rounded-r-none"
        />
      </div>
      <FilterValueSelect
        field={row.field}
        selected={row.values}
        connectionId={connectionId}
        onChange={(values) => updateValues(row.field, values)}
      />
      <button
        className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => removeRow(row.field)}
        aria-label="Remove filter"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ))}
  ```

- [ ] **5.2 — Remove className="h-8" from chart type toggles in TrendsPage.tsx**

  Find the three chart-type `<Button>` elements (Area, Line, Bar). Each has `className="h-8"`. Remove only that prop — keep everything else:

  ```tsx
  // BEFORE
  <Button variant={chartType === 'area' ? 'secondary' : 'ghost'} size="sm" onClick={() => setChartType('area')} className="h-8">
  // AFTER
  <Button variant={chartType === 'area' ? 'secondary' : 'ghost'} size="sm" onClick={() => setChartType('area')}>
  ```

- [ ] **5.3 — Run tests, lint, build**

  ```bash
  npm run test:run
  npm run lint && npm run build
  ```

- [ ] **5.4 — Commit**

  ```bash
  git add apps/web/frontend/features/analytics/trends/components/TrendFilters.tsx \
          apps/web/frontend/features/analytics/trends/TrendsPage.tsx
  git commit -m "refactor: TrendFilters — replace ValueMultiSelect/DimensionTreeSelect with FilterSelect; fix h-8 toggle overrides"
  ```

---

### Task 6 — RetentionPage toggle fix

**Files:**
- Modify: `apps/web/frontend/features/analytics/retention/RetentionPage.tsx`

- [ ] **6.1 — Remove className="h-8" from granularity buttons**

  Find all `<Button ... className="h-8">` instances in the granularity toggle group and remove the `className="h-8"` prop.

- [ ] **6.2 — Lint, build, commit**

  ```bash
  npm run lint && npm run build
  git add apps/web/frontend/features/analytics/retention/RetentionPage.tsx
  git commit -m "fix: RetentionPage — remove h-8 override from granularity toggle buttons"
  ```

---

### Task 7 — PathsExplorerPage compact input fix

**Files:**
- Modify: `apps/web/frontend/features/analytics/paths/PathsExplorerPage.tsx`

- [ ] **7.1 — Find all h-8 instances**

  ```bash
  grep -n "h-8" \
    /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-coherence/apps/web/frontend/features/analytics/paths/PathsExplorerPage.tsx
  ```

- [ ] **7.2 — Remove h-8 from each match**

  For each result, remove `h-8` from the className string, keeping all other classes intact.
  These are compact data-entry inputs inside configuration popovers, not toggle buttons — dropping `h-8` lets them use their natural Input/SelectTrigger height.

- [ ] **7.3 — Verify PathsPage.tsx and FunnelDetailPage.tsx have no h-8 issues**

  ```bash
  grep -n "h-8" \
    /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-coherence/apps/web/frontend/features/analytics/paths/PathsPage.tsx
  # Expected: 0 results (already clean)

  grep -n "h-8" \
    /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-coherence/apps/web/frontend/features/analytics/paths/FunnelDetailPage.tsx
  # Expected: 0 results — the h-9 at line ~203 is a custom icon button, not a toggle, leave it as-is
  ```

- [ ] **7.4 — Lint, build, commit**

  ```bash
  npm run lint && npm run build
  git add apps/web/frontend/features/analytics/paths/PathsExplorerPage.tsx
  git commit -m "fix: PathsExplorerPage — remove h-8 from compact popover inputs"
  ```

---

### Task 8 — EventsTable migration to DataTable

**Files:**
- Modify: `apps/web/frontend/components/events-table/EventsTable.tsx`

**⚠️ Virtualisation trade-off:** `EventsTable` currently uses `@tanstack/react-virtual` (`useVirtualizer`) to handle large datasets without mounting all rows. Replacing it with `DataTable` drops virtualisation in favour of standard pagination. This is intentional — the Events page already uses server-side pagination (the API returns a capped page of results), so virtualisation of a small result set provides no benefit and adds complexity. The migration is valid. Do not attempt to preserve the virtualiser inside `DataTable`.

**⚠️ Double table instance:** `EventsTable` currently owns its own `useReactTable` instance. `DataTable` also creates one internally. After migration, `EventsTable` will no longer call `useReactTable` — it just builds `ColumnDef[]` and passes them to `<DataTable>`.

- [ ] **8.1 — Read the full EventsTable.tsx before touching it**

  ```bash
  cat /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-coherence/apps/web/frontend/components/events-table/EventsTable.tsx | wc -l
  # Then read it fully to understand props, column defs, and virtualisation setup
  ```

- [ ] **8.2 — Build TanStack column definitions from the existing columns**

  The existing columns (timestamp, user_id, event_name, session_id, plus dynamic dim cols) become `ColumnDef<RawEvent>[]`. Custom cell renderers (user timeline modal trigger, property display) stay in the column definitions — they just move from the virtualised row renderer into `cell:` functions.

  Keep `EventsTableProps` interface identical (no changes to the public API).

- [ ] **8.3 — Replace the virtualised table renderer with DataTable**

  ```tsx
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyMessage="No events found"
      showSearch={false}
      showColumnVisibility={false}
      showRowSelection={false}
      showRowActions={false}
      showPagination={false}
    />
  )
  ```

  The `FilterBar` (if present above the table) stays as a sibling element, not inside `DataTable`.

- [ ] **8.4 — Run tests, lint, build**

  ```bash
  npm run test:run
  npm run lint && npm run build
  ```

- [ ] **8.5 — Commit**

  ```bash
  git add apps/web/frontend/components/events-table/EventsTable.tsx
  git commit -m "refactor: EventsTable — migrate internals to DataTable primitive"
  ```

---

### Task 9 — SessionsPage

**Files:**
- Modify: `apps/web/frontend/pages/SessionsPage.tsx`

Note: this file lives in `pages/` (not `features/`) and stays there — no relocation.

- [ ] **9.1 — Fix typography**

  **Note:** `TYPOGRAPHY.pageTitle` expands to `'text-3xl font-bold tracking-tight'` — the same string already in `SessionsPage`. The visual result is identical; the value is replacing a hard-coded literal with the shared constant so future changes to `TYPOGRAPHY.pageTitle` are picked up automatically.

  ```tsx
  // Add import
  import { TYPOGRAPHY } from '@/lib/constants'

  // BEFORE
  <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
  <p className="text-muted-foreground mt-1">Browse individual user sessions.</p>

  // AFTER
  <h1 className={TYPOGRAPHY.pageTitle}>Sessions</h1>
  <p className={cn(TYPOGRAPHY.muted, 'mt-1')}>Browse individual user sessions.</p>
  ```

- [ ] **9.2 — Fix pagination buttons**

  ```tsx
  // Add import
  import { Button } from '@/components/ui/button'

  // BEFORE
  <button className="px-3 py-1 border rounded disabled:opacity-50" ...>Previous</button>
  <button className="px-3 py-1 border rounded disabled:opacity-50" ...>Next</button>

  // AFTER
  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
    Previous
  </Button>
  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
    Next
  </Button>
  ```

- [ ] **9.3 — Migrate table to DataTable**

  Add imports:
  ```tsx
  import { DataTable } from '@/components/data-table/DataTable'
  import type { ColumnDef } from '@tanstack/react-table'
  ```

  Remove imports: `Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton`

  Build column definitions (adapt types to match the actual session data shape from the query):
  ```tsx
  const columns: ColumnDef<Session>[] = [
    {
      accessorKey: 'session_id',
      header: 'Session ID',
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('session_id')}</span>,
    },
    {
      accessorKey: 'user_id',
      header: 'User ID',
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('user_id')}</span>,
    },
    { accessorKey: 'device_type', header: 'Device' },
    { accessorKey: 'event_count', header: 'Events' },
    {
      accessorKey: 'duration_sec',
      header: 'Duration',
      cell: ({ row }) => formatDuration((row.getValue('duration_sec') as number) || 0),
    },
    {
      accessorKey: 'start_time',
      header: 'Start Time',
      cell: ({ row }) => {
        const t = row.getValue('start_time') as string | null
        return t ? format(new Date(t), 'MMM d, HH:mm') : '-'
      },
    },
  ]
  ```

  Replace the conditional render (isLoading / skeleton / table / empty) with:
  ```tsx
  <DataTable
    columns={columns}
    data={sessions}
    isLoading={isLoading}
    emptyMessage="No sessions found"
    showSearch={false}
    showColumnVisibility={false}
    showRowSelection={false}
    showRowActions={false}
    showPagination={false}
  />
  ```

  Keep the existing pagination controls (`Previous` / `Next` buttons with page state) below `DataTable`. Use `showPagination={false}` because pagination is server-side.

- [ ] **9.4 — Run tests, lint, build**

  ```bash
  npm run test:run
  npm run lint && npm run build
  # Expected: 0 errors, 0 warnings
  ```

- [ ] **9.5 — Commit**

  ```bash
  git add apps/web/frontend/pages/SessionsPage.tsx
  git commit -m "fix: SessionsPage — TYPOGRAPHY constants, Button pagination, DataTable migration"
  ```

---

### Task 10 — Final verification

- [ ] **10.1 — Verify no h-8 className overrides remain**

  ```bash
  grep -rn 'className="h-8\|className=".*h-8' \
    /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-coherence/apps/web/frontend \
    --include="*.tsx"
  # Review results — h-8 on a <Button> or toggle is a violation
  # h-8 on a non-button element (e.g. a decorative div, icon container) is acceptable
  ```

- [ ] **10.2 — Verify no hard-coded page-title typography**

  ```bash
  grep -rn '"text-3xl font-bold' \
    /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-coherence/apps/web/frontend \
    --include="*.tsx"
  # Expected: 0 results (TYPOGRAPHY constant itself is allowed)
  ```

- [ ] **10.3 — Verify no vanilla button pagination**

  ```bash
  grep -rn 'px-3 py-1 border rounded' \
    /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-coherence/apps/web/frontend \
    --include="*.tsx"
  # Expected: 0 results
  ```

- [ ] **10.4 — Run full test suite**

  ```bash
  npm run test:run
  # Expected: all passing (the pre-existing Button icon-size test failure is unrelated to this work)
  ```

- [ ] **10.5 — Run lint and full build**

  ```bash
  npm run lint && npm run build
  # Expected: exit 0
  ```

- [ ] **10.6 — Commit if any cleanup changes were made**

  ```bash
  git add -p
  git commit -m "chore: final ui-coherence sweep — verify no remaining violations"
  ```

---

## Summary of File Changes

| File | Change |
|---|---|
| `components/FilterSelect.tsx` | **New** — shared unified Popover-based select |
| `components/__tests__/FilterSelect.test.tsx` | **New** — 6 unit tests |
| `components/DimensionTreeSelect.tsx` | Thin wrapper over FilterSelect |
| `components/data-table/DataTable.tsx` | `loading`→`isLoading`, inline skeleton/empty → `TableSkeleton`/`EmptyState` |
| `components/data-table/EventsDataTable.tsx` | Update `loading` → `isLoading` prop name |
| `components/GlobalFilters.tsx` | `h-9`→`h-10`, `w-52`→`w-56`, `max-h-56`→`max-h-60` |
| `features/analytics/trends/components/TrendFilters.tsx` | Delete `ValueMultiSelect`, use `FilterSelect` |
| `features/analytics/trends/TrendsPage.tsx` | Remove `className="h-8"` from chart type buttons |
| `features/analytics/retention/RetentionPage.tsx` | Remove `className="h-8"` from granularity buttons |
| `features/analytics/paths/PathsExplorerPage.tsx` | Remove `h-8` from compact popover inputs |
| `components/events-table/EventsTable.tsx` | Migrate internals to `DataTable` |
| `pages/SessionsPage.tsx` | Typography constants, Button pagination, DataTable |
| `types/index.ts` | Add `category?: string` to `DimensionOption` if not already present |
