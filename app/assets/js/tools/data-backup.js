  // ---------- Data Backup tool ----------
  // admin_users is intentionally never included. employees' password column
  // is stripped even though it's already bcrypt-hashed, as a safety habit.
  const BACKUP_TABLES = [
    'customers', 'employees', 'services', 'packages', 'ledger',
    'expenses', 'inventory', 'checkins', 'account_closures',
    'payment_clearances', 'ledger_settings'
  ];

  function backupToCsv(rows){
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escapeCell = (val) => {
      if (val === null || val === undefined) return '';
      let s = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = [headers.map(escapeCell).join(',')];
    rows.forEach(row => {
      lines.push(headers.map(h => escapeCell(row[h])).join(','));
    });
    return lines.join('\r\n');
  }

  document.getElementById('backupDownloadBtn').addEventListener('click', async () => {
    const btn = document.getElementById('backupDownloadBtn');
    const msgEl = document.getElementById('backupMsg');
    btn.disabled = true;
    showMsg(msgEl, 'Fetching all data…', 'ok');

    try {
      const zip = new JSZip();
      let tablesIncluded = 0;

      for (const table of BACKUP_TABLES){
        const { data, error } = await sb.from(table).select('*').limit(20000);
        if (error || !data){
          continue; // table might not exist in this project — skip quietly
        }
        if (table === 'employees'){
          data.forEach(row => { delete row.password; });
        }
        const csv = backupToCsv(data);
        zip.file(`${table}.csv`, csv || 'No rows.');
        tablesIncluded++;
      }

      showMsg(msgEl, 'Building ZIP…', 'ok');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const dateStr = acctToday();
      const a = document.createElement('a');
      a.href = url;
      a.download = `hattrick-backup-${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      showMsg(msgEl, `Backup downloaded — ${tablesIncluded} table(s) included.`, 'ok');
    } catch (e) {
      showMsg(msgEl, 'Backup failed: ' + e.message, 'err');
    }

    btn.disabled = false;
  });
