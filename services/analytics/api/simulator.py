"""Simulator preset discovery API — read-only."""

from typing import Any

import structlog
import yaml
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from structlog.stdlib import BoundLogger

from services.event_simulator.simulator.preset import (
    PRESETS_DIR,
    list_presets,
    load_preset,
)

log: BoundLogger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/simulator", tags=["simulator"])


@router.get("/presets")
def get_presets() -> dict[str, Any]:
    """Return every shipped YAML preset in seeders/presets/ parsed into JSON."""
    if not PRESETS_DIR.is_dir():
        raise HTTPException(
            status_code=500, detail=f"presets dir missing: {PRESETS_DIR}"
        )

    presets: list[dict[str, Any]] = []
    for name in list_presets():
        if name.startswith("my-"):
            continue
        try:
            cfg = load_preset(name)
        except (yaml.YAMLError, ValueError, ValidationError) as exc:
            log.warning("preset_skipped", name=name, error=str(exc))
            continue
        presets.append(
            {
                "name": name,
                "display_name": cfg.name,
                "description": cfg.description,
                "domain": getattr(cfg, "domain", None),
                "config": cfg.model_dump(exclude_none=True),
            }
        )

    return {"presets": presets}
