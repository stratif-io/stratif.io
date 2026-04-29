"""Root conftest — registers CLI options used by deterministic E2E tests."""

import os

# Ensure crypto has a valid test key before any test imports services.analytics.services.crypto.
os.environ.setdefault(
    "STRATIFIO_ENCRYPTION_KEY", "test-encryption-key-for-unit-tests-only-xxx"
)


def pytest_addoption(parser):
    parser.addoption(
        "--generate-golden",
        action="store_true",
        default=False,
        help="Write API responses to golden files instead of asserting (DuckDB only).",
    )
