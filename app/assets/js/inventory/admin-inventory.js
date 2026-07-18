// ---------- Admin: Inventory management (add/remove items, low-stock alerts) ----------
  async function loadAdminInventory(){
    const { data, error } = await sb.from('inventory').select('*').order('category').order('item_name');
    if (error || !data) return;

    // Low-stock: alerts disabled for this item are skipped entirely.
    // Otherwise: no count entered yet, or at/below its threshold.
    const lowStock = data.filter(row => {
      if (row.alert_enabled === false) return false;
      const threshold = row.low_stock_threshold === null || row.low_stock_threshold === undefined ? 5 : row.low_stock_threshold;
      return row.quantity === null || row.quantity === undefined || Number(row.quantity) <= Number(threshold);
    });

    // Update the dashboard stat card too.
    const statEl = document.getElementById('statLowStock');
    if (statEl) statEl.textContent = lowStock.length;

    renderLowStockAlerts(lowStock);
    renderAdminInventoryTable(data);
    populateAdminInvCategoryOptions(data);
  }

  function renderLowStockAlerts(lowStock){
    const el = document.getElementById('adminInvLowStock');
    if (!el) return;

    if (lowStock.length === 0){
      el.innerHTML = '<div class="empty">Nothing running low — all stocked items are above their threshold.</div>';
      return;
    }

    el.innerHTML = lowStock.map(row => {
      const qtyLabel = (row.quantity === null || row.quantity === undefined) ? 'Not counted yet' : row.quantity;
      return `
      <div class="inv-alert-row">
        <div class="inv-alert-item">${escapeHtml(row.item_name)}</div>
        <div class="cust-meta">${escapeHtml(row.category || '—')}</div>
        <div class="inv-alert-qty">${escapeHtml(String(qtyLabel))}</div>
      </div>`;
    }).join('');
  }

  function renderAdminInventoryTable(rows){
    const tbody = document.getElementById('adminInvTableBody');
    if (!tbody) return;

    if (!rows || rows.length === 0){
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No inventory items yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(row => `
      <tr>
        <td>${escapeHtml(row.item_name)}</td>
        <td class="cust-meta">${escapeHtml(row.category || '—')}</td>
        <td class="cust-meta">${row.quantity === null || row.quantity === undefined ? '—' : escapeHtml(String(row.quantity))}</td>
        <td class="cust-meta">
          <input type="number" class="inv-threshold-input" data-id="${escapeHtml(row.id)}"
            value="${row.low_stock_threshold === null || row.low_stock_threshold === undefined ? '' : escapeHtml(String(row.low_stock_threshold))}"
            ${row.alert_enabled === false ? 'disabled' : ''} />
        </td>
        <td class="cust-meta" style="text-align:center;">
          <input type="checkbox" class="inv-alert-toggle" data-id="${escapeHtml(row.id)}" ${row.alert_enabled === false ? '' : 'checked'} title="Alert enabled" />
        </td>
        <td style="text-align:right;">
          <button class="emp-del inv-remove-btn" data-id="${escapeHtml(row.id)}" data-name="${escapeHtml(row.item_name)}" style="color:var(--red);">Remove</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.inv-threshold-input').forEach(input => {
      input.addEventListener('change', async () => {
        const val = input.value.trim();
        await sb.from('inventory').update({
          low_stock_threshold: val === '' ? null : Number(val)
        }).eq('id', input.dataset.id);
        await loadAdminInventory();
      });
    });

    tbody.querySelectorAll('.inv-alert-toggle').forEach(cb => {
      cb.addEventListener('change', async () => {
        await sb.from('inventory').update({
          alert_enabled: cb.checked
        }).eq('id', cb.dataset.id);
        await loadAdminInventory();
      });
    });

    tbody.querySelectorAll('.inv-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showConfirm(
          `Remove "${btn.dataset.name}" from inventory? This cannot be undone.`,
          async () => {
            await sb.from('inventory').delete().eq('id', btn.dataset.id);
            await loadAdminInventory();
          },
          'Remove'
        );
      });
    });
  }

  function populateAdminInvCategoryOptions(rows){
    const sel = document.getElementById('adminInvNewCategory');
    if (!sel || sel.dataset.populated === 'true') return;
    const cats = invSortedCategories([...new Set(rows.map(r => r.category).filter(Boolean))]);
    sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('') +
      '<option value="__new__">+ New category…</option>';
    sel.dataset.populated = 'true';
  }

  function adminInventoryInit(){
    const form = document.getElementById('adminInvAddForm');
    if (!form || form.dataset.wired === 'true') return;
    form.dataset.wired = 'true';

    document.getElementById('adminInvNewCategory').addEventListener('change', (e) => {
      const customWrap = document.getElementById('adminInvNewCategoryCustomWrap');
      customWrap.style.display = e.target.value === '__new__' ? 'block' : 'none';
    });

    document.getElementById('adminInvAddBtn').addEventListener('click', async () => {
      const msgEl = document.getElementById('adminInvAddMsg');
      const sel = document.getElementById('adminInvNewCategory');
      let category = sel.value;
      if (category === '__new__'){
        category = document.getElementById('adminInvNewCategoryCustom').value.trim();
      }
      const itemName = document.getElementById('adminInvNewItemName').value.trim();
      const threshold = document.getElementById('adminInvNewThreshold').value.trim();

      if (!category || !itemName){
        showMsg(msgEl, 'Category and item name are required.', 'err');
        return;
      }

      const btn = document.getElementById('adminInvAddBtn');
      btn.disabled = true;
      const { error } = await sb.from('inventory').insert({
        category,
        item_name: itemName,
        quantity: null,
        low_stock_threshold: threshold === '' ? 5 : Number(threshold)
      });
      btn.disabled = false;

      if (error){
        showMsg(msgEl, error.message.includes('duplicate') ? 'That item already exists.' : error.message, 'err');
        return;
      }

      showMsg(msgEl, 'Item added.', 'ok');
      document.getElementById('adminInvNewItemName').value = '';
      document.getElementById('adminInvNewThreshold').value = '';
      document.getElementById('adminInvNewCategoryCustom').value = '';
      document.getElementById('adminInvNewCategoryCustomWrap').style.display = 'none';
      await loadAdminInventory();
    });
  }

  adminInventoryInit();

  document.getElementById('statInventoryCard').addEventListener('click', () => {
    document.querySelector('#adminWrap .tab-btn[data-tab="admin-inventory"]').click();
  });
