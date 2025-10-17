import os
from pathlib import Path

from fastapi.testclient import TestClient

from shotrouter.server import create_app


def test_sources_persist_across_restart(tmp_path: Path, monkeypatch):
    # Use a temp config file
    cfg_path = tmp_path / "config.toml"
    monkeypatch.setenv("SHOTROUTER_CONFIG", str(cfg_path))

    # Create a real source directory
    src_dir = tmp_path / "screens"
    src_dir.mkdir(parents=True)

    # First app/client, add a source
    client = TestClient(create_app())
    r = client.post(
        "/api/sources",
        json={"path": str(src_dir), "enabled": False, "debounce_ms": 500},
    )
    assert r.status_code == 200

    # Config file should exist and contain the path
    assert cfg_path.exists(), "config.toml was not created"
    text = cfg_path.read_text()
    assert str(src_dir) in text

    # New app/client simulates restart; should hydrate sources from config
    client2 = TestClient(create_app())
    r = client2.get("/api/sources")
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(it["path"] == str(src_dir) for it in items), "Persisted source not listed after restart"

    # Removing the source should update config as well
    r = client2.request("DELETE", "/api/sources", params={"path": str(src_dir)})
    assert r.status_code == 200
    text2 = cfg_path.read_text()
    assert str(src_dir) not in text2


def test_sources_name_icon_from_config(tmp_path: Path, monkeypatch):
    # Pre-populate config with richer format
    cfg_path = tmp_path / "config.toml"
    monkeypatch.setenv("SHOTROUTER_CONFIG", str(cfg_path))
    src_dir = tmp_path / "named"
    src_dir.mkdir(parents=True)
    cfg_path.write_text(
        "\n".join(
            [
                "debounce_ms = 400",
                "",
                "[[sources.items]]",
                f"path = \"{src_dir}\"",
                "enabled = true",
                "debounce_ms = 450",
                "name = \"Screens A\"",
                "icon = \"🖼️\"",
                "",
            ]
        )
    )
    client = TestClient(create_app())
    r = client.get("/api/sources")
    assert r.status_code == 200
    items = r.json()["items"]
    found = next((it for it in items if it["path"] == str(src_dir)), None)
    assert found and found.get("name") == "Screens A" and found.get("icon") == "🖼️"


def test_duplicate_normalized_add(tmp_path: Path, monkeypatch):
    cfg_path = tmp_path / "config.toml"
    monkeypatch.setenv("SHOTROUTER_CONFIG", str(cfg_path))
    home = Path.home()
    src_dir = tmp_path / "dupe"
    src_dir.mkdir(parents=True)

    # Use tilde form and absolute form
    tilde_form = str(src_dir).replace(str(home), "~")

    client = TestClient(create_app())
    r1 = client.post("/api/sources", json={"path": tilde_form, "enabled": False, "debounce_ms": 400})
    assert r1.status_code == 200
    r2 = client.post("/api/sources", json={"path": str(src_dir), "enabled": False, "debounce_ms": 400})
    assert r2.status_code == 200

    # Config should contain only one entry for the canonical path
    text = cfg_path.read_text()
    assert text.count("[[sources.items]]") == 1


def test_sources_error_cases(tmp_path: Path, monkeypatch):
    cfg_path = tmp_path / "config.toml"
    monkeypatch.setenv("SHOTROUTER_CONFIG", str(cfg_path))
    client = TestClient(create_app())

    # Non-existent path
    r = client.post("/api/sources", json={"path": str(tmp_path / "missing"), "enabled": True, "debounce_ms": 400})
    assert r.status_code == 400

    # Delete missing
    r = client.request("DELETE", "/api/sources", params={"path": str(tmp_path / "missing")})
    assert r.status_code == 404


def test_settings_patch_persists(tmp_path: Path, monkeypatch):
    cfg_path = tmp_path / "config.toml"
    monkeypatch.setenv("SHOTROUTER_CONFIG", str(cfg_path))
    client = TestClient(create_app())

    r = client.patch("/api/settings", json={"debounce_ms": 555, "inbox_dir": str(tmp_path / "inbox")})
    assert r.status_code == 200

    # New client should reflect persisted settings
    client2 = TestClient(create_app())
    r = client2.get("/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert data.get("debounce_ms") == 555
    assert data.get("inbox_dir") == str(tmp_path / "inbox")
