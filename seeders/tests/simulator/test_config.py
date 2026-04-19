import pytest
from pydantic import ValidationError

from seeders.simulator.config import ScaleConfig, ScaleOverride, SimulationConfig


def test_scale_config_named_values_resolve():
    assert ScaleConfig.from_named("tiny").total_users == 1_000
    assert ScaleConfig.from_named("tiny").window_days == 30
    assert ScaleConfig.from_named("small").total_users == 10_000
    assert ScaleConfig.from_named("medium").total_users == 100_000
    assert ScaleConfig.from_named("large").total_users == 1_000_000


def test_scale_config_unknown_named_value_raises():
    with pytest.raises(ValueError, match="unknown scale"):
        ScaleConfig.from_named("galactic")


def test_simulation_config_minimum_valid():
    cfg = SimulationConfig(
        name="minimal",
        domain="ecommerce",
        axes={"scale": "tiny"},
    )
    assert cfg.name == "minimal"
    assert cfg.domain == "ecommerce"
    assert cfg.resolved_scale().total_users == 1_000


def test_simulation_config_scale_override():
    cfg = SimulationConfig(
        name="override",
        domain="ecommerce",
        axes={"scale": "tiny"},
        scale_config=ScaleOverride(total_users=500, window_days=7),
    )
    scale = cfg.resolved_scale()
    assert scale.total_users == 500
    assert scale.window_days == 7


def test_simulation_config_extra_keys_rejected():
    with pytest.raises(ValidationError):
        SimulationConfig.model_validate(
            {
                "name": "bad",
                "domain": "ecommerce",
                "axes": {"scale": "tiny"},
                "mystery_key": "nope",
            }
        )


def test_simulation_config_random_seed_is_optional():
    cfg = SimulationConfig(
        name="minimal",
        domain="ecommerce",
        axes={"scale": "tiny"},
    )
    assert cfg.random_seed is None
