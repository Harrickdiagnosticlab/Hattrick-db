  // ---------- Transactions history (invoices + pending-payment clearances, merged) ----------
  let acctAllTransactions = [];

  async function acctLoadTransactions(){
    const { data: ledgerRows, error: ledgerErr } = await sb
      .from('ledger')
      .select('invoiceNumber, invoiceDate, customerName, customerPaymentMode, invoiceTotal, customerPaidAmount, balanceDue, timestamp, type')
      .eq('type', 'INVOICE')
      .order('timestamp', { ascending: false })
      .limit(150);

    const { data: clearanceRows, error: clearErr } = await sb
      .from('payment_clearances')
      .select('invoiceNumber, customerName, amount, paymentMode, clearedDate, timestamp')
      .order('timestamp', { ascending: false })
      .limit(150);

    const invoiceEntries = (!ledgerErr && ledgerRows) ? ledgerRows.map(r => ({
      type: 'invoice',
      invoiceNumber: r.invoiceNumber,
      date: r.invoiceDate,
      customerName: r.customerName,
      mode: r.customerPaymentMode,
      total: r.invoiceTotal,
      paid: parseFloat((parseFloat(r.customerPaidAmount) + acctClearedTotalFor(r.invoiceNumber)).toFixed(2)),
      due: parseFloat((parseFloat(r.balanceDue) - acctClearedTotalFor(r.invoiceNumber)).toFixed(2)),
      timestamp: r.timestamp
    })) : [];

    const paymentEntries = (!clearErr && clearanceRows) ? clearanceRows.map(c => ({
      type: 'payment',
      invoiceNumber: c.invoiceNumber,
      date: c.clearedDate,
      customerName: c.customerName,
      mode: c.paymentMode,
      total: null,
      paid: c.amount,
      due: null,
      timestamp: c.timestamp
    })) : [];

    acctAllTransactions = [...invoiceEntries, ...paymentEntries]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    acctRenderTransactions(acctAllTransactions);
  }

  function acctRenderTransactions(rows){
    const body = document.getElementById('acctTxnBody');
    if (!rows || rows.length === 0){
      body.innerHTML = '<tr><td colspan="7" class="empty">No transactions yet.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(r => {
      if (r.type === 'payment'){
        return `
        <tr>
          <td class="cust-meta">${escapeHtml(r.invoiceNumber)}</td>
          <td class="cust-meta">${formatDMY(r.date)}</td>
          <td>${escapeHtml(r.customerName)}</td>
          <td class="cust-meta">${escapeHtml(r.mode)}</td>
          <td class="cust-meta" style="font-family:var(--font-mono); font-size:10px; text-transform:uppercase; color:var(--amber);">Pending payment</td>
          <td style="color:var(--moss); font-weight:600;">${acctFmt(r.paid)}</td>
          <td class="cust-meta">—</td>
        </tr>`;
      }
      return `
      <tr>
        <td class="cust-meta">${escapeHtml(r.invoiceNumber)}</td>
        <td class="cust-meta">${formatDMY(r.date)}</td>
        <td>${escapeHtml(r.customerName)}</td>
        <td class="cust-meta">${escapeHtml(r.mode)}</td>
        <td class="cust-meta">${acctFmt(r.total)}</td>
        <td class="cust-meta">${acctFmt(r.paid)}</td>
        <td style="color:${r.due > 0.009 ? 'var(--red)' : 'var(--moss)'}; font-weight:600;">${acctFmt(r.due)}</td>
      </tr>`;
    }).join('');
  }

  document.getElementById('acctTxnSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (term === ''){ acctRenderTransactions(acctAllTransactions); return; }
    acctRenderTransactions(acctAllTransactions.filter(r =>
      (r.invoiceNumber || '').toLowerCase().includes(term) ||
      (r.customerName || '').toLowerCase().includes(term)
    ));
  });

  async function acctRefreshEmployeeAccounts(){
    await acctLoadClearances();
    await acctLoadBalances();
    await acctLoadTodayClosingBalances();
    await acctLoadHistory();
    await acctLoadPending();
    await acctLoadClearedList();
    await acctLoadTransactions();
    document.getElementById('expDate').value = acctToday();
    syncExpDate();
    await expLoad();
  }

