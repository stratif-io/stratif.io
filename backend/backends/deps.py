"""FastAPI dependency for the backend registry."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from backend.backends import _REGISTRY
from backend.backends.base import DatabaseBackend


def get_backend_registry() -> dict[str, DatabaseBackend]:
    """Return the backend registry dict. Injectable for testing via dependency_overrides."""
    return _REGISTRY


BackendRegistryDep = Annotated[
    dict[str, DatabaseBackend], Depends(get_backend_registry)
]
