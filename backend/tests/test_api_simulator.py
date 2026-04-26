"""Integration tests for /api/simulator/presets."""

from starlette.testclient import TestClient

from backend.main import app


def test_list_presets_returns_every_shipped_yaml():
    client = TestClient(app)
    response = client.get("/api/simulator/presets")
    assert response.status_code == 200
    body = response.json()
    assert "presets" in body
    names = [p["name"] for p in body["presets"]]
    # 10 shipped presets as of 2026-04-26 (my-* user configs excluded).
    assert "saas_pmf" in names
    assert "ecommerce_steady" in names
    assert "ecommerce_explosive" in names
    assert len(names) == 10


def test_each_preset_has_core_fields():
    client = TestClient(app)
    body = client.get("/api/simulator/presets").json()
    for preset in body["presets"]:
        assert "name" in preset
        assert "domain" in preset
        assert "config" in preset
        assert "axes" in preset["config"]


def test_presets_ordered_by_name():
    client = TestClient(app)
    names = [p["name"] for p in client.get("/api/simulator/presets").json()["presets"]]
    assert names == sorted(names)
