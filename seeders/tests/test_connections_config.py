"""Unit tests for connections_config.py."""
import pytest

from seeders.connections_config import (
    load_connections_yaml,
    get_duckdb_credentials,
    get_sqlite_credentials,
    get_postgresql_credentials,
    get_clickhouse_credentials,
)

FIXTURE_YAML = """
backends:
  duckdb:
    enabled: true
    credentials:
      file_path: /data/test.duckdb
  sqlite:
    enabled: true
    credentials:
      file_path: /data/test.sqlite
  postgresql:
    enabled: true
    credentials:
      host: pg.localhost
      port: 5432
      database: testdb
      user: admin
      password: secret
  clickhouse:
    enabled: true
    credentials:
      host: ch.localhost
      port: 8123
      database: testdb
      user: admin
      password: secret
      secure: false
"""


@pytest.fixture
def yaml_path(tmp_path):
    p = tmp_path / "connections.yaml"
    p.write_text(FIXTURE_YAML)
    return p


def test_load_connections_yaml_returns_dict(yaml_path):
    cfg = load_connections_yaml(yaml_path)
    assert isinstance(cfg, dict)
    assert "backends" in cfg


def test_load_connections_yaml_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError, match="connections.yaml"):
        load_connections_yaml(tmp_path / "missing.yaml")


def test_get_duckdb_credentials(yaml_path):
    cfg = load_connections_yaml(yaml_path)
    creds = get_duckdb_credentials(cfg)
    assert creds["file_path"] == "/data/test.duckdb"


def test_get_sqlite_credentials(yaml_path):
    cfg = load_connections_yaml(yaml_path)
    creds = get_sqlite_credentials(cfg)
    assert creds["file_path"] == "/data/test.sqlite"


def test_get_postgresql_credentials(yaml_path):
    cfg = load_connections_yaml(yaml_path)
    creds = get_postgresql_credentials(cfg)
    assert creds["host"] == "pg.localhost"
    assert creds["database"] == "testdb"
    assert creds["user"] == "admin"
    assert creds["password"] == "secret"


def test_get_clickhouse_credentials(yaml_path):
    cfg = load_connections_yaml(yaml_path)
    creds = get_clickhouse_credentials(cfg)
    assert creds["host"] == "ch.localhost"
    assert creds["port"] == 8123
    assert creds["secure"] is False


def test_get_duckdb_credentials_missing_backend(yaml_path):
    cfg = load_connections_yaml(yaml_path)
    cfg["backends"].pop("duckdb")
    with pytest.raises(KeyError, match="duckdb"):
        get_duckdb_credentials(cfg)
