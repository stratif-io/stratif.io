import pytest
from backend.product_db.database import SQLiteProductDB
from backend.product_db.migrations import init_product_db


@pytest.fixture
def fresh_db(tmp_path):
    db = SQLiteProductDB(str(tmp_path / "test.db"))
    return db


def test_schema_config_has_new_columns(fresh_db):
    init_product_db(fresh_db)
    cols = fresh_db.fetchall("PRAGMA table_info(connection_schema_configs)")
    names = {r["name"] for r in cols}
    assert "resurrection_window_days" in names
    assert "power_user_threshold_days" in names
    assert "pinned_metrics" in names


def test_new_columns_have_correct_defaults(fresh_db):
    init_product_db(fresh_db)
    # Insert a minimal connections row then a schema_config row
    fresh_db.execute(
        "INSERT INTO connections (id, name, db_type, credentials_encrypted) VALUES (?, ?, ?, ?)",
        ("c1", "Test", "sqlite", "x"),
    )
    fresh_db.execute(
        "INSERT INTO connection_schema_configs (id, connection_id) VALUES (?, ?)",
        ("s1", "c1"),
    )
    row = fresh_db.fetchone(
        "SELECT resurrection_window_days, power_user_threshold_days, pinned_metrics "
        "FROM connection_schema_configs WHERE id = 's1'"
    )
    assert row["resurrection_window_days"] == 30
    assert row["power_user_threshold_days"] == 4
    assert row["pinned_metrics"] == "[]"
