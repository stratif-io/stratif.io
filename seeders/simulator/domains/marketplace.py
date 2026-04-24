"""Marketplace domain pack — session archetypes + event vocabulary."""

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


class MarketplacePack:
    name: str = "marketplace"
    events: tuple[str, ...] = (
        "PageView",
        "Search",
        "ListingView",
        "MessageToSeller",
        "Offer",
        "Purchase",
        "ListingCreated",
        "ListingSold",
    )
    supported_monetization: tuple[str, ...] = ("marketplace_fee",)

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

        # PageView — every archetype starts here
        events.append(event_tuple(rng, user, "PageView", t, dict(base_props), referrer))
        if archetype == "bounce":
            return events

        # Search
        t += _gap(rng, "normal")
        events.append(event_tuple(rng, user, "Search", t, dict(base_props), referrer))

        # ListingViews
        view_counts = {"browser": (1, 3), "researcher": (3, 5), "converter": (2, 4)}
        lo, hi = view_counts[archetype]
        for i in range(rng.randint(lo, hi)):
            t += _gap(rng, "normal" if i == 0 else "slow")
            props = dict(base_props)
            props["listing_id"] = str(uuid.uuid4())[:8]
            events.append(event_tuple(rng, user, "ListingView", t, props, referrer))

        if archetype == "browser":
            return events

        if archetype == "researcher":
            # 50% chance of MessageToSeller
            if rng.random() < 0.50:
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(
                        rng, user, "MessageToSeller", t, dict(base_props), referrer
                    )
                )
                # 30% chance of Offer after message
                if rng.random() < 0.30:
                    t += _gap(rng, "normal")
                    events.append(
                        event_tuple(rng, user, "Offer", t, dict(base_props), referrer)
                    )
            return events

        # converter: full chain
        t += _gap(rng, "normal")
        events.append(
            event_tuple(rng, user, "MessageToSeller", t, dict(base_props), referrer)
        )

        t += _gap(rng, "normal")
        events.append(event_tuple(rng, user, "Offer", t, dict(base_props), referrer))

        t += _gap(rng, "rapid")
        purchase_props = dict(base_props)
        purchase_props["order_id"] = str(uuid.uuid4())[:12]
        purchase_props["currency"] = user["currency"]
        events.append(event_tuple(rng, user, "Purchase", t, purchase_props, referrer))

        # 10% chance of seller-side events (user is also a seller)
        if rng.random() < 0.10:
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "ListingCreated", t, dict(base_props), referrer)
            )
            t += _gap(rng, "rapid")
            events.append(
                event_tuple(rng, user, "ListingSold", t, dict(base_props), referrer)
            )

        user["completed_purchase"] = True
        return events


assert isinstance(MarketplacePack(), DomainPack)
