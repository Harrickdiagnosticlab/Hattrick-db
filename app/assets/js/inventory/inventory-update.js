// ---------- Inventory Update (Employee tab) ----------
  // Items/categories now live entirely in Supabase (the `inventory` table).
  // Admin can add/remove items from the Admin > Inventory tab; whatever
  // exists there is what employees see here — no code changes needed.
  const INV_CATEGORY_ORDER = [
    'Lab Consumables & Medical Supplies',
    'Medical Equipment & Machines',
    'Office & Stationery',
    'Facility, Housekeeping & Maintenance'
  ];

  function invSlug(str){
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function invSortedCategories(categories){
    const known = INV_CATEGORY_ORDER.filter(c => categories.includes(c));
    const unknown = categories.filter(c => !INV_CATEGORY_ORDER.includes(c)).sort();
    return [...known, ...unknown];
  }

  function invGroupByCategory(rows){
    const grouped = {};
    rows.forEach(row => {
      const cat = row.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(row);
    });
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => a.item_name.localeCompare(b.item_name));
    });
    return grouped;
  }

  function invRenderCards(containerId, rows, { showUpdateBtn }){
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!rows || rows.length === 0){
      container.innerHTML = '<div class="empty">No inventory items yet.</div>';
      return;
    }

    const grouped = invGroupByCategory(rows);
    const cats = invSortedCategories(Object.keys(grouped));

    container.innerHTML = cats.map(cat => {
      const items = grouped[cat];
      const itemRows = items.map(row => {
        const itemSlug = invSlug(row.item_name);
        const qtyVal = (row.quantity === null || row.quantity === undefined) ? '' : row.quantity;
        return `
        <div class="inv-item-row">
          <div class="inv-item-name">${escapeHtml(row.item_name)}</div>
          <button type="button" class="inv-step-btn inv-minus" data-item="${escapeHtml(row.item_name)}">−</button>
          <input type="number" class="inv-qty-input" id="${containerId}-qty-${itemSlug}" value="${qtyVal}"
            data-item="${escapeHtml(row.item_name)}" data-category="${escapeHtml(cat)}" placeholder="0" />
          <button type="button" class="inv-step-btn inv-plus" data-item="${escapeHtml(row.item_name)}">+</button>
        </div>`;
      }).join('');

      const updateBtn = showUpdateBtn
        ? `<button type="button" class="btn moss btn-sm inv-update-btn" data-category="${escapeHtml(cat)}" data-container="${containerId}">Update</button>`
        : '';

      return `
      <div class="panel inv-category-card">
        <div class="panel-header-row">
          <div class="panel-title" style="margin-bottom:0;">${escapeHtml(cat)}</div>
          ${updateBtn}
        </div>
        <div class="inv-item-rows">${itemRows}</div>
      </div>`;
    }).join('');

    container.querySelectorAll('.inv-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        input.value = (parseInt(input.value, 10) || 0) + 1;
      });
    });
    container.querySelectorAll('.inv-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.nextElementSibling;
        input.value = Math.max(0, (parseInt(input.value, 10) || 0) - 1);
      });
    });

    if (showUpdateBtn){
      container.querySelectorAll('.inv-update-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cat = btn.dataset.category;
          const msgEl = document.getElementById('invMsg');
          const inputs = container.querySelectorAll(`.inv-qty-input[data-category="${CSS.escape(cat)}"]`);

          const updates = Array.from(inputs).map(inp => ({
            item_name: inp.dataset.item,
            category: cat,
            quantity: inp.value === '' ? null : Number(inp.value),
            updated_at: new Date().toISOString()
          }));

          btn.disabled = true;
          const { error } = await sb.from('inventory').upsert(updates, { onConflict: 'item_name' });
          btn.disabled = false;

          if (error){ showMsg(msgEl, error.message, 'err'); return; }
          showMsg(msgEl, `${cat} updated.`, 'ok');
        });
      });
    }
  }

  async function loadInventoryList(){
    const { data, error } = await sb.from('inventory').select('*');
    if (error || !data) return;
    invRenderCards('invCategoryCards', data, { showUpdateBtn: true });
  }
