"""Unit tests for DatabricksSeeder."""

from __future__ import annotations

import json
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


CREDS = {
    "server_hostname": "adb-123.azuredatabricks.net",
    "http_path": "/sql/1.0/warehouses/abc123",
    "access_token": "dapiTEST",
}


@pytest.fixture
def seeder():
    with (
        patch("seeders.seeder_databricks.get_databricks_credentials", return_value=CREDS),
        patch("seeders.seeder_databricks.load_connections_yaml", return_value={}),
    ):
        return DatabricksSeeder(config=SeedConfig(seed_users=2, seed_days=1))


def test_create_events_table_uses_struct_and_map_columns(seeder, mock_connect):
    mock_sql, mock_conn, mock_cursor = mock_connect
    seeder._conn = mock_conn

    seeder._create_events_table()

    calls = [c[0][0] for c in mock_cursor.execute.call_args_list]
    assert any("DROP TABLE" in sql for sql in calls)
    assert any("USING DELTA" in sql for sql in calls)
    ddl = next(sql for sql in calls if "CREATE TABLE" in sql)
    assert "MAP<STRING, STRING>" in ddl
    assert "STRUCT<" in ddl
    # properties is MAP, traits and context are STRUCTs
    assert "properties" in ddl
    assert "traits" in ddl
    assert "context" in ddl


def test_insert_events_uses_batch_insert(seeder, mock_connect):
    mock_sql, mock_conn, mock_cursor = mock_connect
    seeder._conn = mock_conn

    props = {"amount": 10, "page_url": "/checkout"}
    traits = {"first_name": "Alice", "last_name": "Smith", "phone": "555-0100", "email": "a@b.com", "date_of_birth": "1990-01-01"}
    context = {"country": "US", "city": "NYC", "timezone": "EST", "device_type": "desktop", "browser": "Chrome", "os": "macOS", "screen_resolution": "1920x1080", "referrer": "google.com"}
    events = [
        ("user1", "Purchase", "2024-01-01T00:00:00", props, "server.us.1", traits, context),
        ("user2", "Search", "2024-01-01T01:00:00", {}, "server.eu.1", traits, context),
    ]
    seeder._insert_events(events)

    # Single execute call with multi-row VALUES — not executemany
    mock_cursor.execute.assert_called_once()
    mock_cursor.executemany.assert_not_called()
    sql_arg, params_arg = mock_cursor.execute.call_args[0]
    assert "INSERT INTO events" in sql_arg
    assert "from_json" in sql_arg
    assert "named_struct" in sql_arg
    # 2 rows × 18 params (3 scalars + 1 json props + 1 server + 5 traits fields + 8 context fields)
    assert len(params_arg) == 36

    # properties passed as JSON string
    row1_props_json = params_arg[3]
    assert isinstance(row1_props_json, str)
    assert json.loads(row1_props_json)["amount"] == "10"

    # traits fields flattened — first_name is index 5
    assert params_arg[5] == "Alice"

    # context fields start at index 10 — country is first
    assert params_arg[10] == "US"


def test_insert_events_no_op_on_empty(seeder, mock_connect):
    mock_sql, mock_conn, mock_cursor = mock_connect
    seeder._conn = mock_conn

    seeder._insert_events([])

    mock_cursor.execute.assert_not_called()
    mock_cursor.executemany.assert_not_called()


def test_seed_overwrites_schema_by_default(seeder, mock_connect):
    mock_sql, mock_conn, mock_cursor = mock_connect

    seeder.seed()

    calls = [c[0][0] for c in mock_cursor.execute.call_args_list]
    assert any("DROP TABLE" in sql for sql in calls)
    assert any("CREATE TABLE" in sql for sql in calls)


def test_seed_skips_schema_when_overwrite_false(mock_connect):
    with (
        patch("seeders.seeder_databricks.get_databricks_credentials", return_value=CREDS),
        patch("seeders.seeder_databricks.load_connections_yaml", return_value={}),
    ):
        seeder = DatabricksSeeder(
            config=SeedConfig(seed_users=2, seed_days=1),
            overwrite_schema=False,
        )
    mock_sql, mock_conn, mock_cursor = mock_connect

    seeder.seed()

    calls = [c[0][0] for c in mock_cursor.execute.call_args_list]
    assert not any("DROP TABLE" in sql for sql in calls)
    assert not any("CREATE TABLE" in sql for sql in calls)


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
