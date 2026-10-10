'use strict';
/* ==========================================================================
   Integrations: notifications · Google Calendar · iPhone Reminders
   (Shortcuts) · .ics · screenshots (IndexedDB) · backup · CSV
   ========================================================================== */

// ── Notifications ─────────────────────────────────────────────────────────
const Notify = {
  supported: () => 'Notification' in window,
  state() { return this.supported() ? Notification.permission : 'unsupported'; },
  async request() {
    if (!this.supported()) {
      UI.toast(`${I('info', 16)} On iPhone, add YRB’s World to your Home Screen first, then enable notifications`, 'warn');
      return false;
    }
    const p = await Notification.requestPermission();
    Store.s.notif = p === 'granted'; Store.save();
    if (p === 'granted') this.show('Notifications on', 'You’ll get task reminders and focus alerts.');
    else UI.toast('Notifications were not allowed', 'warn');
    App.render();
    return p === 'granted';
  },
  async show(title, body) {
    if (!this.supported() || Notification.permission !== 'granted') return;
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
      if (reg) return reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
      new Notification(title, { body });
    } catch { try { new Notification(title, { body }); } catch {} }
  },
};

function checkReminders() {
  const now = Date.now();
  let changed = false;
  for (const t of Store.d.tasks) {
    if (t.reminder && !t.done && !t.reminderFired && t.reminder <= now) {
      t.reminderFired = true; changed = true;
      Notify.show('⏰ ' + t.text, t.due ? 'Due ' + relDate(t.due) + (t.time ? ' at ' + fmtTime(t.time) : '') : 'Reminder');
      UI.toast(`${I('bell', 16)} ${esc(t.text)}`);
    }
  }
  if (changed) App.refresh();
}

