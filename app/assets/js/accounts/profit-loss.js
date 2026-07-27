  // ---------- Admin: Profit & Loss (auto-grouped by every month present in the data) ----------
  const PNL_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function pnlFormatMonth(key){
    const [y, mo] = key.split('-');
    return `${PNL_MONTH_NAMES[parseInt(mo, 10) - 1]} ${y}`;
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
    const ensureMonth = (key) => months[key] || (months[key] = { sales: 0, outstanding: 0, cogs: 0, expenses: 0 });

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
      if ((r.category || '').trim() === 'SRM Settlement'){
        m.cogs += amt;
      } else {
        m.expenses += amt;
      }
    });

    const keys = Object.keys(months).sort().reverse();

    if (keys.length === 0){
      tbody.innerHTML = '<tr><td colspan="8" class="empty">No data yet — add some invoices or expenses first.</td></tr>';
      return;
    }

    tbody.innerHTML = keys.map(key => {
      const m = months[key];
      const grossProfit = m.sales - m.cogs;
      const netProfit = grossProfit - m.expenses;
      return `
        <tr>
          <td style="font-weight:600;">${pnlFormatMonth(key)}</td>
          <td>${acctFmt(m.sales)}</td>
          <td>${acctFmt(m.cogs)}</td>
          <td>${acctFmt(grossProfit)}</td>
          <td>${acctFmt(m.expenses)}</td>
          <td style="font-weight:700; color:${netProfit >= 0 ? 'var(--moss)' : 'var(--red)'};">${acctFmt(netProfit)}</td>
          <td style="color:var(--red);">${acctFmt(m.outstanding)}</td>
          <td></td>
        </tr>`;
    }).join('');
  }
