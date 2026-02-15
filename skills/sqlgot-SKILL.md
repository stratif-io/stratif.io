---
name: sqlglot
description: "Use this skill for SQL query translation, optimization, and dialect conversion tasks using SQLGlot. Triggers include: writing SQL queries for different database dialects (Snowflake, BigQuery, Redshift, Databricks, PostgreSQL, MySQL, etc.), translating SQL between dialects, optimizing SQL queries, parsing and analyzing SQL syntax, generating SQL programmatically, creating custom SQL transformations, building queries for dashboarding tools (Tableau, Looker, Power BI, Metabase), or any task involving multi-dialect SQL code generation. Use when the user mentions 'SQLGlot', 'SQL dialect', 'translate SQL', 'data warehouse query', or needs portable SQL code that works across different database systems."
license: MIT
---

# SQLGlot Expert Skill

## Overview

SQLGlot is a Python library for SQL parsing, transpilation, and optimization. It supports 20+ SQL dialects and enables seamless translation between them, making it essential for:

- **Multi-cloud data platforms**: Write once, run on Snowflake, BigQuery, Redshift, Databricks
- **Query optimization**: Analyze and improve SQL performance
- **Dashboarding tools**: Generate dialect-specific queries for BI tools
- **Data migrations**: Convert queries when moving between database systems
- **SQL validation**: Parse and validate syntax across dialects

## Quick Reference

| Task | Approach |
|------|----------|
| Translate SQL between dialects | `sqlglot.transpile()` |
| Parse SQL to AST | `sqlglot.parse_one()` or `sqlglot.parse()` |
| Optimize queries | `sqlglot.optimizer.optimize()` |
| Generate SQL programmatically | Use expression builders |
| Validate syntax | Parse and catch exceptions |
| Custom transformations | Subclass `sqlglot.expressions.Expression` |

---

## Installation and Setup

```bash
pip install sqlglot --break-system-packages
```

### Basic Usage

```python
import sqlglot
from sqlglot import exp, parse_one
from sqlglot.optimizer import optimize

# Simple transpilation
sql = "SELECT * FROM users WHERE id = 1"
snowflake_sql = sqlglot.transpile(sql, read="postgres", write="snowflake")[0]

# Parse to AST
parsed = parse_one(sql, read="postgres")

# Optimize query
optimized = optimize(parsed, schema=schema_dict)
```

---

## Supported Dialects

SQLGlot supports 20+ SQL dialects. Key data warehouse dialects:

### Cloud Data Warehouses
- **Snowflake** (`snowflake`)
- **BigQuery** (`bigquery`)
- **Redshift** (`redshift`)
- **Databricks** (`databricks`)
- **Azure Synapse** (`tsql`)

### Traditional Databases
- **PostgreSQL** (`postgres`)
- **MySQL** (`mysql`)
- **Oracle** (`oracle`)
- **SQL Server** (`tsql`)
- **SQLite** (`sqlite`)

### Analytics & Other
- **Presto/Trino** (`presto`, `trino`)
- **Hive** (`hive`)
- **Spark** (`spark`)
- **DuckDB** (`duckdb`)
- **ClickHouse** (`clickhouse`)

### Dialect String Reference
Always use the lowercase dialect identifier:
```python
# CORRECT
sqlglot.transpile(sql, read="bigquery", write="snowflake")

# INCORRECT
sqlglot.transpile(sql, read="BigQuery", write="Snowflake")
```

---

## Core Workflows

### 1. Translating SQL Between Dialects

```python
import sqlglot

# BigQuery to Snowflake
bigquery_sql = """
SELECT 
    user_id,
    DATE_TRUNC(created_at, MONTH) as month,
    ARRAY_AGG(order_id) as orders
FROM `project.dataset.orders`
WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY 1, 2
"""

snowflake_sql = sqlglot.transpile(
    bigquery_sql,
    read="bigquery",
    write="snowflake"
)[0]

print(snowflake_sql)
# Output:
# SELECT
#   user_id,
#   DATE_TRUNC('MONTH', created_at) AS month,
#   ARRAY_AGG(order_id) AS orders
# FROM project.dataset.orders
# WHERE created_at >= DATEADD(day, -30, CURRENT_DATE())
# GROUP BY 1, 2
```

