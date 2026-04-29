"""Auth dependency for stratif.io Analytics.

OSS mode: optionally verify API key header.
SaaS override: replace get_current_user via app.dependency_overrides with a JWT verifier.
"""

import secrets

from fastapi import HTTPException, Request, status

from services.analytics.config import settings
from services.analytics.product_db.deps import DBSession


async def get_current_user(
    request: Request,
    session: DBSession,  # unused in OSS path; available for SaaS JWT lookup via dependency_overrides
) -> None:
    """OSS: verify X-API-Key header when auth_enabled=True. No-op otherwise."""
    if not settings.auth_enabled:
        return
    api_key = request.headers.get("X-API-Key", "")
    if not secrets.compare_digest(api_key, settings.api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
