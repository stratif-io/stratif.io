"""Tests for stratifio.services.validators."""

import pytest
from fastapi import HTTPException

from backend.services.validators import parse_date


class TestParseDate:
    def test_returns_none_for_none_input(self):
        assert parse_date(None) is None

    def test_returns_valid_date_string_unchanged(self):
        assert parse_date("2024-01-15") == "2024-01-15"

    def test_accepts_start_of_year(self):
        assert parse_date("2024-01-01") == "2024-01-01"

    def test_accepts_end_of_year(self):
        assert parse_date("2024-12-31") == "2024-12-31"

    def test_raises_400_for_wrong_format_slashes(self):
        with pytest.raises(HTTPException) as exc_info:
            parse_date("2024/01/15")
        assert exc_info.value.status_code == 400

    def test_raises_400_for_wrong_format_no_dashes(self):
        with pytest.raises(HTTPException) as exc_info:
            parse_date("20240115")
        assert exc_info.value.status_code == 400

    def test_raises_400_for_invalid_month(self):
        with pytest.raises(HTTPException) as exc_info:
            parse_date("2024-13-01")
        assert exc_info.value.status_code == 400

    def test_raises_400_for_invalid_day(self):
        with pytest.raises(HTTPException) as exc_info:
            parse_date("2024-01-32")
        assert exc_info.value.status_code == 400

    def test_raises_400_for_sql_injection_attempt(self):
        with pytest.raises(HTTPException) as exc_info:
            parse_date("2024-01-01' OR '1'='1")
        assert exc_info.value.status_code == 400

    def test_error_detail_mentions_expected_format(self):
        with pytest.raises(HTTPException) as exc_info:
            parse_date("not-a-date")
        assert "YYYY-MM-DD" in exc_info.value.detail

    def test_accepts_datetime_with_time_component(self):
        assert parse_date("2024-01-15T14:30:00") == "2024-01-15T14:30:00"

    def test_accepts_datetime_at_end_of_day(self):
        assert parse_date("2024-12-31T23:59:59") == "2024-12-31T23:59:59"

    def test_accepts_datetime_at_midnight(self):
        assert parse_date("2024-01-01T00:00:00") == "2024-01-01T00:00:00"

    def test_raises_400_for_datetime_with_invalid_hour(self):
        with pytest.raises(HTTPException) as exc_info:
            parse_date("2024-01-01T25:00:00")
        assert exc_info.value.status_code == 400
