# Dimension Category Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store dimension category assignments per custom property in the DB, auto-suggested client-side on schema detection, user-editable in SchemaConfigTab, and propagated to all dimension selectors automatically.

**Architecture:** Add optional `category` field to `CustomProperty` (backend Pydantic model + frontend TypeScript type + Zod schema). On schema detect, the frontend auto-suggests categories using the existing `dimension-categories.json` regex config and pre-fills pickers in SchemaConfigTab. User edits are saved with the schema config. `DimensionOption` gains a `category?` field so `groupDimensionsByCategory` can short-circuit regex matching when a stored category is present.

**Tech Stack:** FastAPI/Pydantic (backend), React 18, TypeScript, Vitest, Zod, Tailwind CSS v4, shadcn/ui Popover

---

## Task 1: Backend — add `category` to `CustomProperty`

**Files:**
- Modify: `backend/api/connections/models.py`

- [ ] Open `backend/api/connections/models.py` and add `category: str | None = None` to the `CustomProperty` model, after the `type` field and before the `@field_validator` decorator. The result should look like:

  ```python
  class CustomProperty(BaseModel):
      name: str
      path: str
      type: Literal["string", "number", "boolean", "timestamp"]
      category: str | None = None

      @field_validator("path")
      @classmethod
      def validate_path(cls, v: str) -> str:
          if not _PATH_RE.match(v):
              raise ValueError("path must match ^[a-zA-Z_][a-zA-Z0-9_.]*$")
          return v

      model_config = {"extra": "ignore"}
  ```

- [ ] Verify the model works correctly by running from the repo root:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && \
  python -c "from backend.api.connections.models import CustomProperty; \
  p = CustomProperty(name='x', path='x', type='string'); \
  print('category default:', p.category); \
  p2 = CustomProperty(name='x', path='x', type='string', category='marketing'); \
  print('category set:', p2.category)"
  ```

  Expected output:
  ```
  category default: None
  category set: marketing
  ```

- [ ] Run backend tests (they may not exist for models, which is fine):

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && \
  python -m pytest backend/ -v 2>/dev/null || echo "no backend tests"
  ```

- [ ] Commit:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && \
  git add backend/api/connections/models.py && \
  git commit -m "feat(backend): add optional category field to CustomProperty model"
  ```

---

## Task 2: Frontend types + Zod schema

**Files:**
- Modify: `apps/web/frontend/types/index.ts`
- Modify: `apps/web/frontend/lib/schemas/api-schemas.ts`

- [ ] In `apps/web/frontend/types/index.ts`, add `category?: string` to the `CustomProperty` interface:

  ```typescript
  export interface CustomProperty {
    name: string
    path: string
    type: PropertyType
    category?: string
  }
  ```

- [ ] In the same file, add `category?: string` to the `DimensionOption` interface:

  ```typescript
  export interface DimensionOption { value: string; label: string; category?: string }
  ```

- [ ] In `apps/web/frontend/lib/schemas/api-schemas.ts`, add `category: z.string().optional()` to `CustomPropertySchema` — keep `flatten` as-is, do not remove it:

  ```typescript
  export const CustomPropertySchema = z.object({
    name: z.string(),
    path: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_.]*$/),
    type: z.enum(['string', 'number', 'boolean', 'timestamp']),
    flatten: z.boolean().optional(),
    category: z.string().optional(),
  })
  ```

- [ ] Run TypeScript check to verify no new type errors:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema/apps/web && \
  npm run build 2>&1 | tail -20
  ```

  Expected: build completes with 0 errors (warnings about bundle size are acceptable).

- [ ] Commit:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && \
  git add apps/web/frontend/types/index.ts apps/web/frontend/lib/schemas/api-schemas.ts && \
  git commit -m "feat(frontend): add category field to CustomProperty and DimensionOption types"
  ```

---

## Task 3: Extend `groupDimensionsByCategory` to use stored category

**Files:**
- Modify: `apps/web/frontend/lib/utils/dimensionCategories.ts`
- Modify: `apps/web/frontend/lib/utils/__tests__/dimensionCategories.test.ts`

- [ ] Open `apps/web/frontend/lib/utils/__tests__/dimensionCategories.test.ts` and add two new failing tests at the end of the `describe` block (after the existing 6 tests):

  ```typescript
  it('stored category is used directly without regex matching', () => {
    // 'never_matches_anything' would fall through to 'other' by regex,
    // but the stored category 'marketing' should override that.
    const dims: DimensionOption[] = [
      { value: 'never_matches_anything', label: 'Never', category: 'marketing' },
    ]
    const result = groupDimensionsByCategory(dims, categories)
    expect(result).toHaveLength(1)
    expect(result[0].category.id).toBe('marketing')
    expect(result[0].dimensions[0].label).toBe('Never')
  })

  it('unknown stored category id falls back to last category', () => {
    const dims: DimensionOption[] = [
      { value: 'some_prop', label: 'Some', category: 'nonexistent_category_id' },
    ]
    const result = groupDimensionsByCategory(dims, categories)
    expect(result).toHaveLength(1)
    // 'other' is the last category in the test fixture
    expect(result[0].category.id).toBe('other')
  })
  ```

- [ ] Run tests to confirm the two new tests fail (the existing 6 must still pass):

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema/apps/web && \
  npm run test:run -- dimensionCategories 2>&1 | tail -30
  ```

  Expected: 6 passed, 2 failed.

