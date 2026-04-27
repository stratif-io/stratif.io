"""Contract tests: connection open and error handling."""


def test_backend_has_dialect_name(backend_and_conn):
    backend, _ = backend_and_conn
    assert isinstance(backend.dialect_name, str) and len(backend.dialect_name) > 0


def test_backend_has_identifier_quote_char(backend_and_conn):
    backend, _ = backend_and_conn
    assert backend.identifier_quote_char in ('"', "`", "'")


def test_use_pool_is_bool(backend_and_conn):
    backend, _ = backend_and_conn
    assert isinstance(backend.use_pool, bool)


def test_is_connection_error_false_for_valueerror(backend_and_conn):
    backend, _ = backend_and_conn
    assert backend.is_connection_error(ValueError("nope")) is False
