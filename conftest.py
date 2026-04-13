"""Root conftest — registers CLI options used by deterministic E2E tests."""


def pytest_addoption(parser):
    parser.addoption(
        "--generate-golden",
        action="store_true",
        default=False,
        help="Write API responses to golden files instead of asserting (DuckDB only).",
    )
