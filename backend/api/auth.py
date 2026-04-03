"""Auth endpoints for stratif.io Analytics."""

from fastapi import APIRouter, Depends

from backend.core.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
async def get_me(_: None = Depends(get_current_user)) -> dict[str, str]:
    """Return the current user's identity.

    In OSS mode (API-key auth) there is no user record, so we return a
    generic placeholder.  The SaaS overlay overrides get_current_user via
    dependency_overrides and can return a real user object instead.
    """
    return {"username": "admin"}
