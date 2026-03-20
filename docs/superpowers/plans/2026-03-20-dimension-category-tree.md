# Dimension Category Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category grouping (🕐 Time, 📣 Event, 👤 User, 🌍 Geography, 💻 Device & Platform, 📢 Marketing, ⚙️ Other) to all dimension selectors across the analytics UI, auto-mapped via a frontend JSON regex config file.

**Architecture:** A static JSON config defines regex patterns per category. A pure utility function `groupDimensionsByCategory` groups any flat `DimensionOption[]` by category. A shared `DimensionTreeSelect` component (Popover + collapsible category tree) replaces flat `<Select>` dropdowns where dimensions are chosen. The drag-and-drop ZoneBar in PivotTable and the FilterConfigTab list are adapted separately to show category grouping without using `DimensionTreeSelect`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui (`Popover`), Vitest

---

## File Map

| Path | Status | Purpose |
|------|--------|---------|
| `apps/web/frontend/config/dimension-categories.json` | **CREATE** | Regex config — category id, label (with emoji), patterns[] |
| `apps/web/frontend/lib/utils/dimensionCategories.ts` | **CREATE** | Pure utility: compile regexes + group dimensions |
| `apps/web/frontend/lib/utils/__tests__/dimensionCategories.test.ts` | **CREATE** | Unit tests for the utility |
| `apps/web/frontend/components/DimensionTreeSelect.tsx` | **CREATE** | Shared Popover + collapsible tree component |
| `apps/web/frontend/types/index.ts` | **MODIFY** | Add `DimensionOption`, `DimensionCategoryConfig`, `DimensionGroup`; update `PivotOptionsResponse` |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx` | **MODIFY** | Replace breakdown `<Select>` with `DimensionTreeSelect` |
| `apps/web/frontend/features/analytics/trends/components/TrendFilters.tsx` | **MODIFY** | Replace internal `DimensionSelect` with `DimensionTreeSelect` |
| `apps/web/frontend/components/pivot-table/ZoneBar.tsx` | **MODIFY** | Group "Available" draggable chips by category (this is the PivotPage's dimension picker — `NewPivotPage` delegates entirely to `PivotTable` → `ZoneBar`) |
| `apps/web/frontend/features/connections/components/FilterConfigTab.tsx` | **MODIFY** | Group candidates list by category with collapsible headers |

> **Note on `DimensionTreeSelect` implementation approach:** The spec mentions shadcn `Command` (cmdk) for keyboard navigation. However, this project does not have `command.tsx` installed in its shadcn/ui components. The plan uses the same `Popover` + custom button list pattern that already exists in `TrendFilters.tsx` and `GlobalFilters.tsx`. This matches the codebase's established pattern and avoids adding a new dependency.

**Note:** `lib/utils/` is a new subdirectory. The existing `lib/utils.ts` (contains only `cn()`) stays as-is.

---

## Task 1: Add Types to `types/index.ts`

**Files:**
- Modify: `apps/web/frontend/types/index.ts`

- [ ] **Step 1: Add new interfaces before the `PivotOptionsResponse` interface (line 178)**

Open `apps/web/frontend/types/index.ts`. Insert the following block immediately before the `export interface PivotOptionsResponse` line:

```typescript
export interface DimensionOption {
  value: string
  label: string
}

export interface DimensionCategoryConfig {
  id: string
  label: string       // includes emoji, e.g. "🕐 Time"
  patterns: string[]  // raw regex strings
}

export interface DimensionGroup {
  category: DimensionCategoryConfig
  dimensions: DimensionOption[]
}
```

- [ ] **Step 2: Update `PivotOptionsResponse` to use `DimensionOption[]`**

Replace the inline array types in `PivotOptionsResponse` (lines 178–185):

```typescript
// BEFORE
export interface PivotOptionsResponse {
  dimensions: Array<{ value: string; label: string }>
  measures: Array<{ value: string; label: string }>
  numeric_dimensions?: Array<{ value: string; label: string }>
  event_names: string[]
  /** Dynamic filter options keyed by field name, e.g. { country: [...], browser: [...] } */
  [key: string]: string[] | Array<{ value: string; label: string }> | undefined
}

