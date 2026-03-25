"""E2E test: all API endpoints against a real PostgreSQL connection.

Required env vars:
    TEST_POSTGRES_CONNECTION_ID   UUID of a pre-configured connection in the product DB
    STRATIFIO_PRODUCT_DB_PATH     Path to the product DB containing the connection record
    STRATIFIO_ENCRYPTION_KEY      Key used to encrypt credentials in the product DB
"""
import os
import pytest
from backend.tests.e2e.base import BaseE2ETest

CONNECTION_ID = os.environ.get("TEST_POSTGRES_CONNECTION_ID", "")


@pytest.mark.e2e
@pytest.mark.skipif(not CONNECTION_ID, reason="TEST_POSTGRES_CONNECTION_ID not set")
class TestPostgreSQLE2E(BaseE2ETest):
    CONNECTION_ID = CONNECTION_ID
