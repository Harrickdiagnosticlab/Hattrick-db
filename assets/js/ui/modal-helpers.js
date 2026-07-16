  // ---------- Add Amount (manual cash-in) ----------
  // ---------- Generic modal helpers ----------
  function openModal(id){ document.getElementById(id).classList.add('open'); }
  function closeModal(id){ document.getElementById(id).classList.remove('open'); }
  function wireModePills(containerId){
    document.querySelectorAll(`#${containerId} .mode-pill`).forEach(p => {
      p.addEventListener('click', () => {
        document.querySelectorAll(`#${containerId} .mode-pill`).forEach(x => x.classList.remove('selected'));
        p.classList.add('selected');
      });
    });
  }
  function getSelectedMode(containerId){
    return document.querySelector(`#${containerId} .mode-pill.selected`).dataset.mode;
  }
  wireModePills('addAmountModePills');
  wireModePills('addExpenseModePills');

