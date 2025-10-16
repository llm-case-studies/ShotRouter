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
          // Prefer configured routes by source directory; fallback to armed/prompt
          let routed = false;
          try {
            const sp = it.source_path || '';
            const idx = Math.max(sp.lastIndexOf('/'), sp.lastIndexOf('\\\\'));
            const srcDir = idx >= 0 ? sp.substring(0, idx) : null;
            if (srcDir) {
              const rresp = await api(`/routes?source_path=${encodeURIComponent(srcDir)}`);
              if (rresp.items && rresp.items.length) {
                const r0 = rresp.items[0];
                await api('/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [it.id], repo_path: r0.destination.path, target_dir: r0.destination.target_dir || 'assets/images' }) });
                routed = true;
              }
            }
          } catch {}
          if (!routed) {
            let armed = null;
            try { armed = (await api('/settings')).armed || null; } catch {}
            if (!armed || !armed.repo_path) {
              const repo = prompt('Route to repo path?', '.');
              if (!repo) return;
              await api('/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [it.id], repo_path: repo, target_dir: 'assets/images' }) });
            } else {
              await api('/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [it.id] }) });
            }
          }
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

      // Routes panel
      const routesPanel = document.createElement('div'); routesPanel.style.marginTop = '12px';
      const rh = document.createElement('h3'); rh.textContent = 'Routes';
      const rtable = document.createElement('table'); rtable.className = 'sr-table';
      const head = document.createElement('tr'); head.innerHTML = '<th>Priority</th><th>Destination</th><th></th>';
      rtable.append(head);
      const rresp = await api(`/routes?source_path=${encodeURIComponent(src.path)}`);
      for (const r of rresp.items || []) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.priority}</td><td>${(r.destination.name || '')} ${r.destination.path}</td>`;
        const td = document.createElement('td');
        const del = document.createElement('button'); del.className='sr-btn'; del.textContent='Remove';
        del.onclick = async () => { await fetch(`/api/routes/${r.id}`, { method:'DELETE' }); await refresh(); };
        td.append(del); tr.append(td); rtable.append(tr);
      }
      const addR = document.createElement('button'); addR.className='sr-btn'; addR.textContent='Add Route';
      addR.onclick = async () => {
        const dest = prompt('Destination path? (must be added in Destinations)'); if (!dest) return;
        const pr = parseInt(prompt('Priority? (1 is highest)', '1') || '1', 10);
        await fetch('/api/routes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ source_path: src.path, dest_path: dest, priority: pr }) });
        await refresh();
      };
      routesPanel.append(rh, rtable, addR);

      panel.append(h, p, actions, routesPanel);
      content.append(panel);
    } else if (state.view.type === 'destination') {
      const dresp = await api('/destinations');
      const dst = (dresp.items || []).find(d => d.path === state.view.key);
      const panel = document.createElement('div'); panel.className='sr-panel';
      const h = document.createElement('h2'); h.textContent = 'Destination';
      const pre = document.createElement('pre'); pre.textContent = JSON.stringify(dst || {}, null, 2);
      const rm = document.createElement('button'); rm.className='sr-btn'; rm.textContent='Remove Destination';
      rm.onclick = async () => { await fetch(`/api/destinations?path=${encodeURIComponent(dst.path)}`, { method:'DELETE' }); await loadSidebar(); setView({ type: 'collection', key: 'inbox' }); };
      panel.append(h, pre, rm);
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
    const titleS = document.createElement('div'); titleS.className = 'tree-title'; titleS.textContent = `Sources (${state.sources.length})`;
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

    // Destinations
    const secD = document.createElement('div'); secD.className = 'tree-section';
    const titleD = document.createElement('div'); titleD.className = 'tree-title'; titleD.textContent = 'Destinations';
    const addD = document.createElement('div'); addD.style.margin = '8px 0';
    const inputD = document.createElement('input'); inputD.placeholder = 'Add destination path…'; inputD.style.width = '100%';
    inputD.onkeydown = async (e) => {
      if (e.key==='Enter' && inputD.value.trim()) {
        const body = { path: inputD.value.trim(), target_dir: 'assets/images' };
        const resp = await fetch('/api/destinations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        if (resp.ok) { inputD.value=''; await loadSidebar(); } else { alert('Failed to add destination'); }
      }
    };
    addD.append(inputD);
    const listD = document.createElement('ul'); listD.className = 'tree';
    const dests = await api('/destinations');
    for (const d of dests.items || []) {
      const li = document.createElement('li');
      const a = document.createElement('div'); a.className = 'tree-item'; a.textContent = d.name ? `${d.name} (${d.path})` : d.path;
      a.onclick = () => setView({ type: 'destination', key: d.path });
      if (state.view.type==='destination' && state.view.key===d.path) a.classList.add('active');
      li.append(a); listD.append(li);
    }
    secD.append(titleD, addD, listD);

    wrap.append(secC, secS, secD);
    sidebar.innerHTML = '';
    sidebar.append(wrap);
  }

  function setView(v) {
    state.view = v;
    // update sidebar active states
    loadSidebar();
    refresh();
  }

  // Resizable sidebar
  (function setupResizer() {
    const resizer = document.getElementById('resizer');
    if (!resizer) return;
    let startX = 0; let startWidth = 260; let dragging = false;
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const w = Math.min(480, Math.max(200, startWidth + dx));
      document.documentElement.style.setProperty('--sr-sidebar-width', w + 'px');
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const w = getComputedStyle(document.documentElement).getPropertyValue('--sr-sidebar-width');
      try { localStorage.setItem('sr.sidebar.width', w.trim()); } catch {}
    };
    resizer.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      const cur = getComputedStyle(document.documentElement).getPropertyValue('--sr-sidebar-width');
      startWidth = parseInt(cur || '260', 10) || 260;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    // restore
    const saved = localStorage.getItem('sr.sidebar.width');
    if (saved) document.documentElement.style.setProperty('--sr-sidebar-width', saved);
  })();

  init();
})();
