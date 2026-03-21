# Pivot Table Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the drag-and-drop zone bar in the pivot table with popover-based dimension pickers — a categorized tree popover for Rows/Columns and a two-step popover (dimension → aggregation) for Values.

**Architecture:** `ZoneBar` becomes a pure layout shell rendering zone strips, chips, and "+ Add" buttons. Two new focused components handle picking — `DimensionPickerPopover` for Rows/Columns and `ValuePickerPopover` for Values. `buildLeafMeta` moves to `types.ts` so both pickers can share it.

**Tech Stack:** React 18, TypeScript, Radix UI `Popover` (via shadcn/ui at `@/components/ui/popover`), Tailwind CSS v4, Vitest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/frontend/components/pivot-table/types.ts` | Modify | Export `buildLeafMeta` helper |
| `apps/web/frontend/components/pivot-table/DimensionPickerPopover.tsx` | Create | Categorized tree popover for Rows and Columns |
| `apps/web/frontend/components/pivot-table/ValuePickerPopover.tsx` | Create | Two-step popover: pick dimension → pick agg |
| `apps/web/frontend/components/pivot-table/ZoneBar.tsx` | Rewrite | Layout shell using the two new pickers |
| `apps/web/frontend/components/pivot-table/PivotTable.tsx` | Modify | Remove local `buildLeafMeta`, import from types |
| `apps/web/frontend/features/design-system/components/sections/DataSection.tsx` | Modify | Verify/update PivotTable fixture (public API unchanged, internal fixture still renders) |
| `apps/web/frontend/components/pivot-table/__tests__/DimensionPickerPopover.test.tsx` | Create | Unit tests |
| `apps/web/frontend/components/pivot-table/__tests__/ValuePickerPopover.test.tsx` | Create | Unit tests |
| `apps/web/frontend/components/pivot-table/__tests__/ZoneBar.test.tsx` | Create | Unit tests |

---

## Task 1: Export `buildLeafMeta` from `types.ts`

Move the `buildLeafMeta` helper out of `PivotTable.tsx` and into `types.ts` so both picker components can import it without circular deps.

**Files:**
- Modify: `apps/web/frontend/components/pivot-table/types.ts`

- [ ] **Step 1: Add `buildLeafMeta` to `types.ts`**

Append this to the bottom of `types.ts`:

```typescript
type ColDefInput = {
  field?: string
  headerName?: string
  enableRowGroup?: boolean
  enablePivot?: boolean
  enableValue?: boolean
  allowedAggFuncs?: string[]
  children?: ColDefInput[]
}

export function buildLeafMeta(colDefs: ColDefInput[]): LeafMeta[] {
  const result: LeafMeta[] = []
  const walk = (cols: ColDefInput[]) => {
    for (const c of cols) {
      if (c.children) { walk(c.children); continue }
      if (!c.field) continue
      result.push({
        colId: c.field,
        label: c.headerName ?? c.field,
        enableRowGroup: c.enableRowGroup ?? false,
        enablePivot: c.enablePivot ?? false,
        enableValue: c.enableValue ?? false,
        allowedAggFuncs: c.allowedAggFuncs,
      })
    }
  }
  walk(colDefs)
  return result
}
```

- [ ] **Step 2: Remove `buildLeafMeta` and `ColDefInput` from `PivotTable.tsx` and import from types**

In `PivotTable.tsx`:
- Delete the `type ColDefInput = ...` declaration (lines 16–16)
- Delete the `function buildLeafMeta(...)` declaration (lines 18–36)
- Update the import from `./types` to include `buildLeafMeta`:

```typescript
import type { ZoneCol, LeafMeta, FilterEntry, PivotTableProps } from './types'
import { buildLeafMeta } from './types'
```

- [ ] **Step 3: Verify the app still compiles**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/components/pivot-table/types.ts \
        apps/web/frontend/components/pivot-table/PivotTable.tsx
git commit -m "refactor(pivot): move buildLeafMeta to types.ts"
```

