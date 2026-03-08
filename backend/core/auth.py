# backend/core/auth.py
from fastapi import Header, HTTPException, status
from backend.config import settings


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """Verify the API key header. Skip check if no key is configured (dev mode)."""
    if not settings.api_key:
        return
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
