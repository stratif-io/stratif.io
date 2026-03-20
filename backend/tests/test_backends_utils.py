"""Tests for backend/_utils.py shared helpers."""
import pytest
from backend.backends._utils import sample_property_types


def test_sample_detects_numeric_property():
    """Non-null MAX result → property upgraded to 'number'."""
    def execute_fn(sql):
        return [(3.14,)]

    result = sample_property_types(
        execute_fn,
        "events",
        {"total_amount": "json_extract(properties, '$.total_amount')"},
        "CASE WHEN {expr} GLOB '[0-9]*' THEN 1.0 ELSE NULL END",
    )
    assert result == {"total_amount": "number"}


def test_sample_non_numeric_not_upgraded():
    """NULL MAX result → property not in result dict."""
    def execute_fn(sql):
        return [(None,)]

    result = sample_property_types(
        execute_fn,
        "events",
        {"label": "json_extract(properties, '$.label')"},
        "CASE WHEN {expr} GLOB '[0-9]*' THEN 1.0 ELSE NULL END",
    )
    assert result == {}


def test_sample_mixed_properties():
    """Multiple props: only non-null ones upgraded."""
    def execute_fn(sql):
        return [(5.0, None, 42.0)]

    result = sample_property_types(
        execute_fn,
        "events",
        {"price": "e1", "name": "e2", "qty": "e3"},
        "TRY_CAST({expr} AS DOUBLE)",
    )
    assert result == {"price": "number", "qty": "number"}
    assert "name" not in result


def test_sample_returns_empty_on_db_exception():
    """Any DB error → empty dict (silent fallback)."""
    def execute_fn(sql):
        raise RuntimeError("db error")

    result = sample_property_types(execute_fn, "events", {"x": "expr"}, "TRY_CAST({expr} AS DOUBLE)")
    assert result == {}


def test_sample_returns_empty_for_empty_props():
    """No properties → empty dict, no query issued."""
    called = []
    def execute_fn(sql):
        called.append(sql)
        return []

    result = sample_property_types(execute_fn, "events", {}, "TRY_CAST({expr} AS DOUBLE)")
    assert result == {}
    assert called == []


def test_sample_returns_empty_when_no_rows():
    """Empty result set → empty dict."""
    result = sample_property_types(lambda sql: [], "events", {"x": "e"}, "TRY_CAST({expr} AS DOUBLE)")
    assert result == {}
