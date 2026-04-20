"""Streaming domain pack — session archetypes + event vocabulary."""

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


class StreamingPack:
    name: str = "streaming"
    events: tuple[str, ...] = (
        "SessionStart",
        "Browse",
        "TitlePageView",
        "PlayStarted",
        "PlayPaused",
        "PlayCompleted",
        "Rated",
        "AddedToList",
        "PlanUpgraded",
        "Cancelled",
    )
    supported_monetization: tuple[str, ...] = ("subscription", "ad_supported")

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

        # All non-bounce archetypes Browse first
        t += _gap(rng, "normal")
        events.append(event_tuple(rng, user, "Browse", t, dict(base_props), referrer))

        # browser: 1-3 TitlePageViews, no playback
        if archetype == "browser":
            for _ in range(rng.randint(1, 3)):
                t += _gap(rng, "slow")
                title_props = dict(base_props)
                title_props["title_id"] = str(uuid.uuid4())[:8]
                events.append(
                    event_tuple(rng, user, "TitlePageView", t, title_props, referrer)
                )
            return events

        # researcher + converter: 2-4 TitlePageViews
        title_id = str(uuid.uuid4())[:8]
        for _ in range(rng.randint(2, 4)):
            t += _gap(rng, "slow")
            title_props = dict(base_props)
            title_props["title_id"] = title_id
            events.append(
                event_tuple(rng, user, "TitlePageView", t, title_props, referrer)
            )

        # researcher: PlayStarted → 60% PlayPaused (no PlayCompleted), optional AddedToList
        if archetype == "researcher":
            t += _gap(rng, "normal")
            play_props = dict(base_props)
            play_props["title_id"] = title_id
            events.append(
                event_tuple(rng, user, "PlayStarted", t, play_props, referrer)
            )
            if rng.random() < 0.60:
                t += _gap(rng, "slow")
                events.append(
                    event_tuple(rng, user, "PlayPaused", t, play_props, referrer)
                )
            if rng.random() < 0.30:
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(rng, user, "AddedToList", t, play_props, referrer)
                )
            return events

        # converter: PlayStarted → PlayCompleted → Rated → optional PlanUpgraded/Cancelled
        t += _gap(rng, "normal")
        play_props = dict(base_props)
        play_props["title_id"] = title_id
        events.append(event_tuple(rng, user, "PlayStarted", t, play_props, referrer))
        t += _gap(rng, "slow")
        events.append(event_tuple(rng, user, "PlayCompleted", t, play_props, referrer))
        t += _gap(rng, "rapid")
        rated_props = dict(base_props)
        rated_props["title_id"] = title_id
        rated_props["rating"] = rng.randint(1, 5)
        events.append(event_tuple(rng, user, "Rated", t, rated_props, referrer))
        if rng.random() < 0.10:
            t += _gap(rng, "normal")
            post_event = rng.choice(["PlanUpgraded", "Cancelled"])
            events.append(
                event_tuple(rng, user, post_event, t, dict(base_props), referrer)
            )
        user["completed_purchase"] = True
        return events


assert isinstance(StreamingPack(), DomainPack)
