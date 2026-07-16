  // ---------- Overview (admin): daily/monthly filter, collections, profit & loss ----------
  function acctGetFilterRange(){
    const isMonthly = document.getElementById('acctFilterMonthlyBtn').classList.contains('selected');
    if (isMonthly){
      const monthVal = document.getElementById('acctFilterMonth').value; // "YYYY-MM"
      if (!monthVal) return null;
      const [y, m] = monthVal.split('-');
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(lastDay).padStart(2,'0')}`, label: new Date(`${monthVal}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
    } else {
      const dateVal = document.getElementById('acctFilterDate').value;
      if (!dateVal) return null;
      return { start: dateVal, end: dateVal, label: dateVal === acctToday() ? 'today' : formatDMY(dateVal) };
    }
  }

  async function acctLoadOverviewStats(){
    const range = acctGetFilterRange();
    if (!range) return;

    document.getElementById('acctPeriodLabel').textContent = range.label;
    document.getElementById('acctPeriodLabel2').textContent = range.label;

    const { data: ledgerRows, error } = await sb
      .from('ledger')
      .select('customerPaymentMode, customerPaidAmount, invoiceDate')
      .eq('type', 'INVOICE')
      .gte('invoiceDate', range.start)
      .lte('invoiceDate', range.end);

    let cash = 0, upi = 0, card = 0, credit = 0;
    if (!error && ledgerRows){
      ledgerRows.forEach(r => {
        const amt = parseFloat(r.customerPaidAmount) || 0;
        if (r.customerPaymentMode === 'Cash') cash += amt;
        else if (r.customerPaymentMode === 'UPI') upi += amt;
        else if (r.customerPaymentMode === 'Card') card += amt;
        else if (r.customerPaymentMode === 'Credit') credit += amt;
      });
    }

    acctAllClearances
      .filter(c => c.clearedDate >= range.start && c.clearedDate <= range.end)
      .forEach(c => {
        const amt = parseFloat(c.amount) || 0;
        if (c.paymentMode === 'Cash') cash += amt;
        else if (c.paymentMode === 'UPI') upi += amt;
        else if (c.paymentMode === 'Card') card += amt;
      });

    const revenue = cash + upi + card + credit;
    document.getElementById('acctCashToday').textContent = acctFmt(cash);
    document.getElementById('acctUpiToday').textContent = acctFmt(upi);
    document.getElementById('acctCardToday').textContent = acctFmt(card);
    document.getElementById('acctCreditToday').textContent = acctFmt(credit);
    document.getElementById('acctTotalToday').textContent = acctFmt(revenue);

    const { data: expenseRows } = await sb
      .from('expenses')
      .select('amount, date')
      .gte('date', range.start)
      .lte('date', range.end);

    const totalExpenses = (expenseRows || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const profit = revenue - totalExpenses;

    document.getElementById('acctRevenueStat').textContent = acctFmt(revenue);
    document.getElementById('acctExpenseStat').textContent = acctFmt(totalExpenses);
    const profitEl = document.getElementById('acctProfitStat');
    profitEl.textContent = (profit < 0 ? '-' : '') + acctFmt(Math.abs(profit));
    profitEl.style.color = profit >= 0 ? 'var(--moss)' : 'var(--red)';
  }

  document.getElementById('acctFilterDailyBtn').addEventListener('click', () => {
    document.getElementById('acctFilterDailyBtn').classList.add('selected');
    document.getElementById('acctFilterMonthlyBtn').classList.remove('selected');
    document.getElementById('acctDailyFieldWrap').style.display = 'block';
    document.getElementById('acctMonthlyFieldWrap').style.display = 'none';
    acctLoadOverviewStats();
  });
  document.getElementById('acctFilterMonthlyBtn').addEventListener('click', () => {
    document.getElementById('acctFilterMonthlyBtn').classList.add('selected');
    document.getElementById('acctFilterDailyBtn').classList.remove('selected');
    document.getElementById('acctMonthlyFieldWrap').style.display = 'block';
    document.getElementById('acctDailyFieldWrap').style.display = 'none';
    if (!document.getElementById('acctFilterMonth').value){
      document.getElementById('acctFilterMonth').value = acctToday().slice(0, 7);
    }
    acctLoadOverviewStats();
  });
  document.getElementById('acctFilterDate').addEventListener('change', acctLoadOverviewStats);
  document.getElementById('acctFilterMonth').addEventListener('change', acctLoadOverviewStats);

  async function acctRefreshAdminOverview(){
    document.getElementById('acctFilterDate').value = acctToday();
    syncAcctFilterDate();
    await loadLedgerOpeningBalances();
    await acctLoadClearances();
    await acctLoadBalances();
    await acctLoadOverviewStats();
  }

