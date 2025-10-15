(function () {
  const api = (path, opts = {}) => fetch(`/api${path}`, opts).then(r => r.json());

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('sr.theme', t);
  }

  function renderList(el, items) {
    el.innerHTML = '';
    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'sr-item';
      const info = document.createElement('div');
      info.textContent = `${it.id} • ${it.status}`;
      const actions = document.createElement('div');
      actions.className = 'sr-item-actions';
      if (it.status === 'inbox') {
        const routeBtn = document.createElement('button');
        routeBtn.className = 'sr-btn sr-btn--primary';
        routeBtn.textContent = 'Route';
        routeBtn.onclick = async () => {
          await api('/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [it.id] }) });
          await refresh();
        };
        const qBtn = document.createElement('button');
        qBtn.className = 'sr-btn';
        qBtn.textContent = 'Quarantine';
        qBtn.onclick = async () => { await api('/quarantine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, reason: 'manual' }) }); await refresh(); };
        actions.append(routeBtn, qBtn);
      }
      row.append(info, actions);
      el.append(row);
    }
  }

  async function refresh() {
    const inbox = await api('/screenshots?status=inbox&limit=50&offset=0');
    const routed = await api('/screenshots?status=routed&limit=50&offset=0');
    renderList(document.getElementById('inbox'), inbox.items);
    renderList(document.getElementById('routed'), routed.items);
  }

  async function init() {
    const theme = localStorage.getItem('sr.theme') || 'ledger';
    setTheme(theme);
    document.getElementById('theme').value = theme;
    document.getElementById('theme').addEventListener('change', (e) => setTheme(e.target.value));
    document.getElementById('arm').addEventListener('click', async () => {
      const repo = prompt('Repo path to arm?', '.');
      if (repo) await api('/arm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo_path: repo, target_dir: 'assets/images' }) });
    });
    // Dev: simulate new items while we lack a watcher
    window.addEventListener('keydown', async (e) => {
      if (e.key === 'n' && e.ctrlKey) {
        await fetch('/api/dev/simulate_new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source_path: '/tmp/screenshot.png', size: 12345 }) });
        await refresh();
      }
    });
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onmessage = (ev) => {
      try { const evt = JSON.parse(ev.data); if (evt.event && evt.event.startsWith('screenshot.')) refresh(); } catch {}
    };
    await refresh();
  }

  init();
})();

