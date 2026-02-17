"""Configuration management for OpenFlow Analytics."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API
    api_url: str = "http://localhost:8000"

    # Legacy API key (kept for backwards compat during migration)
    api_key: str = "dev-key-change-in-production"

    # JWT Session Auth
    jwt_secret: str = "dev-jwt-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    frontend_url: str = "http://localhost:5173"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Analytics Database (DuckDB)
    db_path: str = "openflow.duckdb"

    # Product Database (SQLite — stores users, connections, configs)
    product_db_path: str = "openflow_product.sqlite"

    # Encryption key for credentials (Fernet 32-byte URL-safe base64 key)
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    encryption_key: str = "dev-insecure-key-replace-in-production-padded=="

    # Seeding
    seed_users: int = 80000
    seed_days: int = 60

    @property
    def cors_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]

    class Config:
        env_prefix = "OPENFLOW_"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
