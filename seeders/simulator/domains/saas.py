"""SaaS domain pack — session archetypes + event vocabulary."""

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


class SaasPack:
    name: str = "saas"
    events: tuple[str, ...] = (
        "SignUp",
        "EmailVerified",
        "Onboarded",
        "ProjectCreated",
        "ItemCreated",
        "InviteSent",
        "InviteAccepted",
        "UpgradePromptShown",
        "PlanUpgraded",
        "PlanDowngraded",
        "Cancelled",
    )
    supported_monetization: tuple[str, ...] = ("subscription", "freemium")

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
        is_returning = user.get("is_returning", False)

        if archetype == "bounce":
            event_name = "ItemCreated" if is_returning else "SignUp"
            events.append(
                event_tuple(rng, user, event_name, t, dict(base_props), referrer)
            )
            return events

        if archetype == "browser":
            if is_returning:
                for _ in range(rng.randint(1, 3)):
                    t += _gap(rng, "normal")
                    events.append(
                        event_tuple(
                            rng, user, "ItemCreated", t, dict(base_props), referrer
                        )
                    )
            else:
                events.append(
                    event_tuple(rng, user, "SignUp", t, dict(base_props), referrer)
                )
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(
                        rng, user, "EmailVerified", t, dict(base_props), referrer
                    )
                )
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(rng, user, "Onboarded", t, dict(base_props), referrer)
                )
            return events

        # researcher + converter share signup funnel for new users
        if not is_returning:
            events.append(
                event_tuple(rng, user, "SignUp", t, dict(base_props), referrer)
            )
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "EmailVerified", t, dict(base_props), referrer)
            )
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "Onboarded", t, dict(base_props), referrer)
            )
            for _ in range(rng.randint(1, 2)):
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(
                        rng, user, "ProjectCreated", t, dict(base_props), referrer
                    )
                )
            for _ in range(rng.randint(2, 4)):
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(rng, user, "ItemCreated", t, dict(base_props), referrer)
                )
            if rng.random() < 0.40:
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(rng, user, "InviteSent", t, dict(base_props), referrer)
                )
        else:
            for _ in range(rng.randint(2, 4)):
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(rng, user, "ItemCreated", t, dict(base_props), referrer)
                )

        if archetype == "researcher":
            if rng.random() < 0.50:
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(
                        rng, user, "UpgradePromptShown", t, dict(base_props), referrer
                    )
                )
            return events

        # converter
        t += _gap(rng, "normal")
        events.append(
            event_tuple(rng, user, "UpgradePromptShown", t, dict(base_props), referrer)
        )
        t += _gap(rng, "rapid")
        events.append(
            event_tuple(rng, user, "PlanUpgraded", t, dict(base_props), referrer)
        )
        user["completed_purchase"] = True
        return events


assert isinstance(SaasPack(), DomainPack)
