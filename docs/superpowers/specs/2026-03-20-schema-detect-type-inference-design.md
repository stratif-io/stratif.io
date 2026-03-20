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
- For each property: if the MAX result is non-null → type is `"number"` (the dict value is the string `"number"`)
- Returns only properties that were upgraded (empty dict = no upgrades, keep all existing types)
- Wraps execution in `try/except` — any DB error returns `{}` (silent fallback, properties stay as `"string"`)
- Only called for properties currently typed as `"string"` (skips already-typed `number`, `boolean`, `timestamp`)

## Section 2 — Backend Integration

Three backends are updated to call `sample_property_types` inside `detect_schema`, after `proposed_custom_properties` is built.

### DuckDB (`backend/backends/duckdb/__init__.py`)

- `numeric_cast` template: `"TRY_CAST({expr} AS DOUBLE)"` — same as `pivot.py`
- JSON path expression: built as `json_extract_string("<col>", '$.<field>')` where `col` and `field` are split from `p["path"]` on the first dot (e.g. path `properties.total_amount` → `json_extract_string("properties", '$.total_amount')`)

### PostgreSQL (`backend/backends/postgresql/__init__.py`)

- `numeric_cast` template (use raw string in Python to avoid double-escaping): `r"(CASE WHEN {expr} ~ '^-?[0-9]+(\.[0-9]+)?$' THEN 1.0 ELSE NULL END)"`
- JSON path expression: built as `<col>->>'<field>'` split from `p["path"]` (e.g. `properties->>'total_amount'`)

### SQLite (`backend/backends/sqlite/__init__.py`)

- `numeric_cast` template: `"CASE WHEN {expr} GLOB '[0-9]*' OR {expr} GLOB '-[0-9]*' OR {expr} GLOB '[0-9]*.[0-9]*' OR {expr} GLOB '-[0-9]*.[0-9]*' THEN 1.0 ELSE NULL END"`
  - Note: avoids `TYPEOF(CAST(...))` which always returns `'real'` in SQLite due to type affinity coercion. GLOB patterns match integers and decimals, positive and negative. Scientific notation is not matched (acceptable for a heuristic).
- JSON path expression: built as `json_extract(<col>, '$.<field>')` split from `p["path"]` (e.g. `json_extract(properties, '$.total_amount')`)

## Section 3 — Calling Pattern in Each Backend

After building `proposed_custom_properties`, each backend applies the sampling upgrade:

```python
# Each backend defines NUMERIC_CAST and build_expr(p) per the templates above
string_props = [p for p in proposed_custom_properties if p["type"] == "string"]
if string_props:
    prop_exprs = {p["name"]: build_expr(p) for p in string_props}
    upgrades = sample_property_types(execute_fn, events_table, prop_exprs, NUMERIC_CAST)
    # upgrades maps name → "number" for each upgraded property
    for p in proposed_custom_properties:
        if p["name"] in upgrades:
            p["type"] = upgrades[p["name"]]
```

Where `build_expr(p)` splits `p["path"]` on the first dot to get `(col, field)` and formats the backend-specific JSON extraction expression (see Section 2). For `execute_fn`, each backend wraps its own connection execution: DuckDB passes `lambda sql: conn.execute(sql).fetchall()`, PostgreSQL passes a cursor-based equivalent.

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