### 2. Parsing and Analyzing SQL

```python
from sqlglot import parse_one, exp

sql = "SELECT a, b FROM table1 JOIN table2 ON table1.id = table2.id WHERE a > 10"
parsed = parse_one(sql, read="postgres")

# Extract all table names
tables = [table.name for table in parsed.find_all(exp.Table)]
print(tables)  # ['table1', 'table2']

# Extract all column references
columns = [col.name for col in parsed.find_all(exp.Column)]
print(columns)  # ['a', 'b', 'id', 'id', 'a']

# Find WHERE clause
where = parsed.find(exp.Where)
print(where.sql())  # "WHERE a > 10"
```

### 3. Query Optimization

```python
from sqlglot import parse_one
from sqlglot.optimizer import optimize

sql = """
SELECT *
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.country = 'US'
  AND o.total > 100
"""

# Define schema for optimization
schema = {
    "users": {
        "id": "INT",
        "country": "VARCHAR",
        "name": "VARCHAR"
    },
    "orders": {
        "id": "INT",
        "user_id": "INT",
        "total": "DECIMAL"
    }
}

parsed = parse_one(sql)
optimized = optimize(parsed, schema=schema)

print(optimized.sql(pretty=True))
# Optimization will:
# - Push down predicates
# - Eliminate unused columns (SELECT * becomes specific columns)
# - Simplify expressions
# - Qualify column names
```

### 4. Building SQL Programmatically

```python
from sqlglot import exp, select

# Build a query using expression builders
query = (
    select("user_id", "COUNT(*) as order_count")
    .from_("orders")
    .where("status = 'completed'")
    .group_by("user_id")
    .having("COUNT(*) > 5")
    .order_by("order_count DESC")
)

# Generate for different dialects
postgres_sql = query.sql(dialect="postgres")
bigquery_sql = query.sql(dialect="bigquery")
```

### 5. Custom Transformations

```python
from sqlglot import exp, parse_one
from sqlglot.optimizer.scope import build_scope

sql = "SELECT a, b, c FROM table1"
parsed = parse_one(sql)

# Transform: Add a new column
parsed = parsed.select("d", append=True)

# Transform: Replace table name
for table in parsed.find_all(exp.Table):
    table.set("this", exp.Identifier(this="new_table_name"))

print(parsed.sql())
# SELECT a, b, c, d FROM new_table_name
```

---

## Dashboarding Tool Integration

### Common Patterns for BI Tools

Most dashboarding tools (Tableau, Looker, Power BI, Metabase) require SQL queries optimized for specific data warehouses. SQLGlot enables you to:

1. **Write portable queries** that work across tools
2. **Generate dialect-specific SQL** for each platform
3. **Validate syntax** before deploying to production

### Example: Multi-Dashboard Query Generation

```python
import sqlglot

# Base query in standard SQL
base_query = """
WITH monthly_sales AS (
    SELECT 
        DATE_TRUNC('month', order_date) as month,
        product_category,
        SUM(revenue) as total_revenue
    FROM sales
    WHERE order_date >= CURRENT_DATE - INTERVAL '1 year'
    GROUP BY 1, 2
)
SELECT 
    month,
    product_category,
    total_revenue,
    AVG(total_revenue) OVER (PARTITION BY product_category ORDER BY month 
                             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as rolling_avg
FROM monthly_sales
ORDER BY month DESC, total_revenue DESC
"""

# Generate for different data warehouses
dialects = {
    "Snowflake": "snowflake",
    "BigQuery": "bigquery",
    "Redshift": "redshift",
    "PostgreSQL": "postgres"
}

for platform, dialect in dialects.items():
    try:
        converted = sqlglot.transpile(base_query, write=dialect)[0]
        print(f"\n{'='*60}")
        print(f"{platform} SQL:")
        print(f"{'='*60}")
        print(converted)
    except Exception as e:
        print(f"Error converting to {platform}: {e}")
```

### Tableau-Specific Considerations

