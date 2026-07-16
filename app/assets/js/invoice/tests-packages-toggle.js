  // ---------- Tests / Packages mode toggle (shared selection box) ----------
  function invUpdateSelectionBadges(){
    const testsBadge = document.getElementById('invTestsSelectedBadge');
    const pkgBadge = document.getElementById('invPackagesSelectedBadge');
    testsBadge.textContent = invSelectedTests.length > 0 ? `(${invSelectedTests.length})` : '';
    pkgBadge.textContent = invSelectedPackages.length > 0 ? `(${invSelectedPackages.length})` : '';
  }

  document.querySelectorAll('#invModePills .mode-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#invModePills .mode-pill').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const showTests = btn.dataset.mode === 'tests';
      document.getElementById('invTestsModeWrap').style.display = showTests ? 'block' : 'none';
      document.getElementById('invPackagesModeWrap').style.display = showTests ? 'none' : 'block';
    });
  });
