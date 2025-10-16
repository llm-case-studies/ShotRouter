(function () {
  const api = (path, opts = {}) => fetch(`/api${path}`, opts).then(r => r.json());
  const state = {
    view: { type: 'collection', key: 'inbox' }, // 'collection' | 'source'
    sources: [],
  };

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
    // Render content based on current view
    const content = document.getElementById('content');
    content.innerHTML = '';
    if (state.view.type === 'collection') {
      const status = state.view.key;
      const panel = document.createElement('div');
      panel.className = 'sr-panel';
      const h = document.createElement('h2');
      h.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      const listWrap = document.createElement('div');
      listWrap.id = 'list';
      panel.append(h, listWrap);
      content.append(panel);
      const resp = await api(`/screenshots?status=${encodeURIComponent(status)}&limit=200&offset=0`);
      renderList(listWrap, resp.items);
    } else if (state.view.type === 'source') {
      const src = state.sources.find(s => s.path === state.view.key);
      const panel = document.createElement('div');
      panel.className = 'sr-panel';
      const h = document.createElement('h2');
      h.textContent = 'Source';
      const p = document.createElement('pre');
      p.textContent = JSON.stringify(src || {}, null, 2);
      const actions = document.createElement('div');
      actions.className = 'sr-item-actions';
      const rm = document.createElement('button');
      rm.className = 'sr-btn';
      rm.textContent = 'Remove Source';
      rm.onclick = async () => {
        await api(`/sources?path=${encodeURIComponent(src.path)}`, { method: 'DELETE' });
        await loadSidebar();
        setView({ type: 'collection', key: 'inbox' });
      };
      actions.append(rm);
      panel.append(h, p, actions);
      content.append(panel);
    }
  }

  async function refreshStatus() {
    try {
      const st = await api('/status');
      const el = document.getElementById('status');
      el.textContent = `Watching ${st.watching_count} source${st.watching_count === 1 ? '' : 's'}`;
    } catch {
      // ignore
    }
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
      try {
        const evt = JSON.parse(ev.data);
        if (evt.event && evt.event.startsWith('screenshot.')) refresh();
      } catch {}
    };
    await loadSidebar();
    setView({ type: 'collection', key: 'inbox' });
    await refreshStatus();
    setInterval(refreshStatus, 5000);
  }

  async function loadSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sourcesResp = await api('/sources');
    state.sources = sourcesResp.items || [];

    const wrap = document.createElement('div');
    // Collections
    const secC = document.createElement('div'); secC.className = 'tree-section';
    const titleC = document.createElement('div'); titleC.className = 'tree-title'; titleC.textContent = 'Collections';
    const listC = document.createElement('ul'); listC.className = 'tree';
    for (const key of ['inbox','routed','quarantined']) {
      const li = document.createElement('li');
      const a = document.createElement('div'); a.className = 'tree-item'; a.textContent = key.charAt(0).toUpperCase()+key.slice(1);
      a.onclick = () => setView({ type: 'collection', key });
      if (state.view.type==='collection' && state.view.key===key) a.classList.add('active');
      li.append(a); listC.append(li);
    }
    secC.append(titleC, listC);

    // Sources
    const secS = document.createElement('div'); secS.className = 'tree-section';
    const titleS = document.createElement('div'); titleS.className = 'tree-title'; titleS.textContent = 'Sources';
    const addWrap = document.createElement('div'); addWrap.style.margin = '8px 0';
    const input = document.createElement('input'); input.placeholder = 'Add source path…'; input.style.width='100%';
    input.onkeydown = async (e) => {
      if (e.key==='Enter' && input.value.trim()) {
        const body = { path: input.value.trim(), enabled: true, debounce_ms: 400 };
        const resp = await fetch('/api/sources', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        if (resp.ok) { input.value=''; await loadSidebar(); await refreshStatus(); }
        else { alert('Failed to add source (check path exists)'); }
      }
    };
    addWrap.append(input);
    const listS = document.createElement('ul'); listS.className = 'tree';
    for (const s of state.sources) {
      const li = document.createElement('li');
      const a = document.createElement('div'); a.className = 'tree-item'; a.textContent = s.path;
      a.onclick = () => setView({ type: 'source', key: s.path });
      if (state.view.type==='source' && state.view.key===s.path) a.classList.add('active');
      li.append(a); listS.append(li);
    }
    secS.append(titleS, addWrap, listS);

    wrap.append(secC, secS);
    sidebar.innerHTML = '';
    sidebar.append(wrap);
  }

  function setView(v) {
    state.view = v;
    // update sidebar active states
    loadSidebar();
    refresh();
  }

  init();
})();
