# backend/core/auth.py
# OSS-only API key auth — NOT connected to SaaS JWT auth.
# This dependency is wired to NO router in the current codebase.
# Do NOT add Depends(verify_api_key) to any router expecting SaaS-level protection.
# SaaS authentication is handled by app/core/jwt_auth.py in stratifio-saas.
from fastapi import Header, HTTPException, status
from backend.config import settings


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """Verify the API key header. Skip check if no key is configured (dev mode).

    OSS standalone auth only. Not used in SaaS — see stratifio-saas/app/core/jwt_auth.py.
    """
    if not settings.api_key:
        return
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
