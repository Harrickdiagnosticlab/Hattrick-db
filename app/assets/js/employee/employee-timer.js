  // ---------- Employee: timer ----------
  const statusTag = document.getElementById('statusTag');
  const statusText = document.getElementById('statusText');
  const timerEl = document.getElementById('timer');
  const punchBtn = document.getElementById('punchBtn');
  const historyList = document.getElementById('historyList');

  function formatElapsed(ms){
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function startTicking(){
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(renderTimer, 1000);
    renderTimer();
  }

  function renderTimer(){
    if (openSession){
      const elapsed = Date.now() - new Date(openSession.check_in).getTime();
      timerEl.textContent = formatElapsed(elapsed);
      timerEl.classList.remove('idle');
      statusTag.classList.add('active');
      statusText.textContent = 'On shift';
      punchBtn.textContent = 'Check Out';
      punchBtn.className = 'punch-btn out';
    } else {
      timerEl.textContent = '00:00:00';
      timerEl.classList.add('idle');
      statusTag.classList.remove('active');
      statusText.textContent = 'Off shift';
      punchBtn.textContent = 'Check In';
      punchBtn.className = 'punch-btn in';
    }
  }

  async function loadOpenSession(){
    const { data, error } = await sb
      .from('checkins')
      .select('id, check_in')
      .eq('employee_id', currentEmployee.id)
      .is('check_out', null)
      .order('check_in', { ascending: false })
      .limit(1);

    openSession = (!error && data && data.length > 0) ? data[0] : null;
    renderTimer();
  }

  async function loadHistory(){
    const { data, error } = await sb
      .from('checkins')
      .select('id, check_in, check_out, duration_seconds')
      .eq('employee_id', currentEmployee.id)
      .not('check_out', 'is', null)
      .order('check_in', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0){
      historyList.innerHTML = '<div class="empty">No completed sessions yet.</div>';
      return;
    }

    historyList.innerHTML = data.map(row => {
      const d = new Date(row.check_in);
      const dateStr = formatDMY(d);
      const inTime = d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
      const outTime = new Date(row.check_out).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
      return `
        <div class="row">
          <div>
            <div class="row-date">${dateStr}</div>
            <div class="row-time">${inTime} → ${outTime}</div>
          </div>
          <div class="row-duration">${formatElapsed(row.duration_seconds * 1000)}</div>
        </div>`;
    }).join('');
  }

  punchBtn.addEventListener('click', async () => {
    punchBtn.disabled = true;
    if (!openSession){
      const { data, error } = await sb
        .from('checkins')
        .insert({ employee_id: currentEmployee.id, check_in: new Date().toISOString() })
        .select('id, check_in')
        .single();
      if (!error && data){ openSession = data; renderTimer(); }
    } else {
      const checkOutTime = new Date();
      const durationSec = Math.round((checkOutTime.getTime() - new Date(openSession.check_in).getTime()) / 1000);
      const { error } = await sb
        .from('checkins')
        .update({ check_out: checkOutTime.toISOString(), duration_seconds: durationSec })
        .eq('id', openSession.id);
      if (!error){ openSession = null; renderTimer(); await loadHistory(); }
    }
    punchBtn.disabled = false;
  });

