"""Unit tests for SnowflakeBackend (mock-based)."""
import pytest
from backend.backends.snowflake.credentials import SnowflakeCredentials


class TestSnowflakeCredentials:
    def test_valid_minimal(self):
        c = SnowflakeCredentials(
            account="xy12345.us-east-1",
            user="alice",
            password="secret",
            warehouse="COMPUTE_WH",
            database="ANALYTICS",
            schema="PUBLIC",
        )
        assert c.role is None

    def test_with_role(self):
        c = SnowflakeCredentials(
            account="xy12345.us-east-1",
            user="alice",
            password="secret",
            warehouse="COMPUTE_WH",
            database="ANALYTICS",
            schema="PUBLIC",
            role="ANALYST",
        )
        assert c.role == "ANALYST"
