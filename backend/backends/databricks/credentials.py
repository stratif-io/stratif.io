from pydantic import BaseModel

class DatabricksCredentials(BaseModel):
    host: str
    http_path: str
    token: str
