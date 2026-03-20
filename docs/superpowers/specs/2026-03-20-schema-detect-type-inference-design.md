# Schema Detect: Type Inference by Data Sampling

**Date:** 2026-03-20
**Status:** Approved

## Summary

When schema detection proposes custom properties extracted from JSON/nested columns, infer their actual type (`number`, `timestamp`, `boolean`, `string`) by sampling real data values rather than defaulting everything to `"string"`. For example, a `total_amount` field inside a `properties` JSON column should be detected as `"number"`.

## Background

- `backend/backends/_utils.py` already has `infer_type(sql_type)` for top-level SQL columns.
- `backend/api/pivot.py` already uses `TRY_CAST` sampling to detect numeric properties at query time.
- Schema detect currently defaults all JSON-extracted properties to `"string"` because JSON has no SQL-level type info.

## Section 1 — Shared Sampling Utility

Add a new function to `backend/backends/_utils.py`:

```python
def sample_property_types(
    execute_fn,           # callable(sql: str) -> list[row] | None
    table: str,
    prop_exprs: dict[str, str],   # name → SQL expression
    numeric_cast: str,    # backend-specific cast template, e.g. "TRY_CAST({expr} AS DOUBLE)"
) -> dict[str, str]:      # name → inferred type (only upgraded properties)
```

**Behaviour:**

- Builds a single query: `SELECT MAX(<numeric_cast(expr)>) AS <name>, ... FROM (SELECT * FROM <table> LIMIT 500)`
- For each property: if the MAX result is non-null → type is `"number"`
- Returns only properties that were upgraded from `"string"` (empty dict means keep existing types)
- Wraps execution in `try/except` — any DB error returns `{}` (silent fallback, properties stay as `"string"`)
- Only called for properties currently typed as `"string"` (skips already-typed `number`, `boolean`, `timestamp`)

## Section 2 — Backend Integration

Three backends are updated to call `sample_property_types` inside `detect_schema`, after `proposed_custom_properties` is built.

### DuckDB (`backend/backends/duckdb/__init__.py`)

- `numeric_cast` template: `"TRY_CAST({expr} AS DOUBLE)"`
- JSON path expression: dot-notation (e.g. `properties.total_amount`)

### PostgreSQL (`backend/backends/postgresql/__init__.py`)

- `numeric_cast` template: `"(CASE WHEN {expr} ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN 1.0 ELSE NULL END)"`
- JSON path expression: `properties->>'field_name'`

### SQLite (`backend/backends/sqlite/__init__.py`)

- `numeric_cast` template: `"CASE WHEN TYPEOF(CAST({expr} AS REAL)) = 'real' AND {expr} IS NOT NULL AND {expr} != '' AND CAST({expr} AS TEXT) != '0' THEN 1.0 ELSE NULL END"`
- JSON path expression: `json_extract(properties, '$.field_name')`

## Section 3 — Calling Pattern in Each Backend

After building `proposed_custom_properties`, each backend applies the sampling upgrade:

```python
string_props = [p for p in proposed_custom_properties if p["type"] == "string"]
if string_props:
    prop_exprs = {p["name"]: <backend_expr(p)> for p in string_props}
    upgrades = sample_property_types(execute_fn, events_table, prop_exprs, NUMERIC_CAST)
    for p in proposed_custom_properties:
        if p["name"] in upgrades:
            p["type"] = upgrades[p["name"]]
```

## Files Affected

| File | Change |
|------|--------|
| `backend/backends/_utils.py` | Add `sample_property_types` function |
| `backend/backends/duckdb/__init__.py` | Call sampling after building `proposed_custom_properties` |
| `backend/backends/postgresql/__init__.py` | Call sampling after building `proposed_custom_properties` |
| `backend/backends/sqlite/__init__.py` | Call sampling after building `proposed_custom_properties` |

## Out of Scope

- Snowflake, ClickHouse, Databricks backends — no JSON property extraction currently; can be added later
- Timestamp inference by sampling — `TRY_CAST` to timestamp is dialect-fragile; name-based heuristics can be added later
- Frontend changes — type already flows through to `SchemaConfigTab`
- Boolean inference by sampling — rare in practice; `infer_type` already handles SQL `BOOL` columns
