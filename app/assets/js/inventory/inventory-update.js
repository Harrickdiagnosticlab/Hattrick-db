  // ---------- Inventory Update (Employee tab) ----------
  // Master reference catalog — organized by category. Only item names are
  // defined here; quantities always come from (and are saved to) Supabase.
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

  function invSlug(str){
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function invBuildCards(){
    const container = document.getElementById('invCategoryCards');
    if (!container) return;

    container.innerHTML = Object.keys(INVENTORY_CATALOG).map(cat => {
      const catSlug = invSlug(cat);
      const rows = INVENTORY_CATALOG[cat].map(item => {
        const itemSlug = invSlug(item);
        return `
        <div class="inv-item-row">
          <div class="inv-item-name">${escapeHtml(item)}</div>
          <button type="button" class="inv-step-btn inv-minus" data-item="${escapeHtml(item)}">−</button>
          <input type="number" class="inv-qty-input" id="inv-qty-${itemSlug}" data-item="${escapeHtml(item)}" data-category="${escapeHtml(cat)}" placeholder="0" />
          <button type="button" class="inv-step-btn inv-plus" data-item="${escapeHtml(item)}">+</button>
        </div>`;
      }).join('');

      return `
      <div class="panel inv-category-card">
        <div class="panel-header-row">
          <div class="panel-title" style="margin-bottom:0;">${escapeHtml(cat)}</div>
          <button type="button" class="btn moss btn-sm inv-update-btn" data-category="${escapeHtml(cat)}">Update</button>
        </div>
        <div class="inv-item-rows" data-category-rows="${catSlug}">${rows}</div>
      </div>`;
    }).join('');

    // +/- steppers
    container.querySelectorAll('.inv-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const current = parseInt(input.value, 10) || 0;
        input.value = current + 1;
      });
    });
    container.querySelectorAll('.inv-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.nextElementSibling;
        const current = parseInt(input.value, 10) || 0;
        input.value = Math.max(0, current - 1);
      });
    });

    // Per-category "Update" button — saves every item in that card to Supabase
    container.querySelectorAll('.inv-update-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cat = btn.dataset.category;
        const msgEl = document.getElementById('invMsg');
        const inputs = container.querySelectorAll(`.inv-qty-input[data-category="${CSS.escape(cat)}"]`);

        const rows = Array.from(inputs).map(inp => ({
          item_name: inp.dataset.item,
          category: cat,
          quantity: inp.value === '' ? null : Number(inp.value),
          updated_at: new Date().toISOString()
        }));

        btn.disabled = true;
        const { error } = await sb.from('inventory').upsert(rows, { onConflict: 'item_name' });
        btn.disabled = false;

        if (error){ showMsg(msgEl, error.message, 'err'); return; }
        showMsg(msgEl, `${cat} updated.`, 'ok');
      });
    });
  }

  async function loadInventoryList(){
    invBuildCards();

    const { data, error } = await sb.from('inventory').select('item_name, quantity');
    if (error || !data) return;

    data.forEach(row => {
      const input = document.getElementById('inv-qty-' + invSlug(row.item_name));
      if (input && row.quantity !== null && row.quantity !== undefined){
        input.value = row.quantity;
      }
    });
  }
