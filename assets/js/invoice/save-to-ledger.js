  // ---------- Save to ledger ----------
  async function invSaveTransactionToLedger(){
    if (!invValidateInvoiceData()){
      invAlertModal('Cannot save to ledger: select customer and tests first.', 'error');
      return;
    }
    invCalculateTotal();
    const d = window.invInvoiceData;

    const ledgerEntry = {
      invoiceNumber: d.invoiceNumber,
      invoiceDate: d.invoiceDate,
      customerId: String(invCurrentSelectedCustomerId),
      patientId: d.customer.id !== 'WALKIN' ? d.customer.id : null,
      customerName: d.customer.name,
      b2bName: document.getElementById('invB2bNameSelect').value.trim(),
      customerPaymentMode: document.getElementById('invPaymentMode').value,
      paymentType: d.isFullPayment ? 'Full' : 'Advance/Partial',
      invoiceTotal: d.invoiceTotal,
      grandTotal: d.grandTotal,
      customerPaidAmount: d.amountReceived,
      balanceDue: d.balanceDue,
      paidAmountToB2B: parseFloat(document.getElementById('invPaidAmountToB2B').value) || 0,
      discount: d.discount,
      otherCharges: d.charges,
      testsCount: d.selectedTests.length
    };

    const { data: existingRows } = await sb.from('ledger').select('id').eq('invoiceNumber', ledgerEntry.invoiceNumber).limit(1);
    const isUpdate = existingRows && existingRows.length > 0;

    const { error } = await sb.from('ledger').upsert(ledgerEntry, { onConflict: 'invoiceNumber' });
    if (error){ invAlertModal(`Could not save to ledger: ${error.message}`, 'error'); return; }

    invAlertModal(isUpdate
      ? `Invoice ${ledgerEntry.invoiceNumber} updated in the Ledger (prevented duplicate).`
      : `Invoice ${ledgerEntry.invoiceNumber} successfully recorded in the Transaction Ledger!`, isUpdate ? 'warning' : 'success');
  }
  document.getElementById('invSaveLedgerBtn').addEventListener('click', invSaveTransactionToLedger);

