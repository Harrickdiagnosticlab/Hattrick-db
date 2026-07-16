  // ---------- View mode (Mobile / PC) ----------
  function applyViewMode(mode){
    document.body.classList.toggle('pc-view', mode === 'pc');
    document.getElementById('viewModeMobileBtn').classList.toggle('active', mode !== 'pc');
    document.getElementById('viewModePcBtn').classList.toggle('active', mode === 'pc');
    try{ localStorage.setItem('labAppViewMode', mode); }catch(e){}
  }
  document.getElementById('viewModeMobileBtn').addEventListener('click', () => applyViewMode('mobile'));
  document.getElementById('viewModePcBtn').addEventListener('click', () => applyViewMode('pc'));

  let savedViewMode = 'mobile';
  try{ savedViewMode = localStorage.getItem('labAppViewMode') || 'mobile'; }catch(e){}
  applyViewMode(savedViewMode);

