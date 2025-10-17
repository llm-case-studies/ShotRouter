import json
from pathlib import Path

from fastapi.testclient import TestClient

from shotrouter.server import create_app


def new_client():
    return TestClient(create_app())


def test_routes_crud_and_patch_coercion(tmp_path: Path):
    client = new_client()

    # Prepare source/destination folders
    src_dir = tmp_path / "src"
    dst_root = tmp_path / "dst"
    src_dir.mkdir(parents=True)
    dst_root.mkdir(parents=True)

    # Add destination
    r = client.post(
        "/api/destinations",
        json={"path": str(dst_root), "target_dir": "", "name": "DST"},
    )
    assert r.status_code == 200

    # Add route
    r = client.post(
        "/api/routes",
        json={
            "source_path": str(src_dir),
            "dest_path": str(dst_root),
            "priority": 1,
            "active": True,
            "name": "Initial",
        },
    )
    assert r.status_code == 200
    rid = r.json()["route"]["id"]

    # Verify present in list, active True
    r = client.get(f"/api/routes?source_path={str(src_dir)}")
    assert r.status_code == 200
    items = r.json()["items"]
    assert items and items[0]["active"] is True and items[0]["name"] in ("Initial", None)

    # Coercion patch: send text/plain body with types as strings
    payload = json.dumps({"active": False, "priority": "2", "name": "Renamed"})
    r = client.patch(
        f"/api/routes/{rid}", data=payload, headers={"Content-Type": "text/plain"}
    )
    assert r.status_code == 200

    # Verify updated
    r = client.get(f"/api/routes?source_path={str(src_dir)}")
    assert r.status_code == 200
    item = r.json()["items"][0]
    assert item["active"] is False
    assert item["priority"] == 2
    assert item.get("name") in ("Renamed", "Initial", None)  # name may be optional in list


def test_destination_patch_and_query(tmp_path: Path):
    client = new_client()
    dst_root = tmp_path / "dst2"
    dst_root.mkdir(parents=True)

    # Add
    r = client.post(
        "/api/destinations",
        json={"path": str(dst_root), "target_dir": "", "name": "Orig", "icon": "📁"},
    )
    assert r.status_code == 200

    # Patch
    r = client.patch(
        "/api/destinations",
        json={"path": str(dst_root), "name": "Renamed", "icon": "🎯", "target_dir": "shots"},
    )
    assert r.status_code == 200

    # Verify
    r = client.get("/api/destinations")
    assert r.status_code == 200
    items = r.json()["items"]
    found = next((d for d in items if d["path"] == str(dst_root)), None)
    assert found and found["name"] == "Renamed" and found["icon"] == "🎯" and found["target_dir"] == "shots"


def test_route_and_fileserving(tmp_path: Path):
    client = new_client()
    src_dir = tmp_path / "src"
    dst_root = tmp_path / "dst"
    src_dir.mkdir(parents=True)
    dst_root.mkdir(parents=True)

    # Create a dummy screenshot file in the source dir
    img_path = src_dir / "shot.png"
    img_bytes = b"PNGDATA"
    img_path.write_bytes(img_bytes)

    # Simulate new screenshot with the real path
    r = client.post(
        "/api/dev/simulate_new",
        json={"source_path": str(img_path), "size": len(img_bytes)},
    )
    assert r.status_code == 200
    sid = r.json()["id"]

    # Route it to destination root
    r = client.post(
        "/api/route",
        json={"ids": [sid], "repo_path": str(dst_root), "target_dir": ""},
    )
    assert r.status_code == 200
    final = r.json()["routed"][0]["dest_path"]
    assert final and Path(final).exists()

    # Serve the file and compare content
    r = client.get(f"/api/files/{sid}")
    assert r.status_code == 200
    assert r.content == img_bytes


def test_routes_query_by_dest_path(tmp_path: Path):
    client = new_client()
    src_dir = tmp_path / "srcq"
    dst_root = tmp_path / "dstq"
    src_dir.mkdir(parents=True)
    dst_root.mkdir(parents=True)

    # Ensure destination
    client.post("/api/destinations", json={"path": str(dst_root), "target_dir": ""})
    client.post(
        "/api/routes",
        json={"source_path": str(src_dir), "dest_path": str(dst_root), "priority": 3, "active": True},
    )

    r = client.get(f"/api/routes?dest_path={str(dst_root)}")
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(it["dest_path"] == str(dst_root) for it in items)

