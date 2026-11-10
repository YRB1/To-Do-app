'use strict';
/* Neo HQ — your AI company. Neo (COO) runs YRB Nova, YRBSUPREME and the Trading Desk through manager
   and worker agents that share one brain. Everything public-facing waits here for your approval.
   Backend: Supabase edge function `neo` (project yrb-nova). Signed in as you = authorised. */

const Neo = {
  FN: 'https://zosahhhqcqpqmpwahkbs.supabase.co/functions/v1/neo',
  data: null, brain: null, acts: null, hist: null, msgs: null, busy: false, loading: false, err: '', pending: 0, open: {}, bizFilter: '',
  TABS: [['', 'Today', 'home'], ['pipeline', 'Pipeline', 'target'], ['chat', 'Neo', 'message'], ['team', 'Team', 'user'], ['brain', 'Brain', 'database'], ['activity', 'Activity', 'layers']],
  leads: null, leadFilter: '',
  STAGES: [['qualified', 'Qualified'], ['mockup_built', 'Mockup live'], ['contacted', 'Emailed'], ['followup_1', 'Follow-up 1'], ['followup_2', 'Follow-up 2'], ['replied', 'Replied'], ['call_booked', 'Call booked'], ['won', 'Won'], ['new', 'Not emailable'], ['lost', 'Lost'], ['do_not_contact', 'Do not contact']],
  BIZ: { 'yrb-nova': ['YRB Nova', 'blue'], yrbsupreme: ['YRBSUPREME', 'gold'], trading: ['Trading', 'green'] },

  async call(action, body = {}) {
    const r = await fetch(this.FN, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + await Cloud.token() }, body: JSON.stringify({ action, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || `Neo error ${r.status}`);
    return j;
  },
  async load(what = 'overview') {
    if (!Cloud.on()) return;
    this.loading = true;
    try {
      if (what === 'overview') { this.data = await this.call('overview'); this.pending = this.data.approvals?.length || 0; }
      if (what === 'brain') this.brain = (await this.call('brain')).items;
      if (what === 'activity') { this.acts = await this.call('tasks'); this.hist = (await this.call('history')).items; }
      if (what === 'chat') this.msgs = (await this.call('messages')).messages;
      if (what === 'pipeline') this.leads = (await this.call('leads')).items;
      this.err = '';
    } catch (e) { this.err = e.message; }
    this.loading = false;
    if (App.cur === 'neo') App.render(); else App.renderNav();
  },
  poll() { // keep the nav badge fresh
    if (this._poll) return;
    this._poll = setInterval(() => { if (Cloud.on() && document.visibilityState === 'visible') this.load('overview'); }, 120e3);
    setTimeout(() => Cloud.on() && this.load('overview'), 1500);
  },

  hermes() { return this.data?.settings?.engine === 'hermes'; },
  lastEngineRun() { const t = (this.data?.agents || []).map(a => a.last_run_at).filter(Boolean).sort().pop(); return t || null; },
  agent(id) { return (this.data?.agents || []).find(a => a.id === id) || { id, name: id, title: '' }; },
  biz(id) { const b = this.BIZ[id]; return b ? chip(b[0], b[1]) : chip('Company', ''); },
  ago(t) { if (!t) return 'never'; const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; },
  cron(c) {
    const [mi, h, , , dw] = c.split(' ');
    if (mi.startsWith('*/')) return `Every ${mi.slice(2)} min`;
    const time = `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
    const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = dw === '*' ? 'Daily' : dw === '1-5' ? 'Weekdays' : dw.split(',').map(x => D[+x % 7]).join(', ');
    return `${days} ${time}`;
  },
  md(s) { return Claude.md(s); },

  title: 'Neo HQ',
  sub() { const d = this.data; return d ? `${(d.agents || []).filter(a => a.active).length} agents · 3 businesses${this.hermes() ? ' · runs on your Pro plan' : ` · $${(+d.spend_today_usd || 0).toFixed(2)} of $${d.settings?.daily_budget_usd} today`}` : 'Your autonomous company'; },
  actions() { return `<button class="btn icon" onclick="Neo.refresh()" aria-label="Refresh" title="Refresh">${I('refresh', 16)}</button><button class="btn icon" onclick="Neo.settings()" aria-label="Settings" title="Settings">${I('settings', 16)}</button>`; },
  refresh() { const t = App.params[0] || ''; this.load('overview'); if (t === 'pipeline') this.load('pipeline'); if (t === 'brain') this.load('brain'); if (t === 'activity') this.load('activity'); if (t === 'chat') this.load('chat'); },

  render(p) {
    const tab = p[0] || '';
    const tabs = `<div class="s12 neo-tabs">${this.TABS.map(([id, l, ic]) => `<a href="#/neo${id ? '/' + id : ''}" class="${tab === id ? 'on' : ''}">${I(ic, 15)}${l}${id === '' && this.pending ? `<span class="count hot">${this.pending}</span>` : ''}</a>`).join('')}</div>`;
    if (!Cloud.on()) return `<div class="dash">${tabs}<div class="glass card s12"><div class="card-h"><h2>${I('zap')}Sign in to open Neo HQ</h2></div><p class="muted">Neo HQ uses the same sign-in as sync. Go to <a href="#/connect">Connections → Sync & phone notifications</a>, sign in, then come back. Turn on phone notifications there too so Neo can reach you.</p></div></div>`;
    if (!this.data) return `<div class="dash">${tabs}<div class="glass card s12">${this.err ? `<p class="neg">${esc(this.err)}</p><button class="btn mt" onclick="Neo.refresh()">Try again</button>` : '<p class="faint">Loading your company…</p>'}</div></div>`;
    const last = this.lastEngineRun(), stale = !last || Date.now() - new Date(last) > 26 * 3600e3;
    const warn = this.data.settings?.paused === 'true' ? `<div class="glass card s12 neo-warn">${I('pause', 18)}<div><b>Company paused.</b> No sending or publishing until you resume it in settings.</div></div>`
      : this.hermes() && stale ? `<div class="glass card s12 neo-warn">${I('info', 18)}<div><b>${last ? 'Neo has gone quiet.' : 'No runs yet.'}</b> ${last ? `Last work ${this.ago(last)}.` : ''} Neo works in three scheduled Claude runs on your Pro plan (07:12, 12:43, 19:23), no extra cost. If a run was missed, check claude.ai/code/routines.</div></div>`
      : !this.hermes() && !this.data.settings?.api_key_set ? `<div class="glass card s12 neo-warn">${I('info', 18)}<div><b>Neo is built but asleep.</b> Add your Anthropic API key in Supabase → Edge Functions → Secrets as <code>ANTHROPIC_API_KEY</code>.</div></div>`
      : this.data.settings?.paused === 'true' ? `<div class="glass card s12 neo-warn">${I('pause', 18)}<div><b>Company paused.</b> No agent runs until you resume it in settings.</div></div>` : '';
    const body = tab === 'pipeline' ? this.pipelineView() : tab === 'chat' ? this.chatView() : tab === 'team' ? this.teamView() : tab === 'brain' ? this.brainView() : tab === 'activity' ? this.activityView() : this.todayView();
    return `<div class="dash neo">${tabs}${warn}${body}</div>`;
  },
  after(el, p) {
    const tab = p[0] || '';
    if (!this.data && !this.loading && Cloud.on() && !this.err) this.load('overview');
    if (tab === 'brain' && !this.brain && !this.loading) this.load('brain');
    if (tab === 'activity' && !this.acts && !this.loading) this.load('activity');
    if (tab === 'pipeline' && !this.leads && !this.loading) this.load('pipeline');
    clearInterval(this._chatPoll);
    if (tab === 'chat' && this.waiting) this._chatPoll = setInterval(async () => { if (App.cur !== 'neo' || App.params[0] !== 'chat') return clearInterval(this._chatPoll); const n = (this.msgs || []).length; await this.load('chat'); if ((this.msgs || []).length > n && this.msgs[this.msgs.length - 1].role === 'assistant') { this.waiting = false; clearInterval(this._chatPoll); App.render(); } }, 30e3);
    if (tab === 'chat') { if (!this.msgs && !this.loading) this.load('chat'); const lg = $('#neoLog'); if (lg) lg.scrollTop = lg.scrollHeight; }
  },

  // ── Today ────────────────────────────────────────────────
  todayView() {
    const d = this.data, t0 = new Date().toDateString();
    const todayTasks = (d.recent_tasks || []).filter(t => new Date(t.created_at).toDateString() === t0);
    const tile = (l, v, s = '') => `<div class="rv-tile"><small>${l}</small><b>${v}</b>${s ? `<span>${s}</span>` : ''}</div>`;
    const aps = d.approvals || [];
    return `<div class="s12 rv-tiles">
        ${tile('Needs you', aps.length, 'approvals waiting')}
        ${tile('Work today', todayTasks.filter(t => t.status === 'done').length, `${todayTasks.filter(t => t.status === 'running' || t.status === 'queued').length} in progress${todayTasks.some(t => t.status === 'failed') ? ` · ${todayTasks.filter(t => t.status === 'failed').length} failed` : ''}`)}
        ${this.hermes() ? tile('Last run', this.lastEngineRun() ? this.ago(this.lastEngineRun()) : 'not yet', 'Pro runs 07:12 · 12:43 · 19:23') : tile('AI spend', '$' + (+d.spend_today_usd || 0).toFixed(2), `cap $${d.settings?.daily_budget_usd}/day`)}
      </div>
      <div class="glass card s12">
        <div class="card-h"><h2>${I('check')}Waiting for your approval</h2></div>
        ${aps.length ? aps.map(a => this.approvalCard(a)).join('') : `<p class="faint" style="font-size:13.5px">All clear. New drafts land here and on your phone as agents finish them.</p>`}
      </div>
      <div class="glass card s12">
        <div class="card-h"><h2>${I('bell')}Reports</h2><span class="sub">briefs, scorecards, alerts</span></div>
        ${(d.reports || []).length ? d.reports.map(r => this.reportRow(r)).join('') : `<p class="faint" style="font-size:13.5px">Neo’s morning brief arrives at 06:30, Sterling’s gold brief at 06:35 on weekdays.</p>`}
      </div>`;
  },
  approvalCard(a) {
    const ag = this.agent(a.agent_id), open = this.open['a' + a.id];
    let payload = a.payload;
    if (a.kind === 'agent_change') { try { const p = JSON.parse(a.payload); payload = `**Agent:** ${p.agent_id}\n**Why:** ${p.reason}\n\n**New instructions:**\n${p.new_instructions}`; } catch {} }
    if (a.kind === 'governance') { try { const p = JSON.parse(a.payload); payload = `**Rule:** ${p.title}\n${p.body}\n\n**Why:** ${p.reason}`; } catch {} }
    return `<div class="neo-ap ${open ? 'open' : ''}">
      <div class="neo-ap-h" onclick="Neo.toggle('a${a.id}')">
        <div class="grow"><div class="row wrap" style="gap:6px">${this.biz(a.business_id)}${chip(esc(a.kind.replace(/_/g, ' ')), a.risk === 'high' ? 'red' : '')}<small class="faint">${esc(ag.name)} · ${this.ago(a.created_at)}</small></div>
        <b class="neo-sum">${esc(a.summary)}</b></div>${I(open ? 'up' : 'down', 16)}
      </div>
      ${open ? `<div class="neo-payload msg ai">${this.md(payload)}</div>` : ''}
      <div class="row wrap neo-ap-f">
        <button class="btn sm primary" onclick="Neo.decide(${a.id},'approved')">${I('check', 14)}Approve</button>
        <button class="btn sm" onclick="Neo.feedback(${a.id},'revise')">${I('edit', 14)}Revise</button>
        <button class="btn sm ghost danger" onclick="Neo.feedback(${a.id},'rejected')">${I('x', 14)}Reject</button>
        <span class="grow"></span>
        <button class="btn sm ghost" onclick="Neo.copy(${a.id})">${I('layers', 14)}Copy</button>
      </div></div>`;
  },
  reportRow(r) {
    const ag = this.agent(r.agent_id), open = this.open['r' + r.id];
    return `<div class="neo-rep ${r.read ? '' : 'unread'}"><div class="neo-ap-h" onclick="Neo.toggle('r${r.id}',${r.read ? 0 : r.id})">
      <div class="grow"><div class="row wrap" style="gap:6px">${r.business_id ? this.biz(r.business_id) : ''}<small class="faint">${esc(ag.name)} · ${this.ago(r.created_at)}</small></div><b class="neo-sum">${esc(r.title)}</b></div>${I(open ? 'up' : 'down', 16)}</div>
      ${open ? `<div class="neo-payload msg ai">${this.md(r.body)}</div>` : ''}</div>`;
  },
  toggle(k, markRead) {
    this.open[k] = !this.open[k];
    if (markRead) { const r = this.data.reports.find(x => x.id === markRead); if (r) r.read = true; this.call('report_read', { id: markRead }).catch(() => {}); }
    App.render();
  },
  copy(id) {
    const a = (this.data.approvals || []).find(x => x.id === id); if (!a) return;
    navigator.clipboard?.writeText(a.payload).then(() => UI.toast(`${I('check', 16)} Copied`, 'success'), () => UI.toast('Couldn’t copy on this device', 'warn'));
  },
  async decide(id, decision, feedback = '') {
    try {
      await this.call('decide', { id, decision, feedback });
      UI.toast(`${I('check', 16)} ${decision === 'approved' ? 'Approved' : decision === 'revise' ? 'Sent back for a revision — it’ll be back in a few minutes' : 'Rejected — the team will learn from it'}`, 'success');
      this.load('overview');
    } catch (e) { UI.toast(`${I('info', 16)} ${esc(e.message)}`, 'error'); }
  },
  feedback(id, decision) {
    UI.modal({ title: decision === 'revise' ? 'What should change?' : 'Why reject it?', small: true,
      body: `<form class="form" id="neoFb" onsubmit="return false">${F({ name: 'fb', label: decision === 'revise' ? 'Your notes' : 'Reason (helps the agent learn)', type: 'textarea', rows: 4, full: true, placeholder: decision === 'revise' ? 'e.g. Shorter, punchier hook, mention the Black Friday spots' : 'e.g. Too generic, sounds like AI' })}</form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: decision === 'revise' ? 'Send back' : 'Reject', cls: decision === 'revise' ? 'primary' : 'danger-solid', onClick: () => this.decide(id, decision, readForm($('#neoFb')).fb || '') }] });
  },

  // ── Pipeline ─────────────────────────────────────────────
  pipelineView() {
    if (!this.leads) return `<div class="glass card s12"><p class="faint">Loading the pipeline…</p></div>`;
    const L = this.leads.filter(l => !/engine test/.test(l.notes || ''));
    const nova = L.filter(l => l.business_id !== 'yrbsupreme'), sup = L.filter(l => l.business_id === 'yrbsupreme');
    const n = (arr, ...st) => arr.filter(l => st.includes(l.status)).length;
    const touched = st => ['mockup_built', 'contacted', 'followup_1', 'followup_2', 'replied', 'call_booked', 'won', 'lost'].indexOf(st);
    const funnel = [['Leads', nova.length], ['Emailable', nova.filter(l => l.status !== 'new' && l.status !== 'do_not_contact').length], ['Mockups', nova.filter(l => touched(l.status) >= 0 && l.mockup_url).length], ['Emailed', n(nova, 'contacted', 'followup_1', 'followup_2', 'replied', 'call_booked', 'won', 'lost')], ['Replied', n(nova, 'replied', 'call_booked', 'won')], ['Calls', n(nova, 'call_booked', 'won')], ['Won', n(nova, 'won')]];
    const list = (this.leadFilter ? L.filter(l => l.status === this.leadFilter) : L).slice(0, 120);
    const label = Object.fromEntries(this.STAGES);
    const col = { won: 'green', replied: 'green', call_booked: 'green', lost: 'red', do_not_contact: 'red', new: '', qualified: 'blue', mockup_built: 'gold' };
    return `<div class="s12 neo-funnel">${funnel.map(([k, v], i) => `<div class="rv-tile"><small>${k}</small><b>${v}</b>${i ? (funnel[i - 1][1] ? `<span>${Math.round(v / funnel[i - 1][1] * 100)}% of ${funnel[i - 1][0].toLowerCase()}</span>` : '') : '<span>YRB Nova</span>'}</div>`).join('')}</div>
      ${sup.length ? `<p class="hint s12" style="margin:0">YRBSUPREME bulk buyers: ${sup.length} found · ${n(sup, 'contacted', 'followup_1', 'followup_2')} offered · ${n(sup, 'replied', 'won')} replied</p>` : ''}
      <div class="s12 row wrap" style="gap:6px"><button class="btn sm ${!this.leadFilter ? 'primary' : 'ghost'}" onclick="Neo.leadFilter='';App.render()">All</button>${this.STAGES.filter(([k]) => L.some(l => l.status === k)).map(([k, l]) => `<button class="btn sm ${this.leadFilter === k ? 'primary' : 'ghost'}" onclick="Neo.leadFilter='${k}';App.render()">${l} ${n(L, k)}</button>`).join('')}</div>
      <div class="glass card s12">${list.length ? list.map(l => `<div class="neo-brain"><div class="grow">
          <div class="row wrap" style="gap:6px"><b>${esc(l.company)}</b>${chip(label[l.status] || l.status, col[l.status] || '')}${l.business_id === 'yrbsupreme' ? chip('YRBSUPREME', 'gold') : ''}<small class="faint">${esc([l.industry, l.city].filter(Boolean).join(' · '))} · ${this.ago(l.updated_at)}</small></div>
          <p class="muted">${esc(l.problem || '')}${l.entity_type ? ` <small class="faint">(${esc(l.entity_type.replace('_', ' '))})</small>` : ''}</p>
          <div class="row wrap" style="gap:8px;margin-top:4px">${l.mockup_url ? `<a class="btn xs" href="${esc(l.mockup_url)}" target="_blank" rel="noopener">${I('external', 12)}Mockup</a>` : ''}${l.website ? `<a class="btn xs ghost" href="${esc(/^https?:/.test(l.website) ? l.website : 'https://' + l.website)}" target="_blank" rel="noopener">Their site</a>` : ''}${l.email ? `<small class="faint">${esc(l.email)}</small>` : ''}</div>
        </div><select class="neo-stage" onchange="Neo.setStage(${l.id}, this.value)">${this.STAGES.map(([k, lb]) => `<option value="${k}"${k === l.status ? ' selected' : ''}>${lb}</option>`).join('')}</select></div>`).join('') : `<p class="faint" style="font-size:13.5px">No leads yet. Scout fills this every weekday morning (07:12 run).</p>`}</div>`;
  },
  async setStage(id, status) {
    try { await this.call('lead_update', { id, status }); const l = this.leads.find(x => x.id === id); if (l) l.status = status; UI.toast(`${I('check', 16)} Updated`, 'success'); App.render(); }
    catch (e) { UI.toast(esc(e.message), 'error'); }
  },

  // ── Chat ─────────────────────────────────────────────────
  chatView() {
    const m = this.msgs || [];
    const starters = ['Where are we at today?', 'What should I focus on right now?', 'Log it: I sent 30 cold emails today', 'Get Quill to write a post on missed calls costing dentists money'];
    return `<div class="glass card s12 chat-card">
      <div class="card-h"><h2>${I('zap')}Neo</h2><span class="sub">${this.hermes() ? 'replies at 07:12 · 12:43 · 19:23' : 'COO · knows the brain, can assign work'}</span></div>
      <div class="chat-log" id="neoLog">
        ${m.length ? m.map(x => x.role === 'user' ? `<div class="msg me">${esc(x.content)}</div>` : `<div class="msg ai">${this.md(x.content)}</div>`).join('') : `<div class="chat-empty">${starters.map(s => `<span class="chip" onclick="Neo.send(${esc(JSON.stringify(s))})">${esc(s)}</span>`).join('')}</div>`}
        ${this.busy || this.waiting ? `<div class="msg ai typing"><i></i><i></i><i></i></div>` : ''}
      </div>
      ${this.waiting ? `<p class="hint" style="margin:-4px 0 10px">Neo answers on his next run (07:12, 12:43 or 19:23). You’ll get a phone alert, so you can close the app.</p>` : ''}
      <div class="quick-add inset chat-in"><textarea id="neoIn" rows="1" placeholder="Talk to Neo — updates, decisions, new jobs…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Neo.send()}"></textarea><button class="btn primary sm" onclick="Neo.send()" ${this.busy ? 'disabled' : ''}>${I('send', 14)}Send</button></div>
    </div>`;
  },
  async send(text) {
    const inp = $('#neoIn'); text = (text ?? inp?.value ?? '').trim();
    if (!text || this.busy) return;
    (this.msgs ||= []).push({ role: 'user', content: text }); this.busy = true; App.render();
    try { const j = await this.call('chat', { text }); if (j.queued) this.waiting = true; else this.msgs.push({ role: 'assistant', content: j.reply }); }
    catch (e) { this.msgs.push({ role: 'assistant', content: '⚠️ ' + e.message }); }
    this.busy = false; App.render(); this.load('overview');
  },

  // ── Team ─────────────────────────────────────────────────
  teamView() {
    const d = this.data, ag = (d.agents || []).filter(a => a.active), sch = d.schedules || [];
    const card = a => `<div class="neo-agent ${a.role}">
      <div class="row between"><div><b>${esc(a.name)}</b> <small class="faint">v${a.version}</small><br><small class="muted">${esc(a.title)}</small></div>${a.role === 'coo' ? chip('COO', 'gold', 'crown') : a.role === 'manager' ? chip('Manager', 'blue') : ''}</div>
      <div class="neo-sched">${sch.filter(s => s.agent_id === a.id && s.active).map(s => `<small>${I('clock', 12)} ${esc(this.cron(s.cron))} — ${esc(s.title)}</small>`).join('') || (a.id === 'nova-echo' ? `<small>${I('zap', 12)} Instantly, on every new enquiry or booking</small>` : '<small class="faint">On demand</small>')}</div>
      <div class="row between mt"><small class="faint">Last run ${this.ago(a.last_run_at)}</small><span class="row" style="gap:6px"><button class="btn xs ghost" onclick="Neo.showAgent('${a.id}')">Brief</button><button class="btn xs" onclick="Neo.runAgent('${a.id}')">${I('play', 12)}Run now</button></span></div>
    </div>`;
    const group = (bid, label) => `<div class="glass card s12"><div class="card-h"><h2>${I('briefcase')}${label}</h2></div><div class="neo-grid">${ag.filter(a => a.business_id === bid).sort((a, b) => (a.role === 'manager' ? -1 : 1) - (b.role === 'manager' ? -1 : 1)).map(card).join('')}</div></div>`;
    return `<div class="glass card s12"><div class="card-h"><h2>${I('crown')}Chief Operating Officer</h2><span class="sub">runs the managers</span></div><div class="neo-grid">${ag.filter(a => a.role === 'coo').map(card).join('')}</div></div>
      ${this.hermes() ? `<p class="hint s12" style="margin:0">Everyone works inside Neo’s three daily Pro runs (UK time), no extra cost.</p>` : ''}
      ${group('yrb-nova', 'YRB Nova + VoiceDesk')}${group('yrbsupreme', 'YRBSUPREME')}${group('trading', 'Trading Desk')}`;
  },
  showAgent(id) { const a = this.agent(id); UI.modal({ title: `${esc(a.name)} · ${esc(a.title)}`, body: `<div class="msg ai" style="max-width:none">${this.md(a.instructions || '')}</div><p class="hint">Neo proposes upgrades to these instructions after each weekly review — you approve them on Today.</p>` }); },
  runAgent(id) {
    const a = this.agent(id);
    UI.modal({ title: `Run ${esc(a.name)} now`, small: true,
      body: `<form class="form" id="neoRun" onsubmit="return false">${F({ name: 'brief', label: 'Brief (optional)', type: 'textarea', rows: 3, full: true, placeholder: 'Leave blank for their standard job' })}</form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Run', cls: 'primary', onClick: async () => {
        const b = readForm($('#neoRun')).brief;
        try { await this.call('run_agent', { agent_id: id, brief: b || undefined, title: b ? b.slice(0, 80) : undefined }); UI.toast(`${I('play', 16)} ${esc(a.name)} ${this.hermes() ? 'is queued for Neo’s next run (07:12 · 12:43 · 19:23)' : 'is on it — you’ll get a notification'}`, 'success'); } catch (e) { UI.toast(esc(e.message), 'error'); }
      } }] });
  },

  // ── Brain ────────────────────────────────────────────────
  brainView() {
    if (!this.brain) return `<div class="glass card s12"><p class="faint">Loading the brain…</p></div>`;
    const items = this.brain.filter(b => !this.bizFilter || (this.bizFilter === 'company' ? !b.business_id : b.business_id === this.bizFilter));
    const order = ['governance', 'procedure', 'fact', 'evidence', 'metric', 'insight', 'idea'];
    const label = { governance: 'Governance rules', procedure: 'Procedures', fact: 'Facts', evidence: 'Evidence', metric: 'Metrics', insight: 'Insights & feedback', idea: 'Ideas' };
    const f = [['', 'All'], ['company', 'Company'], ['yrb-nova', 'YRB Nova'], ['yrbsupreme', 'YRBSUPREME'], ['trading', 'Trading']];
    return `<div class="s12 row wrap" style="gap:6px">${f.map(([id, l]) => `<button class="btn sm ${this.bizFilter === id ? 'primary' : 'ghost'}" onclick="Neo.bizFilter='${id}';App.render()">${l}</button>`).join('')}<span class="grow"></span><button class="btn sm gold" onclick="Neo.addBrain()">${I('plus', 14)}Teach the brain</button></div>
      ${order.filter(k => items.some(b => b.kind === k)).map(k => `<div class="glass card s12"><div class="card-h"><h2>${I(k === 'governance' ? 'shield' : k === 'procedure' ? 'list' : k === 'idea' ? 'sparkles' : 'database')}${label[k]}</h2><span class="sub">${items.filter(b => b.kind === k).length}</span></div>
        ${items.filter(b => b.kind === k).map(b => `<div class="neo-brain"><div class="grow"><div class="row wrap" style="gap:6px"><b>${esc(b.title)}</b>${b.business_id ? this.biz(b.business_id) : ''}<small class="faint">${esc(b.created_by)} · ${this.ago(b.updated_at)}</small></div><p class="muted">${esc(b.body)}</p></div>${k !== 'governance' ? `<button class="btn xs ghost" onclick="Neo.archive(${b.id})" title="Archive">${I('trash', 13)}</button>` : ''}</div>`).join('')}</div>`).join('')}`;
  },
  addBrain() {
    UI.modal({ title: 'Teach the brain', small: true,
      body: `<form class="form" id="neoBr" onsubmit="return false">
        ${F({ name: 'kind', label: 'Type', type: 'select', value: 'fact', options: [['fact', 'Fact'], ['procedure', 'Procedure (how we do things)'], ['evidence', 'Evidence (result, client, proof)'], ['metric', 'Metric'], ['insight', 'Insight'], ['idea', 'Idea']] })}
        ${F({ name: 'business_id', label: 'Business', type: 'select', value: '', options: [['', 'Company-wide'], ['yrb-nova', 'YRB Nova'], ['yrbsupreme', 'YRBSUPREME'], ['trading', 'Trading']] })}
        ${F({ name: 'title', label: 'Title', full: true })}${F({ name: 'body', label: 'Details', type: 'textarea', rows: 4, full: true })}</form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Save', cls: 'primary', onClick: async () => {
        const o = readForm($('#neoBr')); if (!o.title || !o.body) { UI.toast('Add a title and details', 'warn'); return false; }
        try { await this.call('brain_add', o); UI.toast(`${I('check', 16)} Every agent knows this now`, 'success'); this.load('brain'); } catch (e) { UI.toast(esc(e.message), 'error'); }
      } }] });
  },
  archive(id) { UI.confirm('Archive this?', 'Agents will stop using it.', 'Archive', async () => { await this.call('brain_archive', { id }); this.load('brain'); }); },

  // ── Activity ─────────────────────────────────────────────
  activityView() {
    if (!this.acts) return `<div class="glass card s12"><p class="faint">Loading activity…</p></div>`;
    const runs = this.acts.runs || [], byAgent = {};
    runs.forEach(r => { byAgent[r.agent_id] = (byAgent[r.agent_id] || 0) + Number(r.cost_usd); });
    const st = { done: 'green', failed: 'red', running: 'blue', queued: 'amber' };
    return `<div class="glass card s6"><div class="card-h"><h2>${I('coins')}AI spend · 7 days</h2><span class="sub">$${sum(runs, r => +r.cost_usd).toFixed(2)}</span></div>
        ${Chart.hbars(Object.entries(byAgent).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ label: this.agent(id).name, value: v })), { signed: false, fmt: v => '$' + v.toFixed(2) })}</div>
      <div class="glass card s6"><div class="card-h"><h2>${I('check')}Your decisions</h2><span class="sub">what the team learns from</span></div>
        ${(this.hist || []).slice(0, 12).map(h => `<div class="neo-brain"><div class="grow"><div class="row wrap" style="gap:6px">${chip(h.status, h.status === 'approved' ? 'green' : h.status === 'rejected' ? 'red' : 'amber')}<small class="faint">${esc(this.agent(h.agent_id).name)} · ${this.ago(h.decided_at || h.created_at)}</small></div><p class="muted">${esc(h.summary)}${h.feedback ? ` — <i>“${esc(h.feedback)}”</i>` : ''}</p></div></div>`).join('') || '<p class="faint" style="font-size:13.5px">No decisions yet.</p>'}</div>
      <div class="glass card s12"><div class="card-h"><h2>${I('layers')}Work log</h2></div>
        ${(this.acts.items || []).map(t => `<div class="neo-rep"><div class="neo-ap-h" onclick="Neo.toggle('t${t.id}')"><div class="grow"><div class="row wrap" style="gap:6px">${chip(t.status, st[t.status])}<small class="faint">${esc(this.agent(t.agent_id).name)} · ${esc(t.origin)} · ${this.ago(t.created_at)}</small></div><b class="neo-sum">${esc(t.title)}</b></div>${I(this.open['t' + t.id] ? 'up' : 'down', 16)}</div>
          ${this.open['t' + t.id] ? `<div class="neo-payload msg ai">${t.error ? `<p class="neg">${esc(t.error)}</p>` : ''}${this.md(t.output || (t.status === 'done' ? 'Done.' : 'Not finished yet.'))}</div>` : ''}</div>`).join('') || '<p class="faint" style="font-size:13.5px">Nothing has run yet.</p>'}</div>`;
  },

  // ── Settings ─────────────────────────────────────────────
  settings() {
    const s = this.data?.settings || {};
    const models = [['claude-haiku-5-5', 'Haiku 5.5 (cheapest)'], ['claude-sonnet-5-5', 'Sonnet 5.5 (balanced)'], ['claude-opus-5-5', 'Opus 5.5 (best)']];
    UI.modal({ title: 'Company settings', small: true,
      body: `<form class="form" id="neoSet" onsubmit="return false">
        ${F({ name: 'daily_send_cap', label: 'Max outreach emails per day', type: 'number', value: s.daily_send_cap || 20, hint: 'Hard limit enforced in the database. Keep it low to protect your Gmail.' })}
        ${this.hermes() ? '<p class="hint">Runs on your Claude Pro plan: no extra cost.</p>' : F({ name: 'daily_budget_usd', label: 'Daily AI budget (USD)', type: 'number', value: s.daily_budget_usd, hint: 'Agents stop for the day when this is reached.' })}
        ${this.hermes() ? '' : F({ name: 'model_coo', label: 'Neo’s model', type: 'select', value: s.model_coo, options: models })}
        ${this.hermes() ? '' : F({ name: 'model_worker', label: 'Managers & workers model', type: 'select', value: s.model_worker, options: models })}
        ${F({ name: 'paused', label: 'Pause the whole company', type: 'switch', value: s.paused === 'true', full: true })}</form>
        <button class="btn sm mt" onclick="Neo.call('test_push').then(()=>UI.toast('Test sent — check your phone','success'))">${I('bell', 14)}Send test notification</button>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Save', cls: 'primary', onClick: async () => {
        const o = readForm($('#neoSet'));
        try { await this.call('settings', { daily_send_cap: o.daily_send_cap, daily_budget_usd: o.daily_budget_usd ?? undefined, model_coo: o.model_coo, model_worker: o.model_worker, paused: !!o.paused }); UI.toast(`${I('check', 16)} Saved`, 'success'); this.load('overview'); } catch (e) { UI.toast(esc(e.message), 'error'); }
      } }] });
  },
};
App.register('neo', Neo);
Neo.poll();
