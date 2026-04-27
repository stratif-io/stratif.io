from __future__ import annotations

from services.event_simulator.simulator.config import (
    MarkovConfig,
    ScaleOverride,
    SimulationConfig,
)
from services.event_simulator.simulator.markov import MarkovEvent
from services.event_simulator.simulator.preview import PreviewResult, run_preview


def _minimal_config() -> SimulationConfig:
    return SimulationConfig(
        name="test",
        scale_config=ScaleOverride(starting_rate=33.0, window_days=30),
        axes={"stickiness": "normal"},
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


def test_preview_total_new_users_roughly_matches_starting_rate():
    """Rate-driven: total roughly proportional to starting_rate × window_days."""
    config = _minimal_config()  # 33/day × 30 days ≈ 1000
    result = run_preview(config)
    total = sum(result.new_users)
    assert 200 < total < 3_000  # wide but non-trivial range


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
            assert result.events[d] > 0


def test_preview_reactivated_never_exceeds_active_users():
    result = run_preview(_minimal_config())
    for d in range(len(result.days)):
        assert result.reactivated[d] <= result.active_users[d]


def test_preview_reactivated_day_zero_is_zero():
    result = run_preview(_minimal_config())
    assert result.reactivated[0] == 0


def _rate_driven_config() -> SimulationConfig:
    """Config with starting_rate=50, window=60 — rate-driven mode."""
    return SimulationConfig(
        name="test_rate",
        scale_config=ScaleOverride(starting_rate=50.0, window_days=60),
        axes={"stickiness": "normal"},
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


def test_rate_driven_arrays_have_window_length():
    result = run_preview(_rate_driven_config())
    assert len(result.new_users) == 60
    assert len(result.active_users) == 60
    assert len(result.stickiness) == 60
    assert len(result.growth_curve) == 60


def test_rate_driven_higher_starting_rate_gives_more_users():
    """Doubling starting_rate should roughly double total users."""
    base = _rate_driven_config()
    double = base.model_copy(
        update={"scale_config": ScaleOverride(starting_rate=100.0, window_days=60)}
    )
    r1 = run_preview(base)
    r2 = run_preview(double)
    assert sum(r2.new_users) > sum(r1.new_users)
    assert sum(r2.new_users) >= 1.5 * sum(r1.new_users)


def test_goal_driven_mode_hits_target():
    """Goal-driven mode: total users should be approximately the target."""
    config = SimulationConfig(
        name="test_goal",
        scale_config=ScaleOverride(total_users=2_000, window_days=90),
        axes={"stickiness": "normal"},
        markov=MarkovConfig(
            events=[MarkovEvent(name="PageView")],
            start={"PageView": 1.0},
            transitions={"PageView": {"[end]": 1.0}},
        ),
        random_seed=42,
    )
    result = run_preview(config)
    total = sum(result.new_users)
    assert 1_700 < total < 2_300  # within 15% of target (seed is fixed)
