"""Social domain pack — session archetypes + event vocabulary."""

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


class SocialPack:
    name: str = "social"
    events: tuple[str, ...] = (
        "SessionStart",
        "FeedLoaded",
        "PostViewed",
        "PostLiked",
        "PostShared",
        "CommentPosted",
        "FollowAdded",
        "MessageSent",
        "NotificationOpened",
    )
    supported_monetization: tuple[str, ...] = ("ad_supported",)

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

        # All non-bounce: FeedLoaded
        t += _gap(rng, "normal")
        events.append(
            event_tuple(rng, user, "FeedLoaded", t, dict(base_props), referrer)
        )

        if archetype == "browser":
            for _ in range(rng.randint(2, 5)):
                t += _gap(rng, "slow")
                events.append(
                    event_tuple(rng, user, "PostViewed", t, dict(base_props), referrer)
                )
            return events

        # researcher + converter: PostViewed → PostLiked → optional FollowAdded
        for _ in range(rng.randint(3, 6)):
            t += _gap(rng, "slow")
            events.append(
                event_tuple(rng, user, "PostViewed", t, dict(base_props), referrer)
            )
        for _ in range(rng.randint(1, 2)):
            t += _gap(rng, "rapid")
            events.append(
                event_tuple(rng, user, "PostLiked", t, dict(base_props), referrer)
            )
        if rng.random() < 0.30:
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "FollowAdded", t, dict(base_props), referrer)
            )

        if archetype == "researcher":
            return events

        # converter: one active engagement action
        t += _gap(rng, "normal")
        engagement = rng.choice(["PostShared", "CommentPosted", "MessageSent"])
        events.append(event_tuple(rng, user, engagement, t, dict(base_props), referrer))
        user["completed_purchase"] = True
        return events


assert isinstance(SocialPack(), DomainPack)
