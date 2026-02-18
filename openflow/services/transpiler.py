"""SQL transpilation service using sqlglot."""

import sqlglot
import structlog
from typing import Optional

log = structlog.get_logger(__name__)


class Transpiler:
    """SQL query transpiler for cross-database compatibility."""

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

    def transpile(self, query: str, write_dialect: Optional[str] = None) -> str:
        """
        Transpile SQL query between dialects.

        Args:
            query: SQL query string
            write_dialect: Target dialect (defaults to instance write_dialect)

        Returns:
            Transpiled SQL query
        """
        target_dialect = write_dialect or self.write_dialect
        try:
            return sqlglot.transpile(
                query, read=self.read_dialect, write=target_dialect
            )[0]
        except Exception as e:
            log.warning("transpilation_warning", error=str(e), read=self.read_dialect, write=target_dialect)
            return query

    def validate(self, query: str, dialect: Optional[str] = None) -> bool:
        """
        Validate SQL query syntax.

        Args:
            query: SQL query string
            dialect: SQL dialect (defaults to instance read_dialect)

        Returns:
            True if valid, False otherwise
        """
        target_dialect = dialect or self.read_dialect
        try:
            sqlglot.parse(query, dialect=target_dialect)
            return True
        except Exception:
            return False

    def parse(self, query: str) -> sqlglot.Expression:
        """
        Parse SQL query into AST.

        Args:
            query: SQL query string

        Returns:
            sqlglot Expression
        """
        return sqlglot.parse_one(query, dialect=self.read_dialect)


_default_transpiler = Transpiler()


def transpile_sql(
    query: str,
    read_dialect: str = "duckdb",
    write_dialect: str = "duckdb",
) -> str:
    """Convenience function for transpiling SQL queries."""
    if read_dialect == write_dialect:
        return query
    transpiler = Transpiler(read_dialect, write_dialect)
    return transpiler.transpile(query)


def validate_sql(query: str, dialect: str = "duckdb") -> bool:
    """Convenience function for validating SQL queries."""
    transpiler = Transpiler(dialect)
    return transpiler.validate(query)
