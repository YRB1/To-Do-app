'use strict';
/* Cloud — sync between devices + push reminders, through Supabase (project: yrb-nova, tables world_*).
   Your API keys and passwords for other services never leave the device. */

const Cloud = {
  URL: 'https://zosahhhqcqpqmpwahkbs.supabase.co',
  KEY: 'sb_publishable_q4yoThCm0yuJolSMmzUe3g_Mml1A4ho',
  VAPID: 'BAx6tz16rOJi0WwFfYLZEtnYWAEitaPXErBh6HTSzhYu63PgTnZGeLFp45rT8RGbFduB5QwHDXbLxuTNLToiBbU',
  LOCAL: ['claudeKey', 'claudePass', 'githubToken', 'appleDevToken', 'voiceName'],
  s: null, meta: {}, applying: false, busy: false, status: 'off', err: '', _t: null,

  init() {
    try { this.s = JSON.parse(localStorage.getItem('yrb_cloud') || 'null'); this.meta = JSON.parse(localStorage.getItem('yrb_cloud_meta') || '{}'); } catch { this.s = null; this.meta = {}; }
    if (!this.s) return;
    this.status = 'ok';
    this.sync();
    setInterval(() => document.visibilityState === 'visible' && this.sync(), 60e3);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.sync(); });
    window.addEventListener('online', () => this.sync());
  },
  on() { return !!this.s; },
  uid() { return this.s?.user?.id; },
  saveSession() { if (this.s) localStorage.setItem('yrb_cloud', JSON.stringify(this.s)); else localStorage.removeItem('yrb_cloud'); },
  saveMeta() { localStorage.setItem('yrb_cloud_meta', JSON.stringify(this.meta)); },

  // ── Auth (email + password) ───────────────────────────────────────
  async auth(path, body) {
    const r = await fetch(`${this.URL}/auth/v1/${path}`, { method: 'POST', headers: { apikey: this.KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || `Sign-in error ${r.status}`);
    return j;
  },
  setSession(j) { this.s = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: { id: j.user.id, email: j.user.email } }; this.saveSession(); },
  async signUp(email, password) {
    const j = await this.auth('signup', { email, password });
    if (j.access_token) { this.setSession(j); await this.link(); return 'in'; }
    return 'confirm';
  },
  async signIn(email, password) {
    const j = await this.auth('token?grant_type=password', { email, password });
    this.setSession(j); this.status = 'ok';
    await this.link();
    this.init();
  },
  signOut() { this.s = null; this.meta = {}; this.saveSession(); localStorage.removeItem('yrb_cloud_meta'); localStorage.removeItem('yrb_push'); this.status = 'off'; App.render(); UI.toast('Signed out. Your data stays on this device.'); },
  async token() {
    if (!this.s) throw new Error('Not signed in');
    if (this.s.expires_at - 60 < Date.now() / 1000) {
      try { this.setSession(await this.auth('token?grant_type=refresh_token', { refresh_token: this.s.refresh_token })); }
      catch (e) { this.s = null; this.saveSession(); this.status = 'off'; throw new Error('Signed out — sign in again in Connections'); }
    }
    return this.s.access_token;
  },
  async rest(path, { method = 'GET', body, prefer } = {}) {
    const h = { apikey: this.KEY, Authorization: 'Bearer ' + await this.token(), 'content-type': 'application/json' };
    if (prefer) h.Prefer = prefer;
    const r = await fetch(`${this.URL}/rest/v1/${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || `Sync error ${r.status}`); }
    return r.status === 204 || method !== 'GET' ? null : r.json();
  },

  // ── Sync ─────────────────────────────────────────────────────────
  clean() {
    const d = JSON.parse(JSON.stringify(Store.d));
    for (const k of this.LOCAL) delete d.settings[k];
    return d;
  },
  async remote(full = true) { const rows = await this.rest(`world_state?select=${full ? 'data,saved_at' : 'saved_at'}&user_id=eq.${this.uid()}`); return rows[0] || null; },
  apply(r) {
    const keep = {}; for (const k of this.LOCAL) keep[k] = Store.s[k];
    this.applying = true;
    Store.d = Store.normalize(r.data);
    Object.assign(Store.d.settings, keep);
    try { ensureSpaces(Store.d); ensureVision(Store.d); ensureRoutineTasks(Store.d); cleanUpV1(Store.d); proV1(Store.d); gymV1(Store.d); postingV1(Store.d); } catch {}
    Store.d._savedAt = +r.saved_at;
    try { localStorage.setItem(Store.KEY, JSON.stringify(Store.d)); } catch {}
    this.applying = false;
    this.meta.remoteAt = +r.saved_at; this.meta.dirty = false; this.saveMeta();
    App.render();
  },
  async pushNow() {
    const at = Store.d._savedAt || Date.now();
    await this.rest('world_state?on_conflict=user_id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { user_id: this.uid(), data: this.clean(), saved_at: at, updated_at: new Date().toISOString() } });
    this.meta.remoteAt = at; this.meta.dirty = false; this.meta.lastSync = Date.now(); this.saveMeta();
    this.syncReminders().catch(() => {});
  },
  async sync() {
    if (!this.s || this.busy || !navigator.onLine) return;
    this.busy = true; this.status = 'syncing'; this.paint();
    try {
      const r = await this.remote(false);
      const remoteAt = r ? +r.saved_at : 0, localAt = Store.d._savedAt || 0;
      if (remoteAt > (this.meta.remoteAt || 0)) {
        // Another device saved since we last synced. Newest wins.
        if (!this.meta.dirty || remoteAt >= localAt) this.apply(await this.remote(true));
        else await this.pushNow();
      } else if (this.meta.dirty || !r) await this.pushNow();
      this.meta.lastSync = Date.now(); this.saveMeta();
      this.status = 'ok'; this.err = '';
    } catch (e) { this.status = 'error'; this.err = e.message; }
    this.busy = false; this.paint();
  },
  dirty() {
    if (this.applying || !this.s) return;
    this.meta.dirty = true; this.saveMeta();
    clearTimeout(this._t); this._t = setTimeout(() => this.sync(), 2500);
  },
  // First sign-in on a device: choose which copy wins.
  async link() {
    const r = await this.remote(true);
    if (!r) { await this.pushNow(); UI.toast(`${I('check', 16)} Sync is on — this device’s data is now in the cloud`, 'success'); return; }
    const count = d => `${(d.tasks || []).filter(t => !t.done).length} open tasks · ${(d.goals || []).length} goals · ${(d.journal || []).filter(e => e.wins || e.text || e.mood).length} journal entries`;
    return new Promise(res => UI.modal({ title: 'Which data should this device use?', small: true,
      body: `<p class="muted" style="margin-bottom:14px">You already have data in the cloud. Pick the copy to keep — the other one is replaced.</p>
        <div class="dp-row" style="padding:12px"><span class="grow"><b>Cloud</b><br><small class="faint">${count(r.data)} · saved ${fmtDT(+r.saved_at)}</small></span></div>
        <div class="dp-row" style="padding:12px;margin-top:8px"><span class="grow"><b>This device</b><br><small class="faint">${count(Store.d)}</small></span></div>`,
      footer: [{ label: 'Keep this device', cls: 'ghost', onClick: async () => { await this.pushNow(); res(); } }, 'spacer', { label: 'Use cloud data', cls: 'primary', onClick: () => { this.apply(r); res(); } }],
      onClose: res }));
  },
  paint() { const el = $('#syncState'); if (el) el.outerHTML = this.badge(); },
  badge() {
    if (!this.s) return `<span id="syncState" class="sync off">Not synced</span>`;
    const t = { syncing: 'Syncing…', ok: this.meta.lastSync ? 'Synced ' + this.ago(this.meta.lastSync) : 'Synced', error: 'Sync error' }[this.status] || 'Synced';
    return `<span id="syncState" class="sync ${this.status}" title="${esc(this.err)}">${t}</span>`;
  },
  ago(ms) { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : Math.round(m / 60) + 'h ago'; },

  // ── Push reminders (work with the app closed) ─────────────────────
  pushOn() { return localStorage.getItem('yrb_push') === '1'; },
  upcoming(days = 7) {
    const now = Date.now(), until = now + days * 864e5, out = [];
    for (const t of Store.d.tasks) {
      if (t.done || !t.reminder) continue;
      const base = t.due && t.time ? new Date(`${t.due}T${t.time}:00`).getTime() : t.reminder;
      const off = t.reminder - base, sp = t.spaceId && Store.space(t.spaceId);
      const mk = (ts, key) => out.push({ user_id: this.uid(), id: key, title: t.text, body: [t.time ? fmtTime(t.time) : '', sp ? sp.name : ''].filter(Boolean).join(' · ') || 'Reminder', url: './#/tasks/' + t.id, fire_at: new Date(ts).toISOString() });
      if (t.repeat === 'none' || !t.due || !t.time) { if (t.reminder > now && t.reminder < until) mk(t.reminder, t.id); continue; }
      let d = t.due, n = 0;
      while (n++ < 40) {
        const ts = new Date(`${d}T${t.time}:00`).getTime() + off;
        if (ts > until) break;
        if (ts > now) mk(ts, `${t.id}@${d}`);
        const x = parseYmd(d);
        if (t.repeat === 'daily') x.setDate(x.getDate() + 1);
        else if (t.repeat === 'weekdays') { do x.setDate(x.getDate() + 1); while (x.getDay() === 0 || x.getDay() === 6); }
        else if (t.repeat === 'weekly') x.setDate(x.getDate() + 7);
        else if (t.repeat === 'monthly') x.setMonth(x.getMonth() + 1);
        else x.setFullYear(x.getFullYear() + 1);
        d = ymd(x);
      }
    }
    return out.sort((a, b) => a.fire_at.localeCompare(b.fire_at)).slice(0, 200);
  },
  async syncReminders() {
    if (!this.s || !this.pushOn()) return;
    await this.rest(`world_reminders?user_id=eq.${this.uid()}&sent_at=is.null`, { method: 'DELETE' });
    const rows = this.upcoming();
    if (rows.length) await this.rest('world_reminders?on_conflict=user_id,id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: rows });
  },
  b64(s) { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); },
  async enablePush() {
    if (!this.s) { UI.toast('Turn on sync first — sign in above', 'warn'); return; }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      UI.toast(`${I('info', 16)} On iPhone: add YRB’s World to your Home Screen, open it from there, then turn this on`, 'warn'); return;
    }
    const p = await Notification.requestPermission();
    if (p !== 'granted') { UI.toast('Notifications weren’t allowed. Turn them on in Settings → Notifications → YRB’s World', 'warn'); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.b64(this.VAPID) });
      const j = sub.toJSON();
      await this.rest('world_push_subs?on_conflict=endpoint', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { endpoint: j.endpoint, user_id: this.uid(), p256dh: j.keys.p256dh, auth: j.keys.auth } });
      localStorage.setItem('yrb_push', '1'); Store.s.notif = true;
      await this.syncReminders();
      await this.testPush();
      App.render();
    } catch (e) { UI.toast(`${I('info', 16)} Couldn’t turn on notifications: ${esc(e.message)}`, 'error'); }
  },
  async testPush() {
    const r = await fetch(`${this.URL}/functions/v1/world-push`, { method: 'POST', headers: { Authorization: 'Bearer ' + await this.token(), apikey: this.KEY, 'content-type': 'application/json' }, body: JSON.stringify({ test: true }) });
    const j = await r.json().catch(() => ({}));
    UI.toast(j.sent ? `${I('bell', 16)} Test notification sent` : `${I('info', 16)} ${esc(j.error || 'No device registered yet')}`, j.sent ? 'success' : 'warn');
  },

  card() {
    if (!this.s) return `<div class="glass card s12 sync-card">
      <div class="int-card"><div class="int-ic sync-ic">${I('refresh', 22)}</div><div class="grow">
        <div class="row between wrap"><h2>Sync & phone notifications</h2>${this.badge()}</div>
        <p class="muted">Sign in once on each device and your tasks, sections, goals, journal and everything else stay the same on your phone and laptop. It also lets reminders reach your phone when the app is closed.</p>
        <form class="form mt" id="cloudForm" onsubmit="return false">
          ${F({ name: 'email', label: 'Email', type: 'email', value: Store.s.email || 'yrbnova@gmail.com', attrs: ' autocomplete="username"' })}
          ${F({ name: 'password', label: 'Password', type: 'password', attrs: ' autocomplete="current-password" minlength="8"' })}
        </form>
        <div class="row wrap mt"><button class="btn primary" onclick="Cloud.ui('in')">${I('check', 15)}Sign in</button><button class="btn" onclick="Cloud.ui('up')">Create account</button></div>
        <p class="hint">First time: tap <b>Create account</b>, open the confirmation email, then come back and <b>Sign in</b>.</p>
      </div></div></div>`;
    const push = this.pushOn();
    return `<div class="glass card s12 sync-card">
      <div class="int-card"><div class="int-ic sync-ic">${I('refresh', 22)}</div><div class="grow">
        <div class="row between wrap"><h2>Sync & phone notifications</h2>${this.badge()}</div>
        <p class="muted">Signed in as <b>${esc(this.s.user.email)}</b>. Changes sync within a few seconds and whenever you open the app.</p>
        <div class="row wrap mt"><button class="btn" onclick="Cloud.sync().then(()=>UI.toast('Synced','success'))">${I('refresh', 15)}Sync now</button><button class="btn ghost danger" onclick="Cloud.signOut()">Sign out</button></div>
        <div class="push-row mt">
          <div class="grow"><b>${push ? 'Phone notifications are on' : 'Phone notifications'}</b><small>${push ? `${this.upcoming().length} reminders scheduled for the next 7 days. They arrive even when the app is closed.` : 'Get every task reminder on your phone, even with the app closed. On iPhone this only works from the Home Screen app.'}</small></div>
          ${push ? `<button class="btn sm" onclick="Cloud.testPush()">${I('bell', 14)}Send test</button>` : `<button class="btn sm gold" onclick="Cloud.enablePush()">${I('bell', 14)}Turn on</button>`}
        </div>
      </div></div></div>`;
  },
  async ui(kind) {
    const o = readForm($('#cloudForm'));
    if (!o.email || (o.password || '').length < 8) return UI.toast('Enter your email and a password of at least 8 characters', 'warn');
    try {
      if (kind === 'up') { const r = await this.signUp(o.email, o.password); if (r === 'confirm') UI.toast(`${I('mail', 16)} Check ${esc(o.email)} and tap the confirm link, then sign in here`, 'success'); else this.init(); }
      else await this.signIn(o.email, o.password);
      App.render();
    } catch (e) { UI.toast(`${I('info', 16)} ${esc(/invalid login/i.test(e.message) ? 'Wrong email or password' : /not confirmed/i.test(e.message) ? 'Confirm your email first — check your inbox' : e.message)}`, 'error'); }
  },
};
