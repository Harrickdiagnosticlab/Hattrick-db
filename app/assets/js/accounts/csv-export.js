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

  // ---------- CSV parsing helper (handles quoted fields with commas) ----------
  function pnlParseCsv(text){
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++){
      const c = text[i], next = text[i + 1];
      if (inQuotes){
        if (c === '"' && next === '"'){ field += '"'; i++; }
        else if (c === '"'){ inQuotes = false; }
        else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ','){ row.push(field); field = ''; }
        else if (c === '\n' || c === '\r'){
          if (field !== '' || row.length){ row.push(field); rows.push(row); row = []; field = ''; }
          if (c === '\r' && next === '\n') i++;
        } else field += c;
      }
    }
    if (field !== '' || row.length){ row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).filter(r => r.some(v => v !== '')).map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? r[i].trim() : ''; });
      return obj;
    });
  }

  const ledgerImportBtn = document.getElementById('ledgerImportBtn');
  const ledgerImportFile = document.getElementById('ledgerImportFile');
  ledgerImportBtn.addEventListener('click', () => ledgerImportFile.click());

  // Converts the exported "DD/MM/YYYY" date format back to "YYYY-MM-DD".
  function pnlParseDMY(dmy){
    const parts = String(dmy || '').split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Expects the SAME CSV produced by "Export CSV" above:
  // Type,Date,Invoice,Customer/Reason,Patient ID,Mode,Total,Discount,Received,
  // Pending,B2B,B2B Paid,Expense,Credit,Debit,Holding
  ledgerImportFile.addEventListener('change', async () => {
    const file = ledgerImportFile.files[0];
    if (!file) return;
    const msgEl = document.getElementById('ledgerImportMsg');
    ledgerImportBtn.disabled = true;
    showMsg(msgEl, 'Reading file…', 'ok');

    try{
      const text = await file.text();
      const records = pnlParseCsv(text);

      if (!records.length){
        showMsg(msgEl, 'No rows found in that CSV.', 'err');
        ledgerImportFile.value = '';
        ledgerImportBtn.disabled = false;
        return;
      }
      if (!records[0].Type || !records[0].Invoice){
        showMsg(msgEl, 'This doesn\u2019t look like a ledger export CSV — expected "Type" and "Invoice" columns.', 'err');
        ledgerImportFile.value = '';
        ledgerImportBtn.disabled = false;
        return;
      }

      const num = (v) => v === '' || v === undefined ? 0 : parseFloat(v) || 0;

      const invoiceRecords = records
        .filter(t => t.Type === 'INVOICE' || t.Type === 'AMOUNT_IN')
        .map(t => {
          const invoiceTotal = num(t.Total);
          const discount = num(t.Discount);
          const paid = num(t.Received);
          const grandTotal = Math.max(0, invoiceTotal - discount);
          return {
            invoiceNumber: t.Invoice, invoiceDate: pnlParseDMY(t.Date),
            customerName: t['Customer/Reason'], patientId: t['Patient ID'] || null,
            customerPaymentMode: t.Mode, paymentType: paid >= grandTotal ? 'Full' : 'Advance/Partial',
            invoiceTotal, grandTotal, customerPaidAmount: paid,
            balanceDue: Math.max(0, grandTotal - paid),
            b2bName: t.B2B || '', paidAmountToB2B: num(t['B2B Paid']),
            discount, otherCharges: 0, testsCount: 0,
            timestamp: new Date().toISOString(), type: t.Type
          };
        })
        .filter(r => r.invoiceNumber && r.invoiceDate);

      const expenseRecords = records
        .filter(t => t.Type === 'EXPENSE')
        .map(t => ({
          date: pnlParseDMY(t.Date), category: 'Imported', description: t['Customer/Reason'] || '',
          amount: num(t.Expense), source: t.Mode || 'Cash', added_by: 'admin',
          timestamp: new Date().toISOString()
        }))
        .filter(r => r.date && r.amount > 0);

      const skippedPayments = records.filter(t => t.Type === 'PAYMENT').length;

      let ledgerError = null, expError = null;
      if (invoiceRecords.length){
        const { error } = await sb.from('ledger').upsert(invoiceRecords, { onConflict: 'invoiceNumber' });
        ledgerError = error;
      }
      if (expenseRecords.length){
        const { error } = await sb.from('expenses').insert(expenseRecords);
        expError = error;
      }

      if (ledgerError || expError){
        showMsg(msgEl, 'Import finished with errors: ' + [ledgerError, expError].filter(Boolean).map(e => e.message).join(' | '), 'err');
      } else {
        let summary = `Imported ${invoiceRecords.length} invoice(s) and ${expenseRecords.length} expense(s) (added as new).`;
        if (skippedPayments) summary += ` Skipped ${skippedPayments} payment-collection row(s) — those aren't re-importable.`;
        showMsg(msgEl, summary, 'ok');
      }

      await acctLoadLedgerAll();
      await acctLoadBalances();
      await expLoad();
    } catch(e){
      showMsg(msgEl, 'Could not read that CSV: ' + e.message, 'err');
    }

    ledgerImportFile.value = '';
    ledgerImportBtn.disabled = false;
  });
