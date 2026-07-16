  // ---------- Payment type ----------
  function invHandlePaymentTypeChange(){
    const isFull = document.getElementById('invFullPaymentCheckbox').checked;
    const section = document.getElementById('invAdvancePaymentSection');
    if (isFull){
      section.style.display = 'none';
      document.getElementById('invAdvancePaidAmountInput').value = 0;
    } else {
      section.style.display = 'block';
    }
    invCalculateTotal();
  }
  document.getElementById('invFullPaymentCheckbox').addEventListener('change', invHandlePaymentTypeChange);

