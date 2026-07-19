  // ---------- Tools sub-navigation (switches between individual tools) ----------
  document.querySelectorAll('.tools-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = btn.closest('.tools-subnav');
      nav.querySelectorAll('.tools-subtab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const root = nav.closest('.tools-shared-root');
      root.querySelectorAll('.tools-subpanel').forEach(p => p.classList.remove('active'));
      document.getElementById('toolsSubpanel-' + btn.dataset.tool).classList.add('active');
    });
  });
