"""JWT token creation and decoding utilities."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from openflow.config import get_settings


def create_access_token(user_id: str, email: str) -> str:
    """Create a signed JWT access token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises JWTError on invalid/expired tokens."""
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
