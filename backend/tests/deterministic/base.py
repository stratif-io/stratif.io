"""Base class for deterministic golden-file tests.

Each backend subclass sets db_type. The 14 test methods cover every
analytics endpoint. In normal mode they compare to golden files; with
--generate-golden they write golden files (DuckDB only).

State:
  cls.connection_id  — set by deterministic_setup fixture in conftest.py
"""

from __future__ import annotations

import difflib
import json
import pathlib
from typing import ClassVar

import pytest

from backend.tests.deterministic.normalizer import load_golden, normalize, save_golden

_GOLDEN_DIR = str(pathlib.Path(__file__).parent / "golden")

_START = "2023-01-01"
_END = "2024-12-31"


class DeterministicBaseTest:
    db_type: ClassVar[str] = ""
    connection_id: ClassVar[str | None] = None

    def _p(self, **extra) -> dict:
        """Base params: connection_id + full date range."""
        assert type(self).connection_id, "connection_id not set — setup fixture failed"
        return {
            "connection_id": type(self).connection_id,
            "start_date": _START,
            "end_date": _END,
            **extra,
        }

    def _assert_or_generate(self, request, endpoint_key: str, response: dict) -> None:
        generate = request.config.getoption("--generate-golden", default=False)
        if generate:
            assert self.db_type == "duckdb", (
                "--generate-golden is only valid for the DuckDB backend"
            )
            save_golden(_GOLDEN_DIR, endpoint_key, response)
            return

        live = normalize(endpoint_key, response)
        golden = load_golden(_GOLDEN_DIR, endpoint_key)

        if live != golden:
            diff = _json_diff(golden, live)
            pytest.fail(
                f"[{self.db_type}] {endpoint_key} does not match golden file.\n\n{diff}"
            )

    def test_01_events(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/events", params={"connection_id": type(self).connection_id}
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "events", r.json())

    def test_02_events_top(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/events/top",
            params={"connection_id": type(self).connection_id, "limit": 10},
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "events_top", r.json())

    def test_03_trend_daily(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/mission-control/trend",
            params={**self._p(), "metric": "total_events", "granularity": "day"},
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "trend_daily", r.json())

    def test_04_trend_weekly(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/mission-control/trend",
            params={**self._p(), "metric": "total_events", "granularity": "week"},
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "trend_weekly", r.json())

    def test_05_trend_monthly(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/mission-control/trend",
            params={**self._p(), "metric": "total_events", "granularity": "month"},
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "trend_monthly", r.json())

    def test_06_retention(self, client, request, deterministic_setup) -> None:
        r = client.get("/api/retention", params=self._p())
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "retention", r.json())

    def test_07_conversion(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/conversion",
            params={**self._p(), "entry_event": "page_view", "goal_event": "purchase"},
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "conversion", r.json())

    def test_08_paths(self, client, request, deterministic_setup) -> None:
        r = client.get("/api/paths", params={**self._p(), "target_event": "purchase"})
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "paths", r.json())

    def test_09_pivot_by_event(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/pivot",
            params={**self._p(), "dimension": "event_name", "measures": "count_events"},
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "pivot_by_event", r.json())

    def test_10_pivot_by_country(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/pivot",
            params={**self._p(), "dimension": "country", "measures": "unique_users"},
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "pivot_by_country", r.json())

    def test_11_pivot_by_device(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/pivot",
            params={
                **self._p(),
                "dimension": "device_type",
                "measures": "unique_users",
            },
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "pivot_by_device", r.json())

    def test_12_sessions_summary(self, client, request, deterministic_setup) -> None:
        r = client.get("/api/sessions/summary", params=self._p())
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "sessions_summary", r.json())

    def test_13_raw_events_page1(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/raw/events",
            params={
                **self._p(),
                "offset": 0,
                "limit": 20,
                "sort_field": "timestamp",
                "sort_order": "asc",
            },
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "raw_events_page1", r.json())

    def test_14_raw_sessions_page1(self, client, request, deterministic_setup) -> None:
        r = client.get(
            "/api/raw/sessions", params={**self._p(), "offset": 0, "limit": 20}
        )
        assert r.status_code == 200, r.text
        self._assert_or_generate(request, "raw_sessions_page1", r.json())


def _json_diff(expected: dict, actual: dict) -> str:
    a = json.dumps(expected, indent=2, default=str).splitlines(keepends=True)
    b = json.dumps(actual, indent=2, default=str).splitlines(keepends=True)
    return "".join(difflib.unified_diff(a, b, fromfile="golden", tofile="live", n=5))
