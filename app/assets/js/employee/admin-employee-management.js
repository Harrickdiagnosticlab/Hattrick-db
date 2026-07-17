  // ---------- Admin: employee management ----------
  const empMsg = document.getElementById('empMsg');
  const empList = document.getElementById('empList');

  async function loadEmployees(){
    const showArchived = document.getElementById('empShowArchived').checked;
    let query = sb.from('employees').select('*').order('created_at', { ascending: false });
    query = showArchived ? query : query.eq('active', true);
    const { data, error } = await query;

    if (error || !data || data.length === 0){
      empList.innerHTML = '<div class="empty">No employees yet. Add one above.</div>';
      return;
    }
    empList.innerHTML = data.map(e => `
      <div class="emp-row">
        <div>
          <div class="emp-name">${escapeHtml(e.name) || '(no name)'} ${e.active === false ? '<span class="cust-meta" style="color:var(--red);">(archived)</span>' : ''}</div>
          <div class="emp-username">${escapeHtml(e.username)}</div>
        </div>
        <button class="emp-del" data-id="${e.id}" data-active="${e.active}" style="color:${e.active === false ? 'var(--moss)' : 'var(--red)'};">${e.active === false ? 'Restore' : 'Archive'}</button>
      </div>
    `).join('');

    empList.querySelectorAll('.emp-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const isActive = btn.dataset.active === 'true';
        await sb.from('employees').update({ active: !isActive }).eq('id', btn.dataset.id);
        await loadEmployees();
        await loadAdminStats();
      });
    });
  }
  document.getElementById('empShowArchived').addEventListener('change', loadEmployees);

  document.getElementById('createEmpBtn').addEventListener('click', async () => {
    const name = document.getElementById('empName').value.trim();
    const username = document.getElementById('empUsername').value.trim();
    const password = document.getElementById('empPassword').value;

    if (!username || !password){
      showMsg(empMsg, 'Username and password are required.', 'err');
      return;
    }

    const { error } = await sb.rpc('admin_create_employee', {
      p_name: name,
      p_username: username,
      p_password: password
    });
    if (error){
      showMsg(empMsg, error.message.includes('duplicate') ? 'That username is already taken.' : error.message, 'err');
      return;
    }

    showMsg(empMsg, 'Employee created.', 'ok');
    document.getElementById('empName').value = '';
    document.getElementById('empUsername').value = '';
    document.getElementById('empPassword').value = '';
    await loadEmployees();
    await loadAdminStats();
  });

