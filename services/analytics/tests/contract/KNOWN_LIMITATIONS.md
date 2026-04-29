# Contract Test Known Limitations

## Databricks (stub-based)

Tests use a DuckDB-backed stub instead of a real Databricks workspace.

**Not covered:**

- Databricks-specific SQL: `SHOW CATALOGS`, `DESCRIBE TABLE EXTENDED`, Unity Catalog paths
- Backtick identifier quoting with Databricks-specific reserved words
- `MAP`, `STRUCT`, `ARRAY` type inference — maps to DuckDB equivalents, may differ
- `interval_minutes_exceeded` uses DuckDB interval arithmetic; Databricks timestamp arithmetic may differ
- Connection pool TTL behaviour (stub connections don't time out)

**Covered:**

- Credential parsing and connection open/close flow
- Query execution and result shape (rows + description)
- All 13 dialect method SQL string outputs
- Schema detection against a seeded DuckDB table

Run `databricks-live.yml` workflow for full validation against a real workspace.
