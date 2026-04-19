"""Log-normal inter-event gap sampler (seconds)."""

from __future__ import annotations

import math
import random

_PARAMS: dict[str, tuple[float, float]] = {
    "rapid": (0.5, 0.8),
    "normal": (3.0, 1.2),
    "slow": (5.0, 1.5),
}


def sample_inter_event_seconds(rng: random.Random, kind: str = "normal") -> float:
    if kind not in _PARAMS:
        raise ValueError(f"unknown inter-event kind {kind!r}; valid: {sorted(_PARAMS)}")
    mu, sigma = _PARAMS[kind]
    z = rng.gauss(0, 1)
    return math.exp(mu + sigma * z)
