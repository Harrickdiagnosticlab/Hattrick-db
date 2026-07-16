  // ---------- Patient search ----------
  function invFilterCustomers(searchTerm){
    const resultsDiv = document.getElementById('invCustomerResultsList');
    const lower = searchTerm.toLowerCase().trim();
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'block';

    let toDisplay = invAllCustomers;
    if (lower !== ''){
      toDisplay = invAllCustomers.filter(c =>
        (c.name || '').toLowerCase().includes(lower) ||
        (c.patientId && String(c.patientId).toLowerCase().includes(lower)) ||
        (c.id && String(c.id).toLowerCase().includes(lower)) ||
        (c.phone && String(c.phone).toLowerCase().includes(lower))
      );
    }

    if (lower === '' || 'walk-in'.includes(lower)){
      resultsDiv.innerHTML += `<div class="inv-result-item" onclick="invSelectCustomerFromList('WALKIN')"><strong>Walk-in Patient</strong></div>`;
    }

    toDisplay.forEach(c => {
      const displayId = c.patientId || c.id;
      resultsDiv.innerHTML += `
        <div class="inv-result-item" onclick="invSelectCustomerFromList('${escapeHtml(c.id)}')">
          ${escapeHtml(c.name)} (ID: ${escapeHtml(displayId)}) — Ph: ${escapeHtml(c.phone || '—')}
        </div>`;
    });

    if (resultsDiv.innerHTML === ''){
      resultsDiv.innerHTML = `<div class="inv-result-item" style="color:var(--red);">No matching customers found.</div>`;
    }
  }

  function invSelectCustomerFromList(customerId){
    invCurrentSelectedCustomerId = customerId;
    document.getElementById('invCustomerResultsList').style.display = 'none';
    document.getElementById('invCustomerSearch').value = '';
    invUpdateCustomerDisplay();
  }

  function invUpdateCustomerDisplay(){
    const el = document.getElementById('invSelectedCustomerDisplay');
    const c = invGetSelectedCustomerData();
    if (c){
      el.innerHTML = `
        <strong>Patient ID:</strong> ${escapeHtml(c.id)}<br>
        <strong>Patient Name:</strong> ${escapeHtml(c.name)}<br>
        <strong>Age:</strong> ${escapeHtml(c.age)} &nbsp;&nbsp; <strong>Sex:</strong> ${escapeHtml(c.sex)}<br>
        <strong>Phone:</strong> ${escapeHtml(c.phone)}<br>
        <strong>Address:</strong> ${escapeHtml(c.address)}
      `;
    } else {
      el.textContent = 'Select or type a patient name above.';
    }
    invCalculateTotal();
  }

  function invGetSelectedCustomerData(){
    if (!invCurrentSelectedCustomerId) return null;
    if (invCurrentSelectedCustomerId === 'WALKIN'){
      return { name: 'Walk-in Patient', phone: 'N/A', address: 'N/A', id: 'WALKIN', age: 'N/A', sex: 'N/A' };
    }
    const c = invAllCustomers.find(x => x.id == invCurrentSelectedCustomerId);
    if (!c) return null;
    const officialId = c.patientId || c.id;
    return { name: c.name, phone: c.phone, address: c.address, id: officialId, age: c.age || 'N/A', sex: c.sex || 'N/A' };
  }

  document.getElementById('invCustomerSearch').addEventListener('input', (e) => invFilterCustomers(e.target.value));
  document.getElementById('invCustomerSearch').addEventListener('focus', (e) => invFilterCustomers(e.target.value));
  document.getElementById('invCustomerSearch').addEventListener('blur', () => {
    setTimeout(() => { document.getElementById('invCustomerResultsList').style.display = 'none'; }, 200);
  });

