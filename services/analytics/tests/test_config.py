import os

import pytest

from services.analytics.config import Settings


@pytest.fixture
def clean_env(monkeypatch, tmp_path):
    """Isolate Settings() from .env and shell env.

    Strips STRATIFIO_* env vars and chdirs to a temp directory so the
    repo's .env is not discovered by pydantic-settings.
    """
    for key in list(os.environ):
        if key.startswith("STRATIFIO_"):
            monkeypatch.delenv(key, raising=False)
    monkeypatch.chdir(tmp_path)


def test_product_db_url_defaults_to_sqlite(clean_env):
    s = Settings()
    assert s.product_db_url == "sqlite+aiosqlite:///./data/dbs/stratifio_product.db"


def test_auth_enabled_defaults_to_false(clean_env):
    s = Settings()
    assert s.auth_enabled is False
