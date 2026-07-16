  // ---------- Pending payments (net of any clearances already recorded) ----------
  async function acctLoadPending(){
    const { data, error } = await sb
      .from('ledger')
      .select('invoiceNumber, customerName, balanceDue, "patientId"')
      .gt('balanceDue', 0)
      .order('invoiceDate', { ascending: false })
      .limit(100);

    const body = document.getElementById('acctPendingBody');
    if (error || !data){
      body.innerHTML = '<tr><td colspan="4" class="empty">Could not load pending payments.</td></tr>';
      return;
    }

    const stillPending = data
      .map(r => ({ ...r, netDue: parseFloat((parseFloat(r.balanceDue) - acctClearedTotalFor(r.invoiceNumber)).toFixed(2)) }))
      .filter(r => r.netDue > 0.009);

    if (stillPending.length === 0){
      body.innerHTML = '<tr><td colspan="4" class="empty">No pending payments.</td></tr>';
      return;
    }

    body.innerHTML = stillPending.map(r => `
      <tr data-invoice="${escapeHtml(r.invoiceNumber)}" data-customer="${escapeHtml(r.customerName)}" data-balance="${r.netDue}" data-patient-id="${escapeHtml(r.patientId || '')}">
        <td class="cust-meta">${escapeHtml(r.invoiceNumber)}</td>
        <td>${escapeHtml(r.customerName)}</td>
        <td style="color:var(--red); font-weight:600;">${acctFmt(r.netDue)}</td>
        <td style="text-align:right;">
          <button class="btn ghost btn-sm acct-clear-open">Clear payment</button>
        </td>
      </tr>`).join('');

    body.querySelectorAll('.acct-clear-open').forEach(btn => {
      btn.addEventListener('click', () => {
        const tr = btn.closest('tr');
        const balance = parseFloat(tr.dataset.balance);
        const actionCell = tr.querySelector('td:last-child');
        actionCell.innerHTML = `
          <div class="clear-form">
            <input type="number" class="clear-amount-input" value="${balance.toFixed(2)}" step="0.01" />
            <div class="mode-pills">
              <button type="button" class="mode-pill selected" data-mode="Cash">Cash</button>
              <button type="button" class="mode-pill" data-mode="UPI">UPI</button>
              <button type="button" class="mode-pill" data-mode="Card">Card</button>
            </div>
            <button class="btn moss btn-sm acct-clear-confirm">Confirm</button>
            <button class="btn ghost btn-sm acct-clear-cancel">Cancel</button>
          </div>`;

        actionCell.querySelectorAll('.mode-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            actionCell.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
          });
        });

        actionCell.querySelector('.acct-clear-cancel').addEventListener('click', () => acctLoadPending());

        actionCell.querySelector('.acct-clear-confirm').addEventListener('click', async () => {
          const amount = parseFloat(actionCell.querySelector('.clear-amount-input').value);
          const mode = actionCell.querySelector('.mode-pill.selected').dataset.mode;

          if (isNaN(amount) || amount <= 0){
            showMsg(document.getElementById('acctPendingMsg'), 'Enter a valid amount.', 'err');
            return;
          }

          const { error } = await sb.from('payment_clearances').insert({
            invoiceNumber: tr.dataset.invoice,
            customerName: tr.dataset.customer,
            patientId: tr.dataset.patientId || null,
            amount: parseFloat(amount.toFixed(2)),
            paymentMode: mode,
            clearedDate: acctToday()
          });

          if (error){
            showMsg(document.getElementById('acctPendingMsg'), error.message, 'err');
            return;
          }

          showMsg(document.getElementById('acctPendingMsg'), `₹${amount.toFixed(2)} (${mode}) recorded for ${tr.dataset.invoice}.`, 'ok');
          await acctLoadClearances();
          await acctLoadPending();
          await acctLoadClearedList();
          await acctLoadBalances();
          await acctLoadTodayClosingBalances();
          await acctLoadTransactions();
        });
      });
    });
  }

  async function acctLoadClearedList(){
    const body = document.getElementById('acctClearedBody');
    const recent = acctAllClearances.slice(0, 20);
    if (recent.length === 0){
      body.innerHTML = '<tr><td colspan="5" class="empty">No payments cleared yet.</td></tr>';
      return;
    }
    body.innerHTML = recent.map(c => `
      <tr>
        <td class="cust-meta">${escapeHtml(c.invoiceNumber)}</td>
        <td>${escapeHtml(c.customerName)}</td>
        <td style="color:var(--moss); font-weight:600;">${acctFmt(c.amount)}</td>
        <td class="cust-meta">${escapeHtml(c.paymentMode)}</td>
        <td class="cust-meta">${formatDMY(c.clearedDate)}</td>
      </tr>`).join('');
  }

