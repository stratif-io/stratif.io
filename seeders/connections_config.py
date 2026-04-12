"""Shared loader for connections.yaml — single source of truth for DB credentials."""

from __future__ import annotations

from pathlib import Path

import yaml

_DEFAULT_PATH = Path(__file__).parent.parent / "connections.yaml"


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


def get_sqlite_credentials(cfg: dict) -> dict:
    """Return credentials dict for the SQLite backend."""
    return _get_credentials(cfg, "sqlite")


def get_postgresql_credentials(cfg: dict) -> dict:
    """Return credentials dict for the PostgreSQL backend."""
    return _get_credentials(cfg, "postgresql")


def get_clickhouse_credentials(cfg: dict) -> dict:
    """Return credentials dict for the ClickHouse backend."""
    return _get_credentials(cfg, "clickhouse")


def get_databricks_credentials(cfg: dict) -> dict:
    """Return credentials dict for the Databricks backend."""
    return _get_credentials(cfg, "databricks")


def _get_credentials(cfg: dict, backend: str) -> dict:
    try:
        return cfg["backends"][backend]["credentials"]
    except KeyError as err:
        raise KeyError(
            f"Backend '{backend}' not found in connections.yaml. "
            f"Available backends: {list(cfg.get('backends', {}).keys())}"
        ) from err
