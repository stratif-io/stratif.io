from pydantic import BaseModel

class SQLiteCredentials(BaseModel):
    file_path: str
