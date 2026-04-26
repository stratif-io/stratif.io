from __future__ import annotations

from fastapi.testclient import TestClient

from services.event_simulator.server import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_presets_returns_list():
    r = client.get("/presets")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "name" in data[0]
    assert "description" in data[0]
    assert "config" in data[0]


def test_presets_have_valid_names():
    r = client.get("/presets")
    names = [p["name"] for p in r.json()]
    assert "Casual Game Addictive (Candy Crush-Like)" in names


def test_simulate_returns_timeseries():
    config = {
        "name": "test",
        "axes": {"scale": "tiny", "stickiness": "normal"},
        "markov": {
            "events": [{"name": "PageView"}, {"name": "Click"}],
            "start": {"PageView": 1.0},
            "transitions": {
                "PageView": {"Click": 0.5, "[end]": 0.5},
                "Click": {"[end]": 1.0},
            },
        },
        "random_seed": 42,
    }
    r = client.post("/simulate", json=config)
    assert r.status_code == 200
    data = r.json()
    assert "days" in data
    assert "new_users" in data
    assert "active_users" in data
    assert "churned" in data
    assert "reactivated" in data
    assert "events" in data
    assert "stickiness" in data
    assert len(data["days"]) == 30  # tiny scale = 30 days


def test_simulate_invalid_config_returns_422():
    r = client.post("/simulate", json={"bad": "config"})
    assert r.status_code == 422
