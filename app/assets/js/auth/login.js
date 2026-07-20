// ---------- Login ----------
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const authSubmit = document.getElementById('authSubmit');
  const authMsg = document.getElementById('authMsg');

  let currentEmployee = null;
  let syncInvInvoiceDate = () => {};
  let syncAcctFilterDate = () => {};
  let syncExpDate = () => {};
  let openSession = null;
  let tickHandle = null;

  authSubmit.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password){ showMsg(authMsg, 'Enter both username and password.', 'err'); return; }

    clearMsg(authMsg);
    authSubmit.disabled = true;

    const { data: adminRows } = await sb.rpc('verify_admin_login', {
      p_username: username,
      p_password: password
    });
    const adminMatch = adminRows && adminRows.length ? adminRows[0] : null;

    if (adminMatch){
      usernameInput.value = ''; passwordInput.value = '';
      showScreen('admin');
      await Promise.allSettled([
        loadEmployees(),
        loadServices(),
        pkgLoadServiceSelector(),
        pkgLoadList(),
        loadAdminCustomers(),
        loadAdminStats(),
        acctRefreshAdminOverview(),
        loadDashboardAccountsCard()
      ]);
      authSubmit.disabled = false;
      return;
    }

    const { data: employeeRows, error } = await sb.rpc('verify_employee_login', {
      p_username: username,
      p_password: password
    });
    const data = employeeRows && employeeRows.length ? employeeRows[0] : null;

    authSubmit.disabled = false;

    if (error || !data){
      showMsg(authMsg, 'Invalid username or password.', 'err');
      return;
    }

    currentEmployee = data;
    usernameInput.value = ''; passwordInput.value = '';
    document.getElementById('empGreeting').textContent = data.name || data.username;
    showScreen('employee');
    await loadOpenSession();
    await Promise.allSettled([
      loadHistory(),
      loadCustomers(),
      suggestNextPatientId(),
      invLoadInitialData(),
      acctRefreshEmployeeAccounts()
    ]);
    startTicking();
  });

  document.getElementById('adminLogout').addEventListener('click', () => { showScreen('auth'); });
  document.getElementById('empLogout').addEventListener('click', () => {
    if (tickHandle) clearInterval(tickHandle);
    currentEmployee = null;
    openSession = null;
    showScreen('auth');
  });
