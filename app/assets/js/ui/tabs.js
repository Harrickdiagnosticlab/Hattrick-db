// ---------- Tools: lazy-load heavy PDF libraries only when Tools tab is opened ----------
  let toolsScriptsLoaded = false;
  let toolsScriptsLoading = false;
  function loadToolsScriptsOnce(){
    if (toolsScriptsLoaded || toolsScriptsLoading) return;
    toolsScriptsLoading = true;
    const onFail = () => {
      toolsScriptsLoading = false;
      document.getElementById('toolsLoadingMsg').textContent = 'Could not load the tool — check your internet connection and try again.';
    };
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
    s1.onerror = onFail;
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s2.onerror = onFail;
      s2.onload = () => {
        const s3 = document.createElement('script');
        s3.src = 'assets/js/tools/header-tool.js';
        s3.onerror = onFail;
        s3.onload = () => {
          toolsScriptsLoaded = true;
          toolsScriptsLoading = false;
          document.getElementById('toolsLoadingMsg').classList.add('tools-hide');
          document.getElementById('toolsContentWrap').classList.remove('tools-hide');
        };
        document.body.appendChild(s3);
      };
      document.body.appendChild(s2);
    };
    document.body.appendChild(s1);
  }

  // ---------- Tabs (scoped per dashboard, so admin and employee tabs don't clash) ----------
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.dash-wrap');
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');

      const toolsShared = document.getElementById('toolsSharedRoot');
      if (btn.dataset.tab === 'tools' || btn.dataset.tab === 'admin-tools'){
        const tabsNav = btn.closest('.tabs');
        tabsNav.insertAdjacentElement('afterend', toolsShared);
        toolsShared.classList.add('active');
        loadToolsScriptsOnce();
      } else {
        toolsShared.classList.remove('active');
        container.querySelector('#tab-' + btn.dataset.tab).classList.add('active');
      }

      if (btn.dataset.tab === 'accounts'){ acctRefreshEmployeeAccounts(); }
      if (btn.dataset.tab === 'admin-accounts'){ acctRefreshAdminOverview(); }
      if (btn.dataset.tab === 'admin-customers'){ loadAdminCustomers(); }
      if (btn.dataset.tab === 'admin-inventory'){ loadAdminInventory(); }
      if (btn.dataset.tab === 'admin-services'){ loadServices(); }
      if (btn.dataset.tab === 'admin-dashboard'){ loadDashboardAccountsCard(); loadAdminStats(); }
      if (btn.dataset.tab === 'inventory'){ loadInventoryList(); }
    });
  });
