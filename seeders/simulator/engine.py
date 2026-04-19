"""Simulation engine — cohort-based arrival + per-user journey loop.

Flow per ``run()``:
  1. seed + build SimulationState
  2. apply every axis declared in config.axes (mutates state)
  3. resolve domain pack
  4. generate users by day (Poisson around arrival_curve(day)); each user
     gets an archetype + a lifetime via hazard_curve
  5. for each user day, sample session count + session archetypes, call
     domain.build_session, collect event tuples
  6. yield batches of size INSERT_BATCH_SIZE
"""

from __future__ import annotations

import logging
import math
import random
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from seeders.seeder import COUNTRIES, INSERT_BATCH_SIZE
from seeders.simulator.axes._defaults import default_axis_registry
from seeders.simulator.cohort import (
    assign_user_archetype,
    sample_daily_session_count,
    sample_session_archetype,
)
from seeders.simulator.config import SimulationConfig
from seeders.simulator.domains._defaults import default_domain_registry
from seeders.simulator.protocols import SimulationState

if TYPE_CHECKING:
    from seeders.seeder import BaseSeeder

_logger = logging.getLogger(__name__)


def _weighted_choice(
    rng: random.Random, items_and_weights: list[tuple[str, float]]
) -> str:
    items = [iw[0] for iw in items_and_weights]
    weights = [iw[1] for iw in items_and_weights]
    return rng.choices(items, weights=weights, k=1)[0]


def _country_and_city(
    rng: random.Random, allowed: set[str] | None = None
) -> tuple[str, str, dict]:
    items = [
        (code, data["weight"])
        for code, data in COUNTRIES.items()
        if allowed is None or code in allowed
    ]
    if not items:
        raise ValueError(f"no countries match geography filter {allowed!r}")
    country_code = _weighted_choice(rng, items)
    country_data = COUNTRIES[country_code]
    city = rng.choice(country_data["cities"])
    return country_code, city, country_data


def _poisson(rng: random.Random, lam: float) -> int:
    """Knuth's small-λ Poisson (duplicated from cohort module to avoid a
    circular import; worth extracting to a math util in Phase 3)."""
    if lam <= 0:
        return 0
    limit = math.exp(-lam)
    k = 0
    p = 1.0
    while True:
        k += 1
        p *= rng.random()
        if p < limit:
            return k - 1


class Engine:
    def __init__(self, config: SimulationConfig, base_seeder: BaseSeeder) -> None:
        self.config = config
        self.base_seeder = base_seeder

    def run(self) -> Iterator[list[tuple]]:
        """Yield batches of event tuples for the dialect seeder to insert."""
        scale = self.config.resolved_scale()
        state = SimulationState(
            random_seed=self.config.random_seed or 0,
            total_users=scale.total_users,
            window_days=scale.window_days,
            now=datetime.now(UTC),
        )

        # Plumb anomalies from config to state so the anomalies axis (inside
        # the loop below) can clear or preserve them as directed.
        state.anomalies = list(self.config.anomalies)

        # Apply every axis declared in the preset. Unknown axes are silently
        # ignored — Phase 2a only ships `growth` and `stickiness`; later
        # phases add the rest. This lets preset YAMLs declare future axes
        # without breaking today.
        axis_reg = default_axis_registry()
        for axis_name, axis_value in self.config.axes.items():
            try:
                axis = axis_reg.get(axis_name)
            except KeyError:
                continue
            axis.apply(axis_value, state)

        # Domain resolution. Unknown domain fails fast.
        domain = default_domain_registry().get(self.config.domain)

        # Coerce monetization if unsupported by the domain.
        if (
            state.monetization_mode is not None
            and state.monetization_mode not in domain.supported_monetization
        ):
            coerced = domain.supported_monetization[0]
            _logger.info(
                "monetization=%r not supported by domain %r; coerced to %r",
                state.monetization_mode,
                domain.name,
                coerced,
            )
            state.monetization_mode = coerced

        # Sample per-day arrivals (Poisson around the arrival curve).
        day_0 = state.now - timedelta(days=state.window_days)
        arrival_curve = state.arrival_curve or (
            lambda d: state.total_users / state.window_days
        )

        rng = random.Random(self.config.random_seed or 0)

        users_by_day: dict[int, list[dict]] = {}
        for d in range(state.window_days):
            lam = arrival_curve(d)
            n = _poisson(rng, lam)
            day_users: list[dict] = []
            for _ in range(n):
                country, city, country_data = _country_and_city(
                    rng, state.allowed_countries
                )
                user = {
                    "id": str(uuid.uuid4()),
                    "country": country,
                    "city": city,
                    "timezone": country_data["timezone"],
                    "currency": country_data["currency"],
                    "device_type": "Desktop",
                    "browser": "Chrome",
                    "os": "macOS",
                    "screen_resolution": "1920x1080",
                    "is_returning": rng.random() < 0.40,
                    "is_power_user": False,
                    "browser_only": False,
                    "completed_purchase": False,
                    "sessions": [],
                    "traits": self.base_seeder._generate_traits(country),
                    "_archetype": assign_user_archetype(rng),
                    "_acquisition_day": d,
                }
                if state.hazard_curve is not None:
                    user["_lifetime"] = state.hazard_curve(rng)
                else:
                    user["_lifetime"] = state.window_days
                day_users.append(user)
            users_by_day[d] = day_users

        batch: list[tuple] = []
        for d, users in users_by_day.items():
            for user in users:
                last_active_day = min(d + user["_lifetime"], state.window_days - 1)
                for active_d in range(d, last_active_day + 1):
                    session_count = sample_daily_session_count(
                        rng, user["_archetype"], active_d - d
                    )
                    for _ in range(session_count):
                        arch = sample_session_archetype(
                            rng,
                            user["_archetype"],
                            modifier=state.session_mix_modifier,
                        )
                        session_start = day_0 + timedelta(
                            days=active_d,
                            hours=rng.randint(8, 22),
                            minutes=rng.randint(0, 59),
                        )
                        events = domain.build_session(
                            user, session_start, arch, state, rng
                        )
                        batch.extend(events)
                        if len(batch) >= INSERT_BATCH_SIZE:
                            yield batch
                            batch = []
        if batch:
            yield batch
