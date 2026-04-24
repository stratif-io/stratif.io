"""Fintech domain pack — session archetypes + event vocabulary."""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from seeders.simulator.domains._shared import event_tuple, pick_referrer
from seeders.simulator.protocols import DomainPack, SimulationState
from seeders.simulator.realism.inter_event import sample_inter_event_seconds

_ARCHETYPES = ("bounce", "browser", "researcher", "converter")

_CONVERSION_EVENTS = ("Deposit", "Withdrawal", "TransferExternal", "CardPurchase")


def _gap(rng: random.Random, kind: str = "normal") -> timedelta:
    return timedelta(seconds=sample_inter_event_seconds(rng, kind))


class FintechPack:
    name: str = "fintech"
    events: tuple[str, ...] = (
        "SessionStart",
        "AccountOpened",
        "Deposit",
        "Withdrawal",
        "TransferInternal",
        "TransferExternal",
        "CardPurchase",
        "BalanceChecked",
        "StatementViewed",
    )
    supported_monetization: tuple[str, ...] = ("one_off_purchase",)

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

        # SessionStart — every archetype begins here
        events.append(
            event_tuple(rng, user, "SessionStart", t, dict(base_props), referrer)
        )
        if archetype == "bounce":
            return events

        if archetype == "browser":
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "BalanceChecked", t, dict(base_props), referrer)
            )
            if rng.random() < 0.50:
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(
                        rng, user, "StatementViewed", t, dict(base_props), referrer
                    )
                )
            return events

        if archetype == "researcher":
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "BalanceChecked", t, dict(base_props), referrer)
            )
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "StatementViewed", t, dict(base_props), referrer)
            )
            # 70% chance of TransferInternal (30% just inspects, never fires)
            if rng.random() < 0.70:
                t += _gap(rng, "slow")
                amount_props = dict(base_props)
                amount_props["amount"] = round(rng.uniform(10.0, 500.0), 2)
                amount_props["currency"] = user["currency"]
                events.append(
                    event_tuple(
                        rng, user, "TransferInternal", t, amount_props, referrer
                    )
                )
            return events

        # converter
        # New users get AccountOpened right after SessionStart
        if not user["is_returning"]:
            t += _gap(rng, "rapid")
            events.append(
                event_tuple(rng, user, "AccountOpened", t, dict(base_props), referrer)
            )

        t += _gap(rng, "normal")
        events.append(
            event_tuple(rng, user, "BalanceChecked", t, dict(base_props), referrer)
        )

        t += _gap(rng, "normal")
        conversion_event = rng.choice(_CONVERSION_EVENTS)
        amount_props = dict(base_props)
        amount_props["amount"] = round(rng.uniform(10.0, 1000.0), 2)
        amount_props["currency"] = user["currency"]
        events.append(
            event_tuple(rng, user, conversion_event, t, amount_props, referrer)
        )

        user["completed_purchase"] = True
        return events


assert isinstance(FintechPack(), DomainPack)
