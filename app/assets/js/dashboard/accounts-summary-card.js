  // ---------- Dashboard: Accounts summary card (Cash/Digital balance + today's profit) ----------
  async function loadDashboardAccountsCard(){
    document.getElementById('dashCashBalance').textContent = acctFmt(acctCashBalanceVal);
    document.getElementById('dashDigitalBalance').textContent = acctFmt(acctDigitalBalanceVal);

    const today = acctToday();
    const { data: ledgerRows } = await sb
      .from('ledger')
      .select('customerPaidAmount')
      .eq('type', 'INVOICE')
      .eq('invoiceDate', today);

    let revenue = (ledgerRows || []).reduce((sum, r) => sum + (parseFloat(r.customerPaidAmount) || 0), 0);
    (acctAllClearances || []).filter(c => c.clearedDate === today).forEach(c => { revenue += parseFloat(c.amount) || 0; });

    const { data: expenseRows } = await sb.from('expenses').select('amount').eq('date', today);
    const expenses = (expenseRows || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const profit = revenue - expenses;
    const profitEl = document.getElementById('dashTodayProfit');
    profitEl.textContent = (profit < 0 ? '-' : '') + acctFmt(Math.abs(profit));
    profitEl.style.color = profit >= 0 ? 'var(--moss)' : 'var(--red)';
  }