- [ ] Update the `for` loop in `groupDimensionsByCategory` in `apps/web/frontend/lib/utils/dimensionCategories.ts` to short-circuit regex matching when a stored category is present. Replace the existing loop:

  ```typescript
  for (const dim of dimensions) {
    const cat = findCategory(dim.value)
    if (!grouped.has(cat.id)) grouped.set(cat.id, [])
    grouped.get(cat.id)!.push(dim)
  }
  ```

  With:

  ```typescript
  for (const dim of dimensions) {
    let cat: DimensionCategoryConfig
    if (dim.category) {
      cat = categories.find((c) => c.id === dim.category) ?? categories[categories.length - 1]
    } else {
      cat = findCategory(dim.value)
    }
    if (!grouped.has(cat.id)) grouped.set(cat.id, [])
    grouped.get(cat.id)!.push(dim)
  }
  ```

- [ ] Run tests again to confirm all 8 pass:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema/apps/web && \
  npm run test:run -- dimensionCategories 2>&1 | tail -30
  ```

  Expected output:
  ```
  ✓ apps/web/frontend/lib/utils/__tests__/dimensionCategories.test.ts (8)
  Test Files  1 passed (1)
  Tests  8 passed (8)
  ```

- [ ] Commit:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && \
  git add apps/web/frontend/lib/utils/dimensionCategories.ts \
          apps/web/frontend/lib/utils/__tests__/dimensionCategories.test.ts && \
  git commit -m "feat: short-circuit regex matching in groupDimensionsByCategory when stored category is present"
  ```

---

## Task 4: Propagate `category` through backend pivot endpoint + frontend detect type

The only place `CustomProperty` data is mapped to `DimensionOption`-shaped dicts is in the **backend** at `backend/api/pivot.py` line 312. The frontend `SchemaDetectResult` type also needs updating so Task 5's auto-suggest compiles cleanly.

**Files:**
- Modify: `backend/api/pivot.py`
- Modify: `apps/web/frontend/types/index.ts` (line ~278, `SchemaDetectResult.proposed_custom_properties`)

- [ ] Open `backend/api/pivot.py`. Find `custom_props = db.get_custom_properties()` (around line 281) and add a `category_map` dict right after it:

  ```python
  custom_props = db.get_custom_properties()
  category_map = {p["name"]: p.get("category") for p in custom_props}
  ```

- [ ] Find the `numeric_dimensions` list comprehension (around line 312) and add `"category"`:

  ```python
  # Before:
  numeric_dimensions = [
      {"value": p["name"], "label": p["name"].replace("_", " ").title()}
      for p in custom_props
      if p.get("name") in numeric_names
  ]

  # After:
  numeric_dimensions = [
      {"value": p["name"], "label": p["name"].replace("_", " ").title(), "category": p.get("category")}
      for p in custom_props
      if p.get("name") in numeric_names
  ]
  ```

- [ ] Find the `result["dimensions"]` construction (a few lines below — it produces `[{"value": k, "label": v} for k, v in dimensions.items()]`). Update it to include `category` via the `category_map` (yields `None` for built-in dimensions, stored category for custom props):

  ```python
  # Before:
  "dimensions": [{"value": k, "label": v} for k, v in dimensions.items()],

  # After:
  "dimensions": [{"value": k, "label": v, "category": category_map.get(k)} for k, v in dimensions.items()],
  ```

  Note: `category_map.get(k)` returns `None` for built-in dimension keys (e.g. `"event_name"`, `"user_id"`) — this is correct since built-in dimensions have no stored category.

- [ ] Verify the backend still starts without import errors:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && \
  python -c "from backend.api.pivot import router; print('ok')"
  ```

  Expected: `ok`

- [ ] In `apps/web/frontend/types/index.ts`, update `SchemaDetectResult.proposed_custom_properties` to include the optional `category` field (so Task 5's spread compiles without type errors):

  ```typescript
  // Before:
  proposed_custom_properties: Array<{ name: string; path: string; type: PropertyType }>

  // After:
  proposed_custom_properties: Array<{ name: string; path: string; type: PropertyType; category?: string }>
  ```

- [ ] Run TypeScript check:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema/apps/web && \
  npm run build 2>&1 | tail -20
  ```

  Expected: 0 errors.

