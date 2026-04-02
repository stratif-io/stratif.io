# backend/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {
        "env_prefix": "STRATIFIO_",
        "extra": "ignore",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    # API key auth (optional for dev, required for production)
    api_key: str = ""

    # Product DB — SQLite for local dev, PostgreSQL for production
    # Override with STRATIFIO_PRODUCT_DB_URL=postgresql+asyncpg://user:pass@host/db
    product_db_url: str = "sqlite+aiosqlite:///./stratifio_product.db"

    # Encryption key for credentials (required to store connections)
    encryption_key: str = ""

    # Auth
    auth_enabled: bool = False

    # Server
    cors_origins: str = "http://localhost:5173"
    debug: bool = False
    log_level: str = "INFO"
    log_sql: bool = False
    log_format: str = "json"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
