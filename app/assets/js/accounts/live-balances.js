  // ---------- Live balances (all-time, straight from the ledger) ----------
  async function acctLoadBalances(){
    const { data, error } = await sb.from('ledger').select('customerPaymentMode, customerPaidAmount');

    let cash = 0, digital = 0;
    if (!error && data){
      data.forEach(r => {
        const amt = parseFloat(r.customerPaidAmount) || 0;
        if (r.customerPaymentMode === 'Cash') cash += amt;
        else if (r.customerPaymentMode === 'UPI' || r.customerPaymentMode === 'Card') digital += amt;
      });
    }

    acctAllClearances.forEach(c => {
      const amt = parseFloat(c.amount) || 0;
      if (c.paymentMode === 'Cash') cash += amt;
      else if (c.paymentMode === 'UPI' || c.paymentMode === 'Card') digital += amt;
    });

    // Opening (collections so far) minus expenses paid out of each source
    const { data: expenseRows } = await sb.from('expenses').select('amount, source');
    (expenseRows || []).forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      if ((e.source || 'Cash') === 'Cash') cash -= amt;
      else digital -= amt; // UPI / Card / Bank all draw from the digital balance
    });

    // Start from the admin-set opening balances (Ledger tab) so this figure
    // matches what's shown there, in Overview, and on the Dashboard card.
    cash += ledgerOpeningCashVal;
    digital += ledgerOpeningBankVal;

    acctCashBalanceVal = cash;
    acctDigitalBalanceVal = digital;

    document.getElementById('acctCashBalanceOverview').textContent = acctFmt(cash);
    document.getElementById('acctDigitalBalanceOverview').textContent = acctFmt(digital);
  }

  // Loads just the opening balances (without the full ledger table) — used so
  // Overview/Dashboard have the correct starting point even before the admin
  // ever opens the Ledger tab in this session.
  async function loadLedgerOpeningBalances(){
    const { data } = await sb.from('ledger_settings').select('*').limit(1);
    ledgerOpeningCashVal = (data && data[0]) ? parseFloat(data[0].opening_cash) || 0 : 0;
    ledgerOpeningBankVal = (data && data[0]) ? parseFloat(data[0].opening_bank) || 0 : 0;
  }

