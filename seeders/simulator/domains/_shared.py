"""Helpers shared across domain packs."""

from __future__ import annotations

import random
from datetime import datetime

from seeders.seeder import COUNTRY_TO_SERVER_REGION, REFERRERS


def pick_referrer(rng: random.Random) -> str:
    items = [c[0] for c in REFERRERS]
    weights = [c[1] for c in REFERRERS]
    return rng.choices(items, weights=weights, k=1)[0]


def server(rng: random.Random, country: str) -> str:
    region = COUNTRY_TO_SERVER_REGION.get(country, "us")
    return f"server.{region}.{rng.choice(('1', '2'))}"


def event_tuple(
    rng: random.Random,
    user: dict,
    event_name: str,
    timestamp: datetime,
    props: dict,
    referrer: str,
) -> tuple:
    traits = user["traits"]
    context = {
        "country": user["country"],
        "city": user["city"],
        "timezone": user["timezone"],
        "device_type": user["device_type"],
        "browser": user["browser"],
        "os": user["os"],
        "screen_resolution": user["screen_resolution"],
        "referrer": referrer,
    }
    return (
        user["id"],
        event_name,
        timestamp,
        props,
        server(rng, user["country"]),
        traits,
        context,
    )
