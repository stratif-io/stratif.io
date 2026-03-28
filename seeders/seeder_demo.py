"""Demo seeder — generates MyApp mobile events into a DuckDB file.

Usage:
    uv run seed-demo [--output path/to/demo.duckdb] [--users N] [--days N]

Defaults: 2000 users, 90 days, output to db/demo.duckdb
"""

from __future__ import annotations

import argparse
import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import duckdb
import pandas as pd
import structlog

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PLATFORMS = ["ios", "android"]

PLATFORM_WEIGHTS = [0.55, 0.45]

EVENTS = [
    "app_open",
    "app_close",
    "signup",
    "onboarding_started",
    "onboarding_completed",
    "screen_view",
    "feature_used",
    "purchase",
    "upgrade_clicked",
    "share",
    "search",
    "push_notification_opened",
]

SCREENS = [
    "home",
    "discover",
    "profile",
    "settings",
    "notifications",
    "search_results",
    "item_detail",
    "upgrade",
]

# Drop-off probabilities through onboarding funnel (fraction who continue)
ONBOARDING_COMPLETION_RATE = 0.68

# Fraction of users who eventually make a purchase (across all sessions)
PURCHASE_RATE = 0.22

# Fraction of sessions (for returning users) triggered by a push notification
PUSH_TRIGGERED_RATE = 0.15

DEFAULT_USERS = 2000
DEFAULT_DAYS = 90
DEFAULT_OUTPUT = "db/demo.duckdb"

INSERT_BATCH_SIZE = 5000


# ---------------------------------------------------------------------------
# Seeder
# ---------------------------------------------------------------------------


