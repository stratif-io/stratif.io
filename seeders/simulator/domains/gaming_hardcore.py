"""Gaming hardcore domain pack — session archetypes + event vocabulary."""

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


class GamingHardcorePack:
    name: str = "gaming_hardcore"
    events: tuple[str, ...] = (
        "SessionStart",
        "LevelStart",
        "LevelComplete",
        "LevelFail",
        "RewardCollected",
        "IAPOffer",
        "IAPPurchase",
        "AdShown",
        "AdClicked",
        "ShareAchievement",
        "DailyBonusClaimed",
        "MatchmakingStart",
        "MatchStart",
        "MatchEnd",
        "ClanJoin",
        "Chat",
    )
    supported_monetization: tuple[str, ...] = ("iap_whales", "ad_supported")

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

        # browser: matchmaking → 50% chance of a full match
        if archetype == "browser":
            t += _gap(rng, "normal")
            events.append(
                event_tuple(
                    rng, user, "MatchmakingStart", t, dict(base_props), referrer
                )
            )
            if rng.random() < 0.50:
                t += _gap(rng, "normal")
                match_props = dict(base_props)
                match_props["match_id"] = str(uuid.uuid4())[:8]
                events.append(
                    event_tuple(rng, user, "MatchStart", t, match_props, referrer)
                )
                t += _gap(rng, "slow")
                events.append(
                    event_tuple(rng, user, "MatchEnd", t, match_props, referrer)
                )
            return events

        # researcher + converter: 2-4 full match cycles
        # Optional ClanJoin on first session
        if not user["is_returning"] and rng.random() < 0.20:
            t += _gap(rng, "normal")
            events.append(
                event_tuple(rng, user, "ClanJoin", t, dict(base_props), referrer)
            )

        for i in range(rng.randint(2, 4)):
            t += _gap(rng, "normal" if i == 0 else "slow")
            events.append(
                event_tuple(
                    rng, user, "MatchmakingStart", t, dict(base_props), referrer
                )
            )
            t += _gap(rng, "normal")
            match_props = dict(base_props)
            match_props["match_id"] = str(uuid.uuid4())[:8]
            events.append(
                event_tuple(rng, user, "MatchStart", t, match_props, referrer)
            )
            t += _gap(rng, "slow")
            events.append(event_tuple(rng, user, "MatchEnd", t, match_props, referrer))
            if rng.random() < 0.30:
                t += _gap(rng, "rapid")
                events.append(
                    event_tuple(rng, user, "Chat", t, dict(base_props), referrer)
                )

        if archetype == "researcher":
            return events

        # converter: IAPOffer → IAPPurchase
        t += _gap(rng, "normal")
        iap_props = dict(base_props)
        iap_props["iap_sku"] = rng.choice(["battle_pass", "skin_pack", "boost_pack"])
        events.append(event_tuple(rng, user, "IAPOffer", t, iap_props, referrer))
        t += _gap(rng, "rapid")
        events.append(event_tuple(rng, user, "IAPPurchase", t, iap_props, referrer))
        user["completed_purchase"] = True
        return events


assert isinstance(GamingHardcorePack(), DomainPack)
