  // ---------- Add Expense ----------
  document.getElementById('ledgerAddExpenseBtn').addEventListener('click', () => {
    document.getElementById('addExpenseValue').value = '';
    document.getElementById('addExpenseDescription').value = '';
    document.getElementById('addExpenseCategory').value = 'Other';
    clearMsg(document.getElementById('addExpenseMsg'));
    openModal('addExpenseModal');
  });
  document.getElementById('addExpenseCancelBtn').addEventListener('click', () => closeModal('addExpenseModal'));

  document.getElementById('addExpenseSaveBtn').addEventListener('click', async () => {
    const msgEl = document.getElementById('addExpenseMsg');
    const amount = parseFloat(document.getElementById('addExpenseValue').value);
    const description = document.getElementById('addExpenseDescription').value.trim();
    const category = document.getElementById('addExpenseCategory').value;
    const mode = getSelectedMode('addExpenseModePills');

    if (isNaN(amount) || amount <= 0){
      showMsg(msgEl, 'Enter a valid amount.', 'err');
      return;
    }

    const { error } = await sb.from('expenses').insert({
      date: acctToday(), category, description, amount, source: mode
    });
    if (error){ showMsg(msgEl, 'Could not save: ' + error.message, 'err'); return; }

    closeModal('addExpenseModal');
    await acctLoadLedgerAll();
    await acctLoadBalances();
    await expLoad();
  });

