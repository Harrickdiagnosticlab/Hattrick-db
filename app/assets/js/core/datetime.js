  // ---------- IST (India Standard Time, UTC+5:30) helpers ----------
  // Always compute "today" and invoice timestamps in IST, regardless of
  // the device/browser's own timezone setting.
  function nowIST(){
    return new Date(Date.now() + 5.5 * 60 * 60000);
  }
  function istDateStr(d){
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function istTimeCompact(d){
    const h = String(d.getUTCHours()).padStart(2, '0');
    const mi = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
    return `${h}${mi}${s}${ms}`;
  }

  // ---------- Single shared date formatter — DD/MM/YYYY everywhere ----------
  // Used for every date shown in the UI, printed invoices, and CSV exports.
  function formatDMY(input){
    if (!input) return '—';
    if (typeof input === 'string'){
      // Plain 'YYYY-MM-DD' (or 'YYYY-MM-DDTHH:mm...') text — convert directly,
      // avoiding any timezone shift that new Date() could introduce.
      const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
      if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    const d = (input instanceof Date) ? input : new Date(input);
    if (isNaN(d.getTime())) return String(input);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  // ---------- Wires a native date input to a read-only DD/MM/YYYY display ----------
  // The native input stays functionally in control (its .value is still the
  // ISO YYYY-MM-DD string every other function already reads) — this just
  // fixes what the person actually SEES, since browsers render <input type=date>
  // in their own locale format regardless of what we do.
  function wireDateDisplay(nativeId, displayId){
    const native = document.getElementById(nativeId);
    const display = document.getElementById(displayId);
    function sync(){ display.value = native.value ? formatDMY(native.value) : ''; }
    native.addEventListener('change', sync);
    native.addEventListener('input', sync);
    sync();
    return sync;
  }

