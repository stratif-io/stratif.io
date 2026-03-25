"""Shared fixtures for E2E tests.

E2E tests require a pre-configured connection in the product DB.
Run with: pytest -m e2e
Set TEST_<BACKEND>_CONNECTION_ID env vars to activate each backend.

NOTE: Unlike unit tests, E2E tests do NOT patch init_product_db.
The real product DB is needed to look up connections.
Ensure STRATIFIO_PRODUCT_DB_PATH points to the correct DB.
"""
from datetime import date, timedelta
from starlette.testclient import TestClient
from backend.main import app


def make_client() -> TestClient:
    """Return a TestClient using the real app with no dependency overrides."""
    return TestClient(app)


def default_params(connection_id: str) -> dict:
    """Return base query params with last-7-days date window."""
    end = date.today()
    start = end - timedelta(days=7)
    return {
        "connection_id": connection_id,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    }
