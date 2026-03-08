"""JWT-based authentication dependency for FastAPI."""

from fastapi import HTTPException, Request, status
from jose import JWTError

from openflow.core.jwt_utils import decode_access_token
from openflow.product_db import get_product_db


class AuthUserRow:
    """Lightweight wrapper around a sqlite3.Row for an auth_users record."""

    def __init__(self, row):
        self._row = row
        self.id: str = row["id"]
        self.email: str = row["email"]
        self.display_name: str | None = row["display_name"]
        self.avatar_url: str | None = row["avatar_url"]
        self.created_at: str = row["created_at"]
        self.last_login_at: str | None = row["last_login_at"]


async def get_current_auth_user(request: Request) -> AuthUserRow:
    """FastAPI dependency: extracts and validates the JWT session cookie."""
    token = request.cookies.get("of_session")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = decode_access_token(token)
    except JWTError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        ) from err

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session payload",
        )

    product_db = get_product_db()
    row = product_db.fetchone("SELECT * FROM auth_users WHERE id = ?", (user_id,))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return AuthUserRow(row)
