"""Tests for connection schema config API — resurrection_window_days and power_user_threshold_days."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from starlette.testclient import TestClient

from backend.api.connections.schema_detect import _suggest_fields
from backend.main import app
from backend.product_db.database import SQLiteProductDB
from backend.product_db.migrations import init_product_db


def _make_sqlite_row(data: dict):
    row = MagicMock()
    row.__getitem__ = lambda self, k: data[k]
    row.get = lambda k, default=None: data.get(k, default)
    row.keys = lambda: data.keys()
    for key, val in data.items():
        setattr(row, key, val)
    return row


@pytest.fixture()
def schema_client(tmp_path):
    """TestClient backed by a real SQLite product DB with migrations applied."""
    db_path = str(tmp_path / "product.db")
    db = SQLiteProductDB(db_path)
    init_product_db(db)

    # Seed a connection row
    db.execute(
        "INSERT INTO connections (id, name, db_type, credentials_encrypted, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        ("conn-1", "Test", "sqlite", "x", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"),
    )

    with patch("backend.api.connections.crud.get_product_db", return_value=db), TestClient(app) as client:
        yield client


class TestSchemaConfigNewFields:
    def test_put_schema_config_stores_resurrection_window_days(self, schema_client):
        resp = schema_client.put(
            "/api/connections/conn-1/schema",
            json={
                "user_id_field": "user_id",
                "timestamp_field": "timestamp",
                "event_name_field": "event_name",
                "events_table": "events",
                "custom_properties": [],
                "session_timeout_minutes": 30,
                "resurrection_window_days": 45,
                "power_user_threshold_days": 7,
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["resurrection_window_days"] == 45
        assert body["power_user_threshold_days"] == 7

    def test_get_schema_config_returns_persisted_values(self, schema_client):
        # First PUT
        schema_client.put(
            "/api/connections/conn-1/schema",
            json={
                "user_id_field": "user_id",
                "timestamp_field": "timestamp",
                "event_name_field": "event_name",
                "events_table": "events",
                "custom_properties": [],
                "session_timeout_minutes": 30,
                "resurrection_window_days": 45,
                "power_user_threshold_days": 7,
            },
        )
        # Then GET
        resp = schema_client.get("/api/connections/conn-1/schema")
        assert resp.status_code == 200
        body = resp.json()
        assert body["resurrection_window_days"] == 45
        assert body["power_user_threshold_days"] == 7

    def test_put_schema_config_uses_defaults_when_fields_omitted(self, schema_client):
        resp = schema_client.put(
            "/api/connections/conn-1/schema",
            json={
                "user_id_field": "user_id",
                "timestamp_field": "timestamp",
                "event_name_field": "event_name",
                "events_table": "events",
                "custom_properties": [],
                "session_timeout_minutes": 30,
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["resurrection_window_days"] == 30
        assert body["power_user_threshold_days"] == 4


class TestSchemaConfigUserIdentityFields:
    def test_put_and_get_roundtrip_user_identity_fields(self, schema_client):
        """PUT stores optional user identity fields; GET returns them."""
        payload = {
            "user_id_field": "uid",
            "timestamp_field": "ts",
            "event_name_field": "event",
            "events_table": "events",
            "custom_properties": [],
            "session_timeout_minutes": 30,
            "resurrection_window_days": 30,
            "power_user_threshold_days": 4,
            "email_field": "user_email",
            "first_name_field": "fname",
            "last_name_field": None,
            "date_of_birth_field": None,
            "phone_field": "mobile",
        }
        resp = schema_client.put("/api/connections/conn-1/schema", json=payload)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["email_field"] == "user_email"
        assert body["first_name_field"] == "fname"
        assert body["last_name_field"] is None
        assert body["phone_field"] == "mobile"

        get_resp = schema_client.get("/api/connections/conn-1/schema")
        assert get_resp.status_code == 200
        got = get_resp.json()
        assert got["email_field"] == "user_email"
        assert got["first_name_field"] == "fname"
        assert got["phone_field"] == "mobile"

    def test_put_without_user_identity_fields_defaults_to_none(self, schema_client):
        """Omitting user identity fields is valid; they default to None."""
        payload = {
            "user_id_field": "user_id",
            "timestamp_field": "timestamp",
            "event_name_field": "event_name",
            "events_table": "events",
            "custom_properties": [],
            "session_timeout_minutes": 30,
            "resurrection_window_days": 30,
            "power_user_threshold_days": 4,
        }
        resp = schema_client.put("/api/connections/conn-1/schema", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["email_field"] is None
        assert body["first_name_field"] is None


class TestSuggestFieldsUserIdentity:
    def _cols(self, names: list[str]) -> list[dict]:
        return [{"name": n, "type": "TEXT"} for n in names]

    def test_suggests_email_field(self):
        result = _suggest_fields(self._cols(["user_id", "timestamp", "event_name", "email"]))
        assert result.get("email_field") == "email"

    def test_suggests_email_from_user_email(self):
        result = _suggest_fields(self._cols(["uid", "ts", "action", "user_email"]))
        assert result.get("email_field") == "user_email"

    def test_suggests_first_name(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "first_name"]))
        assert result.get("first_name_field") == "first_name"

    def test_suggests_first_name_from_fname(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "fname"]))
        assert result.get("first_name_field") == "fname"

    def test_suggests_last_name(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "last_name"]))
        assert result.get("last_name_field") == "last_name"

    def test_suggests_date_of_birth(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "date_of_birth"]))
        assert result.get("date_of_birth_field") == "date_of_birth"

    def test_suggests_dob(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "dob"]))
        assert result.get("date_of_birth_field") == "dob"

    def test_suggests_phone(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "phone"]))
        assert result.get("phone_field") == "phone"

    def test_suggests_last_name_from_surname(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "surname"]))
        assert result.get("last_name_field") == "surname"

    def test_suggests_phone_from_mobile(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "mobile"]))
        assert result.get("phone_field") == "mobile"

    def test_no_suggestion_when_no_match(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event"]))
        assert "email_field" not in result
        assert "first_name_field" not in result
        assert "last_name_field" not in result
        assert "date_of_birth_field" not in result
        assert "phone_field" not in result

    # Fuzzy / camelCase / substring matching
    def test_suggests_user_id_from_camel_case(self):
        result = _suggest_fields(self._cols(["userId", "timestamp", "eventName"]))
        assert result.get("user_id_field") == "userId"

    def test_suggests_email_from_camel_case(self):
        result = _suggest_fields(self._cols(["userId", "ts", "event", "userEmail"]))
        assert result.get("email_field") == "userEmail"

    def test_suggests_email_via_substring(self):
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "contact_email_address"]))
        assert result.get("email_field") == "contact_email_address"

    def test_suggests_user_id_via_fuzzy(self):
        # "usr_id" is close enough to "user_id" (ratio > 0.65)
        result = _suggest_fields(self._cols(["usr_id", "ts", "event"]))
        assert result.get("user_id_field") == "usr_id"
