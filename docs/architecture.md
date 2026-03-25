# Backend Architecture

Internal developer reference for the stratif.io Analytics Python backend.

---

## 1. Layer Map

```
backend/
├── api/            HTTP boundary — FastAPI routers
├── services/       Business logic
├── backends/       Database-specific adapters
├── product_db/     Product database (connections, credentials, config)
└── core/           Cross-cutting: auth, middleware, logging
```

### `api/`

FastAPI routers. Responsibility: translate HTTP request parameters into service calls and return JSON responses. Routers must never contain SQL, dialect-specific logic, or business rules. Each analytics router receives an `AnalyticsDatabaseDep` (i.e. `get_analytics_db`) and a `CurrentUser` dependency wired at include time.

Routers: `trend`, `retention`, `events`, `paths`, `conversion`, `pivot`, `sessions`, `connections`, `mission_control`.

### `services/`

Business logic that sits between the routers and the database adapters.

| Module | Responsibility |
|---|---|
| `analytics_db.py` | `AnalyticsDatabase` wrapper and `open_analytics_db` factory |
| `connection_executor.py` | `get_analytics_db` FastAPI dependency |
| `sql_builder.py` | Helper functions that delegate SQL fragment generation to the active backend |
| `crypto.py` | Fernet-based credential encryption/decryption |
| `pool.py` | In-process connection pool (TTL-based) for long-lived backends |
| `path_analyzer.py` | Path analysis business logic |
| `transpiler.py` | SQL dialect transpilation utilities |

### `backends/`

One sub-package per supported database. Each implements the `DatabaseBackend` Protocol defined in `backends/base.py`. The registry in `backends/__init__.py` maps `db_type` strings to singleton backend instances. Service code always goes through the registry — it never imports a concrete backend class directly.

Registered backends: `duckdb`, `sqlite`, `postgresql`, `databricks`, `snowflake`, `clickhouse`.

### `product_db/`

Stores connection metadata, encrypted credentials, schema configs, and filter configs. Currently implemented as `SQLiteProductDB` (SQLite file at `STRATIFIO_PRODUCT_DB_PATH`). The `ProductDB` Protocol in `product_db/base.py` defines the interface; the concrete implementation is selected at startup by `get_product_db()` in `product_db/deps.py`.

### Layer boundary rules

- Routers call services; services call backends. No layer skips another.
- SQL fragments are produced by backend methods, never hardcoded in service or router code.
- `if dialect == "x"` branching is forbidden in service/router code — dialect differences belong inside the backend class.

---

## 2. DatabaseBackend Protocol

Defined in `backend/backends/base.py` as a `@runtime_checkable` Protocol. Every backend must implement all methods; there is no base class with default implementations.

### Properties

