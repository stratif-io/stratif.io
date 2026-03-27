"""Unit tests for BaseSeeder._get_server()."""
import pytest

from seeders.seeder import BaseSeeder, SeedConfig


class ConcreteSeeder(BaseSeeder):
    """Minimal concrete subclass for testing BaseSeeder methods."""

    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


@pytest.fixture
def seeder():
    return ConcreteSeeder(config=SeedConfig(seed_users=1, seed_days=1))


def test_get_server_us_countries(seeder):
    for country in ("US", "BR"):
        server = seeder._get_server(country)
        assert server in ("server.us.1", "server.us.2"), f"Unexpected server for {country}: {server}"


def test_get_server_eu_countries(seeder):
    for country in ("UK", "DE", "FR"):
        server = seeder._get_server(country)
        assert server in ("server.eu.1", "server.eu.2"), f"Unexpected server for {country}: {server}"


def test_get_server_asia_countries(seeder):
    for country in ("JP", "IN", "AU"):
        server = seeder._get_server(country)
        assert server in ("server.asia.1", "server.asia.2"), f"Unexpected server for {country}: {server}"


def test_get_server_returns_different_values_over_time(seeder):
    """Verify both .1 and .2 can be returned (probabilistic — runs 200 times)."""
    results = {seeder._get_server("US") for _ in range(200)}
    assert results == {"server.us.1", "server.us.2"}
