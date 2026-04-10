"""Structured logging configuration using structlog."""

import logging
from typing import Any

import structlog


class InterceptHandler(logging.Handler):
    """Forward stdlib log records to structlog.

    Attach this to the root logger so that uvicorn, third-party libraries,
    and any other stdlib-based logger automatically go through structlog.
    """

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level: int | str = structlog.stdlib.NAME_TO_LEVEL[record.levelname.lower()]
        except KeyError:
            level = record.levelno
        logger = structlog.get_logger(record.name)
        if record.exc_info:
            logger.log(level, record.getMessage(), exc_info=record.exc_info)
        else:
            logger.log(level, record.getMessage())


def setup_logging(log_level: str = "INFO", log_format: str = "console") -> None:
    """Configure structlog for the application.

    Call this once at startup before any log messages are emitted.

    Args:
        log_level:  Standard level name — DEBUG, INFO, WARNING, ERROR.
        log_format: "console" for human-readable dev output,
                    "json" for machine-readable production output.
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

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

    # Route all stdlib logging (uvicorn, third-party) through structlog.
    handler = InterceptHandler()
    logging.root.setLevel(level)
    logging.root.handlers = [handler]

    # Suppress verbose third-party loggers.
    for noisy in (
        "databricks.sql",
        "databricks.sql.thrift_backend",
        "databricks.sql.session",
        "urllib3.connectionpool",
    ):
        logging.getLogger(noisy).setLevel(logging.WARNING)