// ── Google Calendar (OAuth via Google Identity Services, no backend) ─────
const GCal = {
  SCOPE: 'https://www.googleapis.com/auth/calendar.events',
  token: null, exp: 0, cache: {}, _p: null,
  init() {
    try { const t = JSON.parse(localStorage.getItem('empire_gtok') || 'null'); if (t && t.exp > Date.now()) { this.token = t.token; this.exp = t.exp; } } catch {}
    if (this.configured()) this.loadScript().catch(() => {});
  },
  configured() { return !!(Store.s.gClientId || '').trim(); },
  connected() { return !!this.token && this.exp > Date.now(); },
  loadScript() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return this._p ||= new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = res; s.onerror = () => { this._p = null; rej(new Error('Could not load Google sign-in — are you offline?')); };
      document.head.appendChild(s);
    });
  },
  async connect() {
    if (!this.configured()) { UI.toast(`${I('info', 16)} Add your Google Client ID in Profile → Integrations first`, 'warn'); App.go('profile/integrations'); return false; }
    try { await this.loadScript(); } catch (e) { UI.toast(esc(e.message), 'error'); return false; }
    return new Promise(res => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: Store.s.gClientId.trim(), scope: this.SCOPE,
        callback: r => {
          if (r.error) { UI.toast('Google: ' + esc(r.error_description || r.error), 'error'); return res(false); }
          this.token = r.access_token; this.exp = Date.now() + (+r.expires_in - 60) * 1000;
          try { localStorage.setItem('empire_gtok', JSON.stringify({ token: this.token, exp: this.exp })); } catch {}
          this.cache = {};
          UI.toast(`${I('check', 16)} Google Calendar connected`, 'success');
          res(true);
        },
        error_callback: () => { UI.toast('Google sign-in was closed or blocked by the browser', 'warn'); res(false); },
      });
      client.requestAccessToken();
    });
  },
  disconnect() {
    if (this.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(this.token, () => {});
    this.token = null; this.exp = 0; this.cache = {};
    localStorage.removeItem('empire_gtok');
    UI.toast('Google Calendar disconnected');
    App.render();
  },
  async api(path, opt = {}) {
    if (!this.connected()) { const ok = await this.connect(); if (!ok) throw new Error('not connected'); }
    const r = await fetch('https://www.googleapis.com/calendar/v3' + path, { ...opt, headers: { Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json' } });
    if (r.status === 401) { this.token = null; localStorage.removeItem('empire_gtok'); throw new Error('Google session expired — tap Connect again'); }
    if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.error?.message || 'Google API error ' + r.status); e.status = r.status; throw e; }
    return r.status === 204 ? null : r.json();
  },
  calId() { return encodeURIComponent(Store.s.gCalendarId || 'primary'); },
  async fetchMonth(y, m, force = false) {
    const key = `${y}-${m}`;
    if (!this.connected() || (!force && this.cache[key])) return false;
    const from = new Date(y, m, -7), to = new Date(y, m + 1, 8);
    const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
    const j = await this.api(`/calendars/${this.calId()}/events?${q}`);
    this.cache[key] = (j.items || []).filter(e => e.status !== 'cancelled').map(e => {
      const dt = e.start.dateTime ? new Date(e.start.dateTime) : null;
      return { id: e.id, title: e.summary || '(No title)', date: e.start.date || ymd(dt), time: dt ? `${pad(dt.getHours())}:${pad(dt.getMinutes())}` : '', link: e.htmlLink, taskId: e.extendedProperties?.private?.empireTask || '' };
    });
    return true;
  },
  eventsOn(date) {
    const seen = new Set(), out = [];
    for (const k in this.cache) for (const e of this.cache[k]) if (e.date === date && !seen.has(e.id) && !e.taskId) { seen.add(e.id); out.push(e); }
    return out.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  },
  eventBody(t) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const due = t.due || today();
    const b = { summary: t.text, description: [t.notes, 'Added from YRB’s World'].filter(Boolean).join('\n\n'), extendedProperties: { private: { empireTask: t.id } } };
    let start;
    if (t.time) {
      start = new Date(`${due}T${t.time}:00`);
      b.start = { dateTime: start.toISOString(), timeZone: tz };
      b.end = { dateTime: new Date(start.getTime() + 3600e3).toISOString(), timeZone: tz };
    } else {
      start = parseYmd(due);
      b.start = { date: due }; b.end = { date: addDays(due, 1) };
    }
    if (t.reminder) b.reminders = { useDefault: false, overrides: [{ method: 'popup', minutes: clamp(Math.round((start - t.reminder) / 60000), 0, 40320) }] };
    const rr = { daily: 'RRULE:FREQ=DAILY', weekdays: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'RRULE:FREQ=WEEKLY', monthly: 'RRULE:FREQ=MONTHLY', yearly: 'RRULE:FREQ=YEARLY' }[t.repeat];
    if (rr) b.recurrence = [rr];
    return b;
  },
  async pushTask(t) {
    const body = JSON.stringify(this.eventBody(t));
    let ev = null;
    if (t.gcalId) {
      try { ev = await this.api(`/calendars/${this.calId()}/events/${encodeURIComponent(t.gcalId)}`, { method: 'PATCH', body }); }
      catch (e) { if (e.status !== 404 && e.status !== 410) throw e; }
    }
    if (!ev) ev = await this.api(`/calendars/${this.calId()}/events`, { method: 'POST', body });
    t.gcalId = ev.id; Store.save(); this.cache = {};
    return ev;
  },
  templateUrl(t) {
    const due = t.due || today();
    const f = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    let dates;
    if (t.time) { const s = new Date(`${due}T${t.time}:00`); dates = `${f(s)}/${f(new Date(s.getTime() + 3600e3))}`; }
    else dates = `${due.replace(/-/g, '')}/${addDays(due, 1).replace(/-/g, '')}`;
    return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: t.text, dates, details: t.notes || '' });
  },
  // Smart send: API sync when set up, otherwise Google's "add event" page (works with zero setup).
  async send(t) {
    if (this.configured()) {
      try { await this.pushTask(t); UI.toast(`${I('check', 16)} Synced to Google Calendar`, 'success'); App.refresh(); }
      catch (e) { if (e.message !== 'not connected') UI.toast(esc(e.message), 'error'); }
      return;
    }
    window.open(this.templateUrl(t), '_blank', 'noopener');
  },
  async pushUpcoming() {
    const t0 = today(), list = Store.d.tasks.filter(t => !t.done && t.due && t.due >= t0);
    if (!list.length) return UI.toast('No upcoming dated tasks to sync');
    let n = 0;
    try { for (const t of list) { await this.pushTask(t); n++; } UI.toast(`${I('check', 16)} ${n} task${n === 1 ? '' : 's'} synced to Google Calendar`, 'success'); }
    catch (e) { if (e.message !== 'not connected') UI.toast(`Synced ${n}, then: ${esc(e.message)}`, 'error'); }
    App.refresh();
  },
};

