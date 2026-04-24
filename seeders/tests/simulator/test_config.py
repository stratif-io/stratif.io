import pytest
from pydantic import ValidationError

from seeders.simulator.config import ScaleConfig, ScaleOverride, SimulationConfig
from seeders.simulator.markov import MarkovConfig, MarkovEvent

_TINY_MARKOV = MarkovConfig(
    events=[MarkovEvent(name="PageView")],
    start={"PageView": 1.0},
    transitions={"PageView": {"[end]": 1.0}},
)


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
        axes={"scale": "tiny"},
        markov=_TINY_MARKOV,
    )
    assert cfg.name == "minimal"
    assert cfg.resolved_scale().total_users == 1_000


def test_simulation_config_scale_override():
    cfg = SimulationConfig(
        name="override",
        axes={"scale": "tiny"},
        markov=_TINY_MARKOV,
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
                "axes": {"scale": "tiny"},
                "markov": _TINY_MARKOV,
                "mystery_key": "nope",
            }
        )


def test_simulation_config_random_seed_is_optional():
    cfg = SimulationConfig(
        name="minimal",
        axes={"scale": "tiny"},
        markov=_TINY_MARKOV,
    )
    assert cfg.random_seed is None


def test_simulation_config_partial_scale_override():
    """Only ``total_users`` overridden — ``window_days`` falls back to base tier."""
    cfg = SimulationConfig(
        name="partial",
        axes={"scale": "small"},
        markov=_TINY_MARKOV,
        scale_config=ScaleOverride(total_users=2_500),
    )
    scale = cfg.resolved_scale()
    assert scale.total_users == 2_500
    assert scale.window_days == 90  # base 'small' tier window_days


def test_simulation_config_accepts_markov():
    cfg = SimulationConfig(
        name="test",
        axes={"scale": "tiny"},
        markov=_TINY_MARKOV,
    )
    assert cfg.markov.events[0].name == "PageView"


def test_simulation_config_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        SimulationConfig.model_validate(
            {
                "name": "test",
                "domain": "saas",  # should fail: extra field not allowed
                "axes": {"scale": "tiny"},
                "markov": _TINY_MARKOV.model_dump(),
            }
        )
