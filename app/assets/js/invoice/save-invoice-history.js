  // ---------- Save invoice to customer history (Supabase invoice_history) ----------
  async function invSaveInvoiceTransaction(data){
    const customerId = invCurrentSelectedCustomerId;
    if (customerId === 'WALKIN' || !customerId) return null;

    const paymentModeText = document.getElementById('invPaymentMode').value;
    const historyRecord = {
      invoiceNumber: data.invoiceNumber,
      customerId: customerId,
      invoiceDate: data.invoiceDate,
      selectedTests: data.selectedTests.map(t => ({ name: t.name, price: t.price })),
      invoiceTotal: data.invoiceTotal,
      grandTotal: data.grandTotal,
      discount: data.discount,
      otherCharges: data.charges,
      paymentMode: paymentModeText,
      paymentType: data.isFullPayment ? 'Full' : 'Advance/Partial',
      amountReceived: data.amountReceived,
      balanceDue: data.balanceDue
    };

    const { error } = await sb.from('invoice_history').insert(historyRecord);
    if (error){ console.error(error); return `Could not save invoice ${data.invoiceNumber}: ${error.message}`; }
    return `Invoice ${data.invoiceNumber} saved to ${data.customer.name}'s history.`;
  }

