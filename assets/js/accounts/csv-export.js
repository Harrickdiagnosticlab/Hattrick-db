  // ---------- CSV export ----------
  document.getElementById('ledgerExportCsvBtn').addEventListener('click', () => {
    const headers = ['Type','Date','Invoice','Customer/Reason','Patient ID','Mode','Total','Discount','Received','Pending','B2B','B2B Paid','Expense','Credit','Debit','Holding'];
    const csvCell = v => `"${String(v === null || v === undefined ? '' : v).replace(/"/g,'""').trim()}"`;
    const rows = ledgerAllRows.map(r => {
      const m = ledgerRowMetrics(r);
      return [
        r.type, formatDMY(r.date), r.invoiceNumber, r.customer, r.patientId || '', r.mode,
        (parseFloat(r.total)||0).toFixed(2), (parseFloat(r.discount)||0).toFixed(2), (parseFloat(r.paid)||0).toFixed(2),
        m.pending.toFixed(2), r.b2bName || '', (parseFloat(r.b2bPaid)||0).toFixed(2),
        m.expenseAmt.toFixed(2), m.credit.toFixed(2), m.debit.toFixed(2), m.holding.toFixed(2)
      ].map(csvCell).join(',');
    });
    const csv = [headers.map(csvCell).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ledger_export_${acctToday()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  const ledgerImportBtn = document.getElementById('ledgerImportBtn');
  const ledgerImportFile = document.getElementById('ledgerImportFile');
  ledgerImportBtn.addEventListener('click', () => ledgerImportFile.click());

  ledgerImportFile.addEventListener('change', async () => {
    const file = ledgerImportFile.files[0];
    if (!file) return;
    const msgEl = document.getElementById('ledgerImportMsg');
    ledgerImportBtn.disabled = true;
    showMsg(msgEl, 'Reading file…', 'ok');

    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      const records = Array.isArray(parsed) ? parsed : (parsed.transactions || []);

      const invoiceRecords = records
        .filter(t => (t.type || 'INVOICE') === 'INVOICE')
        .map(t => ({
          invoiceNumber: t.invoiceNumber, invoiceDate: t.date, customerId: t.customerID || null,
          patientId: t.customerID || null,
          customerName: t.customerName, b2bName: t.b2bName || '', customerPaymentMode: t.customerPaymentMode,
          paymentType: t.paymentType, invoiceTotal: t.invoiceTotal, grandTotal: t.grandTotal,
          customerPaidAmount: t.customerPaidAmount, balanceDue: t.balanceDue, paidAmountToB2B: t.paidAmountToB2B,
          discount: t.discount, otherCharges: t.otherCharges, testsCount: t.testsCount,
          timestamp: t.timestamp, type: 'INVOICE'
        }));

      const amountInRecords = records
        .filter(t => t.type === 'AMOUNT_IN')
        .map(t => ({
          invoiceNumber: t.invoiceNumber, invoiceDate: t.date, customerId: null,
          customerName: t.customerName || 'MANUAL ENTRY', b2bName: '', customerPaymentMode: t.paymentMode,
          paymentType: 'Full', invoiceTotal: 0, grandTotal: t.amountIn || t.grandTotal,
          customerPaidAmount: t.amountIn || t.receivedAmount, balanceDue: 0, paidAmountToB2B: 0,
          discount: 0, otherCharges: 0, testsCount: 0, timestamp: t.timestamp, type: 'AMOUNT_IN'
        }));

      const expenseRecords = records
        .filter(t => t.type === 'EXPENSE')
        .map(t => ({
          date: t.date, category: 'Imported', description: t.reason || '', amount: t.expenseAmount,
          source: ['Cash','UPI','Card','Bank'].includes(t.paymentMode) ? t.paymentMode : 'Cash',
          import_ref: t.invoiceNumber, timestamp: t.timestamp
        }));

      const allLedgerRecords = [...invoiceRecords, ...amountInRecords];
      let ledgerError = null, expError = null;
      if (allLedgerRecords.length > 0){
        const { error } = await sb.from('ledger').upsert(allLedgerRecords, { onConflict: 'invoiceNumber' });
        ledgerError = error;
      }
      if (expenseRecords.length > 0){
        const { error } = await sb.from('expenses').upsert(expenseRecords, { onConflict: 'import_ref' });
        expError = error;
      }

      if (parsed.openingBalance !== undefined){
        const { data: existing } = await sb.from('ledger_settings').select('id').limit(1);
        if (existing && existing.length > 0){
          await sb.from('ledger_settings').update({ opening_balance: parsed.openingBalance }).eq('id', existing[0].id);
        }
      }

      if (ledgerError || expError){
        showMsg(msgEl, 'Import finished with errors: ' + [ledgerError, expError].filter(Boolean).map(e => e.message).join(' | '), 'err');
      } else {
        showMsg(msgEl, `Imported ${invoiceRecords.length} invoice(s), ${amountInRecords.length} manual entry(ies), ${expenseRecords.length} expense(s), and the opening balance.`, 'ok');
      }

      await acctLoadLedgerAll();
      await acctLoadBalances();
      await expLoad();
    } catch(e){
      showMsg(msgEl, 'Invalid JSON file: ' + e.message, 'err');
    }

    ledgerImportFile.value = '';
    ledgerImportBtn.disabled = false;
  });

