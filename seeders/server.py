"""Seeder Studio preview server.

Run with: uv run seed-serve
Default port: 8001
"""

from __future__ import annotations

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from seeders.simulator.config import SimulationConfig
from seeders.simulator.preset import list_presets, load_preset
from seeders.simulator.preview import PreviewResult, run_preview

app = FastAPI(title="Stratif.io Seeder Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,  # type: ignore[arg-type]
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
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
    uvicorn.run("seeders.server:app", host="0.0.0.0", port=8001, reload=True)
