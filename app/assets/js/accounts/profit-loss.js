// ---------- Admin: Profit & Loss (auto-grouped by every month present in the data) ----------
  const PNL_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const PNL_COGS_CATEGORIES = ['SRM Settlement', 'Home Collection Charge'];

  function pnlFormatMonth(key){
    const [y, mo] = key.split('-');
    return `${PNL_MONTH_NAMES[parseInt(mo, 10) - 1]} ${y}`;
  }

  function pnlSlug(str){
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async function pnlLoad(){
    const tbody = document.getElementById('pnlTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="empty">Loading…</td></tr>';

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

    const keys = Object.keys(months).sort().reverse();

    if (keys.length === 0){
      tbody.innerHTML = '<tr><td colspan="8" class="empty">No data yet — add some invoices or expenses first.</td></tr>';
      return;
    }

    tbody.innerHTML = keys.map(key => {
      const m = months[key];
      const cogsTotal = Object.values(m.cogsByCategory).reduce((a, b) => a + b, 0);
      const expTotal = Object.values(m.expByCategory).reduce((a, b) => a + b, 0);
      const grossProfit = m.sales - cogsTotal;
      const netProfit = grossProfit - expTotal;
      const rowId = 'pnl-detail-' + pnlSlug(key);

      const cogsRows = Object.keys(m.cogsByCategory).sort().map(cat =>
        `<div class="pnl-line-item"><span>${escapeHtml(cat)}</span><span>${acctFmt(m.cogsByCategory[cat])}</span></div>`
      ).join('') || '<div class="pnl-line-item pnl-line-empty"><span>None this month</span><span></span></div>';

      const expRowsHtml = Object.keys(m.expByCategory).sort().map(cat =>
        `<div class="pnl-line-item"><span>${escapeHtml(cat)}</span><span>${acctFmt(m.expByCategory[cat])}</span></div>`
      ).join('') || '<div class="pnl-line-item pnl-line-empty"><span>None this month</span><span></span></div>';

      const mainRow = `
        <tr class="pnl-main-row" data-target="${rowId}">
          <td style="font-weight:600;">${pnlFormatMonth(key)} <button class="pnl-expand-btn" type="button">▼</button></td>
          <td>${acctFmt(m.sales)}</td>
          <td>${acctFmt(cogsTotal)}</td>
          <td>${acctFmt(grossProfit)}</td>
          <td>${acctFmt(expTotal)}</td>
          <td style="font-weight:700; color:${netProfit >= 0 ? 'var(--moss)' : 'var(--red)'};">${acctFmt(netProfit)}</td>
          <td style="color:var(--red);">${acctFmt(m.outstanding)}</td>
          <td></td>
        </tr>`;

      const detailRow = `
        <tr id="${rowId}" class="pnl-detail-row" style="display:none;">
          <td colspan="8">
            <div class="pnl-detail-grid">
              <div class="pnl-detail-col">
                <div class="pnl-detail-heading">Cost of Goods Sold</div>
                ${cogsRows}
                <div class="pnl-line-item pnl-line-total"><span>Total COGS</span><span>${acctFmt(cogsTotal)}</span></div>
              </div>
              <div class="pnl-detail-col">
                <div class="pnl-detail-heading">Expenses</div>
                ${expRowsHtml}
                <div class="pnl-line-item pnl-line-total"><span>Total Expenses</span><span>${acctFmt(expTotal)}</span></div>
              </div>
            </div>
          </td>
        </tr>`;

      return mainRow + detailRow;
    }).join('');

    tbody.querySelectorAll('.pnl-main-row').forEach(row => {
      row.addEventListener('click', () => {
        const detail = document.getElementById(row.dataset.target);
        const btn = row.querySelector('.pnl-expand-btn');
        const show = detail.style.display === 'none';
        detail.style.display = show ? 'table-row' : 'none';
        btn.textContent = show ? '▲' : '▼';
      });
    });
  }
