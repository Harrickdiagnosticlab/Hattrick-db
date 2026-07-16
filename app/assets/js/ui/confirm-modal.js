  // ---------- Generic confirm modal (replaces browser confirm()) ----------
  let confirmModalCallback = null;
  function showConfirm(message, onConfirm, confirmLabel){
    document.getElementById('confirmModalTitle').textContent = message;
    document.getElementById('confirmModalOkBtn').textContent = confirmLabel || 'Confirm';
    confirmModalCallback = onConfirm;
    openModal('confirmModal');
  }
  document.getElementById('confirmModalCancelBtn').addEventListener('click', () => {
    confirmModalCallback = null;
    closeModal('confirmModal');
  });
  document.getElementById('confirmModalOkBtn').addEventListener('click', () => {
    const cb = confirmModalCallback;
    confirmModalCallback = null;
    closeModal('confirmModal');
    if (cb) cb();
  });

