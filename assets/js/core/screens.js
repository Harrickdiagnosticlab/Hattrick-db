  // ---------- Screens ----------
  const authScreen = document.getElementById('authScreen');
  const adminWrap = document.getElementById('adminWrap');
  const empWrap = document.getElementById('empWrap');

  function showScreen(name){
    authScreen.style.display = name === 'auth' ? 'flex' : 'none';
    adminWrap.style.display = name === 'admin' ? 'block' : 'none';
    empWrap.style.display = name === 'employee' ? 'block' : 'none';
  }

  function escapeHtml(str){
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function showMsg(el, text, type){
    el.textContent = text;
    el.className = 'msg show ' + type;
  }
  function clearMsg(el){ el.className = 'msg'; }

