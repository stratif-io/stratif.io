"""Tests for seeders.bootstrap_connection."""

import json
import sqlite3
from contextlib import contextmanager
from unittest.mock import patch


@contextmanager
def _patch_settings(db_path, enc_key):
    """Patch settings in all modules that reference it directly."""
    with (
        patch("backend.product_db.database.settings") as db_s,
        patch("backend.services.crypto.settings") as crypto_s,
    ):
        db_s.product_db_path = db_path
        crypto_s.encryption_key = enc_key
        yield db_s, crypto_s


def _setup_db(tmp_path, enc_key="test-encryption-key-for-testing-only"):
    """Initialise a temp product DB and return its path."""
    import backend.product_db.database as db_module

    db_path = str(tmp_path / "test_product.sqlite")
    with _patch_settings(db_path, enc_key):
        db_module._product_db = None
        from backend.product_db.migrations import init_product_db
        init_product_db()
    return db_path


def test_bootstrap_inserts_all_rows(tmp_path):
    """First call inserts connection, schema config, and filter config."""
    import backend.product_db.database as db_module

    enc_key = "test-encryption-key-for-testing-only"
    db_path = _setup_db(tmp_path, enc_key)

    with _patch_settings(db_path, enc_key):
        db_module._product_db = None
        from seeders.bootstrap_connection import bootstrap
        bootstrap("/data/sample.duckdb")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    connections = conn.execute("SELECT * FROM connections").fetchall()
    schema_configs = conn.execute("SELECT * FROM connection_schema_configs").fetchall()
    filter_configs = conn.execute("SELECT * FROM connection_filter_configs").fetchall()
    conn.close()

    assert len(connections) == 1
    assert connections[0]["name"] == "Sample DuckDB"
    assert connections[0]["db_type"] == "duckdb"

    assert len(schema_configs) == 1
    assert schema_configs[0]["connection_id"] == connections[0]["id"]
    custom_props = json.loads(schema_configs[0]["custom_properties"])
    prop_names = [p["name"] for p in custom_props]
    assert "country" in prop_names
    assert "city" in prop_names
    assert all(p["path"].startswith("properties.") for p in custom_props)

    assert len(filter_configs) == 1
    assert filter_configs[0]["connection_id"] == connections[0]["id"]
    filter_fields = json.loads(filter_configs[0]["filter_fields"])
    field_names = [f["field"] for f in filter_fields]
    assert "country" in field_names
    assert "city" in field_names


def test_bootstrap_credentials_decrypt_correctly(tmp_path):
    """Stored credentials decrypt to the correct path."""
    import backend.product_db.database as db_module

    enc_key = "test-encryption-key-for-testing-only"
    db_path = _setup_db(tmp_path, enc_key)

    with _patch_settings(db_path, enc_key):
        db_module._product_db = None
        from seeders.bootstrap_connection import bootstrap
        bootstrap("/data/sample.duckdb")

    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT credentials_encrypted FROM connections").fetchone()
    conn.close()

    with patch("backend.services.crypto.settings") as s:
        s.encryption_key = enc_key
        from backend.services.crypto import decrypt_credentials
        creds = decrypt_credentials(row[0])

    assert creds == {"file_path": "/data/sample.duckdb"}


def test_bootstrap_is_idempotent(tmp_path):
    """Calling bootstrap twice does not create duplicate connections."""
    import backend.product_db.database as db_module

    enc_key = "test-encryption-key-for-testing-only"
    db_path = _setup_db(tmp_path, enc_key)

    with _patch_settings(db_path, enc_key):
        db_module._product_db = None
        from seeders.bootstrap_connection import bootstrap
        bootstrap("/data/sample.duckdb")
        bootstrap("/data/sample.duckdb")  # second call

    conn = sqlite3.connect(db_path)
    count = conn.execute("SELECT COUNT(*) FROM connections").fetchone()[0]
    conn.close()
    assert count == 1


def test_bootstrap_custom_path(tmp_path):
    """Custom path is stored in encrypted credentials."""
    import backend.product_db.database as db_module

    enc_key = "test-encryption-key-for-testing-only"
    db_path = _setup_db(tmp_path, enc_key)
    custom_path = "/custom/analytics.duckdb"

    with _patch_settings(db_path, enc_key):
        db_module._product_db = None
        from seeders.bootstrap_connection import bootstrap
        bootstrap(custom_path)

    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT credentials_encrypted FROM connections").fetchone()
    conn.close()

    with patch("backend.services.crypto.settings") as s:
        s.encryption_key = enc_key
        from backend.services.crypto import decrypt_credentials
        creds = decrypt_credentials(row[0])

    assert creds == {"file_path": custom_path}