| Property | Type | Purpose |
|---|---|---|
| `dialect_name` | `str` | Human-readable dialect string, e.g. `"duckdb"`, `"postgresql"` |
| `identifier_quote_char` | `str` | Quote character for identifiers (`"` or `` ` ``) |
| `use_pool` | `bool` | Whether connections should be reused via `services/pool.py` |

### Connection methods

| Method | Purpose |
|---|---|
| `parse_credentials(raw: dict) -> BaseModel` | Validate and coerce raw credential dict into a typed Pydantic model |
| `connection_string(credentials) -> str \| None` | Build a DSN string if the driver accepts one |
| `open(credentials, read_only=True) -> Any` | Open and return a live connection |
| `pool_key(connection_id, credentials) -> tuple` | Stable cache key for the pool; typically `(db_type, connection_id)` |
| `is_connection_error(exc) -> bool` | Return `True` if `exc` signals a dropped/stale connection |

### Schema introspection methods

| Method | Purpose |
|---|---|
| `get_table_columns(conn, table_expr) -> frozenset[str]` | Column names for a table |
| `table_exists(conn, table_name) -> bool` | Check table existence |
| `get_tables(conn) -> list[str]` | All table names visible to the connection |
| `get_columns_for_browse(conn, table) -> list[str]` | Column list for the schema browser |
| `browse(conn, catalog, schema) -> list[dict]` | Tree-structured schema metadata |
| `detect_schema(conn, events_table_hint) -> SchemaInfo` | Auto-detect events table and column mapping |

### Query execution

| Method | Purpose |
|---|---|
| `execute(conn, query, params) -> list[tuple]` | Run a parameterised query and return rows. Backends that require `%s` placeholders (e.g. PostgreSQL) convert from `?` internally. |

### SQL fragment generators

These methods return dialect-correct SQL strings. All callers use these instead of hardcoding syntax.

| Method | Returns |
|---|---|
| `build_events_cte(source_table, uid_field, ts_field, en_field, custom_props) -> str` | CTE body that remaps non-standard column names to `user_id`, `timestamp`, `event_name` |
| `prepend_events_cte(cte_body, query) -> str` | Wrap a query with `WITH events AS (...)` |
| `date_trunc(unit, col) -> str` | e.g. `DATE_TRUNC('day', col)` |
| `date_diff_days(start, end) -> str` | Day difference expression |
| `epoch_diff_seconds(start, end) -> str` | Epoch second difference |
| `interval_minutes_exceeded(earlier, later, minutes) -> str` | Boolean expression for session gap detection |
| `string_concat(*parts) -> str` | String concatenation |
| `cast_to_text(expr) -> str` | Cast expression to text/varchar |
| `json_extract_string(col, key) -> str` | Extract a string value from a JSON column |
| `extract_hour(col) -> str` | Hour extraction |
| `extract_day_of_week(col) -> str` | Day-of-week extraction |
| `extract_year(col) -> str` | Year extraction |
| `extract_month(col) -> str` | Month extraction |
| `extract_week(col) -> str` | Week extraction |
| `extract_quarter(col) -> str` | Quarter extraction |

### Adding a new backend

1. Create `backend/backends/<name>/` with an `__init__.py` implementing all Protocol methods.
2. Create `backend/backends/<name>/credentials.py` with a Pydantic model for the credentials.
3. Register the backend in `backend/backends/__init__.py`:
   ```python
   from backend.backends.<name> import <Name>Backend
   _register("<name>", <Name>Backend())
   ```
4. Never use `if dialect == "<name>"` branching in service or router code. Any dialect-specific behaviour belongs exclusively in the new backend class.

---

## 3. Connection Lifecycle

### Credential storage

Credentials are encrypted with Fernet (AES-128-CBC + HMAC-SHA256) by `services/crypto.py`. The encryption key is derived by SHA-256-hashing `STRATIFIO_ENCRYPTION_KEY` (a 32+ character string) and base64url-encoding the result to produce a valid Fernet key. Encrypted tokens are stored in the `connections.credentials_encrypted` column of the product DB. The plaintext key never touches disk or logs.

### Per-request flow

```
HTTP request
  → get_analytics_db (connection_executor.py)
      → open_analytics_db (analytics_db.py)
          1. Fetch connection row from product DB
          2. decrypt_credentials(row["credentials_encrypted"])
          3. backend.parse_credentials(raw_dict)  → typed credentials model
          4. if backend.use_pool:
               conn = _pool_get(pool_key, lambda: backend.open(credentials))
             else:
               conn = backend.open(credentials, read_only=True)
          5. Resolve schema config (field remapping, custom properties)
          6. Build events CTE if column remapping is required
          7. Construct AnalyticsDatabase(conn, backend, events_cte, ...)
  → router handler calls db.execute(query, params)
  → finally: db.close()  (no-op for pooled connections; closes socket for non-pooled)
```

### Connection pool (`services/pool.py`)

Backends with `use_pool = True` (PostgreSQL, Databricks, Snowflake, ClickHouse) reuse connections across requests. The pool is an in-process dict keyed by `backend.pool_key(connection_id, credentials)`. Entries expire after a 600-second TTL; a stale entry is closed and a fresh connection is opened. `AnalyticsDatabase.close()` is a no-op for pooled instances — the connection stays alive for the next request.

Backends with `use_pool = False` (DuckDB, SQLite) open a fresh connection per request and close it in the `finally` block of `get_analytics_db`.

If a pooled connection raises an error that `backend.is_connection_error()` recognises as a dropped connection, `AnalyticsDatabase.execute()` raises HTTP 503 so the client can retry.

---

## 4. SQL Building Pipeline

```
Router params
  → AnalyticsDatabase.execute(query, params)
      → if events_cte: backend.prepend_events_cte(cte_body, query)
      → backend.execute(conn, final_query, params)
          → returns list[tuple]
```

SQL fragments (date truncation, JSON extraction, interval arithmetic, etc.) are assembled in `services/sql_builder.py`, which calls the appropriate backend method for each fragment. This keeps all dialect-specific syntax inside the backend classes.

The `?` character is the universal placeholder convention used throughout service and router code. Backends that require a different placeholder (e.g. PostgreSQL uses `%s`) perform the substitution internally inside their `execute()` method.

When a connection has schema remapping configured (non-standard column names or a non-`events` source table), `open_analytics_db` calls `backend.build_events_cte(...)` to produce a CTE body. `AnalyticsDatabase.execute()` then calls `backend.prepend_events_cte(cte_body, query)` before every execution, so all downstream SQL can reference the canonical `events` virtual table regardless of the underlying schema.

---

## 5. Auth Model

Auth is handled by the `get_current_user` dependency in `backend/core/auth.py`.

### OSS mode (default)

`STRATIFIO_AUTH_ENABLED` defaults to `False`. When disabled, `get_current_user` is a no-op — every request proceeds without authentication. This is appropriate for local development and self-hosted single-user deployments.

When `STRATIFIO_AUTH_ENABLED=True`, the dependency checks the `X-API-Key` request header against `STRATIFIO_API_KEY`. A mismatch raises HTTP 401.

### Wiring

`get_current_user` is added as a router-level dependency on the 7 analytics routers (trend, retention, events, paths, conversion, pivot, sessions) at router initialization via `dependencies=[Depends(get_current_user)]`. The `connections` and `mission_control` routers are currently NOT protected by `get_current_user`; they are admin endpoints accessible without authentication in the OSS implementation.

### SaaS JWT override

In a SaaS deployment, replace the OSS dependency with a JWT verifier without touching router code:

```python
app.dependency_overrides[get_current_user] = jwt_verifier
```

The `ProductDBDep` parameter accepted by `get_current_user` is available to the override function for user lookups.

---

## 6. DI / Injection Map

All injectable dependencies support `app.dependency_overrides` for test isolation. Never call the provider functions directly in tests.

| Injectable | Provider function | How to override in tests |
|---|---|---|
| Product DB | `get_product_db()` in `backend/product_db/deps.py` | `app.dependency_overrides[get_product_db] = lambda: FakeProductDB()` |
| Backend registry | `get_backend_registry()` in `backend/backends/deps.py` | `app.dependency_overrides[get_backend_registry] = lambda: {"duckdb": MockBackend()}` |
| Analytics DB | `get_analytics_db()` in `backend/services/connection_executor.py` | `app.dependency_overrides[get_analytics_db] = lambda: mock_db` |
| Auth | `get_current_user()` in `backend/core/auth.py` | `app.dependency_overrides[get_current_user] = lambda: None` |

`get_product_db` is decorated with `@lru_cache` so a single `ProductDB` instance is shared for the lifetime of the process. The `@lru_cache` is bypassed automatically when `dependency_overrides` is used — override the FastAPI dependency, not the cached function.

### Request flow with all dependencies resolved

```
HTTP request
  ↓
RequestIdMiddleware          binds request_id to structlog context
  ↓
CORSMiddleware
  ↓
Router handler
  ├── get_current_user()     → auth check (or no-op)
  ├── get_product_db()       → SQLiteProductDB (or override)
  ├── get_backend_registry() → dict[str, DatabaseBackend]
  └── get_analytics_db()     → AnalyticsDatabase (wraps connection)
        calls open_analytics_db(connection_id, product_db, registry)
```
