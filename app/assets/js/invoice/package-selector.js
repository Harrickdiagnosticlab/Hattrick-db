  // ---------- Package selector ----------
  function invPopulatePackageSelector(){ invFilterPackages(''); }

  function invFilterPackages(searchTerm){
    const lower = searchTerm.toLowerCase().trim();
    if (invAllPackages.length === 0){
      document.getElementById('invPackageSelectorContainer').innerHTML = '<p class="empty">No packages available.</p>';
      return;
    }
    const list = lower === '' ? invAllPackages : invAllPackages.filter(p => p.name.toLowerCase().includes(lower));
    invRenderPackageCheckboxes(list);
  }

  function invPackageTestNames(pkg){
    const ids = pkg.test_ids || [];
    return ids.map(id => {
      const t = invAllTests.find(x => x.id === id);
      return t ? t.name : null;
    }).filter(Boolean).join(', ') || '—';
  }

  function invRenderPackageCheckboxes(list){
    const container = document.getElementById('invPackageSelectorContainer');
    if (list.length === 0){
      container.innerHTML = '<p class="empty">No matching packages found.</p>';
      return;
    }
    container.innerHTML = list.map(p => {
      const isChecked = invSelectedPackages.some(sp => sp.id === p.id);
      return `
      <div class="pkg-item-wrap">
        <div class="inv-service-item">
          <input type="checkbox" id="inv-pkg-${p.id}" value="${p.id}" ${isChecked ? 'checked' : ''} />
          <label for="inv-pkg-${p.id}" style="flex-grow:1; margin-bottom:0; font-weight:400; cursor:pointer;">${escapeHtml(p.name)}</label>
          <button type="button" class="pkg-expand-toggle" data-target="inv-pkg-detail-${p.id}">▼ tests</button>
          <span class="pkg-mrp-strike">₹${parseFloat(p.mrp).toFixed(2)}</span>
          <span class="inv-service-price">₹${parseFloat(p.rate).toFixed(2)}</span>
        </div>
        <div class="pkg-tests-detail" id="inv-pkg-detail-${p.id}">${escapeHtml(invPackageTestNames(p))}</div>
      </div>`;
    }).join('');

    container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', invHandlePackageSelection));
    container.querySelectorAll('.pkg-expand-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const detail = document.getElementById(btn.dataset.target);
        const show = !detail.classList.contains('open');
        detail.classList.toggle('open', show);
        btn.textContent = show ? '▲ tests' : '▼ tests';
      });
    });
  }

  function invHandlePackageSelection(event){
    const pkgId = event.target.value;
    const pkg = invAllPackages.find(p => p.id === pkgId);
    if (event.target.checked){
      if (pkg && !invSelectedPackages.some(p => p.id === pkg.id)) invSelectedPackages.push(pkg);
    } else {
      invSelectedPackages = invSelectedPackages.filter(p => p.id !== pkgId);
    }
    invUpdateSelectionBadges();
    invCalculateTotal();
  }

  document.getElementById('invPackageSearch').addEventListener('input', (e) => invFilterPackages(e.target.value));

