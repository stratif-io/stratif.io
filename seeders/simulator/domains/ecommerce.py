"""Ecommerce domain pack — session archetypes + event vocabulary.

Extracted from the legacy ``seeder.py`` helpers (``_generate_funnel_session``,
``_generate_browse_session``, ``_build_event_properties``) for Phase 2a.
The legacy helpers remain in ``seeder.py`` during the transition and are
consolidated in Phase 5 once every domain is extracted.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from seeders.seeder import (
    COUNTRY_TO_SERVER_REGION,
    PRODUCT_CATEGORIES,
    REFERRERS,
    SEARCH_QUERIES,
    URL_PATHS,
)
from seeders.simulator.protocols import DomainPack, SimulationState
from seeders.simulator.realism.inter_event import sample_inter_event_seconds
from seeders.simulator.realism.power_law import zipf_sample

_ARCHETYPES = ("bounce", "browser", "researcher", "converter")


def _pick_referrer(rng: random.Random) -> str:
    items = [c[0] for c in REFERRERS]
    weights = [c[1] for c in REFERRERS]
    return rng.choices(items, weights=weights, k=1)[0]


def _product_cache() -> list[dict]:
    cache: list[dict] = []
    for category, data in PRODUCT_CATEGORIES.items():
        for product_name, price in data["products"]:
            cache.append(
                {
                    "product_id": str(uuid.uuid4())[:8],
                    "product_name": product_name,
                    "product_category": category,
                    "product_price": price,
                    "weight": data["weight"],
                }
            )
    return cache


# Built once per process — domain packs are stateless at the session boundary.
_PRODUCTS: list[dict] = _product_cache()
_PRODUCTS.sort(key=lambda p: -p["weight"])


def _pick_product(rng: random.Random) -> dict:
    idx = zipf_sample(rng, len(_PRODUCTS))
    return _PRODUCTS[idx]


def _server(rng: random.Random, country: str) -> str:
    region = COUNTRY_TO_SERVER_REGION.get(country, "us")
    return f"server.{region}.{rng.choice(('1', '2'))}"


def _event_tuple(
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
        _server(rng, user["country"]),
        traits,
        context,
    )


def _home_props(session_id: str, user: dict) -> dict:
    return {
        "session_id": session_id,
        "is_returning_user": user["is_returning"],
        "page_url": URL_PATHS["Home"],
    }


def _search_props(rng: random.Random, session_id: str, user: dict) -> dict:
    query = rng.choice(SEARCH_QUERIES)
    return {
        "session_id": session_id,
        "is_returning_user": user["is_returning"],
        "page_url": URL_PATHS["Search"].format(query=query.replace(" ", "+")),
        "search_query": query,
    }


def _product_view_props(session_id: str, user: dict, product: dict) -> dict:
    return {
        "session_id": session_id,
        "is_returning_user": user["is_returning"],
        "page_url": URL_PATHS["ProductView"].format(product_id=product["product_id"]),
        "product_id": product["product_id"],
        "product_name": product["product_name"],
        "product_category": product["product_category"],
        "product_price": product["product_price"],
    }


def _add_to_cart_props(
    rng: random.Random, session_id: str, user: dict, product: dict
) -> dict:
    return {
        "session_id": session_id,
        "is_returning_user": user["is_returning"],
        "page_url": "/cart",
        "product_id": product["product_id"],
        "product_name": product["product_name"],
        "product_category": product["product_category"],
        "product_price": product["product_price"],
        "quantity": rng.randint(1, 3),
    }


def _purchase_props(
    rng: random.Random, session_id: str, user: dict, purchased: list[dict]
) -> dict:
    total = sum(p["product_price"] for p in purchased)
    return {
        "session_id": session_id,
        "is_returning_user": user["is_returning"],
        "page_url": URL_PATHS["Purchase"],
        "order_id": str(uuid.uuid4())[:12],
        "total_amount": round(total, 2),
        "currency": user["currency"],
        "item_count": len(purchased),
        "payment_method": rng.choice(
            ["credit_card", "paypal", "apple_pay", "google_pay"]
        ),
    }


class EcommercePack:
    name: str = "ecommerce"
    events: tuple[str, ...] = (
        "Home",
        "Search",
        "ProductView",
        "AddToCart",
        "Purchase",
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
        referrer = _pick_referrer(rng)
        t = session_start
        events: list[tuple] = []

        # Every archetype starts on Home.
        events.append(
            _event_tuple(rng, user, "Home", t, _home_props(session_id, user), referrer)
        )
        if archetype == "bounce":
            return events

        # Search
        t += timedelta(seconds=sample_inter_event_seconds(rng, "normal"))
        events.append(
            _event_tuple(
                rng, user, "Search", t, _search_props(rng, session_id, user), referrer
            )
        )

        # ProductViews — count depends on archetype
        view_counts = {"browser": (1, 3), "researcher": (3, 6), "converter": (2, 5)}
        lo, hi = view_counts[archetype]
        visited: list[dict] = []
        for i, _ in enumerate(range(rng.randint(lo, hi))):
            kind = "normal" if i == 0 else "slow"
            t += timedelta(seconds=sample_inter_event_seconds(rng, kind))
            product = _pick_product(rng)
            visited.append(product)
            events.append(
                _event_tuple(
                    rng,
                    user,
                    "ProductView",
                    t,
                    _product_view_props(session_id, user, product),
                    referrer,
                )
            )

        if archetype == "browser":
            return events

        # Researcher sometimes adds to cart; converter always walks the funnel.
        if archetype == "researcher":
            if rng.random() < 0.5 and visited:
                t += timedelta(seconds=sample_inter_event_seconds(rng, "normal"))
                product = rng.choice(visited)
                events.append(
                    _event_tuple(
                        rng,
                        user,
                        "AddToCart",
                        t,
                        _add_to_cart_props(rng, session_id, user, product),
                        referrer,
                    )
                )
            return events

        # Converter — AddToCart then Purchase
        t += timedelta(seconds=sample_inter_event_seconds(rng, "normal"))
        cart_product = rng.choice(visited) if visited else _pick_product(rng)
        events.append(
            _event_tuple(
                rng,
                user,
                "AddToCart",
                t,
                _add_to_cart_props(rng, session_id, user, cart_product),
                referrer,
            )
        )

        t += timedelta(seconds=sample_inter_event_seconds(rng, "rapid"))
        # Purchase always includes the cart item; optionally some other viewed products too.
        extras_pool = [p for p in visited if p is not cart_product]
        extras_count = min(len(extras_pool), rng.randint(0, 2))
        purchased = [cart_product] + rng.sample(extras_pool, extras_count)
        events.append(
            _event_tuple(
                rng,
                user,
                "Purchase",
                t,
                _purchase_props(rng, session_id, user, purchased),
                referrer,
            )
        )
        # Intentional side effect: mark the user as converted so the cohort
        # engine can reference completed_purchase on the same dict without
        # plumbing a separate return channel.
        user["completed_purchase"] = True
        return events


assert isinstance(EcommercePack(), DomainPack)  # structural Protocol check
