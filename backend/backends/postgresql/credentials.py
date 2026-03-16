from pydantic import BaseModel

class PostgreSQLCredentials(BaseModel):
    host: str
    port: int = 5432
    database: str
    user: str
    password: str
    sslmode: str | None = None
