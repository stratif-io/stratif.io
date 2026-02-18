"""Structured logging configuration using structlog."""

import logging
import sys
from typing import Any

import structlog


def setup_logging(log_level: str = "INFO", log_format: str = "console") -> None:
    """
    Configure structlog for the application.

    Call this once at startup before any log messages are emitted.

    Args:
        log_level:  Standard level name — DEBUG, INFO, WARNING, ERROR.
        log_format: "console" for human-readable dev output,
                    "json" for machine-readable production output.
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if log_format == "json":
        processors = shared_processors + [
            structlog.processors.ExceptionRenderer(),
            structlog.processors.JSONRenderer(),
        ]
    else:
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
