"""Configuration management for OpenFlow Analytics."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API
    api_url: str

    # Legacy API key (kept for backwards compat during migration)
    api_key: str

    # JWT Session Auth
    jwt_secret: str
    jwt_algorithm: str
    jwt_expire_days: int

    # CORS
    cors_origins: str

    # Product Database (SQLite — stores users, connections, configs)
    product_db_path: str

    # Encryption key for credentials (Fernet 32-byte URL-safe base64 key)
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    encryption_key: str

    # Logging
    log_level: str = "INFO"  # OPENFLOW_LOG_LEVEL=DEBUG|INFO|WARNING|ERROR
    log_sql: bool = False  # OPENFLOW_LOG_SQL=true  → emit every SQL query at DEBUG
    log_format: str = "console"  # OPENFLOW_LOG_FORMAT=console|json

    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str | None = None

    frontend_url: str | None = None

    allow_registration: bool = False
    debug: bool = False

    @field_validator("encryption_key")
    @classmethod
    def validate_encryption_key_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                "OPENFLOW_ENCRYPTION_KEY must be at least 32 characters long"
            )
        return v

    @property
    def cors_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]

    class Config:
        env_prefix = "OPENFLOW_"
        case_sensitive = False
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()  # type: ignore[call-arg]