// ── iPhone Reminders via Apple Shortcuts ──────────────────────────────────
// Apple has no web API for Reminders. A one-time Shortcut receives
// "Title | YYYY-MM-DD HH:MM" lines and adds each one as a reminder.
const Reminders = {
  isApple: () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent),
  line(t) {
    let when = '';
    if (t.reminder) when = toLocalInput(t.reminder).replace('T', ' ');
    else if (t.due) when = `${t.due} ${t.time || '09:00'}`;
    return t.text.replace(/[|\n\r]/g, ' ').trim() + (when ? ' | ' + when : '');
  },
  send(tasks) {
    tasks = [].concat(tasks).filter(Boolean);
    if (!tasks.length) return UI.toast('Nothing to send');
    const text = tasks.map(t => this.line(t)).join('\n');
    if (!this.isApple()) {
      navigator.clipboard?.writeText(text).catch(() => {});
      UI.toast(`${I('phone', 16)} Open YRB’s World on your iPhone to send to Reminders (copied to clipboard)`, 'warn');
      return;
    }
    const name = Store.s.shortcutName || 'Add to Reminders';
    location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(text)}`;
  },
  test() { this.send([{ text: 'YRB’s World test reminder', due: today(), time: pad(new Date().getHours() + 1 > 23 ? 23 : new Date().getHours() + 1) + ':00' }]); },
};

// ── .ics (Apple Calendar / Outlook / anything) ────────────────────────────
const ICS = {
  e: s => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'),
  stamp: d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
  event(t) {
    const due = t.due || today();
    const L = ['BEGIN:VEVENT', `UID:${t.id}@empire.app`, `DTSTAMP:${this.stamp(new Date())}`, `SUMMARY:${this.e(t.text)}`];
    if (t.time) { const s = new Date(`${due}T${t.time}:00`); L.push(`DTSTART:${this.stamp(s)}`, `DTEND:${this.stamp(new Date(s.getTime() + 3600e3))}`); }
    else L.push(`DTSTART;VALUE=DATE:${due.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(due, 1).replace(/-/g, '')}`);
    if (t.notes) L.push(`DESCRIPTION:${this.e(t.notes)}`);
    const rr = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' }[t.repeat];
    if (rr) L.push('RRULE:' + rr);
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${this.e(t.text)}`, t.reminder ? `TRIGGER;VALUE=DATE-TIME:${this.stamp(new Date(t.reminder))}` : 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT');
    return L.join('\r\n');
  },
  download(tasks, name = 'empire-tasks.ics') {
    tasks = [].concat(tasks);
    if (!tasks.length) return UI.toast('No dated tasks to export');
    downloadFile(name, ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//YRB’s World//Command Centre//EN', 'CALSCALE:GREGORIAN', ...tasks.map(t => this.event(t)), 'END:VCALENDAR'].join('\r\n'), 'text/calendar');
  },
};

// ── Screenshots in IndexedDB (keeps localStorage small) ───────────────────
const Img = {
  _db: null, urls: {},
  db() {
    return this._db ||= new Promise((res, rej) => {
      const r = indexedDB.open('empire-images', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('img');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.db();
    return new Promise((res, rej) => {
      const t = db.transaction('img', mode), req = fn(t.objectStore('img'));
      t.oncomplete = () => res(req?.result); t.onerror = () => rej(t.error);
    });
  },
  get(id) { return this.tx('readonly', s => s.get(id)); },
  del(id) { delete this.urls[id]; return this.tx('readwrite', s => s.delete(id)).catch(() => {}); },
  async compress(file, max = 1800) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(r, 'image/jpeg', .86)) || file;
    } catch { return file; }
  },
  async add(file) {
    const id = 'img_' + uid();
    const blob = await this.compress(file);
    await this.tx('readwrite', s => s.put(blob, id));
    return id;
  },
  async hydrate(root) {
    for (const el of $$('[data-img]', root)) {
      const id = el.dataset.img;
      if (!this.urls[id]) { const b = await this.get(id).catch(() => null); if (!b) continue; this.urls[id] = URL.createObjectURL(b); }
      if (el.tagName === 'IMG') el.src = this.urls[id]; else el.style.backgroundImage = `url(${this.urls[id]})`;
    }
  },
};

// ── Backup ────────────────────────────────────────────────────────────────
const Backup = {
  export() {
    downloadFile(`empire-backup-${today()}.json`, JSON.stringify(Store.d, null, 2), 'application/json');
    localStorage.setItem('empire_lastBackup', String(Date.now()));
    UI.toast(`${I('check', 16)} Backup downloaded`, 'success');
  },
  import() {
    pickFile('.json,application/json', async f => {
      let o;
      try { o = JSON.parse(await f.text()); } catch { return UI.toast('That file isn’t valid JSON', 'error'); }
      if (Array.isArray(o)) { // old To-Do app export
        const add = o.map(normTask);
        Store.d.tasks.push(...add); App.refresh();
        return UI.toast(`${I('check', 16)} Imported ${add.length} tasks`, 'success');
      }
      if (!o || typeof o !== 'object' || !o.settings) return UI.toast('That file isn’t an YRB’s World backup', 'error');
      UI.confirm('Restore backup?', 'This replaces everything currently in the app with the contents of the backup file.', 'Restore', () => {
        Store.replace(o); App.refresh(); UI.toast(`${I('check', 16)} Backup restored`, 'success');
      });
    });
  },
  lastLabel() { const t = +localStorage.getItem('empire_lastBackup'); return t ? fmtDT(t) : 'Never'; },
};

// ── CSV ───────────────────────────────────────────────────────────────────
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const delim = [',', ';', '\t'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
