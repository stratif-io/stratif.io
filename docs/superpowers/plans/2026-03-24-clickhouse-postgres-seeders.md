# ClickHouse & PostgreSQL Seeders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `seed-clickhouse` and `seed-postgres` CLI commands that seed an existing ClickHouse or PostgreSQL server with the same synthetic e-commerce events dataset used by DuckDB/SQLite seeders.

**Architecture:** Two new seeder classes (`ClickHouseSeeder`, `PostgreSQLSeeder`) each extend `BaseSeeder` from `seeders/seeder.py`, implement `_create_events_table()`, `_insert_events()`, and `seed()`, then register CLI entry points in `pyproject.toml`. Connection parameters (host, port, user, password, database) come from env vars read via a new config class (same pattern as `SeedConfig`). The `.env.example` file gains new keys for both databases.

**Tech Stack:** `clickhouse-connect>=0.7.0` (optional dep, already declared), `psycopg2-binary>=2.9.11` (already a core dep), `pydantic-settings` for config, `testcontainers` for integration tests.

---

## File Map

| File | Action |
|------|--------|
| `seeders/seeder_clickhouse.py` | Create — ClickHouseSeeder class + main() |
| `seeders/seeder_postgresql.py` | Create — PostgreSQLSeeder class + main() |
| `seeders/tests/test_seeder_clickhouse.py` | Create — integration test with testcontainers |
| `seeders/tests/test_seeder_postgresql.py` | Create — integration test with testcontainers |
| `seeders/.env.example` | Modify — add ClickHouse + PostgreSQL vars |
| `pyproject.toml` | Modify — add seed-clickhouse, seed-postgres scripts |

---

## Task 0: Create branch

All work must be done on a branch, not directly on `main`.

- [ ] **Step 1: Create and switch to a feature branch**

```bash
git checkout -b feat/clickhouse-postgres-seeders
```

---

## Task 1: PostgreSQL Seeder

**Files:**
- Create: `seeders/seeder_postgresql.py`
- Create: `seeders/tests/test_seeder_postgresql.py`
- Modify: `seeders/.env.example`
- Modify: `pyproject.toml`

The PostgreSQL seeder connects via `psycopg2` using host/port/dbname/user/password from env vars. It creates an `events` table with `TIMESTAMPTZ` and `JSONB` columns, adds an index on `(user_id, timestamp)`, and bulk-inserts via `psycopg2.extras.execute_batch()`.

- [ ] **Step 1: Add PostgreSQL vars to `.env.example`**

Append to `seeders/.env.example`:
```
# PostgreSQL connection (for seed-postgres)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
POSTGRES_DATABASE=postgres
```

- [ ] **Step 2: Add `seed-postgres` script to `pyproject.toml`**

In `[project.scripts]`, add:
```toml
seed-postgres = "seeders.seeder_postgresql:main"
```

- [ ] **Step 3: Write the failing integration test**

Create `seeders/tests/test_seeder_postgresql.py`:

```python
"""Integration tests for PostgreSQLSeeder using testcontainers."""
import pytest
from testcontainers.postgres import PostgresContainer

from seeders.seeder_postgresql import PostgreSQLSeeder


@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16") as pg:
        yield pg


@pytest.fixture(scope="module")
def pg_env(postgres_container):
    """Set env vars for the container once for the entire module."""
    mp = pytest.MonkeyPatch()
    mp.setenv("POSTGRES_HOST", postgres_container.get_container_host_ip())
    mp.setenv("POSTGRES_PORT", str(postgres_container.get_exposed_port(5432)))
    mp.setenv("POSTGRES_USER", postgres_container.username)
    mp.setenv("POSTGRES_PASSWORD", postgres_container.password)
    mp.setenv("POSTGRES_DATABASE", postgres_container.dbname)
    mp.setenv("SEED_USERS", "10")
    mp.setenv("SEED_DAYS", "7")
    yield
    mp.undo()


def test_seed_inserts_events(pg_env):
    seeder = PostgreSQLSeeder()
    stats = seeder.seed()

    assert stats["total_events"] > 0
    assert stats["total_users"] == 10


def test_seed_is_idempotent(pg_env):
    """Running seed twice should not raise — table uses CREATE IF NOT EXISTS."""
    seeder = PostgreSQLSeeder()
    seeder.seed()
    seeder.seed()  # should not raise
```

