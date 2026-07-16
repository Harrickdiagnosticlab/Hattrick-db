  // ---------- Employee Daily Closing: TODAY's Cash & UPI only (not all-time balance) ----------
  let acctClosingCashVal = 0, acctClosingUpiVal = 0;

  async function acctLoadTodayClosingBalances(){
    const today = acctToday();
    const { data } = await sb
      .from('ledger')
      .select('customerPaymentMode, customerPaidAmount')
      .eq('type', 'INVOICE')
      .eq('invoiceDate', today);

    let cash = 0, upi = 0;
    (data || []).forEach(r => {
      const amt = parseFloat(r.customerPaidAmount) || 0;
      if (r.customerPaymentMode === 'Cash') cash += amt;
      else if (r.customerPaymentMode === 'UPI') upi += amt;
    });

    acctAllClearances.filter(c => c.clearedDate === today).forEach(c => {
      const amt = parseFloat(c.amount) || 0;
      if (c.paymentMode === 'Cash') cash += amt;
      else if (c.paymentMode === 'UPI') upi += amt;
    });

    acctClosingCashVal = cash;
    acctClosingUpiVal = upi;

    document.getElementById('acctCashBalance').textContent = acctFmt(cash);
    document.getElementById('acctDigitalBalance').textContent = acctFmt(upi);

    acctUpdateClosingCheck();
  }

