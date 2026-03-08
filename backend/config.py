# backend/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "OPENFLOW_", "extra": "ignore"}

    # API key auth (optional for dev, required for production)
    api_key: str = ""

    # Product DB (SQLite — stores connections and configs)
    product_db_path: str = "./openflow_product.sqlite"

    # Encryption key for credentials (required to store connections)
    encryption_key: str = ""

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
