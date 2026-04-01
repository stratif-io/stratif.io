"""Generate small SQLite and DuckDB test fixture databases for E2E tests.

Run from the project root:
    python backend/tests/e2e/fixtures/seed.py

Produces:
    backend/tests/e2e/fixtures/test.db      (SQLite)
    backend/tests/e2e/fixtures/test.duckdb  (DuckDB)

Uses 200 users over 90 days — small enough to be fast, large enough
for all analytics endpoints to return results.
"""

import sys
from pathlib import Path

# Ensure project root is on path when run directly.
ROOT = Path(__file__).resolve().parents[4]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

FIXTURES_DIR = Path(__file__).parent
SQLITE_OUT = FIXTURES_DIR / "test.db"
DUCKDB_OUT = FIXTURES_DIR / "test.duckdb"

_SEED_USERS = 200
_SEED_DAYS = 90


def _seed_sqlite() -> None:
    import json
    import random
    import sqlite3
    import uuid
    from datetime import datetime, timedelta

    from seeders.seeder import BROWSERS, COUNTRIES, DEVICE_TYPES, FUNNEL_PATH

    print(f"Seeding SQLite → {SQLITE_OUT}")
    SQLITE_OUT.unlink(missing_ok=True)
    conn = sqlite3.connect(str(SQLITE_OUT))
    conn.execute("""
        CREATE TABLE events (
            user_id    TEXT NOT NULL,
            event_name TEXT NOT NULL,
            timestamp  DATETIME NOT NULL,
            properties TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX idx_ts ON events (timestamp)")
    conn.commit()

    rng = random.Random(42)
    country_codes = list(COUNTRIES.keys())
    country_weights = [COUNTRIES[c]["weight"] for c in country_codes]
    browser_names = [b[0] for b in BROWSERS]
    browser_weights = [b[1] for b in BROWSERS]
    device_names = [d[0] for d in DEVICE_TYPES]
    device_weights = [d[1] for d in DEVICE_TYPES]

    now = datetime.now()
    rows: list[tuple] = []

    for _ in range(_SEED_USERS):
        uid = str(uuid.uuid4())
        country = rng.choices(country_codes, weights=country_weights)[0]
        city = rng.choice(COUNTRIES[country]["cities"])
        browser = rng.choices(browser_names, weights=browser_weights)[0]
        device = rng.choices(device_names, weights=device_weights)[0]

        for _ in range(rng.randint(1, 5)):
            ts = now - timedelta(
                days=rng.randint(0, _SEED_DAYS - 1),
                hours=rng.randint(0, 23),
                minutes=rng.randint(0, 59),
            )
            event = rng.choice(list(FUNNEL_PATH))
            props = {
                "country": country,
                "city": city,
                "browser": browser,
                "device_type": device,
                "session_id": str(uuid.uuid4())[:12],
            }
            rows.append(
                (uid, event, ts.strftime("%Y-%m-%d %H:%M:%S"), json.dumps(props))
            )

    conn.executemany(
        "INSERT INTO events (user_id, event_name, timestamp, properties) VALUES (?,?,?,?)",
        rows,
    )
    conn.commit()
    conn.close()
    print(f"  Done — {len(rows)} events written to {SQLITE_OUT}")


def _seed_duckdb() -> None:
    import json
    import random
    import uuid
    from datetime import datetime, timedelta

    import duckdb

    from seeders.seeder import BROWSERS, COUNTRIES, DEVICE_TYPES, FUNNEL_PATH

    print(f"Seeding DuckDB → {DUCKDB_OUT}")
    DUCKDB_OUT.unlink(missing_ok=True)
    conn = duckdb.connect(str(DUCKDB_OUT))
    conn.execute("""
        CREATE TABLE events (
            user_id    VARCHAR,
            event_name VARCHAR,
            timestamp  TIMESTAMP,
            properties JSON
        )
    """)

    rng = random.Random(42)
    country_codes = list(COUNTRIES.keys())
    country_weights = [COUNTRIES[c]["weight"] for c in country_codes]
    browser_names = [b[0] for b in BROWSERS]
    browser_weights = [b[1] for b in BROWSERS]
    device_names = [d[0] for d in DEVICE_TYPES]
    device_weights = [d[1] for d in DEVICE_TYPES]

    now = datetime.now()
    rows: list[tuple] = []

    for _ in range(_SEED_USERS):
        uid = str(uuid.uuid4())
        country = rng.choices(country_codes, weights=country_weights)[0]
        city = rng.choice(COUNTRIES[country]["cities"])
        browser = rng.choices(browser_names, weights=browser_weights)[0]
        device = rng.choices(device_names, weights=device_weights)[0]

        for _ in range(rng.randint(1, 5)):
            ts = now - timedelta(
                days=rng.randint(0, _SEED_DAYS - 1),
                hours=rng.randint(0, 23),
                minutes=rng.randint(0, 59),
            )
            event = rng.choice(list(FUNNEL_PATH))
            props = json.dumps(
                {
                    "country": country,
                    "city": city,
                    "browser": browser,
                    "device_type": device,
                    "session_id": str(uuid.uuid4())[:12],
                }
            )
            rows.append((uid, event, ts, props))

    conn.executemany(
        "INSERT INTO events VALUES (?, ?, ?, ?)",
        rows,
    )
    conn.close()
    print(f"  Done — {len(rows)} events written to {DUCKDB_OUT}")


if __name__ == "__main__":
    _seed_sqlite()
    _seed_duckdb()
    print("\nFixtures created. Run: pytest -m e2e")
