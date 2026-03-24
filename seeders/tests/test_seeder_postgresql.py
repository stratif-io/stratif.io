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