- [ ] **Step 4: Run test to verify it fails (no implementation yet)**

```bash
uv run pytest seeders/tests/test_seeder_postgresql.py -v
```
Expected: `ImportError` or `ModuleNotFoundError` — `seeder_postgresql` doesn't exist yet.

- [ ] **Step 5: Create `seeders/seeder_postgresql.py`**

```python
"""PostgreSQL seeder — writes analytics events to a PostgreSQL database.

Usage:
    uv run seed-postgres

Required env vars (or set in seeders/.env.seed):
    POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE
"""

from __future__ import annotations

import json
from pathlib import Path

import psycopg2
import psycopg2.extras
import structlog
from pydantic_settings import BaseSettings

from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class PostgresConfig(BaseSettings):
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "postgres"
    postgres_password: str = ""
    postgres_database: str = "postgres"

    class Config:
        env_file = str(Path(__file__).parent / ".env.seed")
        env_file_encoding = "utf-8"
        extra = "ignore"


class PostgreSQLSeeder(BaseSeeder):
    """Writes seeded events to a PostgreSQL database."""

    def __init__(self) -> None:
        config = SeedConfig()
        super().__init__(config=config)
        self._pg_config = PostgresConfig()
        self._conn: psycopg2.extensions.connection

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        with self._conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    user_id     TEXT        NOT NULL,
                    event_name  TEXT        NOT NULL,
                    timestamp   TIMESTAMPTZ NOT NULL,
                    properties  JSONB       NOT NULL
                )
            """)
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_events_user_ts "
                "ON events (user_id, timestamp)"
            )
        self._conn.commit()

    def _insert_events(self, events: list[tuple]) -> None:
        if not events:
            return
        rows = [(e[0], e[1], e[2], json.dumps(e[3])) for e in events]
        with self._conn.cursor() as cur:
            psycopg2.extras.execute_batch(
                cur,
                "INSERT INTO events (user_id, event_name, timestamp, properties) "
                "VALUES (%s, %s, %s, %s)",
                rows,
                page_size=1000,
            )
        self._conn.commit()

    def seed(self) -> dict[str, int]:
        cfg = self._pg_config
        log.info(
            "seeding_start",
            users=self.config.seed_users,
            days=self.config.seed_days,
            host=cfg.postgres_host,
            database=cfg.postgres_database,
        )

        self._conn = psycopg2.connect(
            host=cfg.postgres_host,
            port=cfg.postgres_port,
            dbname=cfg.postgres_database,
            user=cfg.postgres_user,
            password=cfg.postgres_password,
        )
        try:
            self._generate_products()
            self._create_events_table()
            users = self._generate_users()

            total_events = 0
            for batch in self._generate_events_batched(users):
                self._insert_events(batch)
                total_events += len(batch)
                if total_events % PROGRESS_INTERVAL < len(batch):
                    log.info("seeding_progress", total_events=total_events)
        finally:
            self._conn.close()

        stats = {
            "total_events": total_events,
            "total_users": len(users),
            "new_users": sum(1 for u in users if not u["is_returning"]),
            "returning_users": sum(1 for u in users if u["is_returning"]),
            "power_users": sum(1 for u in users if u["is_power_user"]),
            "completed_purchases": sum(1 for u in users if u["completed_purchase"]),
        }
        log.info("seeding_complete", **stats)
        return stats


def main() -> None:
    seeder = PostgreSQLSeeder()
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
uv run pytest seeders/tests/test_seeder_postgresql.py -v
```
Expected: both tests PASS.

- [ ] **Step 7: Commit**

