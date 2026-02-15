"""Database seeding for generating test data."""

import random
import uuid
from datetime import datetime, timedelta
from typing import Optional

from faker import Faker

from openflow.config import get_settings
from openflow.db.connection import Database


# Event types for realistic data
FUNNEL_PATH = ["Home", "Search", "ProductView", "AddToCart", "Purchase"]

RANDOM_EVENTS = [
    "Sign Up",
    "Page View",
    "Feature Click",
    "Settings Changed",
    "Profile Updated",
    "Logout",
    "Help Clicked",
    "Review Viewed",
]


class Seeder:
    """Database seeder for generating test analytics data."""

    def __init__(self, db: Optional[Database] = None):
        self.db = db or Database()
        self.faker = Faker()
        self.settings = get_settings()

    def seed(self) -> dict[str, int]:
        """
        Seed the database with test data.

        Returns:
            Dictionary with seeding statistics
        """
        print("🌱 Seeding database with funnel patterns...")

        self._create_events_table()
        users = self._generate_users()
        events = self._generate_events(users)
        self._insert_events(events)

        stats = {
            "total_events": len(events),
            "total_users": len(users),
            "structured_users": sum(1 for u in users if u["is_structured"]),
            "random_users": sum(1 for u in users if not u["is_structured"]),
        }

        print(
            f"✅ Seeded {stats['total_events']} events for {stats['total_users']} users"
        )
        print(f"   - {stats['structured_users']} structured users (funnel path)")
        print(f"   - {stats['random_users']} random users (noise)")

        return stats

    def _create_events_table(self) -> None:
        """Create the events table if it doesn't exist."""
        self.db.execute_write("""
            CREATE TABLE IF NOT EXISTS events (
                user_id VARCHAR,
                event_name VARCHAR,
                timestamp TIMESTAMP,
                properties JSON
            )
        """)

    def _generate_users(self) -> list[dict]:
        """Generate user records."""
        users = []
        num_users = self.settings.seed_users

        for _ in range(num_users):
            device_type = random.choice(["Mobile", "Desktop"])
            users.append(
                {
                    "id": str(uuid.uuid4()),
                    "device_type": device_type,
                    "is_structured": random.random()
                    < 0.6,  # 60% follow structured funnel
                }
            )

        return users

    def _generate_events(self, users: list[dict]) -> list[tuple]:
        """Generate event records for all users."""
        events = []
        base_time = datetime.now() - timedelta(days=self.settings.seed_days)

        for user in users:
            num_sessions = random.randint(1, 8)

            for session_idx in range(num_sessions):
                session_start = base_time + timedelta(
                    days=random.randint(0, self.settings.seed_days - 1),
                    hours=random.randint(0, 23),
                )

                if user["is_structured"] and random.random() < 0.7:
                    # Structured funnel path
                    events_in_session = random.randint(3, 5)
                    path = FUNNEL_PATH[:events_in_session]

                    for i, event_name in enumerate(path):
                        timestamp = session_start + timedelta(
                            minutes=i * 2 + random.randint(0, 3)
                        )
                        properties = {
                            "device_type": user["device_type"],
                            "source": "web",
                            "utm_campaign": "summer_sale"
                            if random.random() < 0.3
                            else None,
                        }
                        events.append((user["id"], event_name, timestamp, properties))
                else:
                    # Random events
                    num_events = random.randint(2, 6)
                    for i in range(num_events):
                        event_name = random.choice(RANDOM_EVENTS)
                        timestamp = session_start + timedelta(
                            minutes=i * 5 + random.randint(0, 10)
                        )
                        properties = {
                            "device_type": user["device_type"],
                            "source": random.choice(["web", "mobile", "api"]),
                            "utm_campaign": random.choice([None, "organic", None]),
                        }
                        events.append((user["id"], event_name, timestamp, properties))

        return events

    def _insert_events(self, events: list[tuple]) -> None:
        """Insert events into the database."""
        self.db.execute_many(
            "INSERT INTO events (user_id, event_name, timestamp, properties) VALUES (?, ?, ?, ?)",
            events,
        )

    def clear(self) -> None:
        """Clear all data from the database."""
        self.db.execute_write("DROP TABLE IF EXISTS events")
        print("🗑️  Cleared database")


def seed_database(db: Optional[Database] = None) -> dict[str, int]:
    """Convenience function to seed the database."""
    seeder = Seeder(db)
    return seeder.seed()
