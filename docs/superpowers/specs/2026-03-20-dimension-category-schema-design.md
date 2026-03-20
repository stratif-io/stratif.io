# Spec: Dimension Category Schema Mapping

**Date:** 2026-03-20
**Status:** Approved
**Branch:** `feature/dimension-category-schema`

---

## Goal

Store dimension category assignments per custom property in the database. Categories are auto-suggested during schema detection using the existing frontend regex config, and are user-editable in SchemaConfigTab. This enables dimension selectors throughout the app to use stored categories instead of re-running regex matching on every render.

---

## Section 1 — Data Model

### CustomProperty extension

`CustomProperty` gains one optional field:

- **Python** (`stratifio/api/connections/models.py`): `category: str | None = None`
- **TypeScript** (`apps/web/frontend/types/index.ts`): `category?: string`

### Storage

Categories are stored as part of the existing `custom_properties` JSON blob inside the `connection_schema_configs` table. No database migration is required — existing rows simply have no `category` field, and the backend defaults it to `None`.

### API behavior

- `GET /api/connections/{conn_id}/schema/detect` — no change; does not return category in the response
- `GET /api/connections/{conn_id}/schema` — already returns the full `custom_properties` blob, so `category` is included automatically once the model is updated
- `PUT /api/connections/{conn_id}/schema` — `category` travels with each property in the save payload; no new endpoints needed

### Client-side auto-suggestion on detect

When the user triggers schema detection, the frontend receives properties without category. It then runs each property's `name` through the existing `groupDimensionsByCategory` utility (backed by `dimension-categories.json`) to pre-fill category pickers before the user saves.

---

## Section 2 — SchemaConfigTab UI

### Row layout

Each custom property row is extended with an inline category cell:

```
Name | Path | Type | Category ▾ | ✕
```

The category cell is always visible (Option A — no hover-to-reveal).

### Category picker

- A small Popover dropdown listing the 7 category options, each with its emoji label (matching the existing dimension category config)
- An explicit "— none —" option maps to `null`/`undefined`, representing an uncategorized property
- Pattern follows existing pickers in the codebase (Popover + Command or simple select)
- No new shared component — the dropdown is local to the SchemaConfigTab row

### Auto-fill on detect

After schema detection returns, the frontend loops over the detected properties, passes each `name` through `groupDimensionsByCategory`, and pre-fills the `category` picker with the matched category id. The user can override before saving.

### Unchanged areas

Event name field, enabled toggles, and type overrides in SchemaConfigTab are not affected.

---

## Section 3 — Integration with Dimension Selectors

### How stored categories propagate

After save, `GET /api/connections/{conn_id}/schema` returns `category` per custom property. The existing `useSchemaData` hook exposes this data as-is to consumers.

### Change to `groupDimensionsByCategory`

`apps/web/frontend/lib/utils/dimensionCategories.ts` is updated so that when a `DimensionOption` already carries a `category` field, it is placed directly into that category bucket without running the regex. The regex config remains the fallback for dimensions that have no stored category (e.g. standard event properties).

```
if (dimension.category) {
  // use stored value — skip regex
} else {
  // fall back to regex matching against dimension-categories.json
}
```

### Downstream benefits (no direct changes needed)

Because `DimensionTreeSelect` already groups by category via `groupDimensionsByCategory`, user overrides saved in SchemaConfigTab automatically propagate to:

- TrendsPage
- TrendFilters
- PivotTable
- FilterConfigTab

---

## Files Affected

### Backend

| File | Change |
|------|--------|
| `stratifio/api/connections/models.py` | Add `category: str | None = None` to `CustomProperty` |

### Frontend

| File | Change |
|------|--------|
| `apps/web/frontend/types/index.ts` | Add `category?: string` to `CustomProperty` type |
| `apps/web/frontend/lib/utils/dimensionCategories.ts` | Extend `groupDimensionsByCategory` to use stored category when present |
| `apps/web/frontend/features/connections/components/SchemaConfigTab.tsx` | Add inline category picker per custom property row; auto-fill on detect |
| `apps/web/frontend/lib/schemas/` | Update Zod schema for `CustomProperty` to include optional `category` |

---

## Out of Scope

- No new API endpoints
- No database migration
- No changes to schema detect endpoint response
- No direct changes to TrendsPage, TrendFilters, PivotTable, or FilterConfigTab (they benefit automatically via `DimensionTreeSelect`)
