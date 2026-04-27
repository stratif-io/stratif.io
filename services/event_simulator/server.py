"""Seeder Studio preview server.

Run with: uv run seed-serve
Default port: 8001
"""

from __future__ import annotations

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.event_simulator.simulator.config import SimulationConfig
from services.event_simulator.simulator.preset import list_presets, load_preset
from services.event_simulator.simulator.preview import PreviewResult, run_preview

app = FastAPI(title="Stratif.io Seeder Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,  # type: ignore[arg-type]
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/presets")
def presets() -> list[dict]:
    return [
        {
            "name": cfg.name,
            "description": cfg.description or "",
            "config": cfg.model_dump(mode="json"),
        }
        for name in list_presets()
        for cfg in [load_preset(name)]
    ]


@app.post("/simulate")
def simulate(config: SimulationConfig) -> PreviewResult:
    return run_preview(config)


def main() -> None:
    uvicorn.run(
        "services.event_simulator.server:app", host="0.0.0.0", port=8001, reload=True
    )
