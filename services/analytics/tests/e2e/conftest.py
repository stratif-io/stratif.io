"""Shared E2E test infrastructure.

E2E tests are self-bootstrapping: each backend's credentials are read from
connections.yaml. Tests create their own product DB and connection records.

Run with: pytest -m e2e

Config resolution order:
  1. STRATIFIO_CONNECTIONS_FILE env var (absolute path or relative to cwd)
  2. connections.yaml at the repo root (gitignored, developer-local)

Copy connections.yaml.example → connections.yaml at the repo root and fill
in your credentials to run E2E tests locally.
"""

import asyncio
import os
import pathlib

import pytest
import yaml
from starlette.testclient import TestClient

from services.analytics.config import settings
from services.analytics.main import app
from services.analytics.product_db.database import init_product_db, reset_engine
from services.analytics.product_db.deps import get_db

# ---------------------------------------------------------------------------
# Module-level config — parsed at import time so setup_class can access it
# without needing pytest fixture injection.
# ---------------------------------------------------------------------------

_REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]

_env_override = os.environ.get("STRATIFIO_CONNECTIONS_FILE")
if _env_override:
    _CONFIG_PATH = pathlib.Path(_env_override)
    if not _CONFIG_PATH.is_absolute():
        _CONFIG_PATH = pathlib.Path.cwd() / _CONFIG_PATH
else:
    _CONFIG_PATH = _REPO_ROOT / "connections.yaml"

if not _CONFIG_PATH.exists():
    raise FileNotFoundError(
        f"E2E connections config not found at {_CONFIG_PATH}.\n"
        "Copy connections.yaml.example → connections.yaml at the repo root "
        "and fill in your credentials, or set STRATIFIO_CONNECTIONS_FILE to "
        "point to your config file."
    )

E2E_CONFIG: dict = yaml.safe_load(_CONFIG_PATH.read_text())["backends"]

# Resolve relative file_path credentials to absolute paths based on the repo
# root. This makes paths work regardless of cwd when pytest is invoked.
for _backend_cfg in E2E_CONFIG.values():
    creds = _backend_cfg.get("credentials") or {}
    if "file_path" in creds:
        fp = pathlib.Path(creds["file_path"])
        if not fp.is_absolute():
            creds["file_path"] = str(_REPO_ROOT / fp)

# ---------------------------------------------------------------------------
# Encryption key used for all E2E credential storage — not a real secret.
# ---------------------------------------------------------------------------

_E2E_ENCRYPTION_KEY = "e2e-test-encryption-key-32-chars!!"


# ---------------------------------------------------------------------------
# Session-scoped TestClient with temp-file product DB
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def client(tmp_path_factory):
    """Return a TestClient backed by a temp-file SQLite product DB."""
    db_path = tmp_path_factory.mktemp("product_db") / "product.db"
    db_url = f"sqlite+aiosqlite:///{db_path}"

    settings.product_db_url = db_url
    settings.encryption_key = _E2E_ENCRYPTION_KEY
    reset_engine()
    asyncio.run(init_product_db())

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    test_engine = create_async_engine(db_url)
    test_factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with test_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.pop(get_db, None)
    asyncio.run(test_engine.dispose())
    reset_engine()
