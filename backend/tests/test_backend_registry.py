"""Tests for backend registry."""
from backend.backends import get_backend


def test_snowflake_registered():
    backend = get_backend("snowflake")
    assert backend.dialect_name == "snowflake"


def test_clickhouse_registered():
    backend = get_backend("clickhouse")
    assert backend.dialect_name == "clickhouse"


def test_unknown_raises():
    import pytest
    with pytest.raises(ValueError, match="Unsupported db_type"):
        get_backend("oracle")
