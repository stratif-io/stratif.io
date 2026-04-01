"""Tests for GET /connections/{id}/tables and /connections/{id}/columns endpoints."""
from __future__ import annotations

import os
import tempfile
from unittest.mock import MagicMock, patch

import duckdb
import pytest
from starlette.testclient import TestClient

from backend.main import app


def _make_sqlite_row(data: dict):
    """Create a mock dict-like row that supports row['key'] access."""
    row = MagicMock()
    row.__getitem__ = lambda self, k: data[k]
    row.get = lambda k, default=None: data.get(k, default)
    # Support dict-like iteration
    row.keys = lambda: data.keys()
    for key, val in data.items():
        setattr(row, key, val)
    return row


@pytest.fixture()
def duckdb_file():
    """Create a temporary DuckDB file with an events table."""
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "test.duckdb")
        conn = duckdb.connect(path)
        conn.execute(
            "CREATE TABLE events (user_id VARCHAR, timestamp TIMESTAMP, event_name VARCHAR)"
        )
        conn.execute(
            "CREATE TABLE sessions (session_id VARCHAR, user_id VARCHAR, started_at TIMESTAMP)"
        )
        conn.close()
        yield path


def _make_product_db_mock(conn_row: dict):
    """Mock product DB that returns a single connection row."""
    db = MagicMock()
    db.fetchone.return_value = _make_sqlite_row(conn_row)
    return db


def _make_encrypted_creds(file_path: str) -> str:
    """Create an encrypted credentials blob for a DuckDB file path."""
    from backend.services.crypto import encrypt_credentials
    return encrypt_credentials({"file_path": file_path})


@pytest.fixture()
def browse_client(duckdb_file):
    """TestClient with a product DB that returns a DuckDB file connection."""
    encrypted = _make_encrypted_creds(duckdb_file)
    conn_row = {
        "id": "conn-1",
        "db_type": "duckdb",
        "credentials_encrypted": encrypted,
        "name": "Test DuckDB",
    }
    mock_db = _make_product_db_mock(conn_row)

    with patch("backend.api.connections.browse.get_product_db", return_value=mock_db), TestClient(app) as client:
        yield client


class TestListTables:
    def test_tables_endpoint_returns_flat_list(self, browse_client):
        resp = browse_client.get("/api/connections/conn-1/tables")
        assert resp.status_code == 200
        body = resp.json()
        assert "tables" in body
        names = [t["name"] for t in body["tables"]]
        assert "events" in names
        assert "sessions" in names

    def test_tables_include_required_fields(self, browse_client):
        resp = browse_client.get("/api/connections/conn-1/tables")
        body = resp.json()
        for table in body["tables"]:
            assert "name" in table
            assert "full_name" in table
            assert "table_schema" in table
            assert "catalog" in table

    def test_tables_full_name_is_schema_qualified(self, browse_client):
        resp = browse_client.get("/api/connections/conn-1/tables")
        body = resp.json()
        events = next(t for t in body["tables"] if t["name"] == "events")
        assert events["full_name"] == "main.events"
        assert events["table_schema"] == "main"

    def test_tables_returns_404_for_unknown_connection(self, browse_client):
        # browse_client's product_db returns None for unknown ids
        from unittest.mock import patch as _patch
        db_mock = MagicMock()
        db_mock.fetchone.return_value = None
        with _patch("backend.api.connections.browse.get_product_db", return_value=db_mock):
            resp = browse_client.get("/api/connections/unknown-id/tables")
        assert resp.status_code == 404


class TestListColumns:
    def test_columns_endpoint_returns_column_names(self, browse_client):
        resp = browse_client.get("/api/connections/conn-1/columns?table=main.events")
        assert resp.status_code == 200
        body = resp.json()
        assert "columns" in body
        assert "user_id" in body["columns"]
        assert "timestamp" in body["columns"]
        assert "event_name" in body["columns"]

    def test_columns_returns_404_for_unknown_connection(self, browse_client):
        db_mock = MagicMock()
        db_mock.fetchone.return_value = None
        with patch("backend.api.connections.browse.get_product_db", return_value=db_mock):
            resp = browse_client.get("/api/connections/nope/columns?table=main.events")
        assert resp.status_code == 404
