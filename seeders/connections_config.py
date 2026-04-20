"""Shared loader for connections.yaml — single source of truth for DB credentials."""

from __future__ import annotations

import os
from pathlib import Path

import yaml

_DEFAULT_PATH = Path(__file__).parent.parent / "connections.yaml"

# Backends whose "database" is a local file — these get their file_path
# rewritten when STRATIFIO_SEED_DB_STEM is set.
_FILE_BACKENDS_EXT: dict[str, str] = {
    "duckdb": ".duckdb",
    "duckdb_fr": ".duckdb",
    "sqlite": ".sqlite",
}


def apply_seed_overrides(backend: str, creds: dict) -> dict:
    """Rewrite ``creds`` with seed-time overrides from env vars.

    - ``STRATIFIO_SEED_DB_STEM`` → rewrites ``file_path`` for file-based
      backends to ``<dir>/<stem><ext>``, preserving the directory that was
      configured in connections.yaml.
    - ``STRATIFIO_SEED_TABLE_NAME`` → sets ``table_name``, overriding any
      value declared in connections.yaml.

    Returns a shallow-copied dict; the input is not mutated.
    """
    result = dict(creds)
    stem = os.environ.get("STRATIFIO_SEED_DB_STEM")
    if stem and backend in _FILE_BACKENDS_EXT:
        original = result.get("file_path", "")
        parent = (
            Path(original).parent if original else Path("db/my_user_seeded_event_dbs")
        )
        result["file_path"] = str(parent / f"{stem}{_FILE_BACKENDS_EXT[backend]}")
    if table := os.environ.get("STRATIFIO_SEED_TABLE_NAME"):
        result["table_name"] = table
    return result


def load_connections_yaml(path: Path | None = None) -> dict:
    """Parse connections.yaml and return the full config dict.

    Args:
        path: Path to connections.yaml. Defaults to <project_root>/connections.yaml.

    Raises:
        FileNotFoundError: if the file does not exist.
    """
    resolved = Path(path) if path is not None else _DEFAULT_PATH
    if not resolved.exists():
        raise FileNotFoundError(
            f"connections.yaml not found at {resolved}. "
            "Ensure the file exists at the project root."
        )
    with resolved.open() as f:
        return yaml.safe_load(f)


def get_duckdb_credentials(cfg: dict) -> dict:
    """Return credentials dict for the DuckDB backend."""
    return _get_credentials(cfg, "duckdb")


def get_duckdb_fr_credentials(cfg: dict) -> dict:
    """Return credentials dict for the French-column DuckDB backend."""
    return _get_credentials(cfg, "duckdb_fr")


def get_sqlite_credentials(cfg: dict) -> dict:
    """Return credentials dict for the SQLite backend."""
    return _get_credentials(cfg, "sqlite")


def get_postgresql_credentials(cfg: dict) -> dict:
    """Return credentials dict for the PostgreSQL backend."""
    return _get_credentials(cfg, "postgresql")


def get_clickhouse_credentials(cfg: dict) -> dict:
    """Return credentials dict for the ClickHouse backend."""
    return _get_credentials(cfg, "clickhouse")


def get_snowflake_credentials(cfg: dict) -> dict:
    """Return credentials dict for the Snowflake backend."""
    return _get_credentials(cfg, "snowflake")


def get_databricks_credentials(cfg: dict) -> dict:
    """Return credentials dict for the Databricks backend."""
    return _get_credentials(cfg, "databricks")


def _get_credentials(cfg: dict, backend: str) -> dict:
    try:
        raw = cfg["backends"][backend]["credentials"]
    except KeyError as err:
        raise KeyError(
            f"Backend '{backend}' not found in connections.yaml. "
            f"Available backends: {list(cfg.get('backends', {}).keys())}"
        ) from err
    return apply_seed_overrides(backend, raw)
