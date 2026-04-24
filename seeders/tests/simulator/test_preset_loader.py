from pathlib import Path

import pytest

from seeders.simulator.preset import (
    PresetNotFoundError,
    list_presets,
    load_preset,
    resolve_config,
)

FIXTURES = Path(__file__).parent / "fixtures"


def test_load_preset_from_path():
    cfg = load_preset(FIXTURES / "minimal_preset.yaml")
    assert cfg.name == "fixture_minimal"
    assert cfg.axes["domain"] == "ecommerce"
    assert cfg.axes["scale"] == "tiny"


def test_load_preset_by_name_searches_presets_dir():
    # This test uses the real presets/ dir — it exists once Task 6 ships
    # the default preset. We assert the lookup mechanism works.
    cfg = load_preset("ecommerce_steady")
    assert cfg.name == "ecommerce_steady"


def test_list_presets_empty_when_dir_missing(monkeypatch, tmp_path):
    """When PRESETS_DIR doesn't exist, list_presets returns []."""
    from seeders.simulator import preset as preset_mod

    monkeypatch.setattr(preset_mod, "PRESETS_DIR", tmp_path / "nonexistent")
    assert preset_mod.list_presets() == []


def test_resolve_config_explicit_preset_beats_env(monkeypatch):
    """An explicit preset_name argument wins over SEED_PRESET env."""
    # SEED_PRESET points at something that would fail; the explicit arg wins.
    monkeypatch.setenv("SEED_PRESET", "does_not_exist")
    cfg = resolve_config(preset_name="ecommerce_steady", axis_overrides={})
    assert cfg.name == "ecommerce_steady"


def test_load_preset_missing_raises():
    with pytest.raises(PresetNotFoundError):
        load_preset("does_not_exist")


def test_list_presets_includes_shipped():
    names = list_presets()
    assert "ecommerce_steady" in names


def test_resolve_config_cli_overrides_env(monkeypatch):
    monkeypatch.setenv("SEED_PRESET", "ecommerce_steady")
    monkeypatch.setenv("SEED_OVERRIDE_GROWTH", "flat")
    cfg = resolve_config(preset_name=None, axis_overrides={"growth": "declining"})
    # CLI override wins
    assert cfg.axes["growth"] == "declining"


def test_resolve_config_env_overrides_yaml(monkeypatch):
    monkeypatch.setenv("SEED_OVERRIDE_SCALE", "small")
    cfg = resolve_config(preset_name="ecommerce_steady", axis_overrides={})
    assert cfg.axes["scale"] == "small"


def test_resolve_config_default_is_ecommerce_steady(monkeypatch):
    monkeypatch.delenv("SEED_PRESET", raising=False)
    cfg = resolve_config(preset_name=None, axis_overrides={})
    assert cfg.name == "ecommerce_steady"


def test_resolve_config_seed_users_legacy_override(monkeypatch):
    monkeypatch.setenv("SEED_USERS", "250")
    monkeypatch.setenv("SEED_DAYS", "5")
    cfg = resolve_config(preset_name="ecommerce_steady", axis_overrides={})
    scale = cfg.resolved_scale()
    assert scale.total_users == 250
    assert scale.window_days == 5
