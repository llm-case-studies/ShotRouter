import json
from pathlib import Path
from fastapi.testclient import TestClient
from shotrouter.server import create_app


def test_websocket_receives_events(tmp_path: Path):
    app = create_app()
    client = TestClient(app)

    # Create temp repo and source file
    repo_path = tmp_path / "repo"
    repo_path.mkdir()
    src_file = tmp_path / "ws.png"
    src_file.write_bytes(b"data")

    with client.websocket_connect('/ws') as ws:
        # simulate new
        r = client.post('/api/dev/simulate_new', json={'source_path': str(src_file), 'size': 1})
        sid = r.json()['id']
        evt = json.loads(ws.receive_text())
        assert evt['event'] == 'screenshot.new'
        assert evt['data']['id'] == sid
        # route it
        client.post('/api/arm', json={'repo_path': str(repo_path), 'target_dir': 'assets/images'})
        client.post('/api/route', json={'ids': [sid]})
        evt2 = json.loads(ws.receive_text())
        assert evt2['event'] == 'screenshot.routed'
        assert evt2['data']['id'] == sid