- [ ] Commit:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && \
  git add backend/api/pivot.py apps/web/frontend/types/index.ts && \
  git commit -m "feat: propagate category in pivot numeric_dimensions and SchemaDetectResult type"
  ```

---

## Task 5: SchemaConfigTab — category picker + auto-suggest on detect

**Files:**
- Modify: `apps/web/frontend/features/connections/components/SchemaConfigTab.tsx`

- [ ] Add the following imports near the top of `SchemaConfigTab.tsx`, alongside existing imports:

  ```tsx
  import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
  import dimensionCategories from '@/config/dimension-categories.json'
  import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
  import type { DimensionCategoryConfig } from '@/types'
  ```

- [ ] Add the `CategoryPicker` component as a module-level function, before the main `SchemaConfigTab` component definition (it must use `useState` from React, which is already imported):

  ```tsx
  function CategoryPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
    const [open, setOpen] = useState(false)
    const selected = (dimensionCategories as DimensionCategoryConfig[]).find((c) => c.id === value)
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-8 w-full truncate rounded-md border border-input bg-background px-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none"
          >
            {selected ? selected.label : '— none —'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          <button
            type="button"
            className="w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
            onClick={() => { onChange(null); setOpen(false) }}
          >
            — none —
          </button>
          {(dimensionCategories as DimensionCategoryConfig[]).map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
              onClick={() => { onChange(cat.id); setOpen(false) }}
            >
              {cat.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    )
  }
  ```

- [ ] Update the `addProp` function inside `SchemaConfigTab` to include `category: undefined`:

  ```tsx
  function addProp() {
    setCustomProps((prev) => [...prev, { name: '', path: '', type: 'string', category: undefined }])
  }
  ```

- [ ] Update the column header `div` to add the "Category" column (5 columns instead of 4):

  ```tsx
  <div className="hidden sm:grid grid-cols-[1fr_1.5fr_100px_110px_32px] gap-2 px-1">
    {['Name', 'Path', 'Type', 'Category', ''].map((h) => (
      <span key={h} className="text-xs font-medium text-muted-foreground">{h}</span>
    ))}
  </div>
  ```

- [ ] Update the per-prop row `div` grid class and add the `CategoryPicker` cell after the Type `<Select>` and before the delete `<Button>`:

  ```tsx
  <div key={idx} className="grid grid-cols-[1fr_1.5fr_100px_110px_32px] gap-2 items-center">
    <Input value={prop.name} ... />
    <Input value={prop.path} ... />
    <Select value={prop.type} ...>...</Select>
    {/* Category picker */}
    <CategoryPicker
      value={prop.category ?? null}
      onChange={(cat) => updateProp(idx, { category: cat ?? undefined })}
    />
    <Button ... onClick={() => removeProp(idx)}><Trash2 /></Button>
  </div>
  ```

  Keep all existing props on the existing elements unchanged — only change the grid class and insert the new cell.

- [ ] Update the `handleDetect` `onSuccess` handler to auto-suggest categories for newly detected properties. Replace the current block:

  ```tsx
  const newProps = proposed_custom_properties.filter((p) => !existingPaths.has(p.path))
  if (newProps.length > 0) {
    setCustomProps((prev) => [...prev, ...newProps])
  }
  ```

  With:

  ```tsx
  const newProps = proposed_custom_properties.filter((p) => !existingPaths.has(p.path))
  if (newProps.length > 0) {
    // Auto-suggest categories using regex config
    const allCategories = dimensionCategories as DimensionCategoryConfig[]
    const groups = groupDimensionsByCategory(
      newProps.map((p) => ({ value: p.name, label: p.name })),
      allCategories,
    )
    const categoryMap = new Map<string, string>()
    for (const group of groups) {
      for (const dim of group.dimensions) {
        categoryMap.set(dim.value, group.category.id)
      }
    }
    const propsWithCategory = newProps.map((p) => ({
      ...p,
      category: categoryMap.get(p.name),
    }))
    setCustomProps((prev) => [...prev, ...propsWithCategory])
  }
  ```

- [ ] Run TypeScript check:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema/apps/web && \
  npm run build 2>&1 | tail -20
  ```

  Expected: 0 errors.

- [ ] Run lint:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema/apps/web && \
  npm run lint 2>&1 | tail -20
  ```

  Expected: 0 warnings, 0 errors.

- [ ] Run the full test suite one final time:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema/apps/web && \
  npm run test:run 2>&1 | tail -20
  ```

  Expected: all tests pass.

- [ ] Commit:

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && \
  git add apps/web/frontend/features/connections/components/SchemaConfigTab.tsx && \
  git commit -m "feat: add category picker to SchemaConfigTab with auto-suggest on schema detect"
  ```
