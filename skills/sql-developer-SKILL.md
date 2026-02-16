# SQL Analytics Backend Library Developer

## Overview
This skill enables Claude to act as an expert Python developer specializing in building modular, DRY (Don't Repeat Yourself) product analytics backend libraries using SQLGlot for SQL abstraction. The focus is on generating SQL code from filters, groups, windows, and other analytical parameters.

## Triggers
Use this skill when:
- Building or designing product analytics backend systems
- Creating SQL query generation libraries in Python
- Working with SQLGlot for SQL abstraction and manipulation
- Implementing filters, groupings, window functions, or aggregations programmatically
- Designing modular analytics query builders
- Converting analytics parameters to SQL queries
- Building data warehouse or analytics layer abstractions

## Core Principles

### 1. Modularity
- Break down query generation into composable components
- Each component should have a single, clear responsibility
- Components should be independently testable
- Use clear interfaces between modules

### 2. DRY (Don't Repeat Yourself)
- Extract common patterns into reusable functions
- Use inheritance and composition appropriately
- Centralize SQL dialect handling
- Create helper utilities for repeated operations

### 3. SQLGlot-First Approach
- Always use SQLGlot's AST (Abstract Syntax Tree) for query manipulation
- Leverage SQLGlot's expression builders rather than string concatenation
- Use SQLGlot's built-in dialect transpilation features
- Maintain type safety through SQLGlot's expression classes

## Library Architecture

### Essential Components

#### 1. **Query Builder Core**
```python
from sqlglot import exp, parse_one
from typing import Optional, List, Dict, Any

class QueryBuilder:
    """Core query builder using SQLGlot expressions."""
    
    def __init__(self, dialect: str = "postgres"):
        self.dialect = dialect
        self._select: Optional[exp.Select] = None
        
    def reset(self) -> 'QueryBuilder':
        """Reset the query builder state."""
        self._select = None
        return self
```

#### 2. **Filter Module**
Handle WHERE and HAVING clauses with composable filters:
```python
class FilterBuilder:
    """Build WHERE/HAVING conditions from filter specifications."""
    
    @staticmethod
    def build_condition(filter_spec: Dict[str, Any]) -> exp.Expression:
        """
        Convert filter specification to SQLGlot condition.
        
        Args:
            filter_spec: Dict with keys like 'column', 'operator', 'value'
        
        Returns:
            SQLGlot expression for the condition
        """
        pass
```

#### 3. **Group Module**
Handle GROUP BY and aggregations:
```python
class GroupBuilder:
    """Build GROUP BY clauses and aggregations."""
    
    @staticmethod
    def build_aggregation(agg_spec: Dict[str, Any]) -> exp.Expression:
        """Build aggregation expression (SUM, COUNT, AVG, etc.)."""
        pass
```

#### 4. **Window Module**
Handle window functions (OVER clauses):
```python
class WindowBuilder:
    """Build window function expressions."""
    
    @staticmethod
    def build_window(window_spec: Dict[str, Any]) -> exp.Window:
        """
        Build window function with PARTITION BY, ORDER BY, frame.
        
        Args:
            window_spec: Contains partition_by, order_by, frame_type, etc.
        """
        pass
```

#### 5. **Join Module**
Handle table joins:
```python
class JoinBuilder:
    """Build JOIN clauses."""
    
    @staticmethod
    def build_join(join_spec: Dict[str, Any]) -> exp.Join:
        """Build JOIN expression with conditions."""
        pass
```

## Implementation Guidelines

### SQLGlot Best Practices

1. **Use Expression Builders**
```python
# Good - Using SQLGlot expressions
column = exp.Column(this="user_id")
table = exp.Table(this="users")
condition = exp.EQ(this=column, expression=exp.Literal.number(123))

# Avoid - String concatenation
query = f"SELECT * FROM users WHERE user_id = {user_id}"  # Don't do this
```

2. **Compose Expressions**
```python
# Build complex conditions by composing
condition1 = exp.EQ(this=exp.Column(this="status"), expression=exp.Literal.string("active"))
condition2 = exp.GT(this=exp.Column(this="created_at"), expression=exp.Literal.string("2024-01-01"))
combined = exp.And(this=condition1, expression=condition2)
```

3. **Use Select Builder Pattern**
```python
from sqlglot import select

query = (
    select("user_id", "COUNT(*) as event_count")
    .from_("events")
    .where("event_type = 'click'")
    .group_by("user_id")
)
```

### Filter Specification Pattern

Design a flexible filter specification format:
```python
{
    "column": "revenue",
    "operator": "gte",  # greater than or equal
    "value": 1000,
    "type": "numeric"
}

# Support complex filters
{
    "logic": "and",
    "conditions": [
        {"column": "status", "operator": "eq", "value": "active"},
        {"column": "age", "operator": "between", "value": [18, 65]}
    ]
}
```

### Group/Aggregation Pattern

```python
{
    "dimensions": ["country", "device_type"],
    "metrics": [
        {"column": "revenue", "function": "sum", "alias": "total_revenue"},
        {"column": "user_id", "function": "count_distinct", "alias": "unique_users"}
    ]
}
```

### Window Function Pattern

```python
{
    "function": "row_number",
    "partition_by": ["user_id"],
    "order_by": [{"column": "event_time", "direction": "desc"}],
    "alias": "event_rank"
}
```

## Code Structure

### Recommended Directory Layout
```
analytics_backend/
├── __init__.py
├── core/
│   ├── __init__.py
│   ├── query_builder.py      # Main QueryBuilder class
│   └── base.py                # Base classes and interfaces
├── builders/
│   ├── __init__.py
│   ├── filter.py              # FilterBuilder
│   ├── group.py               # GroupBuilder
│   ├── window.py              # WindowBuilder
│   ├── join.py                # JoinBuilder
│   └── order.py               # OrderBuilder
├── utils/
│   ├── __init__.py
│   ├── operators.py           # Operator mapping utilities
│   ├── validators.py          # Input validation
│   └── type_handlers.py       # Type conversion utilities
├── dialects/
│   ├── __init__.py
│   └── registry.py            # Dialect-specific handling
└── exceptions.py              # Custom exceptions
```

## Key Patterns

### 1. Operator Mapping
Create a centralized operator registry:
```python
OPERATOR_MAP = {
    "eq": lambda col, val: exp.EQ(this=col, expression=val),
    "neq": lambda col, val: exp.NEQ(this=col, expression=val),
    "gt": lambda col, val: exp.GT(this=col, expression=val),
    "gte": lambda col, val: exp.GTE(this=col, expression=val),
    "lt": lambda col, val: exp.LT(this=col, expression=val),
    "lte": lambda col, val: exp.LTE(this=col, expression=val),
    "in": lambda col, val: exp.In(this=col, expressions=val),
    "like": lambda col, val: exp.Like(this=col, expression=val),
    "between": lambda col, val: exp.Between(
        this=col, low=val[0], high=val[1]
    ),
}
```

### 2. Function Registry
Map aggregation function names to SQLGlot expressions:
```python
AGGREGATION_MAP = {
    "sum": lambda col: exp.Sum(this=col),
    "avg": lambda col: exp.Avg(this=col),
    "count": lambda col: exp.Count(this=col),
    "count_distinct": lambda col: exp.Count(this=col, distinct=True),
    "min": lambda col: exp.Min(this=col),
    "max": lambda col: exp.Max(this=col),
}
```

### 3. Builder Chaining
Enable fluent interface for query construction:
```python
query = (
    QueryBuilder()
    .select(["user_id", "event_type"])
    .from_table("events")
    .add_filters(filter_specs)
    .add_groups(group_specs)
    .add_window_functions(window_specs)
    .build()
)
```

### 4. Validation Layer
Validate inputs before building:
```python
class Validator:
    @staticmethod
    def validate_filter_spec(spec: Dict) -> None:
        """Validate filter specification structure."""
        required_keys = ["column", "operator", "value"]
        if not all(k in spec for k in required_keys):
            raise ValueError(f"Filter spec missing required keys: {required_keys}")
        
        if spec["operator"] not in OPERATOR_MAP:
            raise ValueError(f"Unknown operator: {spec['operator']}")
```

## Testing Strategy

### Unit Tests
Test each builder component independently:
```python
def test_filter_builder_equality():
    filter_spec = {"column": "status", "operator": "eq", "value": "active"}
    condition = FilterBuilder.build_condition(filter_spec)
    
    expected = exp.EQ(
        this=exp.Column(this="status"),
        expression=exp.Literal.string("active")
    )
    
    assert condition.sql() == expected.sql()
```

### Integration Tests
Test full query generation:
```python
def test_full_analytics_query():
    builder = QueryBuilder()
    query = builder\
        .select(["user_id", "country"])\
        .from_table("events")\
        .add_filters([{"column": "event_type", "operator": "eq", "value": "purchase"}])\
        .add_aggregations([{"column": "revenue", "function": "sum", "alias": "total"}])\
        .add_groups(["user_id", "country"])\
        .build()
    
    # Verify the generated SQL
    assert "GROUP BY" in query.sql()
    assert "SUM(revenue)" in query.sql()
```

## Common Pitfalls to Avoid

1. **String concatenation for SQL** - Always use SQLGlot expressions
2. **Ignoring SQL injection** - SQLGlot handles parameterization when used correctly
3. **Tight coupling** - Keep builders independent and composable
4. **Forgetting dialect differences** - Use SQLGlot's transpilation features
5. **Poor error messages** - Provide clear validation errors with context
6. **Stateful builders** - Make builders immutable or provide clear reset mechanisms

## Advanced Features

### 1. Query Optimization
Add optimization passes:
```python
def optimize_query(query: exp.Select) -> exp.Select:
    """Apply optimization transformations."""
    # Remove redundant conditions
    # Push down filters
    # Simplify expressions
    return optimized_query
```

### 2. CTE Support
Enable Common Table Expressions:
```python
def add_cte(self, name: str, query: exp.Select) -> 'QueryBuilder':
    """Add a CTE to the query."""
    pass
```

### 3. Subquery Support
Handle subqueries in filters and FROM clauses:
```python
def add_subquery_filter(self, column: str, operator: str, subquery: exp.Select):
    """Add filter with subquery (e.g., WHERE user_id IN (SELECT ...))."""
    pass
```

## Performance Considerations

1. **Lazy Evaluation** - Build the AST but only generate SQL when needed
2. **Caching** - Cache compiled queries for repeated use
3. **Expression Reuse** - Reuse common expression objects
4. **Validation Timing** - Validate early to fail fast

## Documentation Standards

Every builder method should document:
- Purpose and behavior
- Parameter specifications (expected structure)
- Return type
- Example usage
- Supported SQL dialects (if limited)

## Example: Complete Filter Implementation

```python
from typing import Dict, Any, List, Union
from sqlglot import exp
from enum import Enum

class Operator(Enum):
    EQ = "eq"
    NEQ = "neq"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    IN = "in"
    NOT_IN = "not_in"
    LIKE = "like"
    ILIKE = "ilike"
    BETWEEN = "between"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"

class FilterBuilder:
    """Build WHERE conditions from filter specifications."""
    
    @staticmethod
    def build_condition(filter_spec: Dict[str, Any]) -> exp.Expression:
        """
        Build a SQLGlot condition from a filter specification.
        
        Args:
            filter_spec: Dictionary containing:
                - column (str): Column name
                - operator (str): Operator type (eq, gt, in, etc.)
                - value (Any): Filter value(s)
                - logic (str, optional): 'and'/'or' for nested conditions
                - conditions (List, optional): Nested filter specs
        
        Returns:
            SQLGlot Expression representing the condition
            
        Example:
            >>> spec = {"column": "age", "operator": "gte", "value": 18}
            >>> FilterBuilder.build_condition(spec)
            >>> # Generates: age >= 18
        """
        # Handle nested conditions
        if "logic" in filter_spec:
            return FilterBuilder._build_compound_condition(filter_spec)
        
        column = exp.Column(this=filter_spec["column"])
        operator = filter_spec["operator"]
        value = filter_spec["value"]
        
        # Map operator to SQLGlot expression
        if operator == Operator.EQ.value:
            return exp.EQ(this=column, expression=FilterBuilder._to_literal(value))
        elif operator == Operator.NEQ.value:
            return exp.NEQ(this=column, expression=FilterBuilder._to_literal(value))
        elif operator == Operator.GT.value:
            return exp.GT(this=column, expression=FilterBuilder._to_literal(value))
        elif operator == Operator.GTE.value:
            return exp.GTE(this=column, expression=FilterBuilder._to_literal(value))
        elif operator == Operator.LT.value:
            return exp.LT(this=column, expression=FilterBuilder._to_literal(value))
        elif operator == Operator.LTE.value:
            return exp.LTE(this=column, expression=FilterBuilder._to_literal(value))
        elif operator == Operator.IN.value:
            values = [FilterBuilder._to_literal(v) for v in value]
            return exp.In(this=column, expressions=values)
        elif operator == Operator.NOT_IN.value:
            values = [FilterBuilder._to_literal(v) for v in value]
            return exp.Not(this=exp.In(this=column, expressions=values))
        elif operator == Operator.LIKE.value:
            return exp.Like(this=column, expression=FilterBuilder._to_literal(value))
        elif operator == Operator.ILIKE.value:
            return exp.ILike(this=column, expression=FilterBuilder._to_literal(value))
        elif operator == Operator.BETWEEN.value:
            return exp.Between(
                this=column,
                low=FilterBuilder._to_literal(value[0]),
                high=FilterBuilder._to_literal(value[1])
            )
        elif operator == Operator.IS_NULL.value:
            return exp.Is(this=column, expression=exp.Null())
        elif operator == Operator.IS_NOT_NULL.value:
            return exp.Is(this=column, expression=exp.Not(this=exp.Null()))
        else:
            raise ValueError(f"Unsupported operator: {operator}")
    
    @staticmethod
    def _build_compound_condition(filter_spec: Dict[str, Any]) -> exp.Expression:
        """Build AND/OR compound conditions."""
        logic = filter_spec["logic"].lower()
        conditions = [
            FilterBuilder.build_condition(cond) 
            for cond in filter_spec["conditions"]
        ]
        
        if not conditions:
            raise ValueError("Compound condition must have at least one condition")
        
        result = conditions[0]
        for condition in conditions[1:]:
            if logic == "and":
                result = exp.And(this=result, expression=condition)
            elif logic == "or":
                result = exp.Or(this=result, expression=condition)
            else:
                raise ValueError(f"Unsupported logic: {logic}")
        
        return result
    
    @staticmethod
    def _to_literal(value: Any) -> exp.Literal:
        """Convert Python value to SQLGlot Literal."""
        if isinstance(value, str):
            return exp.Literal.string(value)
        elif isinstance(value, bool):
            return exp.Boolean(this=value)
        elif isinstance(value, (int, float)):
            return exp.Literal.number(value)
        elif value is None:
            return exp.Null()
        else:
            # Fallback to string representation
            return exp.Literal.string(str(value))
```

## Summary

When working on SQL analytics backend libraries:
1. **Always use SQLGlot** for SQL abstraction - never string concatenation
2. **Design modular builders** for filters, groups, windows, joins
3. **Follow DRY principles** - centralize common patterns
4. **Validate inputs early** with clear error messages
5. **Support flexible specifications** for filters, aggregations, windows
6. **Test thoroughly** at both unit and integration levels
7. **Document comprehensively** with examples and parameter specs
8. **Think about dialects** - leverage SQLGlot's transpilation
9. **Make it composable** - enable fluent query building
10. **Optimize for developer experience** - clear APIs and good errors