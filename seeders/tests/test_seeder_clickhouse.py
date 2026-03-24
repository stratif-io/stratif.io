"""Integration tests for ClickHouseSeeder using testcontainers."""
import pytest
from testcontainers.clickhouse import ClickHouseContainer

from seeders.seeder_clickhouse import ClickHouseSeeder


@pytest.fixture(scope="module")
def clickhouse_container():
    with ClickHouseContainer("clickhouse/clickhouse-server:24.3") as ch:
        yield ch


@pytest.fixture(scope="module")
def ch_env(clickhouse_container):
    """Set env vars for the container once for the entire module."""
    mp = pytest.MonkeyPatch()
    mp.setenv("CLICKHOUSE_HOST", clickhouse_container.get_container_host_ip())
    mp.setenv("CLICKHOUSE_PORT", str(clickhouse_container.get_exposed_port(8123)))
    mp.setenv("CLICKHOUSE_USER", clickhouse_container.username)
    mp.setenv("CLICKHOUSE_PASSWORD", clickhouse_container.password)
    mp.setenv("CLICKHOUSE_DATABASE", clickhouse_container.dbname)
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
    """Running seed twice should not raise — table uses CREATE IF NOT EXISTS.
    MergeTree does not deduplicate; double-seeding doubles the row count intentionally.
    """
    seeder = ClickHouseSeeder()
    seeder.seed()
    stats = seeder.seed()  # should not raise
    assert stats["total_events"] > 0
