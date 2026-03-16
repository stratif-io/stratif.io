"""Credentials model for DuckDB connections."""
from pydantic import BaseModel, model_validator


class DuckDBCredentials(BaseModel):
    file_path: str | None = None
    s3_path: str | None = None

    @model_validator(mode="after")
    def require_path(self) -> "DuckDBCredentials":
        if not self.file_path and not self.s3_path:
            raise ValueError("DuckDB connection requires file_path or s3_path")
        return self

    @property
    def resolved_path(self) -> str:
        return self.file_path or self.s3_path or ""
