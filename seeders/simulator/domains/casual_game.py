"""Casual game domain pack — session archetypes + event vocabulary."""

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


class CasualGamePack:
    name: str = "casual_game"
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
    )
    supported_monetization: tuple[str, ...] = ("iap_whales", "ad_supported", "freemium")

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

        # browser: optional DailyBonusClaimed → 1-2 levels (fail/start), optional AdShown
        if archetype == "browser":
            if rng.random() < 0.50:
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(
                        rng, user, "DailyBonusClaimed", t, dict(base_props), referrer
                    )
                )
            for _ in range(rng.randint(1, 2)):
                t += _gap(rng, "normal")
                props = dict(base_props)
                props["level_id"] = rng.randint(1, 20)
                events.append(event_tuple(rng, user, "LevelStart", t, props, referrer))
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(rng, user, "LevelFail", t, dict(base_props), referrer)
                )
            if rng.random() < 0.30:
                t += _gap(rng, "normal")
                ad_props = dict(base_props)
                ad_props["ad_network"] = rng.choice(["admob", "unity_ads", "applovin"])
                events.append(event_tuple(rng, user, "AdShown", t, ad_props, referrer))
            return events

        # researcher + converter share the core loop
        t += _gap(rng, "normal")
        events.append(
            event_tuple(rng, user, "DailyBonusClaimed", t, dict(base_props), referrer)
        )

        for _ in range(rng.randint(3, 5)):
            t += _gap(rng, "normal")
            props = dict(base_props)
            props["level_id"] = rng.randint(1, 50)
            events.append(event_tuple(rng, user, "LevelStart", t, props, referrer))
            t += _gap(rng, "normal")
            if rng.random() < 0.65:
                events.append(
                    event_tuple(
                        rng, user, "LevelComplete", t, dict(base_props), referrer
                    )
                )
                t += _gap(rng, "rapid")
                reward_props = dict(base_props)
                reward_props["reward_points"] = rng.randint(10, 200)
                events.append(
                    event_tuple(rng, user, "RewardCollected", t, reward_props, referrer)
                )
            else:
                events.append(
                    event_tuple(rng, user, "LevelFail", t, dict(base_props), referrer)
                )

        if archetype == "researcher":
            if rng.random() < 0.40:
                t += _gap(rng, "normal")
                events.append(
                    event_tuple(rng, user, "IAPOffer", t, dict(base_props), referrer)
                )
            if rng.random() < 0.50:
                t += _gap(rng, "normal")
                ad_props = dict(base_props)
                ad_props["ad_network"] = rng.choice(["admob", "unity_ads", "applovin"])
                events.append(event_tuple(rng, user, "AdShown", t, ad_props, referrer))
                t += _gap(rng, "rapid")
                events.append(
                    event_tuple(rng, user, "AdClicked", t, dict(base_props), referrer)
                )
            return events

        # converter
        t += _gap(rng, "normal")
        iap_props = dict(base_props)
        iap_props["iap_sku"] = rng.choice(
            ["gem_pack_small", "gem_pack_medium", "no_ads"]
        )
        events.append(event_tuple(rng, user, "IAPOffer", t, iap_props, referrer))
        t += _gap(rng, "rapid")
        events.append(event_tuple(rng, user, "IAPPurchase", t, iap_props, referrer))
        if rng.random() < 0.30:
            t += _gap(rng, "rapid")
            events.append(
                event_tuple(
                    rng, user, "ShareAchievement", t, dict(base_props), referrer
                )
            )
        user["completed_purchase"] = True
        return events


assert isinstance(CasualGamePack(), DomainPack)