// AFTER
export interface PivotOptionsResponse {
  dimensions: DimensionOption[]
  measures: DimensionOption[]
  numeric_dimensions?: DimensionOption[]
  event_names: string[]
  /** Dynamic filter options keyed by field name, e.g. { country: [...], browser: [...] } */
  [key: string]: string[] | DimensionOption[] | undefined
}
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/types/index.ts
git commit -m "feat: add DimensionOption, DimensionCategoryConfig, DimensionGroup types"
```

---

## Task 2: Create the Config File

**Files:**
- Create: `apps/web/frontend/config/dimension-categories.json`

- [ ] **Step 1: Create the config directory and file**

Create `apps/web/frontend/config/dimension-categories.json`:

```json
[
  {
    "id": "time",
    "label": "🕐 Time",
    "patterns": ["^ts_", "^(date|week|hour|month|quarter|year)$", "_(at|date|time|ts)$"]
  },
  {
    "id": "event",
    "label": "📣 Event",
    "patterns": ["^event_", "^day_of_week$"]
  },
  {
    "id": "user",
    "label": "👤 User",
    "patterns": ["^user_", "_(user|account|customer|tenant)$"]
  },
  {
    "id": "geography",
    "label": "🌍 Geography",
    "patterns": ["(country|city|region|state|geo|locale|timezone)"]
  },
  {
    "id": "device",
    "label": "💻 Device & Platform",
    "patterns": ["(device|browser|os|platform|screen|viewport)"]
  },
  {
    "id": "marketing",
    "label": "📢 Marketing",
    "patterns": ["^utm_", "(referrer|campaign|channel|source|medium)"]
  },
  {
    "id": "other",
    "label": "⚙️ Other",
    "patterns": [".*"]
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/frontend/config/dimension-categories.json
git commit -m "feat: add dimension-categories.json regex config"
```

---

## Task 3: Create the Grouping Utility + Tests (TDD)

**Files:**
- Create: `apps/web/frontend/lib/utils/dimensionCategories.ts`
- Create: `apps/web/frontend/lib/utils/__tests__/dimensionCategories.test.ts`

- [ ] **Step 1: Create the test file first**

Create `apps/web/frontend/lib/utils/__tests__/dimensionCategories.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { groupDimensionsByCategory } from '../dimensionCategories'
import type { DimensionOption, DimensionCategoryConfig } from '@/types'

const categories: DimensionCategoryConfig[] = [
  { id: 'time', label: '🕐 Time', patterns: ['^ts_', '^(date|week|hour)$'] },
  { id: 'user', label: '👤 User', patterns: ['^user_'] },
  { id: 'other', label: '⚙️ Other', patterns: ['.*'] },
]

describe('groupDimensionsByCategory', () => {
  it('assigns dimensions to the correct category', () => {
    const dims: DimensionOption[] = [
      { value: 'ts_month', label: 'Month' },
      { value: 'user_id', label: 'User ID' },
      { value: 'custom_field', label: 'Custom Field' },
    ]
    const groups = groupDimensionsByCategory(dims, categories)
    expect(groups).toHaveLength(3)
    expect(groups[0].category.id).toBe('time')
    expect(groups[0].dimensions.map((d) => d.value)).toEqual(['ts_month'])
    expect(groups[1].category.id).toBe('user')
    expect(groups[1].dimensions.map((d) => d.value)).toEqual(['user_id'])
    expect(groups[2].category.id).toBe('other')
    expect(groups[2].dimensions.map((d) => d.value)).toEqual(['custom_field'])
  })

  it('first match wins when patterns overlap', () => {
    const overlappingCategories: DimensionCategoryConfig[] = [
      { id: 'first', label: 'First', patterns: ['^user_'] },
      { id: 'second', label: 'Second', patterns: ['.*'] },
    ]
    const dims: DimensionOption[] = [{ value: 'user_id', label: 'User ID' }]
    const groups = groupDimensionsByCategory(dims, overlappingCategories)
    expect(groups).toHaveLength(1)
    expect(groups[0].category.id).toBe('first')
  })

  it('sorts dimensions A→Z by label within each group', () => {
    const dims: DimensionOption[] = [
      { value: 'ts_year', label: 'Year' },
      { value: 'ts_date', label: 'Date' },
      { value: 'ts_month', label: 'Month' },
    ]
    const groups = groupDimensionsByCategory(dims, categories)
    expect(groups[0].dimensions.map((d) => d.label)).toEqual(['Date', 'Month', 'Year'])
  })

  it('excludes empty groups from output', () => {
    const dims: DimensionOption[] = [{ value: 'user_id', label: 'User ID' }]
    const groups = groupDimensionsByCategory(dims, categories)
    // Only 'user' and 'other' categories should appear — 'time' has no matches
    const ids = groups.map((g) => g.category.id)
    expect(ids).not.toContain('time')
    expect(ids).toContain('user')
  })

  it('returns empty array when dimensions input is empty', () => {
    const groups = groupDimensionsByCategory([], categories)
    expect(groups).toEqual([])
  })

  it('matching is case-insensitive', () => {
    const dims: DimensionOption[] = [{ value: 'User_Name', label: 'User Name' }]
    const groups = groupDimensionsByCategory(dims, categories)
    expect(groups[0].category.id).toBe('user')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd apps/web && npx vitest run frontend/lib/utils/__tests__/dimensionCategories.test.ts 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '../dimensionCategories'`

- [ ] **Step 3: Create the implementation**

Create `apps/web/frontend/lib/utils/dimensionCategories.ts`:

```typescript
import type { DimensionCategoryConfig, DimensionGroup, DimensionOption } from '@/types'

type CompiledCategory = { category: DimensionCategoryConfig; regexes: RegExp[] }
const compiledCache = new WeakMap<DimensionCategoryConfig[], CompiledCategory[]>()

function getCompiled(categories: DimensionCategoryConfig[]): CompiledCategory[] {
  if (!compiledCache.has(categories)) {
    compiledCache.set(
      categories,
      categories.map((cat) => ({ category: cat, regexes: cat.patterns.map((p) => new RegExp(p, 'i')) })),
    )
  }
  return compiledCache.get(categories)!
}

export function groupDimensionsByCategory(
  dimensions: DimensionOption[],
  categories: DimensionCategoryConfig[],
): DimensionGroup[] {
  const compiled = getCompiled(categories)

  function findCategory(value: string): DimensionCategoryConfig {
    for (const { category, regexes } of compiled) {
      if (regexes.some((r) => r.test(value))) return category
    }
    // Should never reach here if the last category has pattern ".*"
    return categories[categories.length - 1]
  }

  const grouped = new Map<string, DimensionOption[]>()

  for (const dim of dimensions) {
    const cat = findCategory(dim.value)
    if (!grouped.has(cat.id)) grouped.set(cat.id, [])
    grouped.get(cat.id)!.push(dim)
  }

  // Preserve category config order, exclude empty groups, sort dims A→Z within each
  return categories
    .filter((cat) => grouped.has(cat.id))
    .map((cat) => ({
      category: cat,
      dimensions: grouped.get(cat.id)!.slice().sort((a, b) => a.label.localeCompare(b.label)),
    }))
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd apps/web && npx vitest run frontend/lib/utils/__tests__/dimensionCategories.test.ts 2>&1 | tail -20
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/lib/utils/dimensionCategories.ts apps/web/frontend/lib/utils/__tests__/dimensionCategories.test.ts
git commit -m "feat: add groupDimensionsByCategory utility with tests"
```

---

## Task 4: Create the `DimensionTreeSelect` Component

**Files:**
- Create: `apps/web/frontend/components/DimensionTreeSelect.tsx`

This component follows the existing `Popover` + custom list pattern used in `TrendFilters.tsx` and `GlobalFilters.tsx`. No shadcn `Command` is used — just Popover + collapsible category sections.

- [ ] **Step 1: Create the component**

Create `apps/web/frontend/components/DimensionTreeSelect.tsx`:

```typescript
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'
import type { DimensionCategoryConfig, DimensionOption } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

interface DimensionTreeSelectProps {
  value: string | null
  onChange: (value: string) => void
  dimensions: DimensionOption[]
  placeholder?: string
  disabled?: boolean
}

export function DimensionTreeSelect({
  value,
  onChange,
  dimensions,
  placeholder = 'Select dimension…',
  disabled = false,
}: DimensionTreeSelectProps) {
  const [open, setOpen] = useState(false)

  const groups = groupDimensionsByCategory(dimensions, CATEGORIES)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // When popover opens, reset expanded state to the category of the current value
  // (or first non-empty group). Done here — not in useState init — so it works
  // correctly when `dimensions` is initially empty and populates later.
  function handleOpenChange(next: boolean) {
    if (next) {
      const activeGroupId =
        value != null
          ? (groups.find((g) => g.dimensions.some((d) => d.value === value))?.category.id ?? groups[0]?.category.id)
          : groups[0]?.category.id
      setExpandedIds(new Set(activeGroupId ? [activeGroupId] : []))
    }
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

  function handleSelect(dimValue: string) {
    onChange(dimValue)
    setOpen(false)
  }

  const selectedLabel = value != null
    ? dimensions.find((d) => d.value === value)?.label ?? value
    : null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'h-9 w-full flex items-center justify-between gap-2 px-3 rounded-md text-sm border border-input bg-background',
            'hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value && 'border-primary text-primary',
          )}
        >
          <span className="truncate">{selectedLabel ?? <span className="text-muted-foreground">{placeholder}</span>}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="max-h-72 overflow-y-auto">
          {groups.map((group) => {
            const isExpanded = expandedIds.has(group.category.id)
            return (
              <div key={group.category.id}>
                {/* Category header */}
                <button
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => toggleGroup(group.category.id)}
                >
                  {isExpanded
                    ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  }
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {group.category.label}
                  </span>
                </button>
                {/* Dimension items */}
                {isExpanded && group.dimensions.map((dim) => (
                  <button
                    key={dim.value}
                    className={cn(
                      'w-full text-left px-3 py-1.5 pl-8 text-sm truncate',
                      'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                      dim.value === value && 'bg-accent font-medium text-accent-foreground',
                    )}
                    onClick={() => handleSelect(dim.value)}
                  >
                    {dim.label}
                  </button>
                ))}
              </div>
            )
          })}
          {groups.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No dimensions available</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/components/DimensionTreeSelect.tsx
git commit -m "feat: add DimensionTreeSelect shared component"
```

---

## Task 5: Integrate into TrendsPage — Breakdown Dropdown

**Files:**
- Modify: `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`

The breakdown dropdown is the `<Select>` at lines 260–279 with `value={breakdownDimension ?? 'none'}`.

- [ ] **Step 1: Import `DimensionTreeSelect` and a "No breakdown" option wrapper**

At the top of `TrendsPage.tsx`, add the import:

```typescript
import { DimensionTreeSelect } from '@/components/DimensionTreeSelect'
```

- [ ] **Step 2: Replace the breakdown `<Select>` (lines 260–279) with `DimensionTreeSelect`**

Find this block (lines 260–279):

```tsx
{/* Breakdown selector */}
{dimensions.length > 0 && (
  <Select
    value={breakdownDimension ?? 'none'}
    onValueChange={(val) => setBreakdownDimension(val === 'none' ? null : val)}
  >
    <SelectTrigger
      className={`w-[min(180px,45vw)] ${breakdownDimension ? 'border-primary text-primary' : ''}`}
    >
      <SelectValue placeholder="Break down by…" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">No breakdown</SelectItem>
      {dimensions.map((d) => (
        <SelectItem key={d.value} value={d.value}>
          {d.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

Replace with:

```tsx
{/* Breakdown selector */}
{dimensions.length > 0 && (
  <div className="w-[min(180px,45vw)] flex gap-1">
    <div className="flex-1">
      <DimensionTreeSelect
        value={breakdownDimension}
        onChange={(val) => setBreakdownDimension(val)}
        dimensions={dimensions}
        placeholder="Break down by…"
      />
    </div>
    {breakdownDimension && (
      <button
        onClick={() => setBreakdownDimension(null)}
        className="h-9 px-2 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-xs"
        title="Clear breakdown"
      >
        ✕
      </button>
    )}
  </div>
)}
```

The "No breakdown" state is restored by the clear button (✕), which only appears when a breakdown is active. This preserves the existing ability to return to no-breakdown state.

- [ ] **Step 3: Start the dev server and visually verify the breakdown dropdown works**

```bash
cd apps/web && npm run dev
```

Open http://localhost:5173, navigate to Trends, confirm the breakdown dropdown shows categories and dimensions.

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/features/analytics/trends/TrendsPage.tsx
git commit -m "feat: use DimensionTreeSelect for trends breakdown dropdown"
```

---

## Task 6: Integrate into TrendFilters — Dimension Picker per Filter Row

**Files:**
- Modify: `apps/web/frontend/features/analytics/trends/components/TrendFilters.tsx`

The `DimensionSelect` internal component (lines 132–195) is the piece to replace. It currently takes `dimensions`, `value`, `usedFields`, and `onChange`. We'll swap it for `DimensionTreeSelect` while keeping the `usedFields` filtering logic.

- [ ] **Step 1: Add the import**

At the top of `TrendFilters.tsx`, add:

```typescript
import { DimensionTreeSelect } from '@/components/DimensionTreeSelect'
```

- [ ] **Step 2: Delete the internal `DimensionSelect` function (lines 132–195)**

Remove the entire `DimensionSelect` function block — from `// ── Dimension picker ─────` comment through the closing `}` of the function.

- [ ] **Step 3: Update the usage site in the JSX (was `<DimensionSelect ...>`, now uses `DimensionTreeSelect`)**

In the `TrendFilters` component's JSX, find the `<DimensionSelect ...>` usage (inside the `rows.map` block) and replace it:

```tsx
// BEFORE
<DimensionSelect
  dimensions={dimensions}
  value={row.field}
  usedFields={usedFields}
  onChange={(newField) => changeField(row.field, newField)}
/>

// AFTER
<DimensionTreeSelect
  value={row.field}
  onChange={(newField) => changeField(row.field, newField)}
  dimensions={dimensions.filter((d) => d.value === row.field || !usedFields.includes(d.value))}
/>
```

The filtering of already-used fields is now passed as a filtered `dimensions` array (same logic as before, just moved to the call site).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Visually verify**

Check Trends → Filters section. Open a filter row's dimension picker — it should show category tree. Adding/removing filters should still work.

- [ ] **Step 6: Commit**

```bash
git add apps/web/frontend/features/analytics/trends/components/TrendFilters.tsx
git commit -m "feat: use DimensionTreeSelect in TrendFilters dimension picker"
```

---

## Task 7: Group Available Columns in PivotTable ZoneBar

**Files:**
- Modify: `apps/web/frontend/components/pivot-table/ZoneBar.tsx`

The ZoneBar shows "Available" columns as draggable chips (lines 76–89). These are already sorted A→Z. We'll group them by category with small category labels, keeping the same drag-and-drop behavior.

- [ ] **Step 1: Add imports**

At the top of `ZoneBar.tsx`, add:

```typescript
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'
import type { DimensionCategoryConfig } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]
```

- [ ] **Step 2: Replace the flat "Available" chips section (lines 76–90)**

Find this block:

```tsx
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
```

Replace with:

```tsx
{available.length > 0 && (
  <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-start">
    {groupDimensionsByCategory(
      available.map((c) => ({ value: c.colId, label: c.label })),
      CATEGORIES,
    ).map((group) => (
      <div key={group.category.id} className="flex flex-wrap gap-1 items-center">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mr-0.5">
          {group.category.label}
        </span>
        {group.dimensions.map((dim) => {
          const col = available.find((c) => c.colId === dim.value)!
          return (
            <span
              key={col.colId}
              draggable
              onDragStart={() => setDragging({ colId: col.colId, from: 'picker' })}
              className="text-xs px-2 py-0.5 rounded border border-border bg-background cursor-grab active:cursor-grabbing hover:bg-accent/50"
            >
              {col.label}
            </span>
          )
        })}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Visually verify**

Navigate to Pivot page — available columns should be grouped by category label, still draggable to zones.

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/components/pivot-table/ZoneBar.tsx
git commit -m "feat: group available columns by category in pivot ZoneBar"
```

---

## Task 8: Group Fields by Category in FilterConfigTab

**Files:**
- Modify: `apps/web/frontend/features/connections/components/FilterConfigTab.tsx`

The tab renders `candidates` as a flat list (lines 134–180). We'll group them by category with collapsible section headers. The existing checkbox/label/icon UI per field remains unchanged.

`candidates` is a `string[]` of raw field names (e.g. `"user_id"`, `"country"`). There are no pre-existing display labels for candidates — labels are only set by the user after enabling a field. So mapping candidates to `DimensionOption[]` as `{ value: f, label: f }` is correct; the field name is the only label available at this point.

- [ ] **Step 1: Add imports**

At the top of `FilterConfigTab.tsx`, add:

```typescript
import { useState } from 'react'  // already imported — just add to existing import
import { ChevronDown, ChevronRight } from 'lucide-react'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'
import type { DimensionCategoryConfig } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]
```

Note: `useState` is already imported — only add the new imports.

- [ ] **Step 2: Add state for expanded categories, defaulting to all expanded**

Inside the `FilterConfigTab` component function, after the existing state declarations, add:

```typescript
const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
  () => new Set(CATEGORIES.map((c) => c.id))
)

function toggleCategory(id: string) {
  setExpandedCategories((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}
```

- [ ] **Step 3: Replace the flat candidates list with a grouped one**

Find the candidates rendering block (inside the `<div className="space-y-3 rounded-md border p-4">` at lines 134–180) and replace the content:

```tsx
// BEFORE
<div className="space-y-3 rounded-md border p-4">
  {candidates.map((field) => {
    const isEnabled = field in enabledFields
    return (
      <div key={field} className="space-y-2">
        {/* ... checkbox + label + inputs ... */}
      </div>
    )
  })}
</div>

// AFTER
<div className="rounded-md border divide-y">
  {groupDimensionsByCategory(
    candidates.map((f) => ({ value: f, label: f })),
    CATEGORIES,
  ).map((group) => {
    const isExpanded = expandedCategories.has(group.category.id)
    return (
      <div key={group.category.id}>
        <button
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-accent/30 transition-colors"
          onClick={() => toggleCategory(group.category.id)}
        >
          {isExpanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          }
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {group.category.label}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {group.dimensions.filter((d) => d.value in enabledFields).length}/{group.dimensions.length}
          </span>
        </button>
        {isExpanded && (
          <div className="space-y-2 px-4 pb-3 pt-1">
            {group.dimensions.map((dim) => {
              const field = dim.value
              const isEnabled = field in enabledFields
              return (
                <div key={field} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`filter-${field}`}
                      checked={isEnabled}
                      onCheckedChange={() => toggleField(field)}
                    />
                    <Label
                      htmlFor={`filter-${field}`}
                      className="cursor-pointer font-mono text-sm flex-1"
                    >
                      {field}
                    </Label>
                  </div>
                  {isEnabled && (
                    <div className="ml-7 flex gap-2">
                      <Input
                        value={enabledFields[field].label}
                        onChange={(e) => setLabel(field, e.target.value)}
                        placeholder="Display label"
                        className="h-8 text-sm flex-1"
                      />
                      <Select
                        value={enabledFields[field].icon}
                        onValueChange={(v) => setIcon(field, v)}
                      >
                        <SelectTrigger className="h-8 text-sm w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  })}
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Visually verify**

Go to Connections → select a connection → Filter Config tab. The field list should now be grouped by category with collapsible headers showing enabled/total counts.

- [ ] **Step 6: Run all unit tests**

```bash
cd apps/web && npm run test:run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/frontend/features/connections/components/FilterConfigTab.tsx
git commit -m "feat: group filter config fields by dimension category"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
cd apps/web && npm run test:run
```

Expected: all tests pass.

- [ ] **Step 2: TypeScript + lint**

```bash
cd apps/web && npm run build 2>&1 | tail -30
```

Expected: build succeeds, no type errors.

- [ ] **Step 3: Lint check**

```bash
cd apps/web && npm run lint 2>&1 | tail -20
```

Expected: zero warnings.

- [ ] **Step 4: Final visual smoke test**

Check each of the 4 integration points manually:
- Trends page → breakdown dropdown: opens as category tree, auto-expands current selection
- Trends page → filter rows → dimension picker: opens as category tree
- Pivot page → available columns: grouped by category with labels
- Connections → Filter Config tab: fields grouped by category, collapsible headers with enabled counts

- [ ] **Step 5: Commit if any final tweaks were made**

```bash
git add -p
git commit -m "fix: dimension category tree final polish"
```
