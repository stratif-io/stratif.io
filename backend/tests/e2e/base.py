"""Base class for self-bootstrapping E2E tests.

Each dialect subclass sets db_type and inherits the 11-step lifecycle:

  01 create_connection     — POST /api/connections/
  02 bad_creds             — throwaway connection with wrong credentials
  03 good_creds            — confirm good connection passes /test
  04 schema_empty          — schema is null before configuration
  05 detect_schema         — GET /schema/detect, store result
  06 schema_has_columns    — expected_columns are in the detected schema
  07 save_schema           — PUT /schema with detected suggestions
  08 add_filters           — PUT /filters with city + country
  09 queries_with_dates    — all analytics endpoints with date range
  10 queries_all_time      — all analytics endpoints without dates
  11 cleanup               — DELETE connection

State flows through class variables:
  cls.connection_id     — set in test_01, used by test_02–test_11
  cls.detected_schema   — set in test_05, used by test_06–test_11

Skip guards: if a required class var is None (prior step didn't complete),
subsequent steps skip rather than fail, keeping the output clean.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import ClassVar, Optional

import pytest

from backend.tests.e2e.conftest import E2E_CONFIG


class BaseE2ETest:
    db_type: ClassVar[str] = ""
    connection_id: ClassVar[Optional[str]] = None
    detected_schema: ClassVar[Optional[dict]] = None

    # ------------------------------------------------------------------
    # Class setup — skip entire class if backend is not enabled
    # ------------------------------------------------------------------

    @classmethod
    def setup_class(cls) -> None:
        cfg = E2E_CONFIG.get(cls.db_type, {})
        if not cfg.get("enabled", False):
            pytest.skip(f"backend '{cls.db_type}' not enabled in connections.yaml")
        cls.connection_id = None
        cls.detected_schema = None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _credentials(self) -> dict:
        return dict(E2E_CONFIG[self.db_type]["credentials"])

    def _bad_credentials(self) -> dict:
        """Derive credentials guaranteed to fail connection."""
        creds = self._credentials()
        if self.db_type in ("sqlite", "duckdb"):
            creds["file_path"] = "/nonexistent/path/does_not_exist.db"
        elif self.db_type in ("postgresql", "clickhouse", "snowflake"):
            creds["password"] = creds.get("password", "") + "_wrong"
        elif self.db_type == "databricks":
            creds["token"] = creds.get("token", "") + "_wrong"
        return creds

    def _date_params(self, connection_id: str) -> dict:
        """Return query params with a 60-day date window."""
        end = date.today()
        start = end - timedelta(days=60)
        return {
            "connection_id": connection_id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        }

    def _all_time_params(self, connection_id: str) -> dict:
        """Return query params without date bounds."""
        return {"connection_id": connection_id}

    def _skip_if_no_connection(self) -> None:
        if not type(self).connection_id:
            pytest.skip("connection_id not available — test_01 did not complete")

    def _skip_if_no_schema(self) -> None:
        if not type(self).detected_schema:
            pytest.skip("detected_schema not available — test_05 did not complete")

    # ------------------------------------------------------------------
    # Step 01 — Create connection
    # ------------------------------------------------------------------

    def test_01_create_connection(self, client) -> None:
        r = client.post(
            "/api/connections/",
            json={
                "name": f"e2e-test-{self.db_type}",
                "db_type": self.db_type,
                "credentials": self._credentials(),
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert "id" in body
        type(self).connection_id = body["id"]

    # ------------------------------------------------------------------
    # Step 02 — Test connection with bad credentials (throwaway)
    # ------------------------------------------------------------------

    def test_02_test_connection_bad_creds(self, client) -> None:
        self._skip_if_no_connection()

        # Create a throwaway connection with wrong credentials.
        # Its ID is stored locally — never in cls.connection_id.
        r = client.post(
            "/api/connections/",
            json={
                "name": f"e2e-bad-{self.db_type}",
                "db_type": self.db_type,
                "credentials": self._bad_credentials(),
            },
        )
        assert r.status_code == 201, r.text
        throwaway_id = r.json()["id"]

        try:
            r = client.post(f"/api/connections/{throwaway_id}/test")
            # Expect either a non-200 status or ok=False in body.
            if r.status_code == 200:
                assert r.json().get("ok") is not True, (
                    "Expected connection test to fail with bad credentials, "
                    f"got: {r.json()}"
                )
        finally:
            client.delete(f"/api/connections/{throwaway_id}")

    # ------------------------------------------------------------------
    # Step 03 — Test connection with good credentials
    # ------------------------------------------------------------------

    def test_03_test_connection_good(self, client) -> None:
        self._skip_if_no_connection()
        conn_id = type(self).connection_id
        r = client.post(f"/api/connections/{conn_id}/test")
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True, r.json()

    # ------------------------------------------------------------------
    # Step 04 — Schema is null before any configuration
    # ------------------------------------------------------------------

    def test_04_schema_empty(self, client) -> None:
        self._skip_if_no_connection()
        conn_id = type(self).connection_id
        r = client.get(f"/api/connections/{conn_id}/schema")
        assert r.status_code == 200, r.text
        assert r.json() is None, f"Expected null schema, got: {r.json()}"

    # ------------------------------------------------------------------
    # Step 05 — Detect schema
    # ------------------------------------------------------------------

    def test_05_detect_schema(self, client) -> None:
        self._skip_if_no_connection()
        conn_id = type(self).connection_id
        r = client.get(f"/api/connections/{conn_id}/schema/detect")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "columns" in body, f"Missing 'columns' key: {body}"
        assert "suggestions" in body, f"Missing 'suggestions' key: {body}"
        assert "proposed_custom_properties" in body, (
            f"Missing 'proposed_custom_properties' key: {body}"
        )
        type(self).detected_schema = body

    # ------------------------------------------------------------------
    # Step 06 — Detected schema contains expected columns
    # ------------------------------------------------------------------

    def test_06_schema_has_expected_columns(self, client) -> None:
        self._skip_if_no_connection()
        self._skip_if_no_schema()

        expected = E2E_CONFIG[self.db_type].get("expected_columns", [])
        if not expected:
            pytest.skip("No expected_columns configured for this backend")

        schema = type(self).detected_schema
        detected_names = {c["name"] for c in schema.get("columns", [])}
        detected_names |= {
            p["name"] for p in schema.get("proposed_custom_properties", [])
        }

        missing = [col for col in expected if col not in detected_names]
        assert not missing, (
            f"Expected columns {missing} not found in detected schema.\n"
            f"Detected: {sorted(detected_names)}"
        )

    # ------------------------------------------------------------------
    # Step 07 — Save schema with detected suggestions
    # ------------------------------------------------------------------

    def test_07_save_schema(self, client) -> None:
        self._skip_if_no_connection()
        self._skip_if_no_schema()
        conn_id = type(self).connection_id
        suggestions = type(self).detected_schema["suggestions"]
        r = client.put(f"/api/connections/{conn_id}/schema", json=suggestions)
        assert r.status_code == 200, r.text

    # ------------------------------------------------------------------
    # Step 08 — Add city and country as global filters
    # ------------------------------------------------------------------

    def test_08_add_global_filters(self, client) -> None:
        self._skip_if_no_connection()
        conn_id = type(self).connection_id
        r = client.put(
            f"/api/connections/{conn_id}/filters",
            json={
                "filter_fields": [
                    {"field": "city", "label": "City", "icon": "map-pin"},
                    {"field": "country", "label": "Country", "icon": "globe"},
                ]
            },
        )
        assert r.status_code == 200, r.text

    # ------------------------------------------------------------------
    # Step 09 — All analytics endpoints with date range
    # ------------------------------------------------------------------

    def test_09_queries_with_dates(self, client) -> None:
        self._skip_if_no_connection()
        conn_id = type(self).connection_id
        params = self._date_params(conn_id)
        self._assert_all_analytics(client, params)

    # ------------------------------------------------------------------
    # Step 10 — All analytics endpoints without date params (all-time)
    # ------------------------------------------------------------------

    def test_10_queries_all_time(self, client) -> None:
        self._skip_if_no_connection()
        conn_id = type(self).connection_id
        params = self._all_time_params(conn_id)
        self._assert_all_analytics(client, params)
        # All-time must return actual data — measures must not be null/zero.
        # This guards against regressions where the all-time path disables queries
        # because no date range is present.
        r = client.get("/api/trend", params=params)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("total_unique_users") is not None, (
            "total_unique_users is None in all-time trend — backend returned null"
        )
        assert body["total_unique_users"] > 0, (
            f"total_unique_users is 0 in all-time trend — got: {body}"
        )
        assert len(body.get("data", [])) > 0, (
            "all-time trend returned empty data array"
        )

    # ------------------------------------------------------------------
    # Step 11 — Cleanup: delete the connection
    # ------------------------------------------------------------------

    def test_11_cleanup(self, client) -> None:
        self._skip_if_no_connection()
        conn_id = type(self).connection_id
        r = client.delete(f"/api/connections/{conn_id}")
        assert r.status_code == 204, r.text
        type(self).connection_id = None

    # ------------------------------------------------------------------
    # Analytics assertion helper (used by steps 09 and 10)
    # ------------------------------------------------------------------

    def _assert_all_analytics(self, client, params: dict) -> None:
        """Hit all analytics endpoints and assert valid response shape."""
        conn_id = params["connection_id"]

        # events — list of strings
        r = client.get("/api/events", params=params)
        assert r.status_code == 200, f"GET /api/events failed: {r.text}"
        assert isinstance(r.json().get("events"), list), r.json()

        # events/top — {data: list}
        r = client.get("/api/events/top", params=params)
        assert r.status_code == 200, f"GET /api/events/top failed: {r.text}"
        assert isinstance(r.json().get("data"), list), r.json()

        # trend — {data: list, total_unique_users: int}
        r = client.get("/api/trend", params=params)
        assert r.status_code == 200, f"GET /api/trend failed: {r.text}"
        body = r.json()
        assert isinstance(body.get("data"), list), body
        assert isinstance(body.get("total_unique_users"), (int, float)), body

        # retention — {data: list, granularity: str}
        r = client.get("/api/retention", params=params)
        assert r.status_code == 200, f"GET /api/retention failed: {r.text}"
        body = r.json()
        assert isinstance(body.get("data"), list), body
        assert isinstance(body.get("granularity"), str), body

        # conversion — {data: list}
        r = client.get("/api/conversion", params=params)
        assert r.status_code == 200, f"GET /api/conversion failed: {r.text}"
        assert isinstance(r.json().get("data"), list), r.json()

        # paths — get first event to use as target
        events_r = client.get("/api/events", params={"connection_id": conn_id})
        first_event = (events_r.json().get("events") or [None])[0]
        if first_event:
            r = client.get("/api/paths", params={**params, "target_event": first_event})
            assert r.status_code == 200, f"GET /api/paths failed: {r.text}"
            body = r.json()
            assert isinstance(body.get("data"), list), body

        # pivot — {data: list, measures: list}
        r = client.get("/api/pivot", params={**params, "measures": "count_events"})
        assert r.status_code == 200, f"GET /api/pivot failed: {r.text}"
        body = r.json()
        assert isinstance(body.get("data"), list), body
        assert isinstance(body.get("measures"), list), body

        # sessions/summary — {data: list}
        r = client.get("/api/sessions/summary", params=params)
        assert r.status_code == 200, f"GET /api/sessions/summary failed: {r.text}"
        assert isinstance(r.json().get("data"), list), r.json()

        # raw/events — {data: list, total: int}
        r = client.get("/api/raw/events", params=params)
        assert r.status_code == 200, f"GET /api/raw/events failed: {r.text}"
        body = r.json()
        assert isinstance(body.get("data"), list), body
        assert isinstance(body.get("total"), int), body

        # raw/sessions — {data: list, total: int}
        r = client.get("/api/raw/sessions", params=params)
        assert r.status_code == 200, f"GET /api/raw/sessions failed: {r.text}"
        body = r.json()
        assert isinstance(body.get("data"), list), body
        assert isinstance(body.get("total"), int), body
