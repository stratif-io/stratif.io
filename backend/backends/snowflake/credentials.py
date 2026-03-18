from pydantic import BaseModel


class SnowflakeCredentials(BaseModel):
    account: str       # e.g. "xy12345.us-east-1"
    user: str
    password: str
    warehouse: str
    database: str
    schema: str
    role: str | None = None
