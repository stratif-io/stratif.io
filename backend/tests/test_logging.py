"""Tests for InterceptHandler."""

import logging
import sys

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


def test_intercept_handler_forwards_exc_info():
    """exc_info on a log record must be forwarded to structlog."""
    from backend.core.logging import InterceptHandler

    handler = InterceptHandler()

    try:
        raise ValueError("boom")
    except ValueError:
        exc_info = sys.exc_info()

    with structlog.testing.capture_logs() as cap:
        record = logging.LogRecord(
            name="some.library",
            level=logging.ERROR,
            pathname="",
            lineno=0,
            msg="error occurred",
            args=(),
            exc_info=exc_info,
        )
        handler.emit(record)

    assert len(cap) == 1
    assert cap[0]["event"] == "error occurred"
    assert cap[0]["exc_info"] == exc_info