```python
# Tableau often uses Custom SQL in data sources
# Generate optimized queries with proper dialect

def generate_tableau_query(base_sql, warehouse_type):
    """
    Generate Tableau-compatible SQL with proper date handling
    """
    dialect_map = {
        "snowflake": "snowflake",
        "bigquery": "bigquery",
        "redshift": "redshift"
    }
    
    # Parse and optimize
    parsed = parse_one(base_sql)
    
    # Tableau parameters often use [Parameter Name] syntax
    # Ensure compatibility with your warehouse
    optimized_sql = sqlglot.transpile(
        base_sql,
        write=dialect_map[warehouse_type],
        pretty=True
    )[0]
    
    return optimized_sql

# Example usage
tableau_query = generate_tableau_query(
    "SELECT * FROM sales WHERE date >= CURRENT_DATE - 30",
    "snowflake"
)
```

### Looker LookML Generation

```python
def generate_looker_sql(dimension_name, sql_fragment, warehouse_dialect):
    """
    Generate SQL snippets for Looker dimension/measure definitions
    """
    # Looker uses ${TABLE}.column_name syntax
    # Generate dialect-specific SQL logic
    
    converted = sqlglot.transpile(
        sql_fragment,
        write=warehouse_dialect
    )[0]
    
    # Format for LookML
    lookml_sql = f"""
    dimension: {dimension_name} {{
        type: string
        sql: {converted} ;;
    }}
    """
    return lookml_sql
```

---

## Advanced Features

### Schema-Aware Optimization

```python
from sqlglot.optimizer import optimize
from sqlglot import parse_one

# Define comprehensive schema
schema = {
    "db": {
        "users": {
            "id": "BIGINT",
            "email": "VARCHAR",
            "created_at": "TIMESTAMP",
            "country": "VARCHAR"
        },
        "orders": {
            "id": "BIGINT",
            "user_id": "BIGINT",
            "total": "DECIMAL(10,2)",
            "order_date": "DATE"
        }
    }
}

sql = """
SELECT *
FROM db.users u
LEFT JOIN db.orders o ON u.id = o.user_id
WHERE u.country = 'US'
"""

parsed = parse_one(sql)
optimized = optimize(parsed, schema=schema)

# Optimizations include:
# - Column pruning (SELECT * → specific columns)
# - Predicate pushdown
# - Join elimination (if possible)
# - Subquery optimization
print(optimized.sql(pretty=True))
```

### Handling Dialect-Specific Features

```python
import sqlglot

# Some features don't translate perfectly
# Use error handling and fallbacks

def safe_transpile(sql, from_dialect, to_dialect):
    """
    Safely transpile SQL with error handling
    """
    try:
        result = sqlglot.transpile(
            sql,
            read=from_dialect,
            write=to_dialect,
            pretty=True
        )[0]
        return result, None
    except Exception as e:
        return None, str(e)

# Example: BigQuery STRUCT to Snowflake OBJECT
bigquery_struct = """
SELECT 
    user_id,
    STRUCT(name, email, phone) as user_info
FROM users
"""

snowflake_version, error = safe_transpile(bigquery_struct, "bigquery", "snowflake")
if error:
    print(f"Warning: {error}")
    # Provide manual conversion or guidance
```

### Custom SQL Dialect Extensions

```python
from sqlglot import exp, Generator, Dialect
from sqlglot.tokens import TokenType

# Extend SQLGlot for custom warehouse functions
class CustomDialect(Dialect):
    class Generator(Generator):
        # Override function generation
        TRANSFORMS = {
            **Generator.TRANSFORMS,
            exp.ArrayAgg: lambda self, e: f"CUSTOM_ARRAY_AGG({self.sql(e, 'this')})",
        }

# Use custom dialect
sql = "SELECT ARRAY_AGG(id) FROM users"
parsed = parse_one(sql)
custom_sql = parsed.sql(dialect=CustomDialect)
```

---

## Best Practices

### 1. Always Specify Dialects

```python
# GOOD: Explicit dialects
sql = sqlglot.transpile(query, read="postgres", write="snowflake")[0]

# BAD: Relying on defaults
sql = sqlglot.transpile(query)[0]  # Ambiguous source dialect
```

