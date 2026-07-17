  // ---------- Inventory Update (Employee tab) ----------
  // Master reference catalog — organized by category. This list only exists
  // to power the dropdown below; no quantity/amount is stored here. Every
  // submission is a fresh entry (quantity + note typed at submit time).
  const INVENTORY_CATALOG = {
    'Lab Consumables & Medical Supplies': [
      'Nipro 3ml syringe (box)',
      'Nipro 5ml syringe (box)',
      'Bandaid (box)',
      'Cotton roll',
      'Nitrile gloves (box)',
      'Tube container',
      'Sugar strips',
      'Lancet needle',
      'Red tube — Plain (Serum)',
      'Gold/Yellow tube — SST (Serum Separator Gel)',
      'Lavender/Purple tube — EDTA',
      'Light Blue tube — Sodium Citrate',
      'Black tube — Sodium Citrate (ESR)',
      'Green tube — Heparin',
      'Grey tube — Sodium Fluoride/Potassium Oxalate (Glucose)',
      'Pink tube — EDTA (Blood Bank)',
      'Royal Blue tube — Trace Element',
      'Blood culture bottles',
      'Dettol (250ml)'
    ],
    'Medical Equipment & Machines': [
      'Weight machine',
      'Height machine',
      'BP machine',
      'Centrifuge machine',
      'Glucometer machine',
      'Blood collection cupboard'
    ],
    'Office & Stationery': [
      'Keyboard and mouse',
      'Note pad',
      'Eraser',
      'Scissors',
      'Steel scale',
      'Sharpener',
      'File',
      'Pen stand',
      'Stapler',
      'Stapler pin box',
      'Pen',
      'Marker',
      'Printer',
      'Visiting card',
      'System table',
      'Screen',
      'Company phone repair charges'
    ],
    'Facility, Housekeeping & Maintenance': [
      'Broom stick',
      'Dust pan',
      'Room freshener',
      'Kitchen cloth (microfiber)',
      'Bucket (yellow)',
      'Bucket (red)',
      'Bucket (blue)',
      'Garbage bag',
      'Mop stick',
      'Water bottle',
      'Water can',
      'Door mat',
      'PVC door mat',
      'Floor mat',
      'Floor mat glue',
      'AC',
      'AC installation',
      'AC hose pipe',
      'BLDC fan',
      'Flex board',
      'Shutter lock',
      'False ceiling LED',
      'False ceiling',
      'Electric requirements',
      'Aluminium door',
      'Foam wall sticker',
      'Door closer',
      'Outdoor live plant',
      'Sofa — one seater',
      'Sofa — two seater'
    ]
  };

  function invPopulateItemDropdown(){
    const sel = document.getElementById('invItemSelect');
    if (!sel || sel.dataset.populated === 'true') return;
    sel.innerHTML = '<option value="">Select an item…</option>' +
      Object.keys(INVENTORY_CATALOG).map(cat => {
        const opts = INVENTORY_CATALOG[cat].map(item =>
          `<option value="${escapeHtml(item)}" data-category="${escapeHtml(cat)}">${escapeHtml(item)}</option>`
        ).join('');
        return `<optgroup label="${escapeHtml(cat)}">${opts}</optgroup>`;
      }).join('');
    sel.dataset.populated = 'true';
  }

  async function loadInventoryList(){
    const tbody = document.getElementById('invStockTableBody');
    if (!tbody) return;
    const { data, error } = await sb
      .from('inventory')
      .select('*')
      .order('category', { ascending: true })
      .order('item_name', { ascending: true });

    if (error || !data || data.length === 0){
      tbody.innerHTML = '<tr><td colspan="4" class="empty">No inventory entries yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(row => `
      <tr>
        <td>${escapeHtml(row.item_name)}</td>
        <td class="cust-meta">${escapeHtml(row.category || '—')}</td>
        <td class="cust-meta">${row.quantity === null || row.quantity === undefined ? '—' : escapeHtml(String(row.quantity))}</td>
        <td class="cust-meta">${escapeHtml(row.note || '—')}</td>
      </tr>
    `).join('');
  }

  function invInit(){
    invPopulateItemDropdown();

    const form = document.getElementById('invUpdateForm');
    if (!form || form.dataset.wired === 'true') return;
    form.dataset.wired = 'true';

    document.getElementById('invSubmitBtn').addEventListener('click', async () => {
      const sel = document.getElementById('invItemSelect');
      const itemName = sel.value;
      const selectedOption = sel.options[sel.selectedIndex];
      const category = selectedOption ? selectedOption.dataset.category : '';
      const qtyRaw = document.getElementById('invQtyInput').value.trim();
      const note = document.getElementById('invNoteInput').value.trim();
      const msgEl = document.getElementById('invMsg');

      if (!itemName){ showMsg(msgEl, 'Please select an item.', 'err'); return; }

      const quantity = qtyRaw === '' ? null : Number(qtyRaw);
      if (qtyRaw !== '' && Number.isNaN(quantity)){ showMsg(msgEl, 'Quantity must be a number.', 'err'); return; }

      const btn = document.getElementById('invSubmitBtn');
      btn.disabled = true;

      const { error } = await sb.from('inventory').upsert({
        item_name: itemName,
        category: category,
        quantity: quantity,
        note: note || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'item_name' });

      btn.disabled = false;

      if (error){ showMsg(msgEl, error.message, 'err'); return; }

      showMsg(msgEl, 'Inventory updated.', 'ok');
      sel.value = '';
      document.getElementById('invQtyInput').value = '';
      document.getElementById('invNoteInput').value = '';
      await loadInventoryList();
    });
  }

  invInit();
