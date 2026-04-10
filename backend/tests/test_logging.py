"""Tests for InterceptHandler."""

import logging

import structlog.testing


def test_intercept_handler_forwards_to_structlog():
    """A stdlib log record emitted via InterceptHandler must appear in structlog output."""
    from backend.core.logging import InterceptHandler

    handler = InterceptHandler()
    handler.setLevel(logging.DEBUG)

    with structlog.testing.capture_logs() as cap:
        record = logging.LogRecord(
            name="some.library",
            level=logging.WARNING,
            pathname="",
            lineno=0,
            msg="something went wrong",
            args=(),
            exc_info=None,
        )
        handler.emit(record)

    assert len(cap) == 1
    assert cap[0]["event"] == "something went wrong"
    assert cap[0]["log_level"] == "warning"
