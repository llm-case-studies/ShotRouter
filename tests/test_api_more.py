from fastapi.testclient import TestClient
from shotrouter.server import create_app


def new_client():
    return TestClient(create_app())


def test_route_requires_repo_or_armed():
    c = new_client()
    # simulate one new item
    r = c.post('/api/dev/simulate_new', json={'source_path': '/src/a.png', 'size': 1})
    sid = r.json()['id']
    r = c.post('/api/route', json={'ids': [sid]})
    assert r.status_code == 422
    assert 'repo_path' in r.text


def test_delete_unknown_404():
    c = new_client()
    r = c.delete('/api/screenshots/does-not-exist')
    assert r.status_code == 404


def test_list_pagination_and_status_filter():
    c = new_client()
    for i in range(5):
        c.post('/api/dev/simulate_new', json={'source_path': f'/src/{i}.png', 'size': 1})
    r = c.get('/api/screenshots?status=inbox&limit=2&offset=0')
    assert r.status_code == 200
    assert len(r.json()['items']) == 2
    r2 = c.get('/api/screenshots?status=inbox&limit=2&offset=2')
    assert len(r2.json()['items']) == 2


def test_routing_uses_armed_defaults():
    c = new_client()
    c.post('/api/arm', json={'repo_path': '/repo', 'target_dir': 'assets/images'})
    r = c.post('/api/dev/simulate_new', json={'source_path': '/src/x.png', 'size': 1})
    sid = r.json()['id']
    rr = c.post('/api/route', json={'ids': [sid]})
    assert rr.status_code == 200
    dest = rr.json()['routed'][0]['dest_path']
    assert dest.startswith('/repo/assets/images/')


def test_quarantine_flow():
    c = new_client()
    r = c.post('/api/dev/simulate_new', json={'source_path': '/src/q.png', 'size': 1})
    sid = r.json()['id']
    r = c.post('/api/quarantine', json={'id': sid, 'reason': 'test'})
    assert r.status_code == 200
    # ensure not in inbox
    r = c.get('/api/screenshots?status=inbox')
    ids = [it['id'] for it in r.json()['items']]
    assert sid not in ids
    # directly inspect quarantined via filter
    r = c.get('/api/screenshots?status=quarantined')
    ids = [it['id'] for it in r.json()['items']]
    assert sid in ids


def test_settings_roundtrip_and_approve_stub():
    c = new_client()
    r = c.get('/api/settings')
    assert r.status_code == 200
    r = c.post('/api/settings', json={'debounce_ms': 500})
    assert r.status_code == 200
    assert r.json()['status'] == 'ok'
    r = c.post('/api/approve', json={'id': 'sr_fake', 'reason': 'test'})
    assert r.status_code == 200
    assert r.json()['status'] == 'approved'

