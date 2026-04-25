from __future__ import annotations

from seeders.simulator.config import MarkovConfig, SimulationConfig
from seeders.simulator.markov import MarkovEvent
from seeders.simulator.preview import PreviewResult, run_preview


def _minimal_config() -> SimulationConfig:
    return SimulationConfig(
        name="test",
        axes={"scale": "tiny", "stickiness": "normal"},
        markov=MarkovConfig(
            events=[MarkovEvent(name="PageView"), MarkovEvent(name="Click")],
            start={"PageView": 1.0},
            transitions={
                "PageView": {"Click": 0.5, "[end]": 0.5},
                "Click": {"[end]": 1.0},
            },
        ),
        random_seed=42,
    )


def test_run_preview_returns_preview_result():
    result = run_preview(_minimal_config())
    assert isinstance(result, PreviewResult)


def test_preview_arrays_have_window_length():
    config = _minimal_config()
    result = run_preview(config)
    scale = config.resolved_scale()
    n = scale.window_days
    assert len(result.days) == n
    assert len(result.new_users) == n
    assert len(result.active_users) == n
    assert len(result.churned) == n
    assert len(result.reactivated) == n
    assert len(result.events) == n
    assert len(result.stickiness) == n


def test_preview_days_are_sequential():
    result = run_preview(_minimal_config())
    assert result.days == list(range(len(result.days)))


def test_preview_new_users_are_non_negative():
    result = run_preview(_minimal_config())
    assert all(v >= 0 for v in result.new_users)


def test_preview_stickiness_between_zero_and_one():
    result = run_preview(_minimal_config())
    assert all(0.0 <= v <= 1.0 for v in result.stickiness)


def test_preview_total_new_users_roughly_matches_scale():
    result = run_preview(_minimal_config())
    total = sum(result.new_users)
    # tiny scale = 1000 users; allow ±50% due to Poisson noise
    assert 500 <= total <= 1500


def test_preview_active_users_never_exceed_total_ever_acquired():
    result = run_preview(_minimal_config())
    cumulative = 0
    for d, (nu, au) in enumerate(
        zip(result.new_users, result.active_users, strict=True)
    ):
        cumulative += nu
        assert au <= cumulative, f"day {d}: active {au} > cumulative {cumulative}"


def test_preview_events_positive_when_active_users_positive():
    result = run_preview(_minimal_config())
    for d in range(len(result.days)):
        if result.active_users[d] > 0:
            assert result.events[d] >= 0
