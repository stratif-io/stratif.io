"""Contract tests: end-to-end query execution."""


def test_simple_select(backend_and_conn):
    backend, conn = backend_and_conn
    rows = backend.execute(conn, "SELECT COUNT(*) FROM test_events", None)
    assert rows[0][0] == 3


def test_select_with_where(backend_and_conn):
    backend, conn = backend_and_conn
    rows = backend.execute(
        conn, "SELECT COUNT(*) FROM test_events WHERE event_name = ?", ["page_view"]
    )
    assert rows[0][0] == 2


def test_events_cte_builds_and_executes(backend_and_conn):
    backend, conn = backend_and_conn
    cte_body = backend.build_events_cte(
        source_table="test_events",
        uid_field="user_id",
        ts_field="timestamp",
        en_field="event_name",
        custom_props=[],
    )
    query = backend.prepend_events_cte(cte_body, "SELECT COUNT(*) FROM events")
    rows = backend.execute(conn, query, None)
    assert rows[0][0] == 3


def test_trend_shape(backend_and_conn):
    """Simulates a daily trend query using CTE + date_trunc."""
    backend, conn = backend_and_conn
    cte_body = backend.build_events_cte(
        "test_events", "user_id", "timestamp", "event_name", []
    )
    date_bucket = backend.date_trunc("day", "timestamp")
    inner = f"SELECT {date_bucket} AS day, COUNT(*) AS cnt FROM events GROUP BY 1 ORDER BY 1"
    query = backend.prepend_events_cte(cte_body, inner)
    rows = backend.execute(conn, query, None)
    assert len(rows) >= 1
    assert rows[0][1] >= 1


def test_string_concat_executes(backend_and_conn):
    backend, conn = backend_and_conn
    expr = backend.string_concat("user_id", "'-'", "event_name")
    query = f"SELECT {expr} FROM test_events LIMIT 1"
    rows = backend.execute(conn, query, None)
    assert len(rows) == 1
    assert "-" in str(rows[0][0])
