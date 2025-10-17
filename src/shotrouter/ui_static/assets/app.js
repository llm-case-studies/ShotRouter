(function () {
  const api = (path, opts = {}) => fetch(`/api${path}`, opts).then(r => r.json());
  const state = {
    view: { type: 'collection', key: 'inbox' }, // 'collection' | 'source' | 'destination' | 'sources' | 'destinations'
    sources: [],
    expanded: {
      collections: true,
      sources: true,
      destinations: true,
      routes: true
    }
  };

  function toggleExpand(section) {
    state.expanded[section] = !state.expanded[section];
    localStorage.setItem('sr.expanded', JSON.stringify(state.expanded));
    loadSidebar();
  }

  function createExpandableTitle(text, section, isActive) {
    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'tree-title expandable';
    if (isActive) titleWrapper.classList.add('active');
    titleWrapper.style.cursor = 'pointer';

    const icon = document.createElement('span');
    icon.className = 'tree-expand-icon';
    if (state.expanded[section]) icon.classList.add('expanded');
    icon.textContent = '▶';

    const label = document.createElement('span');
    label.textContent = text;

    titleWrapper.appendChild(icon);
    titleWrapper.appendChild(label);

    titleWrapper.onclick = (e) => {
      e.stopPropagation();
      toggleExpand(section);
    };

    return titleWrapper;
  }

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
          // Create lightbox
          const lightbox = document.createElement('div');
          lightbox.className = 'sr-lightbox';
          const img = document.createElement('img');
          img.src = `/api/files/${it.id}`;
          const closeBtn = document.createElement('div');
          closeBtn.className = 'sr-lightbox-close';
          closeBtn.innerHTML = '&times;';
          lightbox.appendChild(img);
          lightbox.appendChild(closeBtn);

          // Close on click anywhere
          lightbox.onclick = () => lightbox.remove();

          // ESC key to close
          const escHandler = (e) => {
            if (e.key === 'Escape') {
              lightbox.remove();
              document.removeEventListener('keydown', escHandler);
            }
          };
          document.addEventListener('keydown', escHandler);

          document.body.appendChild(lightbox);
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
      const h = document.createElement('h2'); h.textContent = dst?.name || 'Destination';

      // Editable fields
      const editForm = document.createElement('div'); editForm.style.marginBottom = '16px';
      editForm.innerHTML = `
        <div style="margin-bottom: 8px;"><strong>Path:</strong> ${dst?.path || ''}</div>
        <div style="margin-bottom: 8px;">
          <label>Name: <input type="text" id="dst-name" value="${dst?.name || ''}" placeholder="e.g., MyApp Project" style="width: 200px; padding: 4px;"></label>
        </div>
        <div style="margin-bottom: 8px;">
          <label>Icon: <input type="text" id="dst-icon" value="${dst?.icon || ''}" placeholder="e.g., 📁 or 🎯" style="width: 60px; padding: 4px;"></label>
        </div>
        <div style="margin-bottom: 8px;">
          <label>Target Dir: <input type="text" id="dst-target-dir" value="${dst?.target_dir || ''}" placeholder="e.g., assets/images" style="width: 200px; padding: 4px;"></label>
        </div>
      `;
      const saveBtn = document.createElement('button'); saveBtn.className='sr-btn sr-btn--primary'; saveBtn.textContent='Save Changes';
      saveBtn.onclick = async () => {
        const name = document.getElementById('dst-name').value;
        const icon = document.getElementById('dst-icon').value;
        const target_dir = document.getElementById('dst-target-dir').value;
        await fetch(`/api/destinations`, { method:'DELETE', body: new URLSearchParams({path: dst.path}) });
        await fetch('/api/destinations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path: dst.path, name, icon, target_dir }) });
        await loadSidebar();
        setView({ type: 'destination', key: dst.path });
      };
      editForm.appendChild(saveBtn);

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
      panel.append(h, editForm, routesPanel); content.append(panel);
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
        tr.style.cursor = 'pointer';
        tr.innerHTML = `<td>${r.priority}</td><td>${r.source_path}</td><td>${(r.destination.name||'')} ${r.destination.path}</td>`;
        tr.onclick = () => setView({ type: 'route', key: r.id });
        const td = document.createElement('td');
        const del = document.createElement('button'); del.className='sr-btn'; del.textContent='Remove';
        del.onclick= async (e)=>{ e.stopPropagation(); await fetch(`/api/routes/${r.id}`, { method:'DELETE' }); setView({ type: 'routes' }); };
        td.append(del); tr.append(td); table.append(tr);
      }
      const controls = document.createElement('div'); controls.style.marginBottom='8px'; controls.append(add);
      panel.append(h, controls, table); content.append(panel);
    } else if (state.view.type === 'route') {
      // Route detail view with tabs
      const rresp = await api('/routes');
      const route = (rresp.items || []).find(r => r.id === state.view.key);
      if (!route) {
        content.innerHTML = '<div class="sr-panel">Route not found</div>';
        return;
      }

      const panel = document.createElement('div'); panel.className='sr-panel';
      const h = document.createElement('h2'); h.textContent = `Route: ${route.source_path.split('/').pop()} → ${route.destination.name || route.destination.path.split('/').pop()}`;

      // Tab navigation
      const tabs = document.createElement('div'); tabs.className = 'sr-tabs';
      const configTab = document.createElement('button'); configTab.className = 'sr-tab active'; configTab.textContent = 'Configuration';
      const itemsTab = document.createElement('button'); itemsTab.className = 'sr-tab'; itemsTab.textContent = 'Routed Items';
      tabs.append(configTab, itemsTab);

      // Tab contents
      const configContent = document.createElement('div'); configContent.className = 'sr-tab-content active';
      const itemsContent = document.createElement('div'); itemsContent.className = 'sr-tab-content';

      // Tab switching
      configTab.onclick = () => {
        configTab.classList.add('active'); itemsTab.classList.remove('active');
        configContent.classList.add('active'); itemsContent.classList.remove('active');
      };
      itemsTab.onclick = () => {
        itemsTab.classList.add('active'); configTab.classList.remove('active');
        itemsContent.classList.add('active'); configContent.classList.remove('active');
      };

      // === Configuration Tab ===
      const configForm = document.createElement('div');
      configForm.innerHTML = `
        <div style="margin-bottom: 12px;">
          <strong>Source:</strong> ${route.source_path}
        </div>
        <div style="margin-bottom: 12px;">
          <strong>Destination:</strong> ${route.destination.path}
        </div>
        <div style="margin-bottom: 12px;">
          <label>
            <input type="checkbox" id="route-enabled" ${route.active ? 'checked' : ''}>
            Enabled
          </label>
        </div>
        <div style="margin-bottom: 12px;">
          <label>Route Name: <input type="text" id="route-name" value="" placeholder="e.g., Dev Screenshots" style="width: 250px; padding: 4px;"></label>
        </div>
        <div style="margin-bottom: 12px;">
          <label>Priority: <input type="number" id="route-priority" value="${route.priority}" min="1" style="width: 80px; padding: 4px;"></label>
        </div>
        <div style="margin-bottom: 12px;">
          <strong>Activation Rules:</strong>
          <div style="margin-top: 6px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
            <div style="opacity: 0.7; font-size: 12px;">Coming soon: n-shots, time-based, folder-exists</div>
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <strong>Actions:</strong>
          <div style="margin-top: 6px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
            <div style="opacity: 0.7; font-size: 12px;">Coming soon: compress, calculate_hash, etc.</div>
          </div>
        </div>
      `;

      const saveBtn = document.createElement('button'); saveBtn.className='sr-btn sr-btn--primary'; saveBtn.textContent='Save Changes';
      saveBtn.onclick = async () => {
        const enabled = document.getElementById('route-enabled').checked;
        const priority = parseInt(document.getElementById('route-priority').value, 10);
        try {
          const params = new URLSearchParams();
          params.append('active', enabled);
          params.append('priority', priority);
          await fetch(`/api/routes/${route.id}?${params}`, { method: 'PATCH' });
          alert('Route updated successfully!');
          await refresh();
        } catch (err) {
          alert('Failed to save: ' + err.message);
        }
      };

      const deleteBtn = document.createElement('button'); deleteBtn.className='sr-btn'; deleteBtn.textContent='Delete Route'; deleteBtn.style.marginLeft='8px';
      deleteBtn.onclick = async () => {
        if (!confirm('Delete this route?')) return;
        await fetch(`/api/routes/${route.id}`, { method:'DELETE' });
        setView({ type: 'routes' });
      };

      configForm.appendChild(saveBtn);
      configForm.appendChild(deleteBtn);
      configContent.appendChild(configForm);

      // === Routed Items Tab ===
      const itemsPanel = document.createElement('div');

      // Fetch screenshots routed to this destination
      const ssResp = await api(`/screenshots?status=routed&limit=200&offset=0`);
      const matchedShots = (ssResp.items || []).filter(s => s.dest_path && s.dest_path.startsWith(route.destination.path));

      if (matchedShots.length === 0) {
        itemsPanel.innerHTML = '<div style="opacity: 0.7;">No screenshots routed yet.</div>';
      } else {
        // Layout toggle controls
        const layoutPref = localStorage.getItem('sr.detailLayout') || 'right';
        const layoutControls = document.createElement('div');
        layoutControls.style.cssText = 'margin-bottom: 12px; display: flex; gap: 8px; align-items: center;';

        const layoutLabel = document.createElement('span');
        layoutLabel.textContent = 'Detail pane:';
        layoutLabel.style.opacity = '0.8';

        const layoutToggle = document.createElement('button');
        layoutToggle.className = 'sr-btn';
        layoutToggle.textContent = layoutPref === 'right' ? 'Right ⇄ Below' : 'Below ⇅ Right';

        layoutControls.append(layoutLabel, layoutToggle);
        itemsPanel.appendChild(layoutControls);

        // Create split layout: table + detail pane
        const splitContainer = document.createElement('div');
        const updateLayout = (layout) => {
          if (layout === 'right') {
            splitContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 400px; gap: 16px;';
            layoutToggle.textContent = 'Right ⇄ Below';
          } else {
            splitContainer.style.cssText = 'display: grid; grid-template-rows: auto 1fr; gap: 16px;';
            layoutToggle.textContent = 'Below ⇅ Right';
          }
          localStorage.setItem('sr.detailLayout', layout);
        };

        layoutToggle.onclick = () => {
          const current = localStorage.getItem('sr.detailLayout') || 'right';
          updateLayout(current === 'right' ? 'below' : 'right');
        };

        updateLayout(layoutPref);

        const tableContainer = document.createElement('div');
        const detailPane = document.createElement('div');
        detailPane.className = 'sr-panel';
        detailPane.style.cssText = 'min-height: 400px;';
        detailPane.innerHTML = '<div style="opacity: 0.7; padding: 24px; text-align: center;">Select an item to view details</div>';

        const table = document.createElement('table'); table.className = 'sr-table';
        const thead = document.createElement('tr');
        thead.innerHTML = '<th>ID</th><th>File</th><th>Source</th><th>Destination</th><th>Routed At</th><th>Size</th>';
        table.append(thead);

        for (const s of matchedShots) {
          const tr = document.createElement('tr');
          const filename = (s.dest_path || s.source_path || '').split('/').pop();
          const routedAt = s.moved_at ? new Date(s.moved_at * 1000).toLocaleString() : 'N/A';
          const size = s.size ? Math.round(s.size / 1024) + ' KB' : 'N/A';

          tr.innerHTML = `
            <td style="font-family: monospace; font-size: 11px;">${s.id}</td>
            <td>${filename}</td>
            <td style="font-size: 11px; opacity: 0.7;">${(s.source_path || '').split('/').slice(-2).join('/')}</td>
            <td style="font-size: 11px; opacity: 0.7;">${(s.dest_path || '').split('/').slice(-2).join('/')}</td>
            <td>${routedAt}</td>
            <td>${size}</td>
          `;

          tr.style.cursor = 'pointer';
          tr.onclick = () => {
            // Remove previous selection
            table.querySelectorAll('tr').forEach(r => r.style.background = '');
            tr.style.background = 'rgba(255,255,255,0.08)';

            // Update detail pane
            detailPane.innerHTML = '';
            const img = document.createElement('img');
            img.src = `/api/files/${s.id}`;
            img.style.cssText = 'max-width: 100%; height: auto; display: block; border-radius: 4px; margin-bottom: 16px; cursor: pointer;';
            img.onclick = () => {
              const lightbox = document.createElement('div'); lightbox.className = 'sr-lightbox';
              const imgLarge = document.createElement('img'); imgLarge.src = `/api/files/${s.id}`;
              const closeBtn = document.createElement('div'); closeBtn.className = 'sr-lightbox-close'; closeBtn.innerHTML = '&times;';
              lightbox.appendChild(imgLarge); lightbox.appendChild(closeBtn);
              lightbox.onclick = () => lightbox.remove();
              const escHandler = (e) => { if (e.key === 'Escape') { lightbox.remove(); document.removeEventListener('keydown', escHandler); } };
              document.addEventListener('keydown', escHandler);
              document.body.appendChild(lightbox);
            };

            const info = document.createElement('div');
            info.style.cssText = 'margin-bottom: 16px; font-size: 13px;';
            info.innerHTML = `
              <div style="margin-bottom: 4px;"><strong>File:</strong> ${filename}</div>
              <div style="margin-bottom: 4px;"><strong>ID:</strong> <span style="font-family: monospace; font-size: 11px;">${s.id}</span></div>
              <div style="margin-bottom: 4px;"><strong>Source:</strong> ${s.source_path || 'N/A'}</div>
              <div style="margin-bottom: 4px;"><strong>Destination:</strong> ${s.dest_path || 'N/A'}</div>
              <div style="margin-bottom: 4px;"><strong>Routed At:</strong> ${routedAt}</div>
              <div style="margin-bottom: 4px;"><strong>Size:</strong> ${size}</div>
            `;

            const actions = document.createElement('div');
            actions.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

            const undoBtn = document.createElement('button'); undoBtn.className = 'sr-btn'; undoBtn.textContent = 'Undo';
            undoBtn.onclick = async () => {
              if (confirm(`Undo routing for ${filename}? This will move it back to inbox.`)) {
                alert('Undo functionality coming soon - need POST /api/screenshots/{id}/undo endpoint');
              }
            };

            const rerouteBtn = document.createElement('button'); rerouteBtn.className = 'sr-btn'; rerouteBtn.textContent = 'Re-route';
            rerouteBtn.onclick = async () => {
              alert('Re-route functionality coming soon - need route selection UI');
            };

            const deleteBtn = document.createElement('button'); deleteBtn.className = 'sr-btn'; deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = async () => {
              if (confirm(`Delete ${filename}? This cannot be undone.`)) {
                try {
                  await api(`/screenshots/${s.id}`, { method: 'DELETE' });
                  await refresh();
                } catch (err) {
                  alert('Failed to delete: ' + err.message);
                }
              }
            };

            actions.append(undoBtn, rerouteBtn, deleteBtn);
            detailPane.append(img, info, actions);
          };

          table.append(tr);
        }

        tableContainer.append(table);
        splitContainer.append(tableContainer, detailPane);
        itemsPanel.append(splitContainer);
      }

      itemsContent.appendChild(itemsPanel);

      panel.append(h, tabs, configContent, itemsContent);
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

    // Restore expanded state from localStorage
    try {
      const saved = localStorage.getItem('sr.expanded');
      if (saved) state.expanded = { ...state.expanded, ...JSON.parse(saved) };
    } catch {}

    const wrap = document.createElement('div');

    // Collections (with counts)
    const secC = document.createElement('div'); secC.className = 'tree-section';
    const titleC = createExpandableTitle('Collections', 'collections', false);
    const listC = document.createElement('ul'); listC.className = 'tree-children';
    if (!state.expanded.collections) listC.classList.add('collapsed');

    // Fetch counts for each collection
    const counts = {};
    try {
      for (const key of ['inbox','routed','quarantined']) {
        const resp = await api(`/screenshots?status=${key}&limit=1&offset=0`);
        counts[key] = resp.items?.length || 0; // This is a rough count, ideally API should return total
      }
    } catch {}

    for (const key of ['inbox','routed','quarantined']) {
      const li = document.createElement('li');
      const a = document.createElement('div'); a.className = 'tree-item';
      const label = key.charAt(0).toUpperCase()+key.slice(1);
      const count = counts[key] !== undefined ? ` (${counts[key]}+)` : '';
      a.textContent = label + count;
      a.onclick = () => setView({ type: 'collection', key });
      if (state.view.type==='collection' && state.view.key===key) a.classList.add('active');
      li.append(a); listC.append(li);
    }
    secC.append(titleC, listC);

    // Sources
    const secS = document.createElement('div'); secS.className = 'tree-section';
    const titleS = createExpandableTitle(`Sources (${state.sources.length})`, 'sources', state.view.type === 'sources');
    // Allow clicking on label to open sources view
    titleS.querySelector('span:last-child').onclick = (e) => { e.stopPropagation(); setView({ type: 'sources' }); };
    const listS = document.createElement('ul'); listS.className = 'tree-children';
    if (!state.expanded.sources) listS.classList.add('collapsed');
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
    const titleD = createExpandableTitle('Destinations', 'destinations', state.view.type === 'destinations');
    titleD.querySelector('span:last-child').onclick = (e) => { e.stopPropagation(); setView({ type: 'destinations' }); };
    const listD = document.createElement('ul'); listD.className = 'tree-children';
    if (!state.expanded.destinations) listD.classList.add('collapsed');
    const dests = await api('/destinations');
    for (const d of dests.items || []) {
      const li = document.createElement('li');
      const a = document.createElement('div'); a.className = 'tree-item';

      // Show icon + name or just path
      let displayText = '';
      if (d.icon) displayText += d.icon + ' ';
      if (d.name) {
        displayText += d.name;
        const pathHint = document.createElement('span');
        pathHint.style.opacity = '0.5';
        pathHint.style.fontSize = '11px';
        pathHint.style.marginLeft = '6px';
        pathHint.textContent = d.path.split('/').pop() || d.path;
        a.textContent = displayText;
        a.appendChild(pathHint);
      } else {
        displayText += d.path;
        a.textContent = displayText;
      }

      a.onclick = () => setView({ type: 'destination', key: d.path });
      if (state.view.type==='destination' && state.view.key===d.path) a.classList.add('active');
      li.append(a); listD.append(li);
    }
    secD.append(titleD, listD);

    // Routes (expandable with route list)
    const secR = document.createElement('div'); secR.className = 'tree-section';
    const routesResp = await api('/routes');
    const allRoutes = routesResp.items || [];
    const titleR = createExpandableTitle(`Routes (${allRoutes.length})`, 'routes', state.view.type === 'routes');
    titleR.querySelector('span:last-child').onclick = (e) => { e.stopPropagation(); setView({ type: 'routes' }); };
    const listR = document.createElement('ul'); listR.className = 'tree-children';
    if (!state.expanded.routes) listR.classList.add('collapsed');

    for (const route of allRoutes) {
      const li = document.createElement('li');
      const a = document.createElement('div'); a.className = 'tree-item';
      const routeLabel = `#${route.priority}: ${route.source_path.split('/').pop()} → ${route.destination.name || route.destination.path.split('/').pop()}`;
      a.textContent = routeLabel;
      a.onclick = () => setView({ type: 'route', key: route.id });
      if (state.view.type === 'route' && state.view.key === route.id) a.classList.add('active');
      li.append(a); listR.append(li);
    }
    secR.append(titleR, listR);

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
