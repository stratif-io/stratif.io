"""Unit tests for DatabricksSeeder."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from seeders.seeder import SeedConfig
from seeders.seeder_databricks import DatabricksSeeder


@pytest.fixture
def mock_connect():
    """Patch databricks.sql.connect and return the mock connection/cursor."""
    mock_cursor = MagicMock()
    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
    mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    with patch("seeders.seeder_databricks.sql") as mock_sql:
        mock_sql.connect.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_sql.connect.return_value.__exit__ = MagicMock(return_value=False)
        yield mock_sql, mock_conn, mock_cursor


@pytest.fixture
def seeder():
    creds = {
        "server_hostname": "adb-123.azuredatabricks.net",
        "http_path": "/sql/1.0/warehouses/abc123",
        "access_token": "dapiTEST",
    }
    with (
        patch(
            "seeders.seeder_databricks.get_databricks_credentials", return_value=creds
        ),
        patch("seeders.seeder_databricks.load_connections_yaml", return_value={}),
    ):
        return DatabricksSeeder(config=SeedConfig(seed_users=2, seed_days=1))


def test_create_events_table_drops_and_creates(seeder, mock_connect):
    mock_sql, mock_conn, mock_cursor = mock_connect
    seeder._conn = mock_conn

    seeder._create_events_table()

    calls = [c[0][0] for c in mock_cursor.execute.call_args_list]
    assert any("DROP TABLE" in sql for sql in calls)
    assert any("CREATE TABLE" in sql for sql in calls)
    assert any("USING DELTA" in sql for sql in calls)


def test_insert_events_calls_executemany(seeder, mock_connect):
    mock_sql, mock_conn, mock_cursor = mock_connect
    seeder._conn = mock_conn

    events = [
        (
            "user1",
            "Purchase",
            "2024-01-01T00:00:00",
            {"amount": 10},
            "server.us.1",
            {},
            {},
        ),
        ("user2", "Search", "2024-01-01T01:00:00", {}, "server.eu.1", {}, {}),
    ]
    seeder._insert_events(events)

    mock_cursor.executemany.assert_called_once()
    sql_arg, rows_arg = mock_cursor.executemany.call_args[0]
    assert "INSERT INTO events" in sql_arg
    assert len(rows_arg) == 2
    assert len(rows_arg[0]) == 7


def test_insert_events_no_op_on_empty(seeder, mock_connect):
    mock_sql, mock_conn, mock_cursor = mock_connect
    seeder._conn = mock_conn

    seeder._insert_events([])

    mock_cursor.executemany.assert_not_called()


def test_seed_returns_stats(seeder, mock_connect):
    mock_sql, mock_conn, mock_cursor = mock_connect

    stats = seeder.seed()

    assert "total_events" in stats
    assert "total_users" in stats
    assert "new_users" in stats
    assert "returning_users" in stats
    assert "power_users" in stats
    assert "completed_purchases" in stats
    assert stats["total_users"] == 2
