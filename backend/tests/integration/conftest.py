"""Shared fixtures for integration tests.

Credentials are read from connections.yaml (same file used by E2E tests).

Config resolution order:
  1. STRATIFIO_CONNECTIONS_FILE env var (absolute path or relative to cwd)
  2. connections.yaml at the repo root (gitignored, developer-local)

Copy connections.yaml.example → connections.yaml at the repo root and set
``enabled: true`` for the backends you want to test.

Run with: pytest -m integration
"""

import os
import pathlib

import yaml

_REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]

_env_override = os.environ.get("STRATIFIO_CONNECTIONS_FILE")
if _env_override:
    _CONFIG_PATH = pathlib.Path(_env_override)
    if not _CONFIG_PATH.is_absolute():
        _CONFIG_PATH = pathlib.Path.cwd() / _CONFIG_PATH
else:
    _CONFIG_PATH = _REPO_ROOT / "connections.yaml"

if _CONFIG_PATH.exists():
    _raw = yaml.safe_load(_CONFIG_PATH.read_text()).get("backends", {})
    # Resolve relative file_path credentials to absolute paths
    for _cfg in _raw.values():
        creds = (_cfg or {}).get("credentials") or {}
        if "file_path" in creds:
            fp = pathlib.Path(creds["file_path"])
            if not fp.is_absolute():
                creds["file_path"] = str(_REPO_ROOT / fp)
    INTEGRATION_CONFIG: dict = _raw
else:
    INTEGRATION_CONFIG = {}


def get_backend_config(name: str) -> dict | None:
    """Return credentials dict for *name* if the backend is enabled, else None."""
    cfg = INTEGRATION_CONFIG.get(name)
    if cfg and cfg.get("enabled"):
        return cfg.get("credentials") or {}
    return None
