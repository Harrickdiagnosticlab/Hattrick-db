// ---------- Tools sub-navigation (switches between individual tools) ----------
  document.querySelectorAll('.tools-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = btn.closest('.tools-subnav');
      nav.querySelectorAll('.tools-subtab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const root = nav.closest('.tools-shared-root');
      root.querySelectorAll('.tools-subpanel').forEach(p => p.classList.remove('active'));
      document.getElementById('toolsSubpanel-' + btn.dataset.tool).classList.add('active');

      toolsLoadToolFor(btn.dataset.tool);
    });
  });

  // ---------- Per-tool lazy loading ----------
  // Each tool loads its own dependencies only once, only when actually opened —
  // so opening one tool never forces another tool's libraries to download too.
  const toolsLoadedState = {};

  function toolsLoadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.body.appendChild(s);
    });
  }

  function toolsShowLoadError(toolId, message){
    const msgEl = document.getElementById('toolsLoadingMsg-' + toolId);
    if (msgEl) msgEl.textContent = message;
  }

  function toolsLoadToolFor(toolId){
    if (toolId === 'header-changer') return toolsLoadHeaderChangerOnce();
    if (toolId === 'data-backup') return toolsLoadDataBackupOnce();
  }

  async function toolsLoadHeaderChangerOnce(){
    if (toolsLoadedState['header-changer']) return;
    toolsLoadedState['header-changer'] = 'loading';
    try {
      await toolsLoadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
      await toolsLoadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      await toolsLoadScript('assets/js/tools/header-tool.js');
      toolsLoadedState['header-changer'] = 'loaded';
      document.getElementById('toolsLoadingMsg-header-changer').classList.add('tools-hide');
      document.getElementById('toolsContentWrap-header-changer').classList.remove('tools-hide');
    } catch (e) {
      toolsLoadedState['header-changer'] = null;
      toolsShowLoadError('header-changer', 'Could not load the tool — check your internet connection and try again.');
    }
  }

  async function toolsLoadDataBackupOnce(){
    if (toolsLoadedState['data-backup']) return;
    toolsLoadedState['data-backup'] = 'loading';
    try {
      await toolsLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      await toolsLoadScript('assets/js/tools/data-backup.js');
      toolsLoadedState['data-backup'] = 'loaded';
    } catch (e) {
      toolsLoadedState['data-backup'] = null;
      toolsShowLoadError('data-backup', 'Could not load the tool — check your internet connection and try again.');
      document.getElementById('toolsLoadingMsg-data-backup').classList.remove('tools-hide');
    }
  }
