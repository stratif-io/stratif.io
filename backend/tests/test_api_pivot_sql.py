"""Tests verifying that /api/pivot responses include the `sql` key."""
from __future__ import annotations

import pytest


class TestPivotSqlField:
    def test_flat_mode_response_includes_sql_key(self, client):
        """Flat pivot (no column dims) must include 'sql' in the response."""
        resp = client.get(
            "/api/pivot",
            params={
                "measures": "count_events",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "sql" in body, f"Expected 'sql' key in response, got keys: {list(body.keys())}"
        assert isinstance(body["sql"], str)
        assert len(body["sql"]) > 0

    def test_flat_mode_with_row_dim_includes_sql(self, client):
        """Flat pivot with a row dimension must include 'sql'."""
        resp = client.get(
            "/api/pivot",
            params={
                "row_dimensions": "event_name",
                "measures": "count_events",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "sql" in body
        # SQL should reference event_name dimension
        assert "event_name" in body["sql"].lower()

    def test_pivot_mode_response_includes_sql_key(self, client):
        """Pivot mode (column dims provided) must also include 'sql'."""
        resp = client.get(
            "/api/pivot",
            params={
                "row_dimensions": "event_name",
                "column_dimensions": "date",
                "measures": "count_events",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "sql" in body, f"Expected 'sql' key in pivoted response, got keys: {list(body.keys())}"
        assert isinstance(body["sql"], str)
        assert body["pivoted"] is True

    def test_sql_contains_interpolated_values_not_placeholders(self, client):
        """The sql field should be interpolated (no ? placeholders)."""
        resp = client.get(
            "/api/pivot",
            params={
                "row_dimensions": "event_name",
                "measures": "count_events",
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "sql" in body
        # Should not contain bare ? placeholders
        assert "?" not in body["sql"]
        # Should contain the actual date values
        assert "2024-01-01" in body["sql"] or "2024-01-" in body["sql"]