### 2. Validate Queries After Transpilation

```python
def transpile_and_validate(sql, from_dialect, to_dialect):
    """
    Transpile and validate the result parses correctly
    """
    # Transpile
    converted = sqlglot.transpile(sql, read=from_dialect, write=to_dialect)[0]
    
    # Validate by re-parsing
    try:
        parse_one(converted, dialect=to_dialect)
        return converted
    except Exception as e:
        raise ValueError(f"Transpilation produced invalid SQL: {e}")
```

### 3. Use Pretty Printing for Readability

```python
# Always use pretty=True for human-readable output
sql = sqlglot.transpile(query, write="snowflake", pretty=True)[0]
```

### 4. Handle Edge Cases

```python
# Not all features translate perfectly between dialects
# Document known limitations and provide workarounds

def convert_with_notes(sql, from_dialect, to_dialect):
    """
    Convert SQL and document any manual adjustments needed
    """
    notes = []
    
    try:
        converted = sqlglot.transpile(sql, read=from_dialect, write=to_dialect)[0]
        
        # Check for features that may need manual review
        parsed = parse_one(converted, dialect=to_dialect)
        
        # Check for CTEs (some optimizations may inline them)
        if parsed.find(exp.CTE):
            notes.append("CTE detected - verify optimization preserved intent")
        
        # Check for window functions
        if parsed.find(exp.Window):
            notes.append("Window function detected - verify frame clauses")
            
        return converted, notes
        
    except Exception as e:
        return None, [f"Error: {e}"]
```

### 5. Performance Optimization

```python
# For large-scale transpilation, parse once and reuse
from sqlglot import parse_one

def batch_transpile(queries, from_dialect, to_dialect):
    """
    Efficiently transpile multiple queries
    """
    results = []
    
    for query in queries:
        # Parse with source dialect
        parsed = parse_one(query, read=from_dialect)
        
        # Convert to target dialect
        converted = parsed.sql(dialect=to_dialect, pretty=True)
        results.append(converted)
    
    return results
```

---

## Common Dialect Translation Patterns

### Date/Time Functions

```python
# Different dialects handle dates differently
translations = {
    "BigQuery to Snowflake": {
        "DATE_TRUNC(date, MONTH)": "DATE_TRUNC('MONTH', date)",
        "CURRENT_DATE()": "CURRENT_DATE()",
        "DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)": "DATEADD(day, -30, CURRENT_DATE())"
    },
    "PostgreSQL to Redshift": {
        "NOW()": "GETDATE()",
        "CURRENT_TIMESTAMP": "GETDATE()",
        "date::DATE": "date::DATE"
    }
}

# SQLGlot handles these automatically
bigquery_sql = "SELECT DATE_TRUNC(created_at, MONTH) FROM orders"
snowflake_sql = sqlglot.transpile(bigquery_sql, read="bigquery", write="snowflake")[0]
```

### String Functions

```python
# String concatenation varies by dialect
examples = {
    "PostgreSQL": "first_name || ' ' || last_name",
    "MySQL": "CONCAT(first_name, ' ', last_name)",
    "SQL Server": "first_name + ' ' + last_name",
    "BigQuery": "CONCAT(first_name, ' ', last_name)"
}

# SQLGlot normalizes these
for dialect, sql in examples.items():
    query = f"SELECT {sql} as full_name FROM users"
    # Convert to Snowflake
    snowflake = sqlglot.transpile(query, read=dialect.lower().replace(" ", ""), write="snowflake")[0]
    print(f"{dialect} → Snowflake:\n{snowflake}\n")
```

### Array/List Functions

```python
# Arrays are handled differently across warehouses
array_examples = {
    "BigQuery": "ARRAY_AGG(id ORDER BY created_at)",
    "PostgreSQL": "ARRAY_AGG(id ORDER BY created_at)",
    "Snowflake": "ARRAY_AGG(id) WITHIN GROUP (ORDER BY created_at)",
    "Redshift": "LISTAGG(id, ',') WITHIN GROUP (ORDER BY created_at)"
}

# SQLGlot transpiles appropriately
bigquery_sql = "SELECT user_id, ARRAY_AGG(order_id) as orders FROM orders GROUP BY user_id"
for target_dialect in ["snowflake", "redshift", "postgres"]:
    result = sqlglot.transpile(bigquery_sql, read="bigquery", write=target_dialect)[0]
    print(f"BigQuery → {target_dialect}:\n{result}\n")
```

