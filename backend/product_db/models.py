"""ORM-mapped models for the stratif.io product database."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.product_db.base import Base


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    db_type: Mapped[str] = mapped_column(String, nullable=False)
    credentials_encrypted: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    schema_config: Mapped[ConnectionSchemaConfig | None] = relationship(
        back_populates="connection",
        cascade="all, delete-orphan",
        uselist=False,
    )
    filter_config: Mapped[ConnectionFilterConfig | None] = relationship(
        back_populates="connection",
        cascade="all, delete-orphan",
        uselist=False,
    )


class ConnectionSchemaConfig(Base):
    __tablename__ = "connection_schema_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    connection_id: Mapped[str] = mapped_column(
        String, ForeignKey("connections.id", ondelete="CASCADE"), unique=True
    )
    user_id_field: Mapped[str] = mapped_column(
        String, nullable=False, default="user_id"
    )
    timestamp_field: Mapped[str] = mapped_column(
        String, nullable=False, default="timestamp"
    )
    event_name_field: Mapped[str] = mapped_column(
        String, nullable=False, default="event_name"
    )
    events_table: Mapped[str] = mapped_column(String, nullable=False, default="events")
    session_timeout_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30
    )
    resurrection_window_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30
    )
    power_user_threshold_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=4
    )
    query_timeout_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=10
    )
    max_concurrent_queries: Mapped[int] = mapped_column(
        Integer, nullable=False, default=5
    )
    email_field: Mapped[str | None] = mapped_column(String, nullable=True)
    first_name_field: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name_field: Mapped[str | None] = mapped_column(String, nullable=True)
    date_of_birth_field: Mapped[str | None] = mapped_column(String, nullable=True)
    phone_field: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    connection: Mapped[Connection] = relationship(back_populates="schema_config")
    custom_properties: Mapped[list[ConnectionCustomProperty]] = relationship(
        back_populates="schema_config",
        cascade="all, delete-orphan",
        order_by="ConnectionCustomProperty.sort_order",
    )
    pinned_metrics: Mapped[list[ConnectionPinnedMetric]] = relationship(
        back_populates="schema_config",
        cascade="all, delete-orphan",
        order_by="ConnectionPinnedMetric.sort_order",
    )


class ConnectionFilterConfig(Base):
    __tablename__ = "connection_filter_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    connection_id: Mapped[str] = mapped_column(
        String, ForeignKey("connections.id", ondelete="CASCADE"), unique=True
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    connection: Mapped[Connection] = relationship(back_populates="filter_config")
    filter_fields: Mapped[list[ConnectionFilterField]] = relationship(
        back_populates="filter_config",
        cascade="all, delete-orphan",
        order_by="ConnectionFilterField.sort_order",
    )


class ConnectionCustomProperty(Base):
    __tablename__ = "connection_custom_properties"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    schema_config_id: Mapped[str] = mapped_column(
        String, ForeignKey("connection_schema_configs.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    path: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    schema_config: Mapped[ConnectionSchemaConfig] = relationship(
        back_populates="custom_properties"
    )


class ConnectionPinnedMetric(Base):
    __tablename__ = "connection_pinned_metrics"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    schema_config_id: Mapped[str] = mapped_column(
        String, ForeignKey("connection_schema_configs.id", ondelete="CASCADE")
    )
    metric_key: Mapped[str] = mapped_column(String, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    schema_config: Mapped[ConnectionSchemaConfig] = relationship(
        back_populates="pinned_metrics"
    )


class ConnectionFilterField(Base):
    __tablename__ = "connection_filter_fields"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    filter_config_id: Mapped[str] = mapped_column(
        String, ForeignKey("connection_filter_configs.id", ondelete="CASCADE")
    )
    field: Mapped[str] = mapped_column(String, nullable=False)
    ref: Mapped[str] = mapped_column(String, nullable=False, default="")
    label: Mapped[str] = mapped_column(String, nullable=False)
    icon: Mapped[str] = mapped_column(String, nullable=False, default="filter")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    filter_config: Mapped[ConnectionFilterConfig] = relationship(
        back_populates="filter_fields"
    )
