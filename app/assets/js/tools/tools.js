// ---------- Tools (Employee & Admin tabs) ----------
  // Each tool is its own self-contained HTML file under assets/tools/ —
  // opened in an iframe exactly as-authored (no code inside a tool is ever
  // touched here). This file only renders the launcher grid + iframe shell.
  const TOOLS_REGISTRY = [
    {
      id: 'invoice-header-tool',
      name: 'Invoice Header Tool',
      description: 'Replace an invoice PDF\'s header with a partner logo/branding, preview, and download or print.',
      file: 'assets/js/tools/invoice-header-tool.html'
    }
  ];

  function toolsRenderLauncher(containerId){
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="tools-grid" id="${containerId}-grid"></div>
      <div class="tools-frame-wrap" id="${containerId}-frameWrap" style="display:none;">
        <button class="btn ghost btn-sm tools-back-btn" id="${containerId}-backBtn">← Back to Tools</button>
        <iframe class="tools-iframe" id="${containerId}-iframe"></iframe>
      </div>
    `;

    const grid = document.getElementById(containerId + '-grid');
    grid.innerHTML = TOOLS_REGISTRY.map(tool => `
      <div class="panel tool-card" data-tool-file="${escapeHtml(tool.file)}">
        <div class="tool-card-title">${escapeHtml(tool.name)}</div>
        <div class="tool-card-desc">${escapeHtml(tool.description)}</div>
        <button class="btn moss btn-sm">Open</button>
      </div>
    `).join('');

    const frameWrap = document.getElementById(containerId + '-frameWrap');
    const iframe = document.getElementById(containerId + '-iframe');
    const backBtn = document.getElementById(containerId + '-backBtn');

    grid.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', () => {
        iframe.src = card.dataset.toolFile;
        grid.style.display = 'none';
        frameWrap.style.display = 'block';
      });
    });

    backBtn.addEventListener('click', () => {
      iframe.src = 'about:blank';
      frameWrap.style.display = 'none';
      grid.style.display = 'grid';
    });
  }

  function toolsInit(){
    toolsRenderLauncher('tab-tools');
    toolsRenderLauncher('tab-admin-tools');
  }

  toolsInit();
