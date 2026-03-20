# Filter Config Category Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Forward the stored `category` field from `CustomProperty` into `FilterConfigTab`'s `DimensionOption` array so that `groupDimensionsByCategory` uses the user-assigned category instead of falling back to regex matching.

**Architecture:** Single file change in `FilterConfigTab.tsx` — replace the flat `candidates: string[]` with a typed `candidateOptions: DimensionOption[]` that includes `category` per custom property. The three core fields (user_id, timestamp, event_name) have no stored category and continue to use regex grouping as before.

**Tech Stack:** React 18, TypeScript, Vitest

**Prerequisite:** Branch `feature/dimension-category-schema` must be merged before implementing this plan. That branch adds `category?: string` to `CustomProperty` and `DimensionOption`, and the short-circuit logic in `groupDimensionsByCategory`.

---

## Files Affected

| File | Change |
|------|--------|
| `apps/web/frontend/features/connections/components/FilterConfigTab.tsx` | Replace `candidates: string[]` with `candidateOptions: DimensionOption[]`; add `DimensionOption` to import; update length guard and JSX call |

---

## Task 1: Forward stored category in FilterConfigTab

**Files:**
- Modify: `apps/web/frontend/features/connections/components/FilterConfigTab.tsx`

### Background

Current code (lines 19, 55–62, 147, 153–156 of `FilterConfigTab.tsx`):

```tsx
// Line 19 — import (no DimensionOption)
import type { FilterField, DimensionCategoryConfig } from '@/types'

// Lines 55–62 — flat string array
const candidates: string[] = schema
  ? [
      schema.user_id_field,
      schema.timestamp_field,
      schema.event_name_field,
      ...schema.custom_properties.map((p) => p.name),
    ]
  : []

// Line 147 — empty-state guard
{candidates.length === 0 ? (

// Lines 153–156 — grouping call
groupDimensionsByCategory(
  candidates.map((f) => ({ value: f, label: f })),
  CATEGORIES,
)
```

### Steps

- [ ] **Step 1: Verify prerequisite — `feature/dimension-category-schema` is merged**

```bash
grep "category\?" apps/web/frontend/types/index.ts | grep -E "DimensionOption|CustomProperty"
```

Expected: two lines showing `category?: string` on both `DimensionOption` and `CustomProperty`. If not found, stop — the `feature/dimension-category-schema` branch must be merged first before proceeding.

- [ ] **Step 2: Update the import — add `DimensionOption`**

Change line 19 from:
```tsx
import type { FilterField, DimensionCategoryConfig } from '@/types'
```
to:
```tsx
import type { FilterField, DimensionCategoryConfig, DimensionOption } from '@/types'
```

- [ ] **Step 3: Replace `candidates: string[]` with `candidateOptions: DimensionOption[]`**

Replace the `candidates` block (lines ~55–62) with:
```tsx
const candidateOptions: DimensionOption[] = schema
  ? [
      { value: schema.user_id_field, label: schema.user_id_field },
      { value: schema.timestamp_field, label: schema.timestamp_field },
      { value: schema.event_name_field, label: schema.event_name_field },
      ...schema.custom_properties.map((p) => ({
        value: p.name,
        label: p.name,
        category: p.category,
      })),
    ]
  : []
```

- [ ] **Step 4: Update the empty-state guard**

Change:
```tsx
{candidates.length === 0 ? (
```
to:
```tsx
{candidateOptions.length === 0 ? (
```

- [ ] **Step 5: Update the `groupDimensionsByCategory` call in JSX**

Change:
```tsx
groupDimensionsByCategory(
  candidates.map((f) => ({ value: f, label: f })),
  CATEGORIES,
)
```
to:
```tsx
groupDimensionsByCategory(candidateOptions, CATEGORIES)
```

- [ ] **Step 6: Verify TypeScript compiles with no errors**

```bash
npm run build 2>&1 | grep -E "error TS|ERROR|FilterConfigTab"
```

Expected: no TypeScript errors. If errors appear, check that `DimensionOption` is exported from `@/types` and that `CustomProperty.category` is typed as `string | undefined`.

- [ ] **Step 7: Run existing dimension category unit tests**

```bash
npm run test:run -- --reporter=verbose 2>&1 | grep -E "dimensionCategories|PASS|FAIL|✓|✗"
```

Expected: all `dimensionCategories` tests pass (including the stored-category short-circuit tests added in `feature/dimension-category-schema`).

- [ ] **Step 8: Commit**

```bash
git add apps/web/frontend/features/connections/components/FilterConfigTab.tsx
git commit -m "feat: forward stored category from CustomProperty into FilterConfigTab grouping"
```
