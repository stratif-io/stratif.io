from pydantic import BaseModel, model_validator


class DatabricksCredentials(BaseModel):
    host: str
    http_path: str
    token: str
    catalog: str | None = None
    schema_name: str | None = None
    staging_volume: str | None = None

    model_config = {"extra": "ignore"}

    @model_validator(mode="before")
    @classmethod
    def _normalise_schema_key(cls, data: dict) -> dict:
        """Accept "schema" as an alias for "schema_name"."""
        if isinstance(data, dict) and "schema" in data and "schema_name" not in data:
            data = {**data, "schema_name": data["schema"]}
        return data
