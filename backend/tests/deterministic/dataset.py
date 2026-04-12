"""Fixed deterministic event dataset for cross-backend SQL verification.

2,448 rows. No randomness. Every row is derived from _USER_CONFIG.

Layout:
  - 10 users, each with fixed country/city/device_type/funnel_depth
  - 24 months: 2023-01-01 – 2024-12-31
  - 3 sessions per user per month, on days 1, 8, 15 at 10:00
  - Events within a session are 5 minutes apart
  - All sessions are separated by ≥ 7 days (always distinct sessions)

Precomputed totals:
  - page_view:   720  (all 10 users × 3 sessions × 24 months)
  - signup:      648  (users 001-009 × 3 × 24)
  - add_to_cart: 504  (users 001-007 × 3 × 24)
  - checkout:    288  (users 001-004 × 3 × 24)
  - purchase:    288  (users 001-004 × 3 × 24)
  - total:     2,448

  - Total sessions: 720  (10 × 3 × 24)
  - Avg session duration (sec): 720.0
      (4 users × 72 sess × 1200s + 3 × 72 × 600s + 2 × 72 × 300s + 1 × 72 × 0s) / 720
  - Avg events per session: 3.4
      2448 events / 720 sessions
  - Conversion (page_view→purchase): 4/10 users = 40.0%
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import TypedDict


class EventRow(TypedDict):
    user_id: str
    timestamp: str  # "YYYY-MM-DD HH:MM:SS"
    event_name: str
    properties: str  # JSON string


_FUNNEL = ["page_view", "signup", "add_to_cart", "checkout", "purchase"]

_USER_CONFIG: dict[str, dict] = {
    "user_001": {
        "funnel_depth": 5,
        "country": "US",
        "city": "New York",
        "device": "Desktop",
    },
    "user_002": {
        "funnel_depth": 5,
        "country": "UK",
        "city": "London",
        "device": "Mobile",
    },
    "user_003": {
        "funnel_depth": 5,
        "country": "FR",
        "city": "Paris",
        "device": "Tablet",
    },
    "user_004": {
        "funnel_depth": 5,
        "country": "US",
        "city": "New York",
        "device": "Mobile",
    },
    "user_005": {
        "funnel_depth": 3,
        "country": "UK",
        "city": "London",
        "device": "Desktop",
    },
    "user_006": {
        "funnel_depth": 3,
        "country": "FR",
        "city": "Paris",
        "device": "Mobile",
    },
    "user_007": {
        "funnel_depth": 3,
        "country": "US",
        "city": "New York",
        "device": "Tablet",
    },
    "user_008": {
        "funnel_depth": 2,
        "country": "UK",
        "city": "London",
        "device": "Desktop",
    },
    "user_009": {
        "funnel_depth": 2,
        "country": "FR",
        "city": "Paris",
        "device": "Mobile",
    },
    "user_010": {
        "funnel_depth": 1,
        "country": "US",
        "city": "New York",
        "device": "Desktop",
    },
}

_SESSION_DAYS = [1, 8, 15]  # day-of-month for each session
_SESSION_HOUR = 10  # all sessions start at 10:00:00
_EVENT_GAP_MINUTES = 5  # minutes between events in a session

TABLE_NAME = "deterministic_events"


def _generate() -> list[EventRow]:
    rows: list[EventRow] = []
    for year in (2023, 2024):
        for month in range(1, 13):
            for user_id, cfg in _USER_CONFIG.items():
                props = json.dumps(
                    {
                        "country": cfg["country"],
                        "city": cfg["city"],
                        "device_type": cfg["device"],
                    }
                )
                funnel = _FUNNEL[: cfg["funnel_depth"]]
                for day in _SESSION_DAYS:
                    session_start = datetime(year, month, day, _SESSION_HOUR, 0, 0)
                    for i, event_name in enumerate(funnel):
                        ts = session_start + timedelta(minutes=i * _EVENT_GAP_MINUTES)
                        rows.append(
                            EventRow(
                                user_id=user_id,
                                timestamp=ts.strftime("%Y-%m-%d %H:%M:%S"),
                                event_name=event_name,
                                properties=props,
                            )
                        )
    return rows


EVENTS: list[EventRow] = _generate()
