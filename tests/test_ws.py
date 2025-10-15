import json
from fastapi.testclient import TestClient
from shotrouter.server import create_app


def test_websocket_receives_events():
    app = create_app()
    client = TestClient(app)
    with client.websocket_connect('/ws') as ws:
        # simulate new
        r = client.post('/api/dev/simulate_new', json={'source_path': '/src/ws.png', 'size': 1})
        sid = r.json()['id']
        evt = json.loads(ws.receive_text())
        assert evt['event'] == 'screenshot.new'
        assert evt['data']['id'] == sid
        # route it
        client.post('/api/arm', json={'repo_path': '/repo', 'target_dir': 'assets/images'})
        client.post('/api/route', json={'ids': [sid]})
        evt2 = json.loads(ws.receive_text())
        assert evt2['event'] == 'screenshot.routed'
        assert evt2['data']['id'] == sid