---

## Troubleshooting

### Common Issues

1. **Unsupported Syntax**
   ```python
   # Some dialect-specific features may not have direct equivalents
   # Handle gracefully and document workarounds
   try:
       converted = sqlglot.transpile(sql, read="oracle", write="postgres")[0]
   except Exception as e:
       print(f"Transpilation failed: {e}")
       # Provide manual conversion guidance
   ```

2. **Schema Information Missing**
   ```python
   # Optimization requires schema; provide it when available
   from sqlglot.optimizer import optimize
   
   schema = {...}  # Define your schema
   optimized = optimize(parsed, schema=schema)
   ```

3. **Ambiguous Column References**
   ```python
   # Always qualify columns in multi-table queries
   # SQLGlot's qualify_columns can help
   from sqlglot.optimizer.qualify_columns import qualify_columns
   
   qualified = qualify_columns(parsed, schema=schema)
   ```

### Debugging Tips

```python
# Enable verbose error messages
import logging
logging.basicConfig(level=logging.DEBUG)

# Inspect AST structure
from sqlglot import parse_one

sql = "SELECT * FROM users"
parsed = parse_one(sql)
print(parsed.transform(lambda n: print(type(n).__name__) or n))

# Pretty print AST
print(parsed.dump())
```

---

## Integration Examples

### Flask/FastAPI Endpoint

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sqlglot

app = FastAPI()

class TranspileRequest(BaseModel):
    sql: str
    from_dialect: str
    to_dialect: str

@app.post("/transpile")
async def transpile_sql(request: TranspileRequest):
    try:
        result = sqlglot.transpile(
            request.sql,
            read=request.from_dialect,
            write=request.to_dialect,
            pretty=True
        )[0]
        return {"success": True, "sql": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### CLI Tool

```python
#!/usr/bin/env python3
import argparse
import sqlglot

def main():
    parser = argparse.ArgumentParser(description="Transpile SQL between dialects")
    parser.add_argument("sql", help="SQL query to transpile")
    parser.add_argument("--from", dest="from_dialect", required=True, 
                       help="Source dialect")
    parser.add_argument("--to", dest="to_dialect", required=True,
                       help="Target dialect")
    parser.add_argument("--pretty", action="store_true",
                       help="Pretty print output")
    
    args = parser.parse_args()
    
    result = sqlglot.transpile(
        args.sql,
        read=args.from_dialect,
        write=args.to_dialect,
        pretty=args.pretty
    )[0]
    
    print(result)

if __name__ == "__main__":
    main()
```

---

## Resources

### Official Documentation
- **SQLGlot GitHub**: https://github.com/tobymao/sqlglot
- **Documentation**: https://sqlglot.com
- **API Reference**: https://sqlglot.com/sqlglot.html

### Learning Resources
- Browse dialect differences: https://sqlglot.com/sqlglot/dialects.html
- Expression tree reference: https://sqlglot.com/sqlglot/expressions.html

### Community
- GitHub Issues for bug reports and features
- Examples in the repository's `/tests` directory

---

## Summary

SQLGlot is the definitive tool for SQL dialect translation and optimization. Key capabilities:

✅ **Multi-dialect support**: 20+ SQL dialects including all major data warehouses  
✅ **Bidirectional translation**: Convert between any supported dialects  
✅ **Query optimization**: Schema-aware optimization for better performance  
✅ **Programmatic SQL**: Build queries using Python expressions  
✅ **BI tool integration**: Generate queries for Tableau, Looker, Power BI, etc.  
✅ **Custom transformations**: Extend for proprietary SQL dialects  

Use this skill whenever you need to write portable SQL code, migrate between databases, or generate dialect-specific queries for dashboarding tools.
