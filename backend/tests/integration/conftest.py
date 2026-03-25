"""Shared fixtures for integration tests.

Integration tests require real database credentials via environment variables.
Run with: pytest -m integration
Skip in CI unless credentials are present.
"""
import os
import pytest


def pytest_collection_modifyitems(items):
    """Add integration marker skip reason to any integration test missing credentials."""
    pass  # individual tests handle their own skip logic via pytest.importorskip / env checks
