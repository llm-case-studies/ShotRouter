import json
from pathlib import Path
from fastapi.testclient import TestClient
from shotrouter.server import create_app


def test_arm_and_simulate_and_route(tmp_path: Path):
    app = create_app()
    client = TestClient(app)

    # Create temp repo directory
    repo_path = tmp_path / "repo"
    repo_path.mkdir()

    # Create temp source file
    src_file = tmp_path / "s1.png"
    src_file.write_bytes(b"fake image data")

    # Arm next
    r = client.post('/api/arm', json={'repo_path': str(repo_path), 'target_dir': 'assets/images'})
    assert r.status_code == 200

    # Simulate new
    r = client.post('/api/dev/simulate_new', json={'source_path': str(src_file), 'size': 10})
    assert r.status_code == 200
    sid = r.json()['id']

    # List inbox
    r = client.get('/api/screenshots?status=inbox')
    assert any(it['id'] == sid for it in r.json()['items'])

    # Route
    r = client.post('/api/route', json={'ids': [sid]})
    assert r.status_code == 200
    assert r.json()['routed'][0]['id'] == sid

    # Listed as routed
    r = client.get('/api/screenshots?status=routed')
    assert any(it['id'] == sid for it in r.json()['items'])

