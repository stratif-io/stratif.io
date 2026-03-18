"""Contract tests: schema introspection."""


def test_get_tables_returns_list(backend_and_conn):
    backend, conn = backend_and_conn
    tables = backend.get_tables(conn)
    assert isinstance(tables, list)
    assert len(tables) > 0


def test_test_events_table_exists(backend_and_conn):
    backend, conn = backend_and_conn
    tables = backend.get_tables(conn)
    lower_tables = [t.lower() for t in tables]
    assert "test_events" in lower_tables


def test_get_columns_for_browse(backend_and_conn):
    backend, conn = backend_and_conn
    cols = backend.get_columns_for_browse(conn, "test_events")
    assert isinstance(cols, list)
    lower = [c.lower() for c in cols]
    assert "user_id" in lower
    assert "timestamp" in lower
    assert "event_name" in lower


def test_table_exists_true(backend_and_conn):
    backend, conn = backend_and_conn
    assert backend.table_exists(conn, "test_events") is True


def test_table_exists_false(backend_and_conn):
    backend, conn = backend_and_conn
    assert backend.table_exists(conn, "definitely_does_not_exist_xyz") is False
