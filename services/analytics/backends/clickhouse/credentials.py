from pydantic import BaseModel


class ClickHouseCredentials(BaseModel):
    host: str
    port: int = 8443
    database: str
    user: str
    password: str
    secure: bool = True
    always_final: bool = False
