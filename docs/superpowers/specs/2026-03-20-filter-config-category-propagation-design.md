# Spec: Filter Config Category Propagation

**Date:** 2026-03-20
**Status:** Approved

---

## Goal

`FilterConfigTab` groups candidate fields by dimension category when displaying the global filter picker. Currently it ignores the `category` field stored on each `CustomProperty` and falls back to regex matching for every field. This spec fixes that by forwarding the stored category when building the `DimensionOption` array.

---

## Background

- `CustomProperty` gained an optional `category: string | undefined` field (see `2026-03-20-dimension-category-schema-design.md`).
- `groupDimensionsByCategory` already short-circuits regex when `DimensionOption.category` is set.
- `FilterConfigTab` builds its candidates as a flat `string[]` and maps each to `{ value: f, label: f }`, discarding category information.

---

## Design

### Single change: `FilterConfigTab.tsx`

Replace the flat `candidates: string[]` with a typed `candidateOptions: DimensionOption[]` that includes the stored `category` for each custom property.

**Before:**
```tsx
const candidates: string[] = schema
  ? [
      schema.user_id_field,
      schema.timestamp_field,
      schema.event_name_field,
      ...schema.custom_properties.map((p) => p.name),
    ]
  : []

// ...later in JSX...
groupDimensionsByCategory(
  candidates.map((f) => ({ value: f, label: f })),
  CATEGORIES,
)
```

**After:**
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

// ...later in JSX...
groupDimensionsByCategory(candidateOptions, CATEGORIES)
```

### Behaviour

- **Custom properties with a stored `category`** — placed directly into that category bucket; regex skipped.
- **Custom properties without a `category`** — regex fallback as before.
- **Core fields** (`user_id_field`, `timestamp_field`, `event_name_field`) — no `category` set; regex assigns them correctly as before (Time, User, Event).

### No other changes

- No backend changes.
- No new API endpoints.
- No schema migration.
- No changes to `groupDimensionsByCategory`, `DimensionOption`, or `CustomProperty` types (already support `category`).

---

## Files Affected

| File | Change |
|------|--------|
| `apps/web/frontend/features/connections/components/FilterConfigTab.tsx` | Replace `candidates: string[]` with `candidateOptions: DimensionOption[]`; forward `category` for custom properties |

---

## Out of Scope

- Assigning categories to core fields (`user_id_field` etc.) via UI — regex handles these correctly already.
- Any changes to how `FilterField` is stored or how `GlobalFilters` renders.