```bash
git add seeders/seeder_postgresql.py seeders/tests/test_seeder_postgresql.py seeders/.env.example pyproject.toml
git commit -m "feat(seeders): add PostgreSQL seeder"
```

---

## Task 2: ClickHouse Seeder

**Files:**
- Create: `seeders/seeder_clickhouse.py`
- Create: `seeders/tests/test_seeder_clickhouse.py`
- Modify: `seeders/.env.example`
- Modify: `pyproject.toml`

The ClickHouse seeder connects via `clickhouse_connect.get_client()`. It creates a `MergeTree` events table with `DateTime64(6)` (microsecond precision) partitioned by month with `ORDER BY (user_id, timestamp)`, and bulk-inserts using `client.insert()` with columnar data.

- [ ] **Step 1: Add ClickHouse vars to `.env.example`**

Append to `seeders/.env.example`:
```
# ClickHouse connection (for seed-clickhouse)
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=default
```

- [ ] **Step 2: Add `seed-clickhouse` script to `pyproject.toml`**

In `[project.scripts]`, add:
```toml
seed-clickhouse = "seeders.seeder_clickhouse:main"
```

- [ ] **Step 3: Write the failing integration test**

Create `seeders/tests/test_seeder_clickhouse.py`:

```python
"""Integration tests for ClickHouseSeeder using testcontainers."""
import pytest
from testcontainers.clickhouse import ClickHouseContainer

from seeders.seeder_clickhouse import ClickHouseSeeder


@pytest.fixture(scope="module")
def clickhouse_container():
    with ClickHouseContainer("clickhouse/clickhouse-server:latest") as ch:
        yield ch


@pytest.fixture(scope="module")
def ch_env(clickhouse_container):
    """Set env vars for the container once for the entire module."""
    mp = pytest.MonkeyPatch()
    mp.setenv("CLICKHOUSE_HOST", clickhouse_container.get_container_host_ip())
    mp.setenv("CLICKHOUSE_PORT", str(clickhouse_container.get_exposed_port(8123)))
    mp.setenv("CLICKHOUSE_USER", "default")
    mp.setenv("CLICKHOUSE_PASSWORD", "")
    mp.setenv("CLICKHOUSE_DATABASE", "default")
    mp.setenv("SEED_USERS", "10")
    mp.setenv("SEED_DAYS", "7")
    yield
    mp.undo()


def test_seed_inserts_events(ch_env):
    seeder = ClickHouseSeeder()
    stats = seeder.seed()

    assert stats["total_events"] > 0
    assert stats["total_users"] == 10


def test_seed_is_idempotent(ch_env):
    """Running seed twice should not raise — table uses CREATE IF NOT EXISTS."""
    seeder = ClickHouseSeeder()
    seeder.seed()
    seeder.seed()  # should not raise
```

- [ ] **Step 4: Run test to verify it fails (no implementation yet)**

```bash
uv run pytest seeders/tests/test_seeder_clickhouse.py -v
```
Expected: `ImportError` or `ModuleNotFoundError` — `seeder_clickhouse` doesn't exist yet.

- [ ] **Step 5: Create `seeders/seeder_clickhouse.py`**

