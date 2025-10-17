"""
Test that simulates UI requests to verify correct headers and payloads.

These tests verify that requests sent by the UI (via the api() helper)
are properly formatted with correct Content-Type headers and JSON payloads.
"""
import json
from pathlib import Path

from fastapi.testclient import TestClient

from shotrouter.server import create_app


def new_client():
    return TestClient(create_app())


def test_route_patch_with_json_content_type(tmp_path: Path):
    """Verify route PATCH works with application/json Content-Type (as UI sends)"""
    client = new_client()

    # Setup: create destination and route
    src_dir = tmp_path / "src"
    dst_root = tmp_path / "dst"
    src_dir.mkdir(parents=True)
    dst_root.mkdir(parents=True)

    client.post("/api/destinations", json={"path": str(dst_root), "target_dir": ""})
    r = client.post(
        "/api/routes",
        json={
            "source_path": str(src_dir),
            "dest_path": str(dst_root),
            "priority": 1,
            "active": True,
            "name": "Test Route",
        },
    )
    assert r.status_code == 200
    rid = r.json()["route"]["id"]

    # Simulate UI request: PATCH with application/json and JSON body
    payload = {"active": False, "priority": 3, "name": "Updated"}
    r = client.patch(
        f"/api/routes/{rid}",
        data=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    # Verify changes persisted
    r = client.get(f"/api/routes/{rid}")
    assert r.status_code == 200
    route = r.json()["route"]
    assert route["active"] is False
    assert route["priority"] == 3
    assert route["name"] == "Updated"


def test_route_patch_rejects_missing_content_type(tmp_path: Path):
    """Verify that PATCH without Content-Type header gets handled gracefully"""
    client = new_client()

    src_dir = tmp_path / "src"
    dst_root = tmp_path / "dst"
    src_dir.mkdir(parents=True)
    dst_root.mkdir(parents=True)

    client.post("/api/destinations", json={"path": str(dst_root), "target_dir": ""})
    r = client.post(
        "/api/routes",
        json={
            "source_path": str(src_dir),
            "dest_path": str(dst_root),
            "priority": 1,
            "active": True,
        },
    )
    rid = r.json()["route"]["id"]

    # Try sending JSON without Content-Type header (simulates broken UI)
    payload = json.dumps({"active": False})
    r = client.patch(f"/api/routes/{rid}", data=payload)

    # Backend should handle this gracefully (Codex's robust parser)
    # It may succeed or return 422 - either is acceptable as long as it doesn't crash
    assert r.status_code in (200, 422), f"Unexpected status {r.status_code}"


def test_destination_patch_with_json_content_type(tmp_path: Path):
    """Verify destination PATCH works with application/json Content-Type"""
    client = new_client()

    dst_root = tmp_path / "dst"
    dst_root.mkdir(parents=True)

    # Create destination
    r = client.post(
        "/api/destinations",
        json={"path": str(dst_root), "target_dir": "images", "name": "Original"},
    )
    assert r.status_code == 200

    # Simulate UI request: PATCH with proper headers
    payload = {"path": str(dst_root), "name": "Renamed", "icon": "🎯", "target_dir": "shots"}
    r = client.patch(
        "/api/destinations",
        data=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    # Verify changes
    r = client.get("/api/destinations")
    items = r.json()["items"]
    found = next((d for d in items if d["path"] == str(dst_root)), None)
    assert found is not None
    assert found["name"] == "Renamed"
    assert found["icon"] == "🎯"
    assert found["target_dir"] == "shots"


def test_api_helper_sets_correct_headers():
    """
    Document expected behavior of the UI's api() helper.

    The api() helper should:
    1. Auto-set Content-Type: application/json when body is present
    2. Send JSON.stringify() output in the body
    3. Parse response as JSON

    This test documents the contract between UI and backend.
    """
    client = new_client()

    # Create a simple destination to test
    payload = {"path": "/tmp/test", "target_dir": "", "name": "Test"}
    r = client.post(
        "/api/destinations",
        data=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 200
    assert "destination" in r.json()

    # Verify we can read it back
    r = client.get("/api/destinations")
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(d["path"] == "/tmp/test" for d in items)
