"""Tests for the browse and tables endpoints — focus on pool-conn unpacking."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from services.analytics.main import app

client = TestClient(app)

CONN_ID = "test-conn-id"
DB_TYPE = "databricks"


def _make_db_conn(rows=None):
    cursor = MagicMock()
    cursor.description = [("col",)]
    cursor.fetchall.return_value = rows or []
    cursor.fetchone.return_value = ("main", "default")
    conn = MagicMock()
    conn.cursor.return_value = cursor
    return conn


class TestBrowsePoolUnpacking:
    """_pool_get returns (conn, meta) tuple; browse must unpack it correctly."""

    def _patch_pool(self, db_conn):
        """Return a patcher that makes _pool_get return (conn, {})."""
        return patch(
            "services.analytics.api.connections.browse._pool_get",
            return_value=(db_conn, {}),
        )

    def _patch_connection(self, db_type=DB_TYPE):
        conn_model = MagicMock()
        conn_model.db_type = db_type
        conn_model.credentials_encrypted = b"encrypted"
        return patch(
            "services.analytics.api.connections.browse._get_connection_or_404",
            return_value=conn_model,
        )

    def _patch_credentials(self):
        return patch(
            "services.analytics.api.connections.browse.decrypt_credentials",
            return_value={"host": "h", "http_path": "/p", "token": "t"},
        )

    def test_browse_with_pool_does_not_pass_tuple_as_conn(self):
        """When use_pool=True, _pool_get returns (conn, meta).
        browse() must unpack the tuple and pass only conn to backend.browse().
        Before fix: backend.browse((conn, {}), ...) → AttributeError 'tuple' has no 'cursor'.
        After fix: backend.browse(conn, ...) works correctly.
        """
        db_conn = _make_db_conn([("main",), ("hive_metastore",)])
        with (
            self._patch_connection(),
            self._patch_credentials(),
            self._patch_pool(db_conn),
            patch(
                "services.analytics.api.connections.browse.get_backend"
            ) as mock_get_backend,
        ):
            backend = MagicMock()
            backend.use_pool = True
            backend.pool_key.return_value = ("test-conn-id", "databricks")
            backend.parse_credentials.return_value = MagicMock()
            backend.browse.return_value = [
                {"name": "main", "full_name": "main", "kind": "catalog"}
            ]
            mock_get_backend.return_value = backend

            resp = client.get(f"/api/connections/{CONN_ID}/browse")
            assert resp.status_code == 200, resp.text
            # browse must have been called with the conn object, not the (conn, meta) tuple
            call_args = backend.browse.call_args
            first_arg = call_args[0][0]
            assert not isinstance(first_arg, tuple), (
                f"services.analytics.browse() received a tuple instead of a connection: {first_arg!r}. "
                "_pool_get returns (conn, meta) and must be unpacked before calling browse()."
            )

    def test_tables_with_pool_does_not_pass_tuple_as_conn(self):
        """Same unpacking bug applies to the /tables endpoint."""
        db_conn = _make_db_conn([("main", "default", "events", False)])
        with (
            self._patch_connection(),
            self._patch_credentials(),
            self._patch_pool(db_conn),
            patch(
                "services.analytics.api.connections.browse.get_backend"
            ) as mock_get_backend,
        ):
            backend = MagicMock()
            backend.use_pool = True
            backend.pool_key.return_value = ("test-conn-id", "databricks")
            backend.parse_credentials.return_value = MagicMock()
            backend.browse.return_value = []
            mock_get_backend.return_value = backend

            resp = client.get(f"/api/connections/{CONN_ID}/tables")
            assert resp.status_code == 200, resp.text
            call_args = backend.browse.call_args
            first_arg = call_args[0][0]
            assert not isinstance(first_arg, tuple), (
                f"services.analytics.browse() received a tuple instead of a connection: {first_arg!r}. "
                "_pool_get returns (conn, meta) and must be unpacked before calling browse()."
            )
