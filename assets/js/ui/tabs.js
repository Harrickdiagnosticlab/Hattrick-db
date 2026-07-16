  // ---------- Tabs (scoped per dashboard, so admin and employee tabs don't clash) ----------
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.dash-wrap');
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector('#tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'accounts'){ acctRefreshEmployeeAccounts(); }
      if (btn.dataset.tab === 'admin-accounts'){ acctRefreshAdminOverview(); }
      if (btn.dataset.tab === 'admin-customers'){ loadAdminCustomers(); }
      if (btn.dataset.tab === 'admin-dashboard'){ loadDashboardAccountsCard(); }
    });
  });

