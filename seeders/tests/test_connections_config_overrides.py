"""Seed-time credential overrides driven by env vars."""

from __future__ import annotations

from seeders.connections_config import apply_seed_overrides


def test_no_env_vars_returns_copy_unchanged():
    raw = {"file_path": "db/orig.duckdb", "table_name": "events"}
    out = apply_seed_overrides("duckdb", raw)
    assert out == raw
    assert out is not raw  # copy


def test_table_name_env_var_overrides(monkeypatch):
    monkeypatch.setenv(
        "STRATIFIO_SEED_TABLE_NAME", "casual_game_addictive_growth_flat_seed42"
    )
    out = apply_seed_overrides("duckdb", {"file_path": "db/orig.duckdb"})
    assert out["table_name"] == "casual_game_addictive_growth_flat_seed42"


def test_table_name_overrides_yaml_table_name(monkeypatch):
    monkeypatch.setenv("STRATIFIO_SEED_TABLE_NAME", "from_env")
    out = apply_seed_overrides(
        "duckdb",
        {"file_path": "db/orig.duckdb", "table_name": "from_yaml"},
    )
    assert out["table_name"] == "from_env"


def test_table_name_override_applies_to_non_file_backends_too(monkeypatch):
    monkeypatch.setenv("STRATIFIO_SEED_TABLE_NAME", "preset_seed1")
    out = apply_seed_overrides("postgresql", {"host": "localhost", "database": "db"})
    assert out["table_name"] == "preset_seed1"


def test_file_path_is_not_touched(monkeypatch):
    """DB filename is left exactly as configured — we only override the table."""
    monkeypatch.setenv("STRATIFIO_SEED_TABLE_NAME", "anything")
    out = apply_seed_overrides(
        "duckdb",
        {"file_path": "db/seeds/stratifio_analytics.duckdb"},
    )
    assert out["file_path"] == "db/seeds/stratifio_analytics.duckdb"
