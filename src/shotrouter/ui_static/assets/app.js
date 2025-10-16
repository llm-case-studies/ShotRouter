(function () {
  const api = (path, opts = {}) => fetch(`/api${path}`, opts).then(r => r.json());
  const state = {
    view: { type: 'collection', key: 'inbox' }, // 'collection' | 'source' | 'destination' | 'sources' | 'destinations'
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
      const file = (it.source_path || '').split('/').pop();
      info.textContent = `${file || it.id} • ${it.status}`;
      if (it.source_path) {
        const small = document.createElement('div');
        small.style.opacity = '0.7'; small.style.fontSize = '12px';
        small.textContent = it.source_path;
        info.appendChild(small);
      }
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
        const viewBtn = document.createElement('button');
        viewBtn.className = 'sr-btn';
        viewBtn.textContent = 'View';
        viewBtn.onclick = () => {
          let pre = row.nextSibling;
          if (pre && pre.classList && pre.classList.contains('sr-preview')) { pre.remove(); return; }
          const prev = document.createElement('div'); prev.className='sr-preview';
          const img = document.createElement('img'); img.src = `/api/files/${it.id}`;
          prev.append(img);
          row.parentNode.insertBefore(prev, row.nextSibling);
        };
        actions.append(routeBtn, qBtn, viewBtn);
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
      h.textContent = (status === 'inbox' ? 'Inbox (unrouted)' : status.charAt(0).toUpperCase() + status.slice(1));
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
    } else if (state.view.type === 'sources') {
      const panel = document.createElement('div'); panel.className='sr-panel';
      const h = document.createElement('h2'); h.textContent = `Sources (${state.sources.length})`;
      const add = document.createElement('button'); add.className='sr-btn'; add.textContent='Add Source…';
      add.onclick = async () => {
        const p = prompt('Absolute path to watch (e.g., ~/Pictures/Screenshots)'); if (!p) return;
        const body = { path: p, enabled: true, debounce_ms: 400 };
        const resp = await fetch('/api/sources', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        if (!resp.ok) { alert('Failed to add source; check path exists'); return; }
        await loadSidebar(); setView({ type: 'sources' });
      };
      const candBtn = document.createElement('button'); candBtn.className='sr-btn'; candBtn.textContent='Add from candidates…'; candBtn.style.marginLeft = '8px';
      candBtn.onclick = async () => {
        const cs = await api('/sources/candidates');
        const pick = prompt('Pick a number to add:\n' + (cs.items || []).map((p,i)=>`${i+1}. ${p}`).join('\n')); if (!pick) return;
        const idx = parseInt(pick, 10)-1; if (idx<0 || idx>=(cs.items||[]).length) return;
        const body = { path: cs.items[idx], enabled: true, debounce_ms: 400 };
        await fetch('/api/sources', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        await loadSidebar(); setView({ type: 'sources' });
      };
      const table = document.createElement('table'); table.className='sr-table';
      const head = document.createElement('tr'); head.innerHTML = '<th>Path</th><th>Enabled</th><th>Debounce (ms)</th><th></th>';
      table.append(head);
      for (const s of state.sources) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${s.path}</td><td>${s.enabled ? 'yes' : 'no'}</td><td>${s.debounce_ms||400}</td>`;
        const td = document.createElement('td');
        const view = document.createElement('button'); view.className='sr-btn'; view.textContent='Open'; view.onclick=()=>setView({ type: 'source', key: s.path });
        const del = document.createElement('button'); del.className='sr-btn'; del.textContent='Remove'; del.style.marginLeft='6px'; del.onclick = async ()=>{ await fetch(`/api/sources?path=${encodeURIComponent(s.path)}`, { method:'DELETE' }); await loadSidebar(); setView({ type:'sources' }); };
        td.append(view, del); tr.append(td); table.append(tr);
      }
      const controls = document.createElement('div'); controls.style.marginBottom='8px'; controls.append(add, candBtn);
      panel.append(h, controls, table); content.append(panel);
    } else if (state.view.type === 'destinations') {
      const panel = document.createElement('div'); panel.className='sr-panel';
      const dresp = await api('/destinations');
      const items = dresp.items || [];
      const h = document.createElement('h2'); h.textContent = `Destinations (${items.length})`;
      const add = document.createElement('button'); add.className='sr-btn'; add.textContent='Add Destination…';
      add.onclick = async () => {
        const p = prompt('Absolute destination path (repo root or folder)'); if (!p) return;
        await fetch('/api/destinations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path: p, target_dir: '' }) });
        setView({ type: 'destinations' });
      };
      const table = document.createElement('table'); table.className='sr-table';
      const head = document.createElement('tr'); head.innerHTML = '<th>Path</th><th>Target Dir</th><th></th>';
      table.append(head);
      for (const d of items) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${d.path}</td><td>${d.target_dir||''}</td>`;
        const td = document.createElement('td');
        const open = document.createElement('button'); open.className='sr-btn'; open.textContent='Open'; open.onclick=()=>setView({ type:'destination', key: d.path });
        const del = document.createElement('button'); del.className='sr-btn'; del.textContent='Remove'; del.style.marginLeft='6px'; del.onclick= async ()=>{ await fetch(`/api/destinations?path=${encodeURIComponent(d.path)}`, { method:'DELETE' }); setView({ type:'destinations' }); };
        td.append(open, del); tr.append(td); table.append(tr);
      }
      const controls = document.createElement('div'); controls.style.marginBottom='8px'; controls.append(add);
      panel.append(h, controls, table); content.append(panel);
    } else if (state.view.type === 'destination') {
      const dresp = await api('/destinations');
      const dst = (dresp.items || []).find(d => d.path === state.view.key);
      const panel = document.createElement('div'); panel.className='sr-panel';
      const h = document.createElement('h2'); h.textContent = 'Destination';
      const pre = document.createElement('pre'); pre.textContent = JSON.stringify(dst || {}, null, 2);
      const routesPanel = document.createElement('div'); routesPanel.style.marginTop='12px';
      const rh = document.createElement('h3'); rh.textContent = 'Inbound Routes';
      const rtable = document.createElement('table'); rtable.className='sr-table';
      const head2 = document.createElement('tr'); head2.innerHTML = '<th>Priority</th><th>Source</th><th></th>';
      rtable.append(head2);
      const rresp = await api(`/routes?dest_path=${encodeURIComponent(dst.path)}`);
      for (const r of rresp.items || []) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.priority}</td><td>${r.source_path}</td>`;
        const td = document.createElement('td');
        const del = document.createElement('button'); del.className='sr-btn'; del.textContent='Remove';
        del.onclick = async () => { await fetch(`/api/routes/${r.id}`, { method:'DELETE' }); await refresh(); };
        td.append(del); tr.append(td); rtable.append(tr);
      }
      const addR = document.createElement('button'); addR.className='sr-btn'; addR.textContent='Add Route from Source';
      addR.onclick = async () => {
        const sp = prompt('Source path?'); if (!sp) return;
        const pr = parseInt(prompt('Priority? (1 is highest)', '1') || '1', 10);
        await fetch('/api/routes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ source_path: sp, dest_path: dst.path, priority: pr }) });
        await refresh();
      };
      const rm = document.createElement('button'); rm.className='sr-btn'; rm.textContent='Remove Destination'; rm.style.marginLeft='8px';
      rm.onclick = async () => { await fetch(`/api/destinations?path=${encodeURIComponent(dst.path)}`, { method:'DELETE' }); await loadSidebar(); setView({ type: 'destinations' }); };
      routesPanel.append(rh, rtable, addR, rm);
      panel.append(h, pre, routesPanel); content.append(panel);
    } else if (state.view.type === 'routes') {
      const panel = document.createElement('div'); panel.className='sr-panel';
      const h = document.createElement('h2'); h.textContent = 'Routes';
      const add = document.createElement('button'); add.className='sr-btn'; add.textContent='Add Route…';
      add.onclick = async () => {
        const sp = prompt('Source path?'); if (!sp) return;
        const dp = prompt('Destination path?'); if (!dp) return;
        const pr = parseInt(prompt('Priority? (1 is highest)', '1') || '1', 10);
        await fetch('/api/routes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ source_path: sp, dest_path: dp, priority: pr }) });
        setView({ type: 'routes' });
      };
      const table = document.createElement('table'); table.className='sr-table';
      const head3 = document.createElement('tr'); head3.innerHTML = '<th>Priority</th><th>Source</th><th>Destination</th><th></th>';
      table.append(head3);
      const rresp2 = await api('/routes');
      for (const r of rresp2.items || []) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.priority}</td><td>${r.source_path}</td><td>${(r.destination.name||'')} ${r.destination.path}</td>`;
        const td = document.createElement('td');
        const del = document.createElement('button'); del.className='sr-btn'; del.textContent='Remove'; del.onclick= async ()=>{ await fetch(`/api/routes/${r.id}`, { method:'DELETE' }); setView({ type: 'routes' }); };
        td.append(del); tr.append(td); table.append(tr);
      }
      const controls = document.createElement('div'); controls.style.marginBottom='8px'; controls.append(add);
      panel.append(h, controls, table); content.append(panel);
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
    titleS.style.cursor='pointer';
    titleS.onclick = () => setView({ type: 'sources' });
    const listS = document.createElement('ul'); listS.className = 'tree';
    for (const s of state.sources) {
      const li = document.createElement('li');
      const a = document.createElement('div'); a.className = 'tree-item'; a.textContent = s.path;
      a.onclick = () => setView({ type: 'source', key: s.path });
      if (state.view.type==='source' && state.view.key===s.path) a.classList.add('active');
      li.append(a); listS.append(li);
    }
    secS.append(titleS, listS);

    // Destinations
    const secD = document.createElement('div'); secD.className = 'tree-section';
    const titleD = document.createElement('div'); titleD.className = 'tree-title'; titleD.textContent = 'Destinations';
    titleD.style.cursor='pointer';
    titleD.onclick = () => setView({ type: 'destinations' });
    const listD = document.createElement('ul'); listD.className = 'tree';
    const dests = await api('/destinations');
    for (const d of dests.items || []) {
      const li = document.createElement('li');
      const a = document.createElement('div'); a.className = 'tree-item'; a.textContent = d.name ? `${d.name} (${d.path})` : d.path;
      a.onclick = () => setView({ type: 'destination', key: d.path });
      if (state.view.type==='destination' && state.view.key===d.path) a.classList.add('active');
      li.append(a); listD.append(li);
    }
    secD.append(titleD, listD);

    // Routes
    const secR = document.createElement('div'); secR.className = 'tree-section';
    const titleR = document.createElement('div'); titleR.className = 'tree-title'; titleR.textContent = 'Routes';
    titleR.style.cursor='pointer';
    titleR.onclick = () => setView({ type: 'routes' });

    wrap.append(secC, secS, secD, secR);
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
