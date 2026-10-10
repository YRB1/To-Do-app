'use strict';
/* Boot */

(function boot() {
  Store.load();
  Theme.apply();
  GCal.init();
  Focus.load();

  Theme.mq.addEventListener?.('change', () => { if (Store.s.theme === 'system') { Theme.apply(); } });
  window.addEventListener('hashchange', () => App.route());
  App.route();
  Music.renderDock();

  const tickClock = () => {
    const el = $('#clock'); if (!el) return;
    const n = new Date();
    const parts = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(n);
    let seenMin = false;
    const t = parts.map(p => { if (p.type === 'minute') seenMin = true; else if (seenMin && (p.type === 'second' || (p.type === 'literal' && p.value.trim() === ':'))) return `<span class="sec">${p.value}</span>`; return esc(p.value); }).join('');
    el.innerHTML = `<b>${t}</b><small>${n.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })}</small>`;
  };
  tickClock();
  setInterval(() => { Focus.tick(); tickClock(); }, 1000);
  setInterval(checkReminders, 20000);
  checkReminders();

  // Re-render when returning to the app (new day, reminders, other-tab edits)
  let lastDay = today();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    checkReminders();
    if (today() !== lastDay) { lastDay = today(); App.render(); }
  });
  window.addEventListener('storage', e => { if (e.key === Store.KEY) { Store.load(); App.render(); } });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && UI.stack.length) { UI.close(); return; }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (typing || e.metaKey || e.ctrlKey || e.altKey || UI.stack.length) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); QuickAdd.open(); }
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); Tasks.edit(); }
    else if (k === 't') { e.preventDefault(); Trading.edit(); }
    else if (k === '/') { const s = $('#taskSearch'); if (s) { e.preventDefault(); s.focus(); } }
    else if (/^[1-8]$/.test(k)) { const ids = ['dashboard', 'tasks', 'calendar', 'goals', 'business', 'habits', 'trading', 'wealth']; App.go(ids[+k - 1]); }
  });

  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
