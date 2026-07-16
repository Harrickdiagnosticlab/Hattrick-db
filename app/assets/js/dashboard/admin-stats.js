  // ---------- Admin: dashboard stats ----------
  async function loadAdminStats(){
    const results = await Promise.allSettled([
      sb.from('employees').select('*', { count: 'exact', head: true }),
      sb.from('customers').select('*', { count: 'exact', head: true }),
      sb.from('services').select('*', { count: 'exact', head: true }),
      sb.from('checkins').select('*', { count: 'exact', head: true }).is('check_out', null)
    ]);
    const [emp, cust, svc, active] = results;
    document.getElementById('statEmployees').textContent = (emp.status === 'fulfilled' && !emp.value.error) ? emp.value.count : '—';
    document.getElementById('statCustomers').textContent = (cust.status === 'fulfilled' && !cust.value.error) ? cust.value.count : '—';
    document.getElementById('statServices').textContent = (svc.status === 'fulfilled' && !svc.value.error) ? svc.value.count : '—';
    document.getElementById('statActive').textContent = (active.status === 'fulfilled' && !active.value.error) ? active.value.count : '—';
  }

