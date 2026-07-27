// ---------- Add Expense ----------
  document.getElementById('ledgerAddExpenseBtn').addEventListener('click', () => {
    document.getElementById('addExpenseValue').value = '';
    document.getElementById('addExpenseDescription').value = '';
    document.getElementById('addExpenseCategory').value = 'Other';
    document.getElementById('addExpenseNewCategory').value = '';
    document.getElementById('addExpenseNewCategoryWrap').style.display = 'none';
    clearMsg(document.getElementById('addExpenseMsg'));
    openModal('addExpenseModal');
  });
  document.getElementById('addExpenseCancelBtn').addEventListener('click', () => closeModal('addExpenseModal'));

  document.getElementById('addExpenseCategory').addEventListener('change', (e) => {
    document.getElementById('addExpenseNewCategoryWrap').style.display = e.target.value === '__new__' ? 'block' : 'none';
  });

  document.getElementById('addExpenseSaveBtn').addEventListener('click', async () => {
    const msgEl = document.getElementById('addExpenseMsg');
    const amount = parseFloat(document.getElementById('addExpenseValue').value);
    const description = document.getElementById('addExpenseDescription').value.trim();
    const categorySelect = document.getElementById('addExpenseCategory').value;
    const category = categorySelect === '__new__'
      ? document.getElementById('addExpenseNewCategory').value.trim()
      : categorySelect;
    const mode = getSelectedMode('addExpenseModePills');

    if (isNaN(amount) || amount <= 0){
      showMsg(msgEl, 'Enter a valid amount.', 'err');
      return;
    }
    if (categorySelect === '__new__' && !category){
      showMsg(msgEl, 'Enter a name for the new category.', 'err');
      return;
    }
    if (category === 'Other' && !description){
      showMsg(msgEl, 'Description is required when category is "Other".', 'err');
      return;
    }

    const { error } = await sb.from('expenses').insert({
      date: acctToday(), category, description, amount, source: mode, added_by: 'admin'
    });
    if (error){ showMsg(msgEl, 'Could not save: ' + error.message, 'err'); return; }

    closeModal('addExpenseModal');
    await acctLoadLedgerAll();
    await acctLoadBalances();
    await expLoad();
  });
