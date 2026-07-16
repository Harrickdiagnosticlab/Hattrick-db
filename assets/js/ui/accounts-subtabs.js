  // ---------- Accounts sub-tabs ----------
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.tab-panel');
      container.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.subtab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector('#subtab-' + btn.dataset.subtab).classList.add('active');
      if (btn.dataset.subtab === 'admin-ledger'){ acctLoadLedgerAll(); }
      if (btn.dataset.subtab === 'svc-packages'){ pkgLoadServiceSelector(); pkgLoadList(); }
    });
  });

