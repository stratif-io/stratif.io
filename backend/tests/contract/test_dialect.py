"""Contract tests: all 13 dialect methods must produce valid SQL strings."""


def test_date_trunc_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.date_trunc("day", "ts")
    assert isinstance(result, str) and "ts" in result


def test_date_diff_days_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.date_diff_days("a", "b")
    assert isinstance(result, str) and "a" in result and "b" in result


def test_epoch_diff_seconds_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.epoch_diff_seconds("a", "b")
    assert isinstance(result, str) and "a" in result and "b" in result


def test_interval_minutes_exceeded_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.interval_minutes_exceeded("a", "b", 30)
    # Backends may represent the threshold in minutes (30) or seconds (1800)
    assert isinstance(result, str) and ("30" in result or "1800" in result)


def test_string_concat_two_parts(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.string_concat("x", "y")
    assert isinstance(result, str) and "x" in result and "y" in result


def test_string_concat_three_parts(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.string_concat("x", "y", "z")
    assert isinstance(result, str) and "x" in result and "z" in result


def test_cast_to_text_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.cast_to_text("col")
    assert isinstance(result, str) and "col" in result


def test_json_extract_string_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.json_extract_string("props", "key")
    assert isinstance(result, str) and ("props" in result or "key" in result)


def test_extract_hour_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_hour("ts")


def test_extract_day_of_week_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_day_of_week("ts")


def test_extract_year_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_year("ts")


def test_extract_month_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_month("ts")


def test_extract_week_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_week("ts")


def test_extract_quarter_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_quarter("ts")


def test_date_trunc_result_executes(backend_and_conn):
    """date_trunc output must produce valid executable SQL."""
    backend, conn = backend_and_conn
    expr = backend.date_trunc("day", "timestamp")
    query = f"SELECT {expr} FROM test_events LIMIT 1"
    rows = backend.execute(conn, query, None)
    assert isinstance(rows, list)


def test_extract_hour_result_executes(backend_and_conn):
    backend, conn = backend_and_conn
    expr = backend.extract_hour("timestamp")
    query = f"SELECT {expr} FROM test_events LIMIT 1"
    rows = backend.execute(conn, query, None)
    assert len(rows) > 0
    assert isinstance(rows[0][0], (int, float))
