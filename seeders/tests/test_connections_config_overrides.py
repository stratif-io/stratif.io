"""Seed-time credential overrides driven by env vars."""

from __future__ import annotations

from pathlib import Path

from seeders.connections_config import apply_seed_overrides


def test_no_env_vars_returns_copy_unchanged():
    raw = {"file_path": "db/orig.duckdb", "table_name": "events"}
    out = apply_seed_overrides("duckdb", raw)
    assert out == raw
    assert out is not raw  # copy


def test_db_stem_rewrites_file_path_for_file_backends(monkeypatch):
    monkeypatch.setenv("STRATIFIO_SEED_DB_STEM", "casual_game_addictive_2026_04_20")
    out = apply_seed_overrides(
        "duckdb",
        {"file_path": "db/seeds/stratifio_analytics.duckdb"},
    )
    assert out["file_path"] == str(
        Path("db/seeds/casual_game_addictive_2026_04_20.duckdb")
    )


def test_db_stem_preserves_directory(monkeypatch):
    monkeypatch.setenv("STRATIFIO_SEED_DB_STEM", "retail_declining_2026_04_20")
    out = apply_seed_overrides(
        "sqlite",
        {"file_path": "some/nested/dir/original.sqlite"},
    )
    assert out["file_path"].endswith("retail_declining_2026_04_20.sqlite")
    assert "some/nested/dir" in out["file_path"]


def test_db_stem_ignored_for_non_file_backends(monkeypatch):
    monkeypatch.setenv("STRATIFIO_SEED_DB_STEM", "casual_game_addictive_2026_04_20")
    raw = {"host": "localhost", "database": "mydb"}
    out = apply_seed_overrides("postgresql", raw)
    assert "file_path" not in out
    assert out == raw


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


def test_both_env_vars_applied_together(monkeypatch):
    monkeypatch.setenv("STRATIFIO_SEED_DB_STEM", "saas_pmf_2026_04_20")
    monkeypatch.setenv("STRATIFIO_SEED_TABLE_NAME", "saas_pmf_seed1")
    out = apply_seed_overrides(
        "duckdb",
        {"file_path": "db/old.duckdb", "table_name": "events"},
    )
    assert out["file_path"].endswith("saas_pmf_2026_04_20.duckdb")
    assert out["table_name"] == "saas_pmf_seed1"


def test_duckdb_fr_uses_duckdb_extension(monkeypatch):
    monkeypatch.setenv("STRATIFIO_SEED_DB_STEM", "ecommerce_steady_2026_04_20")
    out = apply_seed_overrides(
        "duckdb_fr",
        {"file_path": "db/orig.duckdb"},
    )
    assert out["file_path"].endswith("ecommerce_steady_2026_04_20.duckdb")
