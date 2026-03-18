"""SQL transpilation service using SQLGlot.

Prefer building queries with helpers from ``stratifio.services.sql_builder``
rather than transpiling raw SQL strings.  The helpers generate dialect-correct
SQL at build time, which is more reliable than post-hoc transpilation.

This module is kept as a thin utility layer for cases where you receive raw
SQL from an external source and need to convert it to the target dialect.
"""

import sqlglot
import structlog

log = structlog.get_logger(__name__)


class Transpiler:
    """SQL query transpiler for cross-database compatibility.

    Use this when you need to convert a SQL string written in one dialect to
    another.  For queries you build yourself, prefer ``sql_builder`` helpers
    which generate the correct SQL directly without a transpilation step.
    """

    SUPPORTED_DIALECTS = [
        "duckdb",
        "snowflake",
        "bigquery",
        "postgres",
        "mysql",
        "redshift",
        "sqlite",
        "tsql",
    ]

    def __init__(self, read_dialect: str = "duckdb", write_dialect: str = "duckdb"):
        self.read_dialect = read_dialect
        self.write_dialect = write_dialect

    def transpile(self, query: str, write_dialect: str | None = None) -> str:
        """Transpile *query* from *read_dialect* to *write_dialect*.

        Returns the original query unchanged if transpilation fails, logging
        a warning so the caller can investigate.
        """
        target = write_dialect or self.write_dialect
        if self.read_dialect == target:
            return query
        try:
            return sqlglot.transpile(query, read=self.read_dialect, write=target)[0]
        except Exception as e:
            log.warning(
                "transpilation_warning",
                error=str(e),
                read=self.read_dialect,
                write=target,
            )
            return query

    def validate(self, query: str, dialect: str | None = None) -> bool:
        """Return True if *query* is syntactically valid for *dialect*."""
        target = dialect or self.read_dialect
        try:
            sqlglot.parse(query, dialect=target)
            return True
        except Exception:
            return False

    def parse(self, query: str) -> sqlglot.Expression:
        """Parse *query* into a SQLGlot AST."""
        return sqlglot.parse_one(query, dialect=self.read_dialect)


def transpile_sql(
    query: str,
    read: str = "duckdb",
    write: str = "duckdb",
) -> str:
    """Convenience function: transpile *query* from *read* dialect to *write* dialect.

    No-op when ``read == write``.
    """
    if read == write:
        return query
    return Transpiler(read, write).transpile(query)


def validate_sql(query: str, dialect: str = "duckdb") -> bool:
    """Convenience function: validate *query* syntax for *dialect*."""
    return Transpiler(dialect).validate(query)
