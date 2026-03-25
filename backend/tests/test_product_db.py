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
