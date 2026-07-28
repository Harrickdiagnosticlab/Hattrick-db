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

  // Expects a CSV with the ledger table's own raw column names (matching a
  // Supabase table export), e.g.:
  // invoiceNumber,invoiceDate,customerId,customerName,b2bName,customerPaymentMode,
  // paymentType,invoiceTotal,grandTotal,customerPaidAmount,balanceDue,
  // paidAmountToB2B,discount,otherCharges,testsCount,timestamp,type,patientId
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
      if (!records[0].invoiceNumber){
        showMsg(msgEl, 'This CSV doesn\u2019t look like a ledger backup — missing an "invoiceNumber" column.', 'err');
        ledgerImportFile.value = '';
        ledgerImportBtn.disabled = false;
        return;
      }

      const num = (v) => v === '' || v === undefined ? 0 : parseFloat(v) || 0;
      const ledgerRecords = records.map(t => ({
        invoiceNumber: t.invoiceNumber, invoiceDate: t.invoiceDate,
        customerId: t.customerId || null, patientId: t.patientId || null,
        customerName: t.customerName, b2bName: t.b2bName || '',
        customerPaymentMode: t.customerPaymentMode, paymentType: t.paymentType,
        invoiceTotal: num(t.invoiceTotal), grandTotal: num(t.grandTotal),
        customerPaidAmount: num(t.customerPaidAmount), balanceDue: num(t.balanceDue),
        paidAmountToB2B: num(t.paidAmountToB2B), discount: num(t.discount),
        otherCharges: num(t.otherCharges), testsCount: num(t.testsCount),
        timestamp: t.timestamp || new Date().toISOString(), type: t.type || 'INVOICE'
      })).filter(r => r.invoiceNumber);

      const { error } = await sb.from('ledger').upsert(ledgerRecords, { onConflict: 'invoiceNumber' });

      if (error){
        showMsg(msgEl, 'Import finished with errors: ' + error.message, 'err');
      } else {
        showMsg(msgEl, `Imported/updated ${ledgerRecords.length} ledger record(s).`, 'ok');
      }

      await acctLoadLedgerAll();
      await acctLoadBalances();
    } catch(e){
      showMsg(msgEl, 'Could not read that CSV: ' + e.message, 'err');
    }

    ledgerImportFile.value = '';
    ledgerImportBtn.disabled = false;
  });
