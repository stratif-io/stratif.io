"""Authentication module for OpenFlow Analytics API."""

from typing import Optional

from fastapi import Header, HTTPException, Depends, status

from openflow.config import get_settings


async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """
    Verify API key from request header.

    Args:
        x_api_key: API key from X-Api-Key header

    Returns:
        The API key if valid

    Raises:
        HTTPException: If API key is invalid
    """
    settings = get_settings()

    # Skip validation if no API key is configured
    if not settings.api_key:
        return x_api_key or ""

    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
        )

    return x_api_key


async def optional_auth(x_api_key: Optional[str] = Header(None)) -> Optional[str]:
    """
    Optional authentication - returns None if no key provided.

    Args:
        x_api_key: API key from X-Api-Key header

    Returns:
        The API key if provided, None otherwise
    """
    settings = get_settings()

    if not settings.api_key:
        return x_api_key

    if x_api_key is None:
        return None

    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
        )

    return x_api_key
