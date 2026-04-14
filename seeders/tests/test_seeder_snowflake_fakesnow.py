"""End-to-end smoke test for seeder_snowflake against fakesnow.

Verifies the bulk-staging path works without real Snowflake stages.
"""

from __future__ import annotations

import os
from unittest.mock import patch

import pytest


@pytest.fixture
def fakesnow_patched():
    fakesnow = pytest.importorskip("fakesnow")
    with fakesnow.patch():
        yield


def test_snowflake_seeder_e2e_against_fakesnow(fakesnow_patched):
    os.environ["SEED_USERS"] = "5"
    os.environ["SEED_DAYS"] = "2"

    import snowflake.connector

    conn = snowflake.connector.connect(
        account="fakesnow",
        user="test",
        password="test",
        warehouse="wh",
        database="DB",
        schema="PUBLIC",
    )
    try:
        with patch(
            "seeders.seeder_snowflake.load_connections_yaml",
            return_value={
                "backends": {
                    "snowflake": {
                        "credentials": {
                            "account": "fakesnow",
                            "user": "test",
                            "password": "test",
                            "database": "DB",
                            "schema": "PUBLIC",
                            "warehouse": "wh",
                        }
                    }
                }
            },
        ):
            from seeders.seeder_snowflake import SnowflakeSeeder

            seeder = SnowflakeSeeder()
            stats = seeder.seed()

        assert stats["total_users"] == 5
        assert stats["total_events"] > 0

        # Reconnect from a fresh cursor to verify rows landed in events
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM events")
        count_row = cur.fetchone()
        assert count_row is not None
        assert count_row[0] == stats["total_events"]

        # VARIANT columns should be queryable as JSON
        cur.execute("SELECT context:country::STRING FROM events LIMIT 1")
        country_row = cur.fetchone()
        assert country_row is not None
        assert isinstance(country_row[0], str) and country_row[0]
    finally:
        conn.close()
