# seeders/simulator/markov.py
"""Markov chain session config + runner."""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from pydantic import BaseModel, model_validator

from seeders.simulator.realism.inter_event import sample_inter_event_seconds
from seeders.simulator.session_shared import event_tuple, pick_referrer


class MarkovEvent(BaseModel):
    name: str
    color: str | None = None


class MarkovConfig(BaseModel):
    events: list[MarkovEvent]
    start: dict[str, float]
    transitions: dict[str, dict[str, float]]

    @model_validator(mode="after")
    def _validate_sums(self) -> "MarkovConfig":
        errors: list[str] = []
        start_sum = sum(self.start.values())
        if abs(start_sum - 1.0) > 0.001:
            errors.append(
                f"start distribution sums to {start_sum:.4f}, expected 1.0"
            )
        event_names = {e.name for e in self.events}
        for from_event, row in self.transitions.items():
            if from_event not in event_names:
                errors.append(
                    f"transitions key {from_event!r} not in events list"
                )
            row_sum = sum(row.values())
            if abs(row_sum - 1.0) > 0.001:
                errors.append(
                    f"row {from_event!r} sums to {row_sum:.4f}, expected 1.0"
                )
        if errors:
            raise ValueError("; ".join(errors))
        return self


class MarkovRunner:
    def __init__(self, config: MarkovConfig) -> None:
        self.config = config

    def build_session(
        self,
        user: dict,
        session_start: datetime,
        state: object,
        rng: random.Random,
    ) -> list[tuple]:
        referrer = pick_referrer(rng)
        t = session_start
        events: list[tuple] = []
        session_id = f"{user['id']}_{str(uuid.uuid4())[:6]}"
        base_props = {
            "session_id": session_id,
            "is_returning_user": user["is_returning"],
        }

        start_keys = list(self.config.start)
        start_weights = list(self.config.start.values())
        current = rng.choices(start_keys, weights=start_weights)[0]

        while current != "[end]":
            events.append(
                event_tuple(rng, user, current, t, dict(base_props), referrer)
            )
            t += timedelta(seconds=sample_inter_event_seconds(rng, "normal"))
            row = self.config.transitions.get(current, {"[end]": 1.0})
            current = rng.choices(list(row), weights=list(row.values()))[0]

        return events
