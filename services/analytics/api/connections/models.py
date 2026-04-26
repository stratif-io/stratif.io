"""Pydantic models for the Connections API."""

import re
import uuid
from typing import Any, Literal

from pydantic import BaseModel, field_validator

DbType = Literal[
    "duckdb", "databricks", "postgresql", "sqlite", "clickhouse", "snowflake"
]

_PATH_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_.\-']*$")


class CustomProperty(BaseModel):
    id: str | None = None
    name: str
    path: str
    type: Literal["string", "number", "boolean", "timestamp"]
    category: str | None = None

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str | None) -> str | None:
        if v is None:
            return None
        try:
            uuid.UUID(v)
        except ValueError:
            raise ValueError("id must be a valid UUID") from None
        return v

    @field_validator("path")
    @classmethod
    def validate_path(cls, v: str) -> str:
        if not _PATH_RE.match(v):
            raise ValueError("path must match ^[a-zA-Z_][a-zA-Z0-9_.\\-']*$")
        return v

    model_config = {"extra": "ignore"}


class ConnectionCreate(BaseModel):
    name: str
    db_type: DbType
    credentials: dict[str, Any]


class ConnectionUpdate(BaseModel):
    name: str | None = None
    credentials: dict[str, Any] | None = None


class ConnectionResponse(BaseModel):
    id: str
    name: str
    db_type: str
    created_at: str
    updated_at: str


class SchemaConfigBody(BaseModel):
    user_id_field: str = "user_id"
    timestamp_field: str = "timestamp"
    event_name_field: str = "event_name"
    events_table: str = "events"
    custom_properties: list[CustomProperty] = []
    session_timeout_minutes: int = 30
    resurrection_window_days: int = 30
    power_user_threshold_days: int = 4
    query_timeout_seconds: int = 10
    max_concurrent_queries: int = 5
    # optional user identity fields — None means not mapped
    email_field: str | None = None
    first_name_field: str | None = None
    last_name_field: str | None = None
    date_of_birth_field: str | None = None
    phone_field: str | None = None


class SchemaConfigResponse(SchemaConfigBody):
    id: str
    connection_id: str
    updated_at: str


class FilterField(BaseModel):
    ref: str = ""  # new: UUID or "$<schema_key>"; empty = legacy
    field: str = ""  # kept for backward compat with old stored data
    label: str
    icon: str = "filter"

    model_config = {"extra": "ignore"}


class FilterConfigBody(BaseModel):
    filter_fields: list[FilterField] = []


class FilterConfigResponse(FilterConfigBody):
    id: str
    connection_id: str
    updated_at: str
