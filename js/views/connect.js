'use strict';
/* Connections — Claude (chat + coach), Apple Music (MusicKit), GitHub, and the hub page */

// ── Claude ────────────────────────────────────────────────────────────────
// Three ways to reach Claude, best first:
//  server – the Vercel function /api/claude (key stored in Vercel, passcode-locked)
//  key    – your own API key stored on this device (direct from the browser)
//  link   – opens claude.ai with the prompt and context pre-filled (uses your Claude plan, no setup)
const Claude = {
  srv: null, busy: false,
  async probe(force) {
    if (this.srv && !force) return this.srv;
    if (!/^https?:/.test(location.protocol)) return (this.srv = { configured: false });
    try { const r = await fetch('api/claude', { cache: 'no-store' }); this.srv = r.ok ? await r.json() : { configured: false }; }
    catch { this.srv = { configured: false }; }
    return this.srv;
  },
  mode() {
    const pref = Store.s.claudeMode || 'auto';
    const server = !!(this.srv?.configured && Store.s.claudePass);
    const key = !!(Store.s.claudeKey || '').trim();
    if (pref === 'link') return 'link';
    if (pref === 'server') return server ? 'server' : 'link';
    if (pref === 'key') return key ? 'key' : 'link';
    return server ? 'server' : key ? 'key' : 'link';
  },
  label() { return { server: 'Connected through your Vercel app', key: 'Connected with your API key', link: 'Opens in the Claude app' }[this.mode()]; },
  model() { return Store.s.claudeModel || 'claude-opus-5-5'; },

  // Raw Messages API call (works for server + key modes). Returns the response JSON.
  async call(body) {
    const m = this.mode();
    body = { model: this.model(), max_tokens: 4000, ...body };
    if (m === 'server') {
      const r = await fetch('api/claude', { method: 'POST', headers: { 'content-type': 'application/json', 'x-yrb-passcode': Store.s.claudePass || '' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error?.message || `Claude error ${r.status}`);
      return j;
    }
    if (m === 'key') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': Store.s.claudeKey.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) throw new Error('Your Claude API key was rejected. Check it in Connections.');
      if (!r.ok) throw new Error(j.error?.message || `Claude error ${r.status}`);
      return j;
    }
    throw new Error('link');
  },
  text(j) { return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join(''); },

  SYSTEM: `You are Claude, built into Benjamin's personal command centre "YRB's World". He is a 22-year-old founder in Leicestershire (UK) running YRB Nova (websites + VoiceDesk AI receptionist), ClientSniper (lead-gen SaaS), YRBSUPREME (jewellery) and trading gold, while finishing a Construction Management degree.
His principles: one focus at a time; climb ladders one rung at a time (make it transact first); every goal needs a deadline; sell outcomes and recurring revenue, not cheap one-off projects; build systems that make money without his face; set goals on daily actions he controls.
Be direct, specific and practical. Use real names and numbers from the context. British English. Keep replies tight: short paragraphs or bullets, no fluff.
Whenever you suggest concrete actions, put each one on its own line starting with "☐ " (e.g. "☐ Email 10 Leicester garages with the VoiceDesk offer") so the app can turn them into tasks.`,

  // Start a conversation about something (a section, a task, the whole app).
  start({ title = 'Chat', context = '', ask = '', spaceId = '', bizId = '' } = {}) {
    if (this.mode() === 'link') return this.openApp(`${context ? 'Context from my YRB’s World app:\n' + context + '\n\n' : ''}${ask}`);
    const th = { id: 'c_' + uid(), title, context, spaceId, bizId, at: Date.now(), messages: [] };
    Store.d.chat.unshift(th); Store.d.chat = Store.d.chat.slice(0, 30); Store.save();
    App.go('coach/chat/' + th.id);
    if (ask) setTimeout(() => this.send(th.id, ask), 80);
  },
  openApp(prompt) {
    const url = 'https://claude.ai/new?q=' + encodeURIComponent(prompt.slice(0, 7000));
    window.open(url, '_blank', 'noopener');
  },
  thread(id) { return Store.d.chat.find(t => t.id === id); },
  async send(id, text) {
    const th = this.thread(id); text = (text || '').trim();
    if (!th || !text || this.busy) return;
    th.messages.push({ role: 'user', content: text }); th.at = Date.now();
    this.busy = true; Store.save(); App.render();
    try {
      const sys = this.SYSTEM + `\n\nToday is ${fmtDay(today(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.` + (th.context ? `\n\nContext for this conversation:\n${th.context}` : `\n\nSnapshot of the app:\n${JSON.stringify(Coach.snapshot())}`);
      const j = await this.call({ system: sys, messages: th.messages.slice(-20).map(m => ({ role: m.role, content: m.content })) });
      th.messages.push({ role: 'assistant', content: this.text(j) || '(No reply)' });
    } catch (e) {
      th.messages.pop();
      UI.toast(`${I('info', 16)} ${esc(e.message)}`, 'error');
      const inp = $('#chatIn'); if (inp) inp.value = text;
    }
    this.busy = false; Store.save(); App.render();
    const log = $('#chatLog'); if (log) log.scrollTop = log.scrollHeight;
  },
  tasksIn(txt) { return String(txt).split('\n').map(l => l.match(/^\s*(?:☐|\[ \]|- \[ \])\s*(.+)$/)).filter(Boolean).map(m => m[1].replace(/\*\*/g, '').trim()); },
  addTasks(id, i) {
    const th = this.thread(id); if (!th) return;
    const list = this.tasksIn(th.messages[i]?.content || '');
    list.reverse().forEach(text => Store.d.tasks.unshift(normTask({ id: uid(), text, spaceId: th.spaceId, bizId: th.bizId })));
    App.refresh();
    UI.toast(`${I('check', 16)} ${list.length} task${list.length === 1 ? '' : 's'} added${th.spaceId && Store.space(th.spaceId) ? ' to ' + esc(Store.space(th.spaceId).name) : ''}`, 'success', th.spaceId ? 'space/' + th.spaceId : 'tasks');
  },
  md(s) { // tiny, safe markdown: bold, inline code, bullets, task lines
    return esc(s).split('\n').map(l => {
      let h = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
      if (/^\s*☐\s/.test(l)) return `<div class="md-task">${I('tasks', 14)}<span>${h.replace(/^\s*☐\s/, '')}</span></div>`;
      if (/^\s*[-•*]\s/.test(l)) return `<div class="md-li">${h.replace(/^\s*[-•*]\s/, '')}</div>`;
      if (/^#{1,3}\s/.test(l)) return `<div class="md-h">${h.replace(/^#{1,3}\s/, '')}</div>`;
      return h ? `<p>${h}</p>` : '';
    }).join('');
  },
  del(id) { Store.d.chat = Store.d.chat.filter(t => t.id !== id); App.refresh(); App.go('coach'); },

  chatCard(id) {
    const th = id ? this.thread(id) : Store.d.chat[0];
    const m = this.mode();
    if (m === 'link') return `<div class="glass card s12 chat-card">
      <div class="card-h"><h2>${I('sparkles')}Claude</h2><span class="sub">${this.label()}</span></div>
      <div class="quick-add inset">${I('sparkles', 18)}<input id="chatIn" placeholder="Ask Claude anything about your businesses, trading or uni…" onkeydown="if(event.key==='Enter'){event.preventDefault();Claude.openApp('Context from my YRB’s World app:\\n'+JSON.stringify(Coach.snapshot())+'\\n\\n'+this.value)}"><button class="btn primary sm" onclick="Claude.openApp('Context from my YRB’s World app:\\n'+JSON.stringify(Coach.snapshot())+'\\n\\n'+$('#chatIn').value)">Ask in Claude</button></div>
      <p class="hint">This opens the Claude app with your question and a snapshot of your data filled in. To chat <b>inside</b> YRB’s World instead, <a href="#/connect">connect Claude</a>.</p>
    </div>`;
    return `<div class="glass card s12 chat-card">
      <div class="card-h"><h2>${I('sparkles')}Claude</h2><span class="sub">${th ? esc(th.title) : this.label()}</span>
        <div class="right">${th ? `<button class="btn xs ghost" onclick="Claude.del('${th.id}')" title="Delete chat">${I('trash', 13)}</button>` : ''}<button class="btn xs" onclick="Claude.start({title:'New chat'})">${I('plus', 13)}New chat</button></div></div>
      ${Store.d.chat.length > 1 ? `<div class="chat-threads">${Store.d.chat.slice(0, 8).map(t => `<a href="#/coach/chat/${t.id}" class="${th && t.id === th.id ? 'on' : ''}">${esc(t.title)}</a>`).join('')}</div>` : ''}
      <div class="chat-log" id="chatLog">
        ${th && th.messages.length ? th.messages.map((msg, i) => msg.role === 'user'
          ? `<div class="msg me">${esc(msg.content)}</div>`
          : `<div class="msg ai">${this.md(msg.content)}${this.tasksIn(msg.content).length ? `<button class="btn xs primary" onclick="Claude.addTasks('${th.id}',${i})">${I('plus', 12)}Add ${this.tasksIn(msg.content).length} as tasks</button>` : ''}</div>`).join('')
          : `<div class="chat-empty">${['What should I focus on today?', 'Write a cold email for VoiceDesk to Leicester garages', 'Review my trading this month', 'Plan my week around my deadlines'].map(q => `<button class="chip lg" onclick="Claude.ensure('${esc(q)}')">${esc(q)}</button>`).join('')}</div>`}
        ${this.busy ? `<div class="msg ai typing"><i></i><i></i><i></i></div>` : ''}
      </div>
      <div class="quick-add inset chat-in">${I('message', 18)}<textarea id="chatIn" rows="1" placeholder="Message Claude…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Claude.ensure(this.value)}" ${this.busy ? 'disabled' : ''}></textarea><button class="btn primary sm icon" onclick="Claude.ensure($('#chatIn').value)" ${this.busy ? 'disabled' : ''} aria-label="Send">${I('send', 15)}</button></div>
    </div>`;
  },
  ensure(text) {
    if (!(text || '').trim()) return;
    const id = App.cur === 'coach' && App.params[0] === 'chat' && this.thread(App.params[1]) ? App.params[1] : Store.d.chat[0]?.id;
    if (id) return this.send(id, text);
    this.start({ title: text.slice(0, 40), ask: text });
  },
};

// ── Apple Music (MusicKit JS v3) ─────────────────────────────────────────
const AppleMusic = {
  mk: null, ready: false, lib: null, recent: null, err: '',
  async devToken() {
    if ((Store.s.appleDevToken || '').trim()) return Store.s.appleDevToken.trim();
    try { const r = await fetch('api/apple-music-token', { cache: 'no-store' }); const j = await r.json(); return j.configured ? j.token : ''; } catch { return ''; }
  },
  loadScript() {
    if (window.MusicKit) return Promise.resolve();
    return this._p ||= new Promise((res, rej) => {
      document.addEventListener('musickitloaded', () => res(), { once: true });
      const s = document.createElement('script'); s.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'; s.async = true;
      s.dataset.webComponents = ''; s.onerror = () => { this._p = null; rej(new Error('Could not load Apple MusicKit')); };
      document.head.appendChild(s);
    });
  },
  async init(interactive) {
    if (this.mk) return this.mk;
    const tok = await this.devToken();
    if (!tok) { if (interactive) { UI.toast(`${I('info', 16)} Apple Music needs a developer token — see the steps on this page`, 'warn'); } return null; }
    try {
      await this.loadScript();
      this.mk = await MusicKit.configure({ developerToken: tok, app: { name: 'YRB’s World', build: '2.0.0' } });
      const rr = () => { Music.renderDock(); if (App.cur === 'music') this.paintNow(); };
      this.mk.addEventListener('playbackStateDidChange', rr);
      this.mk.addEventListener('nowPlayingItemDidChange', rr);
      this.mk.addEventListener('authorizationStatusDidChange', () => App.render());
      this.ready = true;
      return this.mk;
    } catch (e) { this.err = e.message; if (interactive) UI.toast(esc(e.message), 'error'); return null; }
  },
  authed() { return !!this.mk?.isAuthorized; },
  async connect() {
    const mk = await this.init(true); if (!mk) return;
    try { await mk.authorize(); Store.s.appleMusicOn = true; Store.save(); UI.toast(`${I('check', 16)} Apple Music connected`, 'success'); await this.loadLib(true); }
    catch { UI.toast('Apple Music sign-in was cancelled', 'warn'); }
    App.render();
  },
  async disconnect() { try { await this.mk?.unauthorize(); } catch {} Store.s.appleMusicOn = false; Store.save(); this.lib = null; App.render(); },
  async loadLib(force) {
    if (!this.authed() || (this.lib && !force)) return;
    try {
      const [pl, rp] = await Promise.all([
        this.mk.api.music('/v1/me/library/playlists', { limit: 25 }),
        this.mk.api.music('/v1/me/recent/played', { limit: 10 }).catch(() => ({ data: { data: [] } })),
      ]);
      this.lib = pl.data.data || []; this.recent = rp.data.data || [];
    } catch (e) { this.err = e.message; this.lib = []; }
    if (App.cur === 'music') App.render();
  },
  art(a, s = 120) { const u = a?.attributes?.artwork?.url; return u ? u.replace('{w}', s).replace('{h}', s) : ''; },
  async playLib(id, kind = 'playlist') { if (!this.mk) return; try { await this.mk.setQueue({ [kind]: id, startPlaying: true }); Music.stop(true); } catch (e) { UI.toast(esc(e.message || 'Could not play that'), 'error'); } },
  toggle() { if (!this.mk) return; this.mk.isPlaying ? this.mk.pause() : this.mk.play(); },
  next() { this.mk?.skipToNextItem(); }, prev() { this.mk?.skipToPreviousItem(); },
  item() { return this.mk?.nowPlayingItem || null; },
  paintNow() { const el = $('#amNow'); if (el) el.outerHTML = this.nowHTML(); },
  nowHTML() {
    const it = this.item();
    if (!it) return `<div id="amNow" class="faint" style="font-size:13px">Pick a playlist below — full songs play here and keep going across every page.</div>`;
    return `<div id="amNow" class="am-now"><img src="${esc(it.artworkURL ? it.artworkURL.replace('{w}', 160).replace('{h}', 160) : (it.attributes?.artwork?.url || '').replace('{w}', 160).replace('{h}', 160))}" alt=""><div class="grow"><b class="ellipsis">${esc(it.title || it.attributes?.name || '')}</b><small class="ellipsis">${esc(it.artistName || it.attributes?.artistName || '')}</small></div>
      <div class="row"><button class="btn icon" onclick="AppleMusic.prev()" aria-label="Previous">${I('back', 15)}</button><button class="btn primary icon" onclick="AppleMusic.toggle()" aria-label="Play or pause">${I(this.mk?.isPlaying ? 'pause' : 'play', 16)}</button><button class="btn icon" onclick="AppleMusic.next()" aria-label="Next">${I('skip', 15)}</button></div></div>`;
  },
  card() {
    const on = this.authed();
    if (!on) return `<div class="glass card s12 am-card">
      <div class="card-h"><h2><span class="am-logo">${I('music', 15, 2.4)}</span>Apple Music library</h2><span class="sub">${this.ready ? 'Ready to connect' : 'Not connected'}</span></div>
      <p class="muted" style="font-size:13.5px">Sign in with your Apple ID to play your own playlists here — full songs, with play/pause/skip in the bar at the bottom of every page.</p>
      <div class="row wrap mt"><button class="btn primary" onclick="AppleMusic.connect()">${I('music', 15)}Connect Apple Music</button><a class="btn ghost" href="#/connect">Setup steps</a></div>
    </div>`;
    if (!this.lib) this.loadLib();
    return `<div class="glass card s12 am-card">
      <div class="card-h"><h2><span class="am-logo">${I('music', 15, 2.4)}</span>Apple Music</h2><span class="sub">Connected</span><div class="right"><button class="btn xs ghost" onclick="AppleMusic.loadLib(true)">${I('refresh', 13)}</button></div></div>
      ${this.nowHTML()}
      ${this.recent?.length ? `<div class="am-sec">Recently played</div><div class="am-row">${this.recent.map(x => `<button class="am-tile" onclick="AppleMusic.playLib('${esc(x.id)}','${x.type === 'albums' || x.type === 'library-albums' ? 'album' : x.type === 'stations' ? 'station' : 'playlist'}')"><img src="${esc(this.art(x, 200))}" alt="" loading="lazy"><span class="ellipsis">${esc(x.attributes?.name || '')}</span></button>`).join('')}</div>` : ''}
      <div class="am-sec">Your playlists</div>
      <div class="am-row">${(this.lib || []).map(x => `<button class="am-tile" onclick="AppleMusic.playLib('${esc(x.id)}')"><img src="${esc(this.art(x, 200))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span class="ellipsis">${esc(x.attributes?.name || '')}</span></button>`).join('') || `<p class="faint" style="font-size:13px">${this.lib ? 'No playlists in your library yet.' : 'Loading…'}</p>`}</div>
    </div>`;
  },
  dockHTML() {
    const it = this.item(); if (!it) return '';
    const art = (it.artworkURL || it.attributes?.artwork?.url || '').replace('{w}', 80).replace('{h}', 80);
    return `<div class="md-bar am-dock"><a class="md-pill" href="#/music"><img class="md-art" src="${esc(art)}" alt=""><span class="md-name"><b>${esc(it.title || it.attributes?.name || '')}</b> <span class="faint">${esc(it.artistName || it.attributes?.artistName || '')}</span></span></a>
      <button class="btn ghost xs icon" onclick="AppleMusic.prev()" aria-label="Previous">${I('back', 14)}</button><button class="btn xs icon primary" onclick="AppleMusic.toggle()" aria-label="Play or pause">${I(this.mk?.isPlaying ? 'pause' : 'play', 14)}</button><button class="btn ghost xs icon" onclick="AppleMusic.next()" aria-label="Next">${I('skip', 14)}</button></div>`;
  },
};

// ── GitHub (public API; optional token for private repos) ────────────────
const GitHub = {
  cache: {},
  async get(path) {
    const hit = this.cache[path]; if (hit && Date.now() - hit.at < 5 * 60e3) return hit.data;
    const h = { Accept: 'application/vnd.github+json' }; if (Store.s.githubToken) h.Authorization = 'Bearer ' + Store.s.githubToken.trim();
    const r = await fetch('https://api.github.com' + path, { headers: h });
    if (!r.ok) throw new Error(r.status === 404 ? 'Repo not found (private? add a token in Connections)' : r.status === 403 ? 'GitHub rate limit — add a token in Connections' : 'GitHub error ' + r.status);
    const data = await r.json(); this.cache[path] = { at: Date.now(), data }; return data;
  },
  ago(iso) { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; },
  async repoBox(el) {
    const repo = el.dataset.repo;
    try {
      const [info, commits] = await Promise.all([this.get(`/repos/${repo}`), this.get(`/repos/${repo}/commits?per_page=3`)]);
      el.innerHTML = `<div class="gh-meta">${chip(info.private ? 'Private' : 'Public', '', 'shield')}${chip(info.open_issues_count + ' open issues', info.open_issues_count ? 'amber' : '', 'info')}${chip('pushed ' + this.ago(info.pushed_at), '', 'clock')}</div>
        ${commits.map(c => `<a class="gh-commit" href="${esc(c.html_url)}" target="_blank" rel="noopener"><span class="ellipsis">${esc(c.commit.message.split('\n')[0])}</span><small>${this.ago(c.commit.author.date)}</small></a>`).join('')}`;
    } catch (e) { el.innerHTML = `<p class="faint" style="font-size:12.5px">${esc(e.message)}</p>`; }
  },
  async listInto(el) {
    const u = (Store.s.githubUser || '').trim(); if (!u) { el.innerHTML = '<p class="faint">Add your GitHub username.</p>'; return; }
    try {
      const repos = Store.s.githubToken ? await this.get('/user/repos?sort=pushed&per_page=10') : await this.get(`/users/${encodeURIComponent(u)}/repos?sort=pushed&per_page=10`);
      el.innerHTML = repos.map(r => { const sp = Store.d.spaces.find(x => (x.repo || '').toLowerCase() === r.full_name.toLowerCase()); return `<div class="li"><div class="li-ic">${I('github', 16)}</div><div class="li-b"><a class="li-t" href="${esc(r.html_url)}" target="_blank" rel="noopener">${esc(r.name)}</a><div class="li-s">${r.private ? 'Private · ' : ''}pushed ${this.ago(r.pushed_at)}${sp ? ` · in <a href="#/space/${sp.id}">${esc(sp.name)}</a>` : ''}</div></div>${r.homepage ? `<a class="btn sm icon ghost" href="${esc(safeUrl(r.homepage))}" target="_blank" rel="noopener" title="Live site">${I('globe', 14)}</a>` : ''}</div>`; }).join('');
    } catch (e) { el.innerHTML = `<p class="faint" style="font-size:13px">${esc(e.message)}</p>`; }
  },
};

// ── Hub page ─────────────────────────────────────────────────────────────
const LAUNCH = [
  ['Claude', 'https://claude.ai', '#d97757'], ['Gmail', 'https://mail.google.com', '#ea4335'], ['Vercel', 'https://vercel.com/dashboard', '#9ca3af'],
  ['GitHub', 'https://github.com/YRB1', '#a78bfa'], ['Etsy shop', 'https://www.etsy.com/your/shops/me/dashboard', '#f1641e'], ['Stripe', 'https://dashboard.stripe.com', '#635bff'],
  ['TradingView', 'https://www.tradingview.com/chart/', '#2962ff'], ['Canva', 'https://www.canva.com', '#00c4cc'], ['Google Drive', 'https://drive.google.com', '#1fa463'],
];
const Connect = {
  title: 'Connections',
  sub() { return 'Plug your apps into YRB’s World'; },
  render() {
    const s = Store.s, cm = Claude.mode(), srv = Claude.srv || {};
    const pill = (on, txt) => `<span class="status ${on === true ? 'on' : on === 'warn' ? 'warn' : ''}">${txt}</span>`;
    const g = GCal.connected() ? [true, 'Connected'] : GCal.configured() ? ['warn', 'Saved — tap connect'] : [false, 'Not set up'];
    const n = Notify.state();
    return `<div class="dash connect">
      ${Cloud.card()}
      <div class="glass card s12 int-hero">
        <div class="int-card"><div class="int-ic claude">${I('sparkles', 22)}</div>
        <div class="grow">
          <div class="row between wrap"><h2>Claude</h2>${pill(cm !== 'link' || 'warn', Claude.label())}</div>
          <p class="muted">Chat with Claude inside the app, with your sections, tasks, trading and money as context — and turn its suggestions into tasks in one tap. Works three ways; pick one.</p>
          <div class="conn-opts">
            <div class="conn-opt ${cm === 'link' ? 'on' : ''}"><b>${I('external', 15)}Claude app — no setup</b><p>Every “Ask Claude” button opens claude.ai with your question and data filled in. Uses your normal Claude plan.</p></div>
            <div class="conn-opt ${cm === 'server' ? 'on' : ''}"><b>${I('shield', 15)}Through your Vercel app — best</b><p>Your API key lives in Vercel, never on your phone. Chat happens right here. ${srv.configured ? '<span class="pos">Vercel key detected.</span>' : '<span class="faint">No key on the server yet.</span>'}</p>
              <form class="form mt-s" id="cpForm" onsubmit="return false">${F({ name: 'claudePass', label: 'Passcode (the YRB_PASSCODE you set in Vercel)', type: 'password', value: s.claudePass || '', full: true, attrs: ' autocomplete="off"' })}</form></div>
            <div class="conn-opt ${cm === 'key' ? 'on' : ''}"><b>${I('zap', 15)}API key on this device</b><p>Quickest to try. The key is stored in this browser only.</p>
              <form class="form mt-s" id="ckForm" onsubmit="return false">${F({ name: 'claudeKey', label: 'Claude API key', type: 'password', value: s.claudeKey || '', full: true, placeholder: 'sk-ant-…', attrs: ' autocomplete="off" spellcheck="false"' })}</form></div>
          </div>
          <form class="form mt" id="cmForm" onsubmit="return false">
            ${F({ name: 'claudeMode', label: 'Use', type: 'select', value: s.claudeMode || 'auto', options: [['auto', 'Best available (automatic)'], ['server', 'Vercel app'], ['key', 'API key on this device'], ['link', 'Claude app (claude.ai)']] })}
            ${F({ name: 'claudeModel', label: 'Model', type: 'select', value: s.claudeModel, options: [['claude-opus-5-5', 'Claude Opus 5.5 — sharpest'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 — faster'], ['claude-haiku-5-5', 'Claude Haiku 5.5 — cheapest']] })}
          </form>
          <div class="row wrap mt"><button class="btn primary" onclick="Connect.saveClaude(true)">${I('check', 15)}Save &amp; test</button><a class="btn ghost" href="#/coach">${I('message', 15)}Open chat</a></div>
          <details class="guide"><summary>${I('info', 16)}Set up the Vercel connection (5 minutes)</summary><ol>
            <li>Get an API key at <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com</a> and add some credit. Set a monthly spend limit while you’re there.</li>
            <li>In <a href="https://vercel.com/dashboard" target="_blank" rel="noopener">Vercel</a> → your <b>yrbs-world</b> project → <b>Settings → Environment Variables</b>, add <code>ANTHROPIC_API_KEY</code> (the key) and <code>YRB_PASSCODE</code> (any password you’ll remember).</li>
            <li>Redeploy. Then type the same passcode above and tap <b>Save &amp; test</b>.</li>
          </ol></details>
        </div></div>
      </div>

      <div class="glass card s12">
        <div class="int-card"><div class="int-ic apple">${I('music', 22)}</div>
        <div class="grow">
          <div class="row between wrap"><h2>Apple Music</h2>${pill(AppleMusic.authed() ? true : s.appleDevToken || AppleMusic.ready ? 'warn' : false, AppleMusic.authed() ? 'Connected' : AppleMusic.ready ? 'Ready — sign in' : 'Needs a developer token')}</div>
          <p class="muted">Two levels. <b>Right now, no setup:</b> paste any Apple Music playlist link on the Music page and it plays in the bar at the bottom (sign in inside the player for full songs). <b>Full connection:</b> your whole library, recently played and proper play/pause/skip controls — this uses Apple’s MusicKit, which needs a developer token from an Apple Developer account (£79/year).</p>
          <div class="row wrap mt">${AppleMusic.authed() ? `<a class="btn primary" href="#/music">${I('music', 15)}Open music</a><button class="btn ghost danger" onclick="AppleMusic.disconnect()">Disconnect</button>` : `<button class="btn primary" onclick="AppleMusic.connect()">${I('music', 15)}Connect Apple Music</button><a class="btn" href="#/music">Paste a playlist link instead</a>`}</div>
          <details class="guide"><summary>${I('info', 16)}Get the developer token (one time)</summary><ol>
            <li>Join the <a href="https://developer.apple.com/programs/" target="_blank" rel="noopener">Apple Developer Program</a> (you’ll want it anyway to put Vaultline on the App Store).</li>
            <li>In <a href="https://developer.apple.com/account/resources/identifiers/list/musicId" target="_blank" rel="noopener">Identifiers</a> create a <b>Media ID</b> with <b>MusicKit</b> ticked.</li>
            <li>In <a href="https://developer.apple.com/account/resources/authkeys/list" target="_blank" rel="noopener">Keys</a> create a key with <b>Media Services</b> → download the <code>.p8</code> file. Note the <b>Key ID</b> and your <b>Team ID</b> (top right of the page).</li>
            <li>In Vercel → Environment Variables add <code>APPLE_TEAM_ID</code>, <code>APPLE_KEY_ID</code> and <code>APPLE_MUSIC_PRIVATE_KEY</code> (paste the whole .p8 file). Redeploy, then tap <b>Connect Apple Music</b>.</li>
          </ol>
          <form class="form mt-s" id="amForm" onsubmit="return false">${F({ name: 'appleDevToken', label: 'Or paste a developer token directly', type: 'password', value: s.appleDevToken || '', full: true, attrs: ' autocomplete="off"' })}</form>
          <div class="row mt-s"><button class="btn sm" onclick="Store.s.appleDevToken=readForm($('#amForm')).appleDevToken;Store.save();AppleMusic.mk=null;AppleMusic.connect()">Save token &amp; connect</button></div>
          </details>
        </div></div>
      </div>

      <div class="glass card s7">
        <div class="int-card"><div class="int-ic gh">${I('github', 22)}</div>
        <div class="grow">
          <div class="row between wrap"><h2>GitHub</h2>${pill(!!s.githubUser, s.githubUser ? '@' + esc(s.githubUser) : 'Not set')}</div>
          <p class="muted">Your latest repos, and live commit activity inside each section that has a repo.</p>
          <form class="form mt" id="ghForm" onsubmit="return false">${F({ name: 'githubUser', label: 'Username', value: s.githubUser })}${F({ name: 'githubToken', label: 'Token (optional, for private repos)', type: 'password', value: s.githubToken, attrs: ' autocomplete="off"', hint: 'Fine-grained token, read-only' })}</form>
          <div class="row mt"><button class="btn" onclick="Connect.saveGH()">${I('check', 15)}Save</button></div>
          <div id="ghList" class="mt"><p class="faint" style="font-size:13px">Loading repos…</p></div>
        </div></div>
      </div>

      <div class="s5 col-stack">
        <div class="glass card">
          <div class="card-h"><h2>${I('link')}Also connected</h2></div>
          <a class="li click" href="#/profile/integrations"><div class="li-ic" style="background:linear-gradient(135deg,#4285f4,#34a853);color:#fff">${I('calendar', 16)}</div><div class="li-b"><div class="li-t">Google Calendar</div><div class="li-s">Events in, tasks out</div></div>${pill(g[0], g[1])}</a>
          <a class="li click" href="#/profile/integrations"><div class="li-ic" style="background:linear-gradient(135deg,#ff9f0a,#ff375f);color:#fff">${I('phone', 16)}</div><div class="li-b"><div class="li-t">iPhone Reminders</div><div class="li-s">Through an Apple Shortcut</div></div>${pill(Reminders.isApple(), Reminders.isApple() ? 'Ready' : 'On iPhone')}</a>
          <a class="li click" href="#/profile/integrations"><div class="li-ic" style="background:var(--a-grad);color:#fff">${I('bell', 16)}</div><div class="li-b"><div class="li-t">Notifications</div><div class="li-s">Reminders open the task when tapped</div></div>${pill(n === 'granted' ? true : n === 'denied' ? 'warn' : false, { granted: 'On', denied: 'Blocked', default: 'Off', unsupported: 'Install first' }[n])}</a>
          <a class="li click" href="#/profile/integrations"><div class="li-ic" style="background:linear-gradient(135deg,#22c55e,#0ea5e9);color:#fff">${I('rewind', 16)}</div><div class="li-b"><div class="li-t">FX Replay</div><div class="li-s">Backtests and CSV import</div></div></a>
        </div>
        <div class="glass card">
          <div class="card-h"><h2>${I('grid')}Launchpad</h2></div>
          <div class="launch-grid">${LAUNCH.map(([l, u, c]) => `<a href="${u}" target="_blank" rel="noopener" style="--c:${c}"><i>${esc(l[0])}</i><span>${esc(l)}</span></a>`).join('')}</div>
        </div>
      </div>
    </div>`;
  },
  after(el) { const gl = $('#ghList', el); if (gl) GitHub.listInto(gl); const had = !!Claude.srv; Claude.probe().then(() => { if (!had && App.cur === 'connect') App.render(); }); },
  async saveClaude(test) {
    const a = readForm($('#cpForm')), b = readForm($('#ckForm')), c = readForm($('#cmForm'));
    Object.assign(Store.s, { claudePass: a.claudePass, claudeKey: b.claudeKey, claudeMode: c.claudeMode, claudeModel: c.claudeModel }); Store.save();
    await Claude.probe(true);
    if (!test) return App.render();
    if (Claude.mode() === 'link') { UI.toast(`${I('external', 16)} Claude will open in the Claude app. Add a key or passcode to chat in here.`, 'warn'); return App.render(); }
    try { const j = await Claude.call({ max_tokens: 30, messages: [{ role: 'user', content: 'Reply with exactly: connected' }] }); UI.toast(`${I('check', 16)} Claude ${esc(Claude.text(j).trim() || 'connected')} · ${esc(j.model || '')}`, 'success', 'coach'); }
    catch (e) { UI.toast(`${I('info', 16)} ${esc(e.message)}`, 'error'); }
    App.render();
  },
  saveGH() { const o = readForm($('#ghForm')); Store.s.githubUser = o.githubUser; Store.s.githubToken = o.githubToken; Store.save(); GitHub.cache = {}; App.render(); },
};
App.register('connect', Connect);
