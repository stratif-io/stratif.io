"""Dating domain pack — session archetypes + event vocabulary."""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from seeders.simulator.domains._shared import event_tuple, pick_referrer
from seeders.simulator.protocols import DomainPack, SimulationState
from seeders.simulator.realism.inter_event import sample_inter_event_seconds

_ARCHETYPES = ("bounce", "browser", "researcher", "converter")


def _gap(rng: random.Random, kind: str = "normal") -> timedelta:
    return timedelta(seconds=sample_inter_event_seconds(rng, kind))


class DatingPack:
    name: str = "dating"
    events: tuple[str, ...] = (
        "SessionStart",
        "ProfileView",
        "Swipe",
        "Match",
        "MessageSent",
        "MessageRead",
        "DateScheduled",
        "SubscriptionUpgraded",
        "AccountDeleted",
    )
    supported_monetization: tuple[str, ...] = ("subscription",)

    def build_session(
        self,
        user: dict,
        session_start: datetime,
        archetype: str,
        state: SimulationState,
        rng: random.Random,
    ) -> list[tuple]:
        if archetype not in _ARCHETYPES:
            raise ValueError(f"unknown archetype {archetype!r}; valid: {_ARCHETYPES}")

        session_id = f"{user['id']}_{str(uuid.uuid4())[:6]}"
        referrer = pick_referrer(rng)
        t = session_start
        events: list[tuple] = []
        base_props = {
            "session_id": session_id,
            "is_returning_user": user["is_returning"],
        }

        events.append(
            event_tuple(rng, user, "SessionStart", t, dict(base_props), referrer)
        )
        if archetype == "bounce":
            return events

        if archetype == "browser":
            for _ in range(rng.randint(2, 4)):
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(rng, user, "ProfileView", t, dict(base_props), referrer)
                )
                t += _gap(rng, "rapid")
                events.append(
                    event_tuple(rng, user, "Swipe", t, dict(base_props), referrer)
                )
            return events

        # researcher + converter: 4-8 ProfileView + Swipe cycles
        for _ in range(rng.randint(4, 8)):
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "ProfileView", t, dict(base_props), referrer)
            )
            t += _gap(rng, "rapid")
            events.append(
                event_tuple(rng, user, "Swipe", t, dict(base_props), referrer)
            )
        if rng.random() < 0.30:
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "Match", t, dict(base_props), referrer)
            )
            if rng.random() < 0.30:
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(rng, user, "MessageSent", t, dict(base_props), referrer)
                )
                if rng.random() < 0.20:
                    t += _gap(rng, "normal")
                    events.append(
                        event_tuple(
                            rng, user, "MessageRead", t, dict(base_props), referrer
                        )
                    )

        if archetype == "researcher":
            return events

        # converter: optional SubscriptionUpgraded → DateScheduled
        if rng.random() < 0.20:
            t += _gap(rng, "normal")
            events.append(
                event_tuple(
                    rng, user, "SubscriptionUpgraded", t, dict(base_props), referrer
                )
            )
        t += _gap(rng, "normal")
        events.append(
            event_tuple(rng, user, "DateScheduled", t, dict(base_props), referrer)
        )
        user["completed_purchase"] = True
        return events


assert isinstance(DatingPack(), DomainPack)
