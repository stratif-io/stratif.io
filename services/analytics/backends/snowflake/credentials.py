from pydantic import BaseModel, ConfigDict, Field


class SnowflakeCredentials(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    account: str  # e.g. "xy12345.us-east-1"
    user: str
    password: str
    warehouse: str
    database: str
    schema_: str = Field(alias="schema")
    role: str | None = None
    host: str | None = None
    port: int | None = None
    protocol: str | None = None
