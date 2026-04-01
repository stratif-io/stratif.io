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

import os
import pathlib

import pytest
import yaml
from starlette.testclient import TestClient

from backend.config import settings
from backend.main import app
from backend.product_db.deps import get_product_db
from backend.product_db.migrations import init_product_db

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
    """Return a TestClient backed by a temp-file SQLite product DB.

    Why a named file (not :memory:): SQLiteProductDB opens a new
    sqlite3.connect() per operation. :memory: creates a separate isolated
    DB on each call. A named file ensures all callers — both Depends() and
    direct get_product_db() calls in routers — see the same data.

    Why cache_clear() before AND after: clears any stale cached instance
    from a prior run before setup, and prevents the temp-file path from
    leaking beyond this session after teardown.
    """
    db_path = tmp_path_factory.mktemp("product_db") / "product.db"

    settings.product_db_path = str(db_path)
    settings.encryption_key = _E2E_ENCRYPTION_KEY
    get_product_db.cache_clear()
    init_product_db()

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    get_product_db.cache_clear()
