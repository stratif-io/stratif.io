"""Auth dependency for stratif.io Analytics.

OSS mode: optionally verify API key header.
SaaS override: replace get_current_user via app.dependency_overrides with a JWT verifier.
"""

from fastapi import HTTPException, Request, status

from backend.config import settings
from backend.product_db import ProductDBDep


async def get_current_user(
    request: Request,
    product_db: ProductDBDep,  # unused in OSS path; available for SaaS JWT lookup via dependency_overrides
) -> None:
    """OSS: verify X-API-Key header when auth_enabled=True. No-op otherwise."""
    if not settings.auth_enabled:
        return
    api_key = request.headers.get("X-API-Key", "")
    if api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
