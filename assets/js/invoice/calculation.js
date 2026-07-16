  // ---------- Calculation ----------
  function invCalculateTotal(){
    // Packages are folded in as ordinary line items (name + price) so every
    // downstream calculation, printed invoice, and ledger/pending record
    // works exactly like it already does for individual tests — no separate
    // code path, so nothing can drift out of sync.
    const packageLineItems = invSelectedPackages.map(p => ({
      id: 'pkg-' + p.id, name: `PACKAGE: ${p.name} (${(p.test_ids || []).length} tests)`, price: parseFloat(p.rate) || 0
    }));
    const effectiveLineItems = [...invSelectedTests, ...packageLineItems];

    let subtotal = effectiveLineItems.reduce((sum, t) => sum + parseFloat(t.price || 0), 0);

    const discount = parseFloat(document.getElementById('invDiscountInput').value) || 0;
    const charges = parseFloat(document.getElementById('invOtherChargesInput').value) || 0;
    const chargesNoteInput = document.getElementById('invOtherChargesNote').value;

    const effectiveDiscount = Math.min(discount, subtotal);
    let invoiceTotal = subtotal - effectiveDiscount + charges;

    const isFullPayment = document.getElementById('invFullPaymentCheckbox').checked;
    const advancePaid = parseFloat(document.getElementById('invAdvancePaidAmountInput').value) || 0;

    let amountReceived, balanceDue;
    if (isFullPayment){
      amountReceived = invoiceTotal;
      balanceDue = 0;
    } else {
      amountReceived = Math.min(invoiceTotal, advancePaid);
      balanceDue = invoiceTotal - amountReceived;
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const effectiveDiscountFixed = parseFloat(effectiveDiscount.toFixed(2));
    const chargesFixed = parseFloat(charges.toFixed(2));
    const amountReceivedFixed = parseFloat(amountReceived.toFixed(2));
    const balanceDueFixed = parseFloat(balanceDue.toFixed(2));
    const invoiceTotalFixed = parseFloat(invoiceTotal.toFixed(2));

    const now = nowIST();
    const datePart = istDateStr(now).slice(2).replace(/-/g, '');
    const timePart = istTimeCompact(now);
    const uniqueInvoiceNumber = `INV-${datePart}-${timePart}`;

    const fmt = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    document.getElementById('invSubTotalDisplay').textContent = `₹${subtotal.toLocaleString('en-IN', fmt)}`;
    document.getElementById('invDiscountDisplay').textContent = `- ₹${effectiveDiscountFixed.toLocaleString('en-IN', fmt)}`;
    document.getElementById('invChargesDisplay').textContent = `+ ₹${chargesFixed.toLocaleString('en-IN', fmt)}`;
    document.getElementById('invGrandTotalDisplay').textContent = `₹${Math.max(0, invoiceTotalFixed).toLocaleString('en-IN', fmt)}`;
    document.getElementById('invBalanceDueDisplay').textContent = `₹${balanceDueFixed.toLocaleString('en-IN', fmt)}`;

    window.invInvoiceData = {
      subtotal, discount: effectiveDiscountFixed, charges: chargesFixed, chargesNote: chargesNoteInput.trim(),
      grandTotal: amountReceivedFixed, invoiceTotal: invoiceTotalFixed,
      isFullPayment, amountReceived: amountReceivedFixed, balanceDue: balanceDueFixed,
      selectedTests: effectiveLineItems, customer: invGetSelectedCustomerData(),
      invoiceDate: document.getElementById('invInvoiceDate').value, invoiceNumber: uniqueInvoiceNumber
    };
  }

  ['invDiscountInput','invOtherChargesInput','invAdvancePaidAmountInput'].forEach(id => {
    document.getElementById(id).addEventListener('input', invCalculateTotal);
  });
  document.getElementById('invB2bNameSelect').addEventListener('change', invCalculateTotal);