class DemoSeeder:
    def __init__(
        self,
        num_users: int = DEFAULT_USERS,
        num_days: int = DEFAULT_DAYS,
        output: str = DEFAULT_OUTPUT,
    ):
        self.num_users = num_users
        self.num_days = num_days
        self.output = output

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    def seed(self) -> dict[str, int]:
        out = Path(self.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        if out.exists():
            out.unlink()  # Remove existing DB to avoid appending

        log.info("demo_seed_start", users=self.num_users, days=self.num_days, output=str(out))

        conn = duckdb.connect(str(out))
        try:
            self._create_table(conn)
            users = self._generate_users()
            total_events = self._write_all_events(conn, users)
        finally:
            conn.close()

        stats = {
            "total_events": total_events,
            "total_users": len(users),
            "new_users": sum(1 for u in users if not u["is_returning"]),
            "returning_users": sum(1 for u in users if u["is_returning"]),
        }
        log.info("demo_seed_complete", **stats)
        return stats

    # ------------------------------------------------------------------
    # Table
    # ------------------------------------------------------------------

    def _create_table(self, conn: duckdb.DuckDBPyConnection) -> None:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                user_id     VARCHAR,
                session_id  VARCHAR,
                event_name  VARCHAR,
                timestamp   TIMESTAMP,
                platform    VARCHAR,
                properties  JSON
            )
        """)

    # ------------------------------------------------------------------
    # User generation
    # ------------------------------------------------------------------

    def _generate_users(self) -> list[dict]:
        users = []
        base = datetime.now() - timedelta(days=self.num_days)

        for _ in range(self.num_users):
            is_returning = random.random() < 0.55
            platform = random.choices(PLATFORMS, weights=PLATFORM_WEIGHTS, k=1)[0]
            signup_day = random.randint(0, self.num_days - 1)

            users.append({
                "id": str(uuid.uuid4()),
                "platform": platform,
                "is_returning": is_returning,
                "signup_day": signup_day,
                "signup_ts": base + timedelta(days=signup_day),
                "will_purchase": random.random() < PURCHASE_RATE,
                "has_purchased": False,
            })

        return users

    # ------------------------------------------------------------------
    # Session generation
    # ------------------------------------------------------------------

    def _generate_session(
        self, user: dict, session_idx: int, session_start: datetime
    ) -> list[tuple]:
        """Return list of (user_id, session_id, event_name, timestamp, platform, properties)."""
        session_id = f"{user['id']}_{session_idx}"
        events: list[tuple] = []
        t = session_start

        def evt(name: str, extra: dict | None = None) -> tuple:
            props: dict = {"session_id": session_id}
            if extra:
                props.update(extra)
            return (user["id"], session_id, name, t, user["platform"], props)

        # Always open
        events.append(evt("app_open"))

        # Push notification open (returning users — this triggered the app open)
        if user["is_returning"] and random.random() < PUSH_TRIGGERED_RATE:
            t += timedelta(seconds=random.randint(2, 10))
            events.append(evt("push_notification_opened", {"campaign": random.choice(["reengagement", "promo", "update", "social"])}))

        is_first_session = session_idx == 0 and not user["is_returning"]

        if is_first_session:
            # New user: signup → onboarding
            t += timedelta(seconds=random.randint(3, 10))
            events.append(evt("signup"))

            t += timedelta(seconds=random.randint(2, 5))
            events.append(evt("onboarding_started"))

            if random.random() < ONBOARDING_COMPLETION_RATE:
                t += timedelta(seconds=random.randint(30, 120))
                events.append(evt("onboarding_completed"))

        # Mid-session activity
        num_actions = random.randint(2, 8)
        for _ in range(num_actions):
            t += timedelta(seconds=random.randint(5, 60))
            action = random.choices(
                ["screen_view", "feature_used", "search", "share", "upgrade_clicked"],
                weights=[0.40, 0.30, 0.15, 0.08, 0.07],
                k=1,
            )[0]

            if action == "screen_view":
                events.append(evt("screen_view", {"screen": random.choice(SCREENS)}))
            elif action == "feature_used":
                events.append(evt("feature_used", {"feature": random.choice(["bookmark", "like", "comment", "follow", "create"])}))
            elif action == "search":
                events.append(evt("search", {"query": random.choice(["trending", "nearby", "new", "popular", "recommended"])}))
            elif action == "share":
                events.append(evt("share", {"method": random.choice(["link", "instagram", "whatsapp", "twitter"])}))
            elif action == "upgrade_clicked":
                events.append(evt("upgrade_clicked", {"source": random.choice(["banner", "paywall", "settings"])}))

        # Purchase funnel: upgrade_clicked → purchase (for users flagged will_purchase)
        if user["will_purchase"] and not user["has_purchased"] and random.random() < 0.4:
            t += timedelta(seconds=random.randint(5, 20))
            events.append(evt("upgrade_clicked", {"source": random.choice(["banner", "paywall", "settings"])}))
            t += timedelta(seconds=random.randint(5, 30))
            events.append(evt("purchase", {
                "amount": round(random.choice([4.99, 9.99, 14.99, 29.99]), 2),
                "currency": "USD",
                "plan": random.choice(["monthly", "annual"]),
            }))
            user["has_purchased"] = True

        # Always close
        t += timedelta(seconds=random.randint(5, 30))
        events.append(evt("app_close", {"duration_sec": int((t - session_start).total_seconds())}))

        return events

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def _write_all_events(self, conn: duckdb.DuckDBPyConnection, users: list[dict]) -> int:
        base = datetime.now() - timedelta(days=self.num_days)
        batch: list[tuple] = []
        total = 0

        for user in users:
            num_sessions = random.randint(3, 15) if user["is_returning"] else random.randint(1, 4)

            for session_idx in range(num_sessions):
                if not user["is_returning"]:
                    # Non-returning: sessions cluster around signup
                    day_offset = user["signup_day"] + random.randint(0, 2)
                elif session_idx == 0:
                    # First session always on or just after signup (cohort anchor)
                    day_offset = user["signup_day"]
                else:
                    # Subsequent sessions: spread across remaining days with decay
                    # Earlier sessions more likely to be closer to signup
                    max_days = self.num_days - 1 - user["signup_day"]
                    if max_days <= 0:
                        day_offset = user["signup_day"]
                    else:
                        # Exponential-ish spread: bias toward earlier days
                        spread = random.randint(1, max(1, max_days))
                        day_offset = user["signup_day"] + spread
                day_offset = min(day_offset, self.num_days - 1)
                session_start = base + timedelta(
                    days=day_offset,
                    hours=random.randint(7, 23),
                    minutes=random.randint(0, 59),
                )
                session_events = self._generate_session(user, session_idx, session_start)
                batch.extend(session_events)

                if len(batch) >= INSERT_BATCH_SIZE:
                    self._insert_batch(conn, batch)
                    total += len(batch)
                    batch = []

        if batch:
            self._insert_batch(conn, batch)
            total += len(batch)

        return total

    def _insert_batch(self, conn: duckdb.DuckDBPyConnection, events: list[tuple]) -> None:
        df = pd.DataFrame(  # noqa: F841
            {
                "user_id":    [e[0] for e in events],
                "session_id": [e[1] for e in events],
                "event_name": [e[2] for e in events],
                "timestamp":  [e[3] for e in events],
                "platform":   [e[4] for e in events],
                "properties": [json.dumps(e[5]) for e in events],
            }
        )
        conn.execute(
            "INSERT INTO events "
            "SELECT user_id, session_id, event_name, timestamp, platform, properties::JSON FROM df"
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate MyApp demo dataset")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Output DuckDB file path")
    parser.add_argument("--users", type=int, default=DEFAULT_USERS, help="Number of users")
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS, help="Days of history")
    args = parser.parse_args()

    seeder = DemoSeeder(num_users=args.users, num_days=args.days, output=args.output)
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['new_users']:,} new, {stats['returning_users']:,} returning)"
    )


if __name__ == "__main__":
    main()
