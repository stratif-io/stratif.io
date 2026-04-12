from pydantic import BaseModel


class DatabricksCredentials(BaseModel):
    server_hostname: str
    http_path: str
    access_token: str
