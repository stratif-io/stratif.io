"""Tests for connection schema config API — resurrection_window_days and power_user_threshold_days."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.testclient import TestClient

from backend.api.connections.schema_detect import _suggest_fields
from backend.main import app
from backend.product_db.base import Base
from backend.product_db.deps import get_db
from backend.product_db.models import Connection


@pytest.fixture()
def schema_client(tmp_path):
    """TestClient backed by a real async SQLite product DB."""
    db_url = f"sqlite+aiosqlite:///{tmp_path / 'product.db'}"

    async def setup():
        engine = create_async_engine(db_url)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            now = datetime.now(UTC).replace(tzinfo=None)
            session.add(
                Connection(
                    id="conn-1",
                    name="Test",
                    db_type="sqlite",
                    credentials_encrypted="x",
                    created_at=now,
                    updated_at=now,
                )
            )
            await session.commit()
        await engine.dispose()

    asyncio.run(setup())

    test_engine = create_async_engine(db_url)
    test_factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with test_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


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

    def test_schema_config_persists_query_execution_fields(self, schema_client):
        payload = {
            "user_id_field": "user_id",
            "timestamp_field": "ts",
            "event_name_field": "event_name",
            "events_table": "events",
            "query_timeout_seconds": 25,
            "max_concurrent_queries": 8,
        }
        r = schema_client.put("/api/connections/conn-1/schema", json=payload)
        assert r.status_code == 200, r.text
        r = schema_client.get("/api/connections/conn-1/schema")
        body = r.json()
        assert body["query_timeout_seconds"] == 25
        assert body["max_concurrent_queries"] == 8


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
        result = _suggest_fields(
            self._cols(["user_id", "timestamp", "event_name", "email"])
        )
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
        result = _suggest_fields(
            self._cols(["user_id", "ts", "event", "date_of_birth"])
        )
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
        result = _suggest_fields(
            self._cols(["user_id", "ts", "event", "contact_email_address"])
        )
        assert result.get("email_field") == "contact_email_address"

    def test_suggests_user_id_via_fuzzy(self):
        # "usr_id" is close enough to "user_id" (ratio > 0.65)
        result = _suggest_fields(self._cols(["usr_id", "ts", "event"]))
        assert result.get("user_id_field") == "usr_id"

    # False-positive regression tests (subset check, dotted path token split)
    def test_no_false_positive_user_email_vs_returning_user(self):
        # "user_email" alias tokens {"user","email"} must NOT match
        # "properties.is_returning_user" because "email" is absent.
        result = _suggest_fields(
            self._cols(["user_id", "ts", "event", "properties.is_returning_user"])
        )
        assert result.get("email_field") is None

    def test_no_false_positive_last_name_vs_first_name(self):
        # "last_name" alias tokens {"last","name"} must NOT match
        # "traits.first_name" — "last" is absent from {"traits","first","name"}.
        result = _suggest_fields(
            self._cols(["user_id", "ts", "event", "traits.first_name"])
        )
        assert result.get("last_name_field") is None

    def test_dotted_path_tokens_split_correctly(self):
        # "traits.email" should match email_field — tokens {"traits","email"} ⊇ {"email"}
        result = _suggest_fields(self._cols(["user_id", "ts", "event", "traits.email"]))
        assert result.get("email_field") == "traits.email"
