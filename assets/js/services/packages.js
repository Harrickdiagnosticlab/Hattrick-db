  // ---------- Packages ----------
  let pkgAllServices = [];
  let pkgSelectedTestIds = new Set();

  async function pkgLoadServiceSelector(){
    const { data } = await sb.from('services').select('id, name, price').eq('active', true).order('name');
    pkgAllServices = data || [];
    pkgRenderServiceSelector(pkgAllServices);
  }

  function pkgRenderServiceSelector(list){
    const container = document.getElementById('pkgTestSelector');
    if (!list || list.length === 0){
      container.innerHTML = '<p class="empty">No services found.</p>';
      return;
    }
    container.innerHTML = list.map(s => `
      <div class="inv-service-item">
        <input type="checkbox" id="pkg-test-${s.id}" value="${s.id}" ${pkgSelectedTestIds.has(s.id) ? 'checked' : ''} />
        <label for="pkg-test-${s.id}" style="flex-grow:1; margin-bottom:0; font-weight:400; cursor:pointer;">${escapeHtml(s.name)}</label>
        <span class="inv-service-price">₹${parseFloat(s.price).toFixed(2)}</span>
      </div>`).join('');

    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = parseInt(cb.value, 10);
        if (cb.checked) pkgSelectedTestIds.add(id); else pkgSelectedTestIds.delete(id);
        pkgUpdateMrp();
      });
    });
  }

  function pkgUpdateMrp(){
    const total = pkgAllServices
      .filter(s => pkgSelectedTestIds.has(s.id))
      .reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    document.getElementById('pkgMrpDisplay').textContent = acctFmt(total);
    return total;
  }

  document.getElementById('pkgTestSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    pkgRenderServiceSelector(term ? pkgAllServices.filter(s => s.name.toLowerCase().includes(term)) : pkgAllServices);
  });

  document.getElementById('createPkgBtn').addEventListener('click', async () => {
    const name = document.getElementById('pkgName').value.trim();
    const rate = parseFloat(document.getElementById('pkgRate').value);
    const mrp = pkgUpdateMrp();
    const testIds = Array.from(pkgSelectedTestIds);

    if (!name){ showMsg(document.getElementById('pkgMsg'), 'Enter a package name.', 'err'); return; }
    if (testIds.length === 0){ showMsg(document.getElementById('pkgMsg'), 'Select at least one test.', 'err'); return; }
    if (isNaN(rate) || rate <= 0){ showMsg(document.getElementById('pkgMsg'), 'Enter a valid published rate.', 'err'); return; }

    const { error } = await sb.from('packages').insert({ name, test_ids: testIds, mrp, rate });
    if (error){ showMsg(document.getElementById('pkgMsg'), error.message, 'err'); return; }

    showMsg(document.getElementById('pkgMsg'), 'Package published.', 'ok');
    document.getElementById('pkgName').value = '';
    document.getElementById('pkgRate').value = '';
    pkgSelectedTestIds = new Set();
    pkgRenderServiceSelector(pkgAllServices);
    pkgUpdateMrp();
    await pkgLoadList();
    await loadAdminStats();
  });

  async function pkgLoadList(){
    const showArchived = document.getElementById('pkgShowArchived').checked;
    let query = sb.from('packages').select('*').order('created_at', { ascending: false });
    query = showArchived ? query : query.eq('active', true);
    const { data, error } = await query;

    const { data: allServicesForLookup } = await sb.from('services').select('id, name');
    const serviceNameById = {};
    (allServicesForLookup || []).forEach(s => { serviceNameById[s.id] = s.name; });

    const body = document.getElementById('pkgTableBody');
    if (error || !data || data.length === 0){
      body.innerHTML = '<tr><td colspan="6" class="empty">No packages yet.</td></tr>';
      return;
    }

    body.innerHTML = data.map((p, idx) => {
      const savings = (parseFloat(p.mrp) || 0) - (parseFloat(p.rate) || 0);
      const rowId = 'pkg-detail-' + idx;
      const testNames = (p.test_ids || []).map(id => serviceNameById[id] || `#${id}`).join(', ') || '—';
      return `
      <tr>
        <td>
          ${escapeHtml(p.name)} ${p.active === false ? '<span class="cust-meta" style="color:var(--red);">(archived)</span>' : ''}
        </td>
        <td class="cust-meta">
          <button class="pkg-expand-toggle" data-target="${rowId}" style="margin-left:0;">▼ ${(p.test_ids || []).length} tests</button>
        </td>
        <td class="cust-meta">${acctFmt(p.mrp)}</td>
        <td style="color:var(--amber); font-weight:600;">${acctFmt(p.rate)}</td>
        <td style="color:var(--moss);">${acctFmt(savings)}</td>
        <td style="text-align:right;">
          <button class="emp-del pkg-del" data-id="${p.id}" data-active="${p.active}" style="color:${p.active === false ? 'var(--moss)' : 'var(--red)'};">${p.active === false ? 'Restore' : 'Archive'}</button>
        </td>
      </tr>
      <tr id="${rowId}" style="display:none;">
        <td colspan="6" style="background:var(--amber-soft); font-size:13px; color:var(--ink-dim);">${escapeHtml(testNames)}</td>
      </tr>`;
    }).join('');

    body.querySelectorAll('.pkg-expand-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = document.getElementById(btn.dataset.target);
        const show = row.style.display === 'none';
        row.style.display = show ? 'table-row' : 'none';
        btn.textContent = btn.textContent.replace(/^[▼▲]/, show ? '▲' : '▼');
      });
    });

    body.querySelectorAll('.pkg-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const isActive = btn.dataset.active === 'true';
        await sb.from('packages').update({ active: !isActive }).eq('id', btn.dataset.id);
        await pkgLoadList();
        await loadAdminStats();
      });
    });
  }
  document.getElementById('pkgShowArchived').addEventListener('change', pkgLoadList);