---

## Task 2: Create `DimensionPickerPopover`

A popover that shows available dimensions grouped by category. Used by Rows and Columns zones. Receives a filter function so the caller can restrict to `enableRowGroup` or `enablePivot` columns.

**Files:**
- Create: `apps/web/frontend/components/pivot-table/DimensionPickerPopover.tsx`
- Create: `apps/web/frontend/components/pivot-table/__tests__/DimensionPickerPopover.test.tsx`

- [ ] **Step 0: Verify shared utility paths exist**

Before writing any code, confirm these imports resolve:

```bash
ls apps/web/frontend/lib/utils/dimensionCategories.ts
ls apps/web/frontend/config/dimension-categories.json
```

Also confirm `DimensionCategoryConfig` is exported from `apps/web/frontend/types/index.ts`:

```bash
grep -n "DimensionCategoryConfig" apps/web/frontend/types/index.ts
```

All three must exist. If any are missing, check git history or ask before continuing.

- [ ] **Step 1: Write the failing test**

Create `apps/web/frontend/components/pivot-table/__tests__/DimensionPickerPopover.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DimensionPickerPopover } from '../DimensionPickerPopover'
import type { LeafMeta } from '../types'

const leafCols: LeafMeta[] = [
  { colId: 'country', label: 'Country', enableRowGroup: true, enablePivot: true, enableValue: false },
  { colId: 'device', label: 'Device', enableRowGroup: true, enablePivot: false, enableValue: false },
  { colId: 'count', label: 'Count', enableRowGroup: false, enablePivot: false, enableValue: true },
]

describe('DimensionPickerPopover', () => {
  it('renders trigger button', () => {
    render(
      <DimensionPickerPopover
        leafCols={leafCols}
        usedIds={new Set()}
        canAdd={(m) => m.enableRowGroup}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('opens popover on click and shows eligible dimensions', async () => {
    render(
      <DimensionPickerPopover
        leafCols={leafCols}
        usedIds={new Set()}
        canAdd={(m) => m.enableRowGroup}
        onSelect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(await screen.findByText('Country')).toBeInTheDocument()
    expect(await screen.findByText('Device')).toBeInTheDocument()
    expect(screen.queryByText('Count')).not.toBeInTheDocument()
  })

  it('disables already-used dimensions', async () => {
    render(
      <DimensionPickerPopover
        leafCols={leafCols}
        usedIds={new Set(['country'])}
        canAdd={(m) => m.enableRowGroup}
        onSelect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    const countryBtn = await screen.findByRole('button', { name: 'Country' })
    expect(countryBtn).toBeDisabled()
  })

  it('calls onSelect with colId and closes on click', async () => {
    const onSelect = vi.fn()
    render(
      <DimensionPickerPopover
        leafCols={leafCols}
        usedIds={new Set()}
        canAdd={(m) => m.enableRowGroup}
        onSelect={onSelect}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Country' }))
    expect(onSelect).toHaveBeenCalledWith('country')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- DimensionPickerPopover
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `DimensionPickerPopover.tsx`**

```typescript
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'
import type { LeafMeta } from './types'
import type { DimensionCategoryConfig } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

interface DimensionPickerPopoverProps {
  leafCols: LeafMeta[]
  usedIds: Set<string>
  canAdd: (meta: LeafMeta) => boolean
  onSelect: (colId: string) => void
}

