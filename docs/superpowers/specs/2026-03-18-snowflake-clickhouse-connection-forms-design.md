# Snowflake & ClickHouse Connection Forms — Design Spec

## Overview

Add Snowflake and ClickHouse as selectable database types in the connection configuration UI. This is a purely additive frontend change: extend the `DbType` union, add credential field definitions to the create and edit forms, and wire up `buildCredentials()` for each new type.

---

## 1. Type System

**File:** `frontend/types/index.ts`

Extend the existing `DbType` union:

```typescript
// Before
export type DbType = 'duckdb' | 'databricks' | 'postgresql' | 'sqlite'

// After
export type DbType = 'duckdb' | 'databricks' | 'postgresql' | 'sqlite' | 'snowflake' | 'clickhouse'
```

No other type changes are required — credentials are typed as `Record<string, unknown>` throughout.

---

## 2. Credential Fields

### Snowflake

Matches `SnowflakeCredentials` backend model (`account`, `user`, `password`, `warehouse`, `database`, `schema`, `role`).

| Field | Input type | Default | Required | Notes |
|---|---|---|---|---|
| `account` | plain | — | yes | e.g. `xy12345.us-east-1` |
| `user` | plain | — | yes | |
| `password` | masked | — | yes | |
| `warehouse` | plain | — | yes | e.g. `COMPUTE_WH` |
| `database` | plain | — | yes | |
| `schema` | plain | — | yes | |
| `role` | plain | — | no | Optional Snowflake role |

### ClickHouse

Matches `ClickHouseCredentials` backend model (`host`, `port`, `database`, `user`, `password`, `secure`). `always_final` is an internal backend flag and is not exposed in the UI.

| Field | Input type | Default | Required | Notes |
|---|---|---|---|---|
| `host` | plain | — | yes | |
| `port` | plain | `8443` | yes | |
| `database` | plain | — | yes | |
| `user` | plain | — | yes | |
| `password` | masked | — | yes | |
| `secure` | checkbox | `true` | yes | TLS on/off |

---

## 3. Components to Modify

### `ConnectionFormDialog.tsx` (create flow)

1. Add `'snowflake'` and `'clickhouse'` to the db_type dropdown options with labels "Snowflake" and "ClickHouse".
2. Add Snowflake and ClickHouse field blocks to the conditional credential section (follows the existing `db_type === 'postgresql'` / `db_type === 'databricks'` pattern).
3. Extend `buildCredentials()` to handle the two new types:
   - Snowflake: pass all 7 fields; omit `role` key entirely if the field value is an empty string.
   - ClickHouse: pass all 6 fields; convert `port` to number; read `secure` via `(element as HTMLInputElement).checked` to get a boolean (not `FormData.get()` which returns `'on'`/`null`).
4. Snowflake `password` in the create form uses `<Input type="password">` (same as other types). `MaskedInput` is only used in the edit flow (`ConnectionConfigTab`).

### `ConnectionConfigTab.tsx` (edit flow)

1. Add Snowflake and ClickHouse credential field blocks to the conditional edit section (same pattern as existing types).
2. Snowflake `password` and ClickHouse `password` use `MaskedInput` — existing masked field behaviour applies (clears on focus, unchanged masked values are not re-submitted).
3. ClickHouse `port` in the edit form: pass `placeholder="8443"` on the `PlainInput` so the hint is visible if the stored value is null. No pre-population needed — the backend default handles it.
3. ClickHouse `secure` field: render as a checkbox. The form's `onInput` bubble does not fire for checkboxes in React — wire the checkbox directly with `onChange={() => saveCredentials()}`. Read the value via `(element as HTMLInputElement).checked` (boolean), not `FormData.get()` which returns `'on'`/`null`.
4. Snowflake `role` in the edit flow: same rule as create — omit the key from the submitted credentials object if the field value is an empty string, to avoid overwriting a previously set role with an empty string.

---

## 4. No Backend Changes Required

The backend API already accepts `db_type: "snowflake"` and `db_type: "clickhouse"` — both backends are registered in the registry. This change is purely additive on the frontend.

---

## 5. Files Changed

- `frontend/types/index.ts` — extend `DbType`
- `frontend/features/connections/components/ConnectionFormDialog.tsx` — dropdown + create fields + `buildCredentials()`
- `frontend/features/connections/components/ConnectionConfigTab.tsx` — edit fields
