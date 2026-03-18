"""Unit tests for ClickHouseBackend (mock-based)."""
import pytest
from backend.backends.clickhouse.credentials import ClickHouseCredentials


class TestClickHouseCredentials:
    def test_valid_minimal(self):
        c = ClickHouseCredentials(host="ch.example.com", database="analytics",
                                   user="default", password="secret")
        assert c.port == 8443
        assert c.secure is True
        assert c.always_final is False

    def test_custom_port(self):
        c = ClickHouseCredentials(host="localhost", database="db",
                                   user="u", password="p", port=9000, secure=False)
        assert c.port == 9000
        assert c.secure is False

    def test_always_final_flag(self):
        c = ClickHouseCredentials(host="h", database="db", user="u",
                                   password="p", always_final=True)
        assert c.always_final is True