```python
"""ClickHouse seeder — writes analytics events to a ClickHouse database.

Usage:
    uv run seed-clickhouse

Install the optional clickhouse dep if needed:
    uv pip install ".[clickhouse]"

Required env vars (or set in seeders/.env.seed):
    CLICKHOUSE_HOST, CLICKHOUSE_PORT, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD, CLICKHOUSE_DATABASE
"""

from __future__ import annotations

import json
from pathlib import Path

import structlog
from pydantic_settings import BaseSettings

from seeders.seeder import PROGRESS_INTERVAL, BaseSeeder, SeedConfig

log = structlog.get_logger(__name__)


class ClickHouseConfig(BaseSettings):
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "default"

    class Config:
        env_file = str(Path(__file__).parent / ".env.seed")
        env_file_encoding = "utf-8"
        extra = "ignore"


class ClickHouseSeeder(BaseSeeder):
    """Writes seeded events to a ClickHouse database."""

    def __init__(self) -> None:
        config = SeedConfig()
        super().__init__(config=config)
        self._ch_config = ClickHouseConfig()

    # ------------------------------------------------------------------
    # Dialect implementation
    # ------------------------------------------------------------------

    def _create_events_table(self) -> None:
        self._client.command("""
            CREATE TABLE IF NOT EXISTS events (
                user_id     String,
                event_name  String,
                timestamp   DateTime64(6),
                properties  String
            )
            ENGINE = MergeTree()
            PARTITION BY toYYYYMM(timestamp)
            ORDER BY (user_id, timestamp)
        """)

    def _insert_events(self, events: list[tuple]) -> None:
        if not events:
            return
        self._client.insert(
            "events",
            data=[
                [e[0], e[1], e[2], json.dumps(e[3])]
                for e in events
            ],
            column_names=["user_id", "event_name", "timestamp", "properties"],
        )

    def seed(self) -> dict[str, int]:
        import clickhouse_connect

        cfg = self._ch_config
        log.info(
            "seeding_start",
            users=self.config.seed_users,
            days=self.config.seed_days,
            host=cfg.clickhouse_host,
            database=cfg.clickhouse_database,
        )

        self._client = clickhouse_connect.get_client(
            host=cfg.clickhouse_host,
            port=cfg.clickhouse_port,
            username=cfg.clickhouse_user,
            password=cfg.clickhouse_password,
            database=cfg.clickhouse_database,
        )
        try:
            self._generate_products()
            self._create_events_table()
            users = self._generate_users()

            total_events = 0
            for batch in self._generate_events_batched(users):
                self._insert_events(batch)
                total_events += len(batch)
                if total_events % PROGRESS_INTERVAL < len(batch):
                    log.info("seeding_progress", total_events=total_events)
        finally:
            self._client.close()

        stats = {
            "total_events": total_events,
            "total_users": len(users),
            "new_users": sum(1 for u in users if not u["is_returning"]),
            "returning_users": sum(1 for u in users if u["is_returning"]),
            "power_users": sum(1 for u in users if u["is_power_user"]),
            "completed_purchases": sum(1 for u in users if u["completed_purchase"]),
        }
        log.info("seeding_complete", **stats)
        return stats


def main() -> None:
    seeder = ClickHouseSeeder()
    stats = seeder.seed()
    print(
        f"\nDone — {stats['total_events']:,} events, {stats['total_users']:,} users "
        f"({stats['completed_purchases']:,} purchases)"
    )


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
uv run pytest seeders/tests/test_seeder_clickhouse.py -v
```
Expected: both tests PASS.

- [ ] **Step 7: Commit**

```bash
git add seeders/seeder_clickhouse.py seeders/tests/test_seeder_clickhouse.py seeders/.env.example pyproject.toml
git commit -m "feat(seeders): add ClickHouse seeder"
```

---

## Task 3: Open PR

- [ ] **Step 1: Push branch and open PR**

```bash
git push -u origin feat/clickhouse-postgres-seeders
gh pr create --title "feat(seeders): add ClickHouse and PostgreSQL seeders" --body "Adds seed-clickhouse and seed-postgres CLI commands mirroring the existing DuckDB/SQLite seeders. Both connect to existing server instances via env vars."
```

---

## Notes

- Both seeders read connection config from `seeders/.env.seed` (the live file, not `.env.example`). Copy `.env.example` to `.env.seed` and fill in your values before running.
- `clickhouse-connect` is an optional dep: install with `uv pip install ".[clickhouse]"` if not already present.
- `psycopg2-binary` is already a core dep — no extra install needed for PostgreSQL.
- The `.env.example` file is the template users copy; `.env.seed` is the actual file read at runtime (already gitignored).
- `testcontainers[clickhouse]` is already in dev dependencies. For Postgres testcontainer support you may need `uv add --dev "testcontainers[postgres]"` if not already present — check `pyproject.toml` before adding.
