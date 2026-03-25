import os
import tempfile

from backend.product_db.base import ProductDB
from backend.product_db.database import SQLiteProductDB


def test_sqlite_satisfies_protocol():
    with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as f:
        path = f.name
    try:
        db = SQLiteProductDB(path)
        assert isinstance(db, ProductDB)
    finally:
        os.unlink(path)


def test_protocol_has_required_methods():
    assert hasattr(ProductDB, 'fetchall')
    assert hasattr(ProductDB, 'fetchone')
    assert hasattr(ProductDB, 'execute')
    assert hasattr(ProductDB, 'executescript')


def test_get_product_db_returns_sqlite_by_default(monkeypatch, tmp_path):
    from backend.product_db.deps import get_product_db
    from backend import config
    monkeypatch.setattr(config.settings, "product_db_url", "")
    monkeypatch.setattr(config.settings, "product_db_path", str(tmp_path / "test.sqlite"))
    get_product_db.cache_clear()
    db = get_product_db()
    from backend.product_db.database import SQLiteProductDB
    assert isinstance(db, SQLiteProductDB)
    get_product_db.cache_clear()
