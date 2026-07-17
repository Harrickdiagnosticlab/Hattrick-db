// ---------- Admin: dashboard stats ----------
  async function loadAdminStats(){
    const results = await Promise.allSettled([
      sb.from('employees').select('*', { count: 'exact', head: true }),
      sb.from('customers').select('*', { count: 'exact', head: true }),
      sb.from('services').select('*', { count: 'exact', head: true }),
      sb.from('checkins').select('*', { count: 'exact', head: true }).is('check_out', null),
      sb.from('inventory').select('quantity, low_stock_threshold')
    ]);
    const [emp, cust, svc, active, inv] = results;
    document.getElementById('statEmployees').textContent = (emp.status === 'fulfilled' && !emp.value.error) ? emp.value.count : '—';
    document.getElementById('statCustomers').textContent = (cust.status === 'fulfilled' && !cust.value.error) ? cust.value.count : '—';
    document.getElementById('statServices').textContent = (svc.status === 'fulfilled' && !svc.value.error) ? svc.value.count : '—';
    document.getElementById('statActive').textContent = (active.status === 'fulfilled' && !active.value.error) ? active.value.count : '—';

    if (inv.status === 'fulfilled' && !inv.value.error && inv.value.data){
      const lowCount = inv.value.data.filter(row => {
        const threshold = row.low_stock_threshold === null || row.low_stock_threshold === undefined ? 5 : row.low_stock_threshold;
        return row.quantity === null || row.quantity === undefined || Number(row.quantity) <= Number(threshold);
      }).length;
      document.getElementById('statLowStock').textContent = lowCount;
    } else {
      document.getElementById('statLowStock').textContent = '—';
    }
  }
