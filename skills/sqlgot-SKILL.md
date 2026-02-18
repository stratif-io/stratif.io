---
name: sqlglot
description: "Use this skill for tasks involving SQLGlot directly: parsing SQL into an AST, using expression builders to construct a query programmatically, transpiling SQL between dialects, or extending sql_builder.py with a new dialect. Triggers: 'parse this SQL', 'build a query with SQLGlot', 'transpile from Postgres to BigQuery', 'add Snowflake support', 'what does this AST node mean'."
license: MIT
---

# SQLGlot Reference — OpenFlow Context

SQLGlot is used in OpenFlow for two purposes:

1. **`openflow/services/sql_builder.py`** — dialect-aware fragment generators (the primary pattern).
2. **`openflow/services/transpiler.py`** — fallback transpilation for externally-supplied SQL.

For new query code, **always prefer `sql_builder` helpers** over calling `sqlglot.transpile()`.

---

## Quick Reference

| Task | API |
|------|-----|
| Translate a SQL string | `sqlglot.transpile(sql, read="postgres", write="sqlite")[0]` |
| Parse to AST | `sqlglot.parse_one(sql, dialect="duckdb")` |
| Build query programmatically | `sqlglot.select("col").from_("events").where("…")` |
| Render AST to string | `expr.sql(dialect="sqlite")` |
| Validate syntax | `sqlglot.parse(sql, dialect="duckdb")` (raises on error) |

---

## Supported Dialects (lowercase identifiers)

| Engine | dialect string |
|--------|---------------|
| DuckDB | `"duckdb"` |
| PostgreSQL | `"postgres"` |
| MySQL | `"mysql"` |
| SQLite | `"sqlite"` |
| BigQuery | `"bigquery"` |
| Snowflake | `"snowflake"` |
| Redshift | `"redshift"` |
| SQL Server | `"tsql"` |
| Databricks | `"databricks"` |
| ClickHouse | `"clickhouse"` |

---

## Transpilation

```python
import sqlglot

# Convert a query from one dialect to another
postgres_sql = "SELECT DATE_TRUNC('month', created_at) FROM orders"
sqlite_sql = sqlglot.transpile(postgres_sql, read="postgres", write="sqlite")[0]
# → "SELECT STRFTIME('%Y-%m-01', created_at) FROM orders"
```

**Use transpilation for external SQL** (user-supplied queries, migrations).
**Use `sql_builder` helpers for internal queries** — they generate the right SQL directly.

---

## Expression Builder API

Build queries as an AST and render to any dialect:

```python
from sqlglot import exp, select

# Programmatic query construction
query = (
    select("user_id", "COUNT(*) AS event_count")
    .from_("events")
    .where("event_name = 'purchase'")
    .group_by("user_id")
    .having("COUNT(*) > 5")
    .order_by("event_count DESC")
)

# Render for different engines — no transpilation step needed
duckdb_sql   = query.sql(dialect="duckdb")
sqlite_sql   = query.sql(dialect="sqlite")
bigquery_sql = query.sql(dialect="bigquery")
```

### Key expression types

```python
from sqlglot import exp

# Columns and tables
col   = exp.Column(this=exp.Identifier(this="user_id"))
table = exp.Table(this=exp.Identifier(this="events"))

# Literals
s = exp.Literal.string("purchase")   # 'purchase'
n = exp.Literal.number(30)           # 30

# Comparisons
eq  = exp.EQ(this=col, expression=s)
gt  = exp.GT(this=col, expression=n)
and_= exp.And(this=eq, expression=gt)

# Date / time — these render correctly per dialect
trunc = exp.DateTrunc(unit=exp.Var(this="day"), this=col)
diff  = exp.DateDiff(unit=exp.Var(this="day"), this=col, expression=col2)
intvl = exp.Interval(this=exp.Literal.number(30), unit=exp.Var(this="MINUTE"))

# Aggregates
count  = exp.Count(this=exp.Star())
avg    = exp.Avg(this=col)
window = exp.Window(
    this=exp.Anonymous(this="LAG", expressions=[col]),
    partition_by=[col],
    order=exp.Order(expressions=[exp.Ordered(this=col)]),
)

# Cast
cast = exp.Cast(this=col, to=exp.DataType.build("TEXT"))
```

### Rendering

```python
expr.sql(dialect="sqlite", pretty=True)
```

---

## When to Use Expression Builders vs sql_builder Helpers

| Situation | Approach |
|-----------|----------|
| Adding a new fragment type to `sql_builder.py` that SQLGlot handles natively | Expression builder — write once, renders per dialect |
| Dialect has quirky rendering for a specific construct | String branch in `sql_builder.py` |
| Complex query with many dialect-specific parts | Expression builder, call `.sql(dialect=...)` |
| Simple query with 1–2 dialect-specific expressions | `sql_builder` helpers + f-string |
| Converting user-supplied SQL | `transpile_sql()` from `transpiler.py` |

---

## Extending sql_builder.py with Expression Builders

Instead of adding a new `elif dialect == "…"` branch, you can use the expression builder when SQLGlot handles the construct natively:

```python
# sql_builder.py — add a new helper using expression builder
from sqlglot import exp

def timestamp_add(col_expr: str, value: int, unit: str, dialect: str = "duckdb") -> str:
    """Add an interval to a timestamp."""
    expr = exp.DateAdd(
        this=exp.Column(this=exp.Identifier(this=col_expr)),
        expression=exp.Interval(
            this=exp.Literal.number(value),
            unit=exp.Var(this=unit.upper()),
        ),
    )
    return expr.sql(dialect=dialect)
```

This approach is preferred when SQLGlot's dialect-specific rendering is known to be correct.

---

## AST Inspection

```python
from sqlglot import parse_one, exp

sql    = "SELECT a, b FROM t WHERE a > 10"
parsed = parse_one(sql, dialect="duckdb")

# Extract tables
tables  = [t.name for t in parsed.find_all(exp.Table)]
# Extract columns
columns = [c.name for c in parsed.find_all(exp.Column)]
# Find WHERE clause
where   = parsed.find(exp.Where)

# Pretty-print AST
print(parsed.dump())
```

---

## Resources

- GitHub: https://github.com/tobymao/sqlglot
- Dialect map: https://sqlglot.com/sqlglot/dialects.html
- Expression API: https://sqlglot.com/sqlglot/expressions.html
