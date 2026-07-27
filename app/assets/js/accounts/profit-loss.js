// ---------- Admin: Profit & Loss — Excel-style grid (months as columns) ----------
  const PNL_MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const PNL_COGS_CATEGORIES = ['SRM Settlement', 'Home Collection Charge'];
  const PNL_CATEGORY_ORDER = ['Rent','Electricity (EB Bill)','Salary','Recharge','Water Can','Interest on EMI',
    'SRM Settlement','Home Collection Charge','Supplies','Maintenance','Misc','Other'];

  function pnlFormatMonth(key){
    const [y, mo] = key.split('-');
    return `${PNL_MONTH_NAMES_SHORT[parseInt(mo, 10) - 1]}-${y.slice(2)}`;
  }

  function pnlSortCategories(cats){
    const known = PNL_CATEGORY_ORDER.filter(c => cats.includes(c));
    const unknown = cats.filter(c => !PNL_CATEGORY_ORDER.includes(c)).sort();
    return [...known, ...unknown];
  }

  async function pnlLoad(){
    const thead = document.getElementById('pnlTableHead');
    const tbody = document.getElementById('pnlTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td class="empty">Loading…</td></tr>';

    const [{ data: invRows }, { data: expRows }] = await Promise.all([
      sb.from('ledger').select('invoiceDate, grandTotal, balanceDue').limit(5000),
      sb.from('expenses').select('date, category, amount').limit(5000)
    ]);

    const months = {};
    const monthKey = (dateStr) => dateStr ? String(dateStr).slice(0, 7) : null;
    const ensureMonth = (key) => months[key] || (months[key] = {
      sales: 0, outstanding: 0, cogsByCategory: {}, expByCategory: {}
    });

    (invRows || []).forEach(r => {
      const key = monthKey(r.invoiceDate);
      if (!key) return;
      const m = ensureMonth(key);
      m.sales += parseFloat(r.grandTotal) || 0;
      m.outstanding += parseFloat(r.balanceDue) || 0;
    });

    (expRows || []).forEach(r => {
      const key = monthKey(r.date);
      if (!key) return;
      const m = ensureMonth(key);
      const amt = parseFloat(r.amount) || 0;
      const cat = (r.category || 'Misc').trim();
      const bucket = PNL_COGS_CATEGORIES.includes(cat) ? m.cogsByCategory : m.expByCategory;
      bucket[cat] = (bucket[cat] || 0) + amt;
    });

    const monthKeys = Object.keys(months).sort(); // oldest → newest, left to right, like the sheet

    if (monthKeys.length === 0){
      thead.innerHTML = '<tr><th>Income</th></tr>';
      tbody.innerHTML = '<tr><td class="empty">No data yet — add some invoices or expenses first.</td></tr>';
      return;
    }

    // Only show category rows that actually have data in at least one shown month.
    const allCogsCats = new Set();
    const allExpCats = new Set();
    monthKeys.forEach(k => {
      Object.keys(months[k].cogsByCategory).forEach(c => allCogsCats.add(c));
      Object.keys(months[k].expByCategory).forEach(c => allExpCats.add(c));
    });
    const cogsCats = pnlSortCategories([...allCogsCats]);
    const expCats = pnlSortCategories([...allExpCats]);

    // ---------- Header ----------
    thead.innerHTML = `<tr><th>Income</th>${monthKeys.map(k => `<th>${pnlFormatMonth(k)}</th>`).join('')}</tr>`;

    // ---------- Body ----------
    const rupee = (n) => n ? acctFmt(n) : '';
    const cell = (key, fn) => monthKeys.map(k => `<td>${rupee(fn(months[k]))}</td>`).join('');

    const rows = [];

    rows.push(`<tr class="pnl-row-highlight"><td>Sales</td>${cell(null, m => m.sales)}</tr>`);

    rows.push(`<tr class="pnl-row-highlight"><td>Cost of Goods Sold</td>${cell(null, m => Object.values(m.cogsByCategory).reduce((a,b)=>a+b,0))}</tr>`);
    cogsCats.forEach(cat => {
      rows.push(`<tr class="pnl-row-sub"><td>${escapeHtml(cat)}</td>${cell(null, m => m.cogsByCategory[cat] || 0)}</tr>`);
    });

    rows.push(`<tr class="pnl-row-highlight pnl-row-bold"><td>Gross Profit (Sales − COGS)</td>${cell(null, m => {
      const cogsTotal = Object.values(m.cogsByCategory).reduce((a,b)=>a+b,0);
      return m.sales - cogsTotal;
    })}</tr>`);

    rows.push(`<tr class="pnl-row-section"><td>Expenses</td>${monthKeys.map(() => '<td></td>').join('')}</tr>`);
    expCats.forEach(cat => {
      rows.push(`<tr class="pnl-row-sub"><td>${escapeHtml(cat)}</td>${cell(null, m => m.expByCategory[cat] || 0)}</tr>`);
    });

    rows.push(`<tr class="pnl-row-danger pnl-row-bold"><td>Total Expenses</td>${cell(null, m => Object.values(m.expByCategory).reduce((a,b)=>a+b,0))}</tr>`);

    rows.push(`<tr class="pnl-row-net pnl-row-bold"><td>Net Profit</td>${monthKeys.map(k => {
      const m = months[k];
      const cogsTotal = Object.values(m.cogsByCategory).reduce((a,b)=>a+b,0);
      const expTotal = Object.values(m.expByCategory).reduce((a,b)=>a+b,0);
      const net = m.sales - cogsTotal - expTotal;
      return `<td style="color:${net >= 0 ? 'var(--moss)' : 'var(--red)'}; font-weight:700;">${acctFmt(net)}</td>`;
    }).join('')}</tr>`);

    rows.push(`<tr><td>Outstanding</td>${cell(null, m => m.outstanding)}</tr>`);

    tbody.innerHTML = rows.join('');
  }