export function DimensionPickerPopover({ leafCols, usedIds, canAdd, onSelect }: DimensionPickerPopoverProps) {
  const [open, setOpen] = useState(false)

  const eligible = leafCols.filter(canAdd)

  const groups = groupDimensionsByCategory(
    eligible.map((c) => ({ value: c.colId, label: c.label })),
    CATEGORIES,
  )

  function handleSelect(colId: string) {
    onSelect(colId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground">
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {groups.map((group) => (
          <div key={group.category.id} className="mb-2 last:mb-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 px-1 mb-1">
              {group.category.label}
            </div>
            {group.dimensions.map((dim) => {
              const disabled = usedIds.has(dim.value)
              return (
                <Button
                  key={dim.value}
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleSelect(dim.value)}
                  className="w-full justify-start text-xs h-7 px-2"
                >
                  {dim.label}
                </Button>
              )
            })}
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground px-1">No dimensions available.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- DimensionPickerPopover
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/components/pivot-table/DimensionPickerPopover.tsx \
        apps/web/frontend/components/pivot-table/__tests__/DimensionPickerPopover.test.tsx
git commit -m "feat(pivot): add DimensionPickerPopover"
```

---

## Task 3: Create `ValuePickerPopover`

A two-step popover: step 1 picks a dimension from a categorized tree, step 2 picks an aggregation method. Calls `onSelect(colId, label, aggFunc)` on completion.

**Files:**
- Create: `apps/web/frontend/components/pivot-table/ValuePickerPopover.tsx`
- Create: `apps/web/frontend/components/pivot-table/__tests__/ValuePickerPopover.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/frontend/components/pivot-table/__tests__/ValuePickerPopover.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ValuePickerPopover } from '../ValuePickerPopover'
import type { LeafMeta } from '../types'

const leafCols: LeafMeta[] = [
  { colId: 'count', label: 'Count', enableRowGroup: false, enablePivot: false, enableValue: true, allowedAggFuncs: ['sum', 'avg'] },
  { colId: 'revenue', label: 'Revenue', enableRowGroup: false, enablePivot: false, enableValue: true, allowedAggFuncs: ['sum', 'avg', 'max'] },
  { colId: 'country', label: 'Country', enableRowGroup: true, enablePivot: false, enableValue: false },
]

describe('ValuePickerPopover', () => {
  it('renders trigger button', () => {
    render(<ValuePickerPopover leafCols={leafCols} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('step 1: shows only enableValue dimensions', async () => {
    render(<ValuePickerPopover leafCols={leafCols} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(await screen.findByText('Count')).toBeInTheDocument()
    expect(await screen.findByText('Revenue')).toBeInTheDocument()
    expect(screen.queryByText('Country')).not.toBeInTheDocument()
  })

  it('step 2: shows agg options after selecting a dimension', async () => {
    render(<ValuePickerPopover leafCols={leafCols} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Count' }))
    expect(await screen.findByRole('button', { name: /sum/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /avg/i })).toBeInTheDocument()
  })

  it('calls onSelect with colId, label, and aggFunc', async () => {
    const onSelect = vi.fn()
    render(<ValuePickerPopover leafCols={leafCols} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Count' }))
    fireEvent.click(await screen.findByRole('button', { name: /sum/i }))
    expect(onSelect).toHaveBeenCalledWith('count', 'Count', 'sum')
  })

  it('back button returns to step 1', async () => {
    render(<ValuePickerPopover leafCols={leafCols} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Count' }))
    fireEvent.click(await screen.findByRole('button', { name: /back/i }))
    expect(await screen.findByText('Revenue')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- ValuePickerPopover
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `ValuePickerPopover.tsx`**

```typescript
import { useState } from 'react'
import { Plus, ChevronLeft } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import categoriesConfig from '@/config/dimension-categories.json'
import type { LeafMeta } from './types'
import type { DimensionCategoryConfig } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

const DEFAULT_AGG_CYCLE = ['sum', 'count', 'avg', 'min', 'max', 'countDistinct']
const AGG_LABELS: Record<string, string> = {
  sum: 'Σ Sum', count: 'n Count', avg: 'avg Avg', min: 'min Min', max: 'max Max', countDistinct: '# Distinct',
}

interface ValuePickerPopoverProps {
  leafCols: LeafMeta[]
  onSelect: (colId: string, label: string, aggFunc: string) => void
}

export function ValuePickerPopover({ leafCols, onSelect }: ValuePickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const [selectedCol, setSelectedCol] = useState<LeafMeta | null>(null)

  const eligible = leafCols.filter((c) => c.enableValue)

  const groups = groupDimensionsByCategory(
    eligible.map((c) => ({ value: c.colId, label: c.label })),
    CATEGORIES as DimensionCategoryConfig[],
  )

  function handleDimSelect(col: LeafMeta) {
    setSelectedCol(col)
  }

  function handleAggSelect(aggFunc: string) {
    if (!selectedCol) return
    onSelect(selectedCol.colId, selectedCol.label, aggFunc)
    setOpen(false)
    setSelectedCol(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSelectedCol(null)
  }

  const aggCycle = selectedCol?.allowedAggFuncs ?? DEFAULT_AGG_CYCLE

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground">
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {selectedCol === null ? (
          <>
            {groups.map((group) => (
              <div key={group.category.id} className="mb-2 last:mb-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 px-1 mb-1">
                  {group.category.label}
                </div>
                {group.dimensions.map((dim) => {
                  const col = eligible.find((c) => c.colId === dim.value)!
                  return (
                    <Button
                      key={dim.value}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDimSelect(col)}
                      className="w-full justify-start text-xs h-7 px-2"
                    >
                      {dim.label}
                    </Button>
                  )
                })}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">No metrics available.</p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCol(null)}
                className="h-6 w-6 p-0"
                aria-label="Back"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium">{selectedCol.label}</span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 px-1 mb-1">
              Aggregation
            </div>
            {aggCycle.map((agg) => (
              <Button
                key={agg}
                variant="ghost"
                size="sm"
                onClick={() => handleAggSelect(agg)}
                className="w-full justify-start text-xs h-7 px-2"
              >
                {AGG_LABELS[agg] ?? agg}
              </Button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- ValuePickerPopover
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/components/pivot-table/ValuePickerPopover.tsx \
        apps/web/frontend/components/pivot-table/__tests__/ValuePickerPopover.test.tsx
git commit -m "feat(pivot): add ValuePickerPopover"
```

---

## Task 4: Rewrite `ZoneBar`

Replace all drag-and-drop logic with "+ Add" buttons that open the new picker components. The public prop interface (`ZoneBarProps`) stays identical.

**Files:**
- Rewrite: `apps/web/frontend/components/pivot-table/ZoneBar.tsx`
- Create: `apps/web/frontend/components/pivot-table/__tests__/ZoneBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/frontend/components/pivot-table/__tests__/ZoneBar.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ZoneBar } from '../ZoneBar'
import type { LeafMeta, ZoneCol } from '../types'

const leafCols: LeafMeta[] = [
  { colId: 'country', label: 'Country', enableRowGroup: true, enablePivot: true, enableValue: false },
  { colId: 'count', label: 'Count', enableRowGroup: false, enablePivot: false, enableValue: true, allowedAggFuncs: ['sum'] },
]

function makeProps(overrides = {}) {
  return {
    leafCols,
    rowGroups: [] as ZoneCol[],
    pivotCols: [] as ZoneCol[],
    valueCols: [] as ZoneCol[],
    onRowGroupsChange: vi.fn(),
    onPivotColsChange: vi.fn(),
    onValueColsChange: vi.fn(),
    ...overrides,
  }
}

describe('ZoneBar', () => {
  it('renders three zone labels', () => {
    render(<ZoneBar {...makeProps()} />)
    expect(screen.getByText('Rows')).toBeInTheDocument()
    expect(screen.getByText('Columns')).toBeInTheDocument()
    expect(screen.getByText('Values')).toBeInTheDocument()
  })

  it('renders existing chips', () => {
    render(
      <ZoneBar {...makeProps({
        rowGroups: [{ colId: 'country', label: 'Country' }],
      })} />
    )
    expect(screen.getByText('Country')).toBeInTheDocument()
  })

  it('remove chip calls onRowGroupsChange without that col', async () => {
    const onRowGroupsChange = vi.fn()
    render(
      <ZoneBar {...makeProps({
        rowGroups: [{ colId: 'country', label: 'Country' }],
        onRowGroupsChange,
      })} />
    )
    fireEvent.click(screen.getByRole('button', { name: /remove country/i }))
    expect(onRowGroupsChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- ZoneBar
```

Expected: FAIL (tests fail because current ZoneBar has drag logic not matching new API).

- [ ] **Step 3: Rewrite `ZoneBar.tsx`**

Replace the entire file contents:

```typescript
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DimensionPickerPopover } from './DimensionPickerPopover'
import { ValuePickerPopover } from './ValuePickerPopover'
import type { ZoneCol, LeafMeta } from './types'

const AGG_LABELS: Record<string, string> = {
  sum: 'Σ', count: 'n', avg: 'avg', min: 'min', max: 'max', countDistinct: '#',
}

interface ZoneBarProps {
  leafCols: LeafMeta[]
  rowGroups: ZoneCol[]
  pivotCols: ZoneCol[]
  valueCols: ZoneCol[]
  onRowGroupsChange: (cols: ZoneCol[]) => void
  onPivotColsChange: (cols: ZoneCol[]) => void
  onValueColsChange: (cols: ZoneCol[]) => void
}

export function ZoneBar({
  leafCols, rowGroups, pivotCols, valueCols,
  onRowGroupsChange, onPivotColsChange, onValueColsChange,
}: ZoneBarProps) {
  const usedIds = new Set([...rowGroups, ...pivotCols, ...valueCols].map((c) => c.colId))

  function addToZone(
    setter: (cols: ZoneCol[]) => void,
    current: ZoneCol[],
    colId: string,
    aggFunc?: string,
  ) {
    const meta = leafCols.find((c) => c.colId === colId)
    if (!meta) return
    setter([...current, {
      colId: meta.colId,
      label: meta.label,
      aggFunc: aggFunc ?? meta.allowedAggFuncs?.[0] ?? 'sum',
      allowedAggFuncs: meta.allowedAggFuncs,
    }])
  }

  function removeFromZone(setter: (cols: ZoneCol[]) => void, current: ZoneCol[], colId: string) {
    setter(current.filter((c) => c.colId !== colId))
  }

  function changeAgg(colId: string, aggFunc: string) {
    onValueColsChange(valueCols.map((c) => c.colId === colId ? { ...c, aggFunc } : c))
  }

  return (
    <div className="border-b border-border bg-muted/20 px-4 py-2">
      <div className="flex gap-3">
        {/* Rows */}
        <Zone label="Rows">
          {rowGroups.map((col) => (
            <Chip
              key={col.colId}
              label={col.label}
              onRemove={() => removeFromZone(onRowGroupsChange, rowGroups, col.colId)}
            />
          ))}
          <DimensionPickerPopover
            leafCols={leafCols}
            usedIds={usedIds}
            canAdd={(m) => m.enableRowGroup}
            onSelect={(colId) => addToZone(onRowGroupsChange, rowGroups, colId)}
          />
        </Zone>

        {/* Columns */}
        <Zone label="Columns">
          {pivotCols.map((col) => (
            <Chip
              key={col.colId}
              label={col.label}
              onRemove={() => removeFromZone(onPivotColsChange, pivotCols, col.colId)}
            />
          ))}
          <DimensionPickerPopover
            leafCols={leafCols}
            usedIds={usedIds}
            canAdd={(m) => m.enablePivot}
            onSelect={(colId) => addToZone(onPivotColsChange, pivotCols, colId)}
          />
        </Zone>

        {/* Values */}
        <Zone label="Values">
          {valueCols.map((col) => (
            <ValueChip
              key={`${col.colId}-${col.aggFunc}`}
              col={col}
              leafCols={leafCols}
              onRemove={() => removeFromZone(onValueColsChange, valueCols, col.colId)}
              onAggChange={(agg) => changeAgg(col.colId, agg)}
            />
          ))}
          <ValuePickerPopover
            leafCols={leafCols}
            onSelect={(colId, label, aggFunc) =>
              onValueColsChange([...valueCols, {
                colId,
                label,
                aggFunc,
                allowedAggFuncs: leafCols.find((c) => c.colId === colId)?.allowedAggFuncs,
              }])
            }
          />
        </Zone>
      </div>
    </div>
  )
}

function Zone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-[36px] rounded border border-dashed border-border px-2 py-1 flex flex-wrap gap-1 items-center">
      <span className="text-xs text-muted-foreground mr-1 shrink-0">{label}</span>
      {children}
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
      {label}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-4 w-4 p-0 hover:opacity-70 hover:bg-transparent"
        aria-label={`Remove ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </Button>
    </span>
  )
}

function ValueChip({
  col, leafCols, onRemove, onAggChange,
}: {
  col: ZoneCol
  leafCols: LeafMeta[]
  onRemove: () => void
  onAggChange: (agg: string) => void
}) {
  const meta = leafCols.find((c) => c.colId === col.colId)
  const aggCycle = meta?.allowedAggFuncs ?? ['sum', 'count', 'avg', 'min', 'max', 'countDistinct']
  const currentIdx = aggCycle.indexOf(col.aggFunc ?? aggCycle[0])

  function cycleAgg() {
    const next = aggCycle[(currentIdx + 1) % aggCycle.length]
    onAggChange(next)
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
      {col.label}
      <Button
        variant="ghost"
        size="sm"
        onClick={cycleAgg}
        className="ml-0.5 h-auto px-1 py-0 text-[10px] bg-primary/20 hover:bg-primary/30"
        title="Click to cycle aggregation"
      >
        {AGG_LABELS[col.aggFunc ?? ''] ?? col.aggFunc}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-4 w-4 p-0 hover:opacity-70 hover:bg-transparent"
        aria-label={`Remove ${col.label}`}
      >
        <X className="h-2.5 w-2.5" />
      </Button>
    </span>
  )
}
```

- [ ] **Step 4: Run the ZoneBar tests**

```bash
npm run test:run -- ZoneBar
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Run all pivot-table tests**

```bash
npm run test:run -- pivot-table
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/frontend/components/pivot-table/ZoneBar.tsx \
        apps/web/frontend/components/pivot-table/__tests__/ZoneBar.test.tsx
git commit -m "feat(pivot): replace drag-and-drop ZoneBar with popover pickers"
```

---

## Task 5: Update `DataSection` fixture

`PivotTable`'s public props haven't changed, but the `ZoneBar` no longer shows a drag area — verify the design system fixture renders correctly and remove the note about drag if present.

**Files:**
- Modify: `apps/web/frontend/features/design-system/components/sections/DataSection.tsx`

- [ ] **Step 1: Run the design system test**

```bash
npm run test:run -- DesignSystemPage
```

Expected: PASS (no changes should be needed since `PivotTable` props are unchanged). If it fails, inspect the error and adjust the fixture accordingly.

- [ ] **Step 2: Start the dev server and visually verify the pivot table**

```bash
npm run dev
```

Navigate to `http://localhost:5173/design-system` (dev mode only) and check the PivotTable section renders the zone bar with popover "+ Add" buttons instead of drag chips.

Also navigate to `http://localhost:5173/pivot` and confirm the full pivot page works: add rows, columns, values using the new pickers, run a query, export CSV.

- [ ] **Step 3: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 4: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: zero lint warnings, clean production build.

- [ ] **Step 5: Final commit**

```bash
git add apps/web/frontend/features/design-system/components/sections/DataSection.tsx
git commit -m "feat(pivot): refactor pivot table — replace drag-and-drop with popover pickers"
```

If `DataSection.tsx` was not modified (tests passed without changes), skip the add and just verify the working tree is clean:

```bash
git status
```
