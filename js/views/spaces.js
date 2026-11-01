'use strict';
/* Sections — one workspace per area of life/business: mission, deadline, ladder, daily
   non-negotiables, tasks, links, notes and Claude. Tap a section to work on it. */

const SPACE_STATUS = { Focus: 'gold', Active: 'green', Side: 'blue', Paused: '' };
const SPACE_COLORS = ['#8b6cff', '#e8c27a', '#34d399', '#38bdf8', '#fb7185', '#f97316', '#a3e635', '#e879f9', '#94a3b8'];

function seedSpaces() {
  const now = Date.now();
  const r = (...xs) => xs.map(text => ({ id: uid(), text, done: false }));
  const dly = (...xs) => xs.map(text => ({ id: uid(), text, days: {} }));
  const L = (label, url) => ({ id: uid(), label, url });
  return [
    { id: 'sp_nova', name: 'YRB Nova + VoiceDesk', emoji: '🚀', color: '#8b6cff', status: 'Focus', bizId: 'b_nova', order: 0,
      mission: 'Sell outcomes, not £350 sites: website + VoiceDesk + instant follow-up, as a setup fee plus a monthly fee.',
      deadline: '2026-11-30', deadlineLabel: 'First paying client',
      rungs: r('One paying client at any price (no more free sites)', 'One new client every month', 'Every client on a monthly retainer'),
      daily: dly('Send 30 cold emails', 'Answer every lead within 5 minutes'),
      links: [L('yrbnova.com', 'https://yrbnova.com'), L('VoiceDesk backend', 'https://ai-receptionist-backend-sage.vercel.app')], repo: 'YRB1/YRB-Nova', notes: '', createdAt: now },
    { id: 'sp_leadsnipe', name: 'LeadSnipe', emoji: '🎯', color: '#e8c27a', status: 'Active', bizId: 'b_clientsniper', order: 1,
      mission: 'The lead source that feeds YRB Nova.', deadline: '', deadlineLabel: '',
      rungs: r('One paying subscriber you don’t know', 'Ten paying subscribers'), daily: [],
      links: [L('clientsniperofficial.com', 'https://clientsniperofficial.com')], repo: 'clientsniper/clientsniper-simple', notes: '', createdAt: now },
    { id: 'sp_supreme', name: 'YRBSUPREME', emoji: '👑', color: '#f59e0b', status: 'Side', bizId: 'b_supreme', order: 2,
      mission: 'Jewellery on the side. Sell beyond Etsy and clear the old stock for cash.', deadline: '', deadlineLabel: '',
      rungs: r('Clear the Hyso units and headphones', 'One sale a week outside Etsy'), daily: [],
      links: [L('yrbsupreme.com', 'https://www.yrbsupreme.com'), L('Etsy shop manager', 'https://www.etsy.com/your/shops/me/dashboard')], repo: 'YRB1/yrb-supreme', notes: '', createdAt: now },
    { id: 'sp_trading', name: 'Trading', emoji: '📈', color: '#34d399', status: 'Active', bizId: '', order: 3,
      mission: 'Gold, traded by hand. Liquidity, FVGs, multi-timeframe. Protect the account first.', deadline: '', deadlineLabel: '',
      rungs: r('Pass one evaluation with zero rule breaks', 'First payout from the new account'),
      daily: dly('Journal every trade'),
      links: [L('TradingView', 'https://www.tradingview.com/chart/'), L('Trading journal', '#/trading')], repo: '', notes: '', createdAt: now },
    { id: 'sp_uni', name: 'University', emoji: '🎓', color: '#38bdf8', status: 'Active', bizId: '', order: 4,
      mission: 'Final year, Construction Management at Bath Spa. Finish strong.', deadline: '2026-11-09', deadlineLabel: 'CMA6009 poster due',
      rungs: r('Present the poster (week of 2 Nov)', 'Submit CMA6009 poster by 9 Nov'), daily: [],
      links: [L('Bath Spa Minerva', 'https://minerva.bathspa.ac.uk')], repo: '', notes: '', createdAt: now },
    { id: 'sp_vaultline', name: 'Vaultline', emoji: '💎', color: '#94a3b8', status: 'Paused', bizId: '', order: 5,
      mission: 'App for collectors of watches, cars and art. Paused during the 90-day focus.', deadline: '', deadlineLabel: '',
      rungs: [], daily: [], links: [], repo: '', notes: '', createdAt: now },
    { id: 'sp_clean', name: 'Cleaning startup', emoji: '🧽', color: '#a3e635', status: 'Paused', bizId: '', order: 6,
      mission: 'Website is built. Paused during the 90-day focus.', deadline: '', deadlineLabel: '',
      rungs: [], daily: [], links: [], repo: '', notes: '', createdAt: now },
  ];
}
function ensureSpaces(d) {
  if (d.settings.spacesSeeded) return;
  if (!d.spaces.length) d.spaces = seedSpaces();
  d.settings.spacesSeeded = true;
}

const Spaces = {
  list() { return [...Store.d.spaces].filter(x => !x.archived).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)); },
  tasks(sp) { return Store.d.tasks.filter(t => t.spaceId === sp.id || (sp.bizId && t.bizId === sp.bizId && !t.spaceId)); },
  nextRung(sp) { return (sp.rungs || []).find(r => !r.done); },
  ladderP(sp) { const r = sp.rungs || []; return r.length ? r.filter(x => x.done).length / r.length : 0; },
  dailyDone(sp, day = today()) { const d = sp.daily || []; return d.filter(x => x.days?.[day]).length; },
  countdown(sp) {
    if (!sp.deadline) return null;
    const n = daysBetween(today(), sp.deadline);
    return { n, txt: n > 1 ? `${n} days` : n === 1 ? 'Tomorrow' : n === 0 ? 'Today' : `${-n} days over`, cls: n < 0 ? 'red' : n <= 7 ? 'amber' : '' };
  },

  // ── Grid ────────────────────────────────────────────────────────────
  title: 'Sections',
  sub() { const l = this.list(); return `${l.filter(x => x.status !== 'Paused').length} live · ${l.filter(x => x.status === 'Paused').length} paused`; },
  actions() { return `<button class="btn primary" onclick="Spaces.edit()">${I('plus', 16)}<span class="hide-sm">New section</span></button>`; },
  render() {
    const l = this.list(), live = l.filter(x => x.status !== 'Paused'), paused = l.filter(x => x.status === 'Paused');
    const focus = live.find(x => x.status === 'Focus');
    return `<div class="spaces">
      ${focus ? this.focusTile(focus) : ''}
      <div class="sp-grid">${live.filter(x => x !== focus).map(x => this.tile(x)).join('')}
        <button class="sp-tile sp-new" onclick="Spaces.edit()">${I('plus', 22)}<b>New section</b><span>Uni module, side project, content, anything you work on</span></button>
      </div>
      ${paused.length ? `<details class="sp-paused"><summary>${I('pause', 15)}Paused (${paused.length}) <span class="faint">— parked on purpose, so they don’t steal focus</span></summary><div class="sp-grid">${paused.map(x => this.tile(x)).join('')}</div></details>` : ''}
    </div>`;
  },
  focusTile(x) {
    const ts = this.tasks(x).filter(t => !t.done), nr = this.nextRung(x), cd = this.countdown(x);
    return `<a class="sp-focus" href="#/space/${x.id}" style="--c:${esc(x.color)}">
      <div class="spf-main">
        <div class="spf-tag">${I('flame', 14)}Your one focus</div>
        <div class="spf-name"><span class="sp-emoji lg">${esc(x.emoji || '•')}</span>${esc(x.name)}</div>
        ${nr ? `<div class="spf-rung">${I('ladder', 16)}<span>Next rung: <b>${esc(nr.text)}</b></span></div>` : ''}
      </div>
      <div class="spf-side">
        ${cd ? `<div class="spf-count ${cd.cls}"><b>${cd.n >= 0 ? cd.n : -cd.n}</b><span>${cd.n >= 0 ? (cd.n === 1 ? 'day' : 'days') + ' to' : 'days past'}<br>${esc(x.deadlineLabel || 'deadline')}</span></div>` : ''}
        <div class="spf-stats"><span>${ts.length} open task${ts.length === 1 ? '' : 's'}</span>${(x.daily || []).length ? `<span>${this.dailyDone(x)}/${x.daily.length} daily done</span>` : ''}</div>
      </div>
    </a>`;
  },
  tile(x) {
    const ts = this.tasks(x).filter(t => !t.done), od = ts.filter(t => t.due && t.due < today()).length, nr = this.nextRung(x), cd = this.countdown(x);
    return `<a class="sp-tile ${x.status === 'Paused' ? 'paused' : ''}" href="#/space/${x.id}" style="--c:${esc(x.color)}">
      <div class="row between"><span class="sp-emoji">${esc(x.emoji || '•')}</span>${cd ? chip(cd.txt, cd.cls, 'clock') : chip(esc(x.status), SPACE_STATUS[x.status] || '')}</div>
      <b class="sp-name">${esc(x.name)}</b>
      <span class="sp-next">${nr ? esc(nr.text) : esc(x.mission || 'Tap to set a mission and the next rung')}</span>
      <div class="sp-foot">${(x.rungs || []).length ? `<div class="sp-ladder">${x.rungs.map(r => `<i class="${r.done ? 'on' : ''}"></i>`).join('')}</div>` : '<span></span>'}<span class="faint">${ts.length} open${od ? ` · <span class="neg">${od} late</span>` : ''}</span></div>
    </a>`;
  },

  // ── Workspace ───────────────────────────────────────────────────────
  detail(x) {
    const all = this.tasks(x), open = all.filter(t => !t.done).sort((a, b) => Tasks.smartSort(a, b)), done = all.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const cd = this.countdown(x), t0 = today(), biz = Store.biz(x.bizId);
    const links = [...(x.links || [])];
    return `<div class="dash ws" style="--c:${esc(x.color)}">
      <div class="glass card ws-hero s12">
        <div class="ws-top">
          <span class="sp-emoji xl">${esc(x.emoji || '•')}</span>
          <div class="grow">
            <div class="row wrap" style="gap:6px">${chip(esc(x.status), SPACE_STATUS[x.status] || '')}${biz ? `<a class="chip" href="#/business/${biz.id}" style="text-decoration:none">${I('briefcase', 12)}${esc(biz.name)} finances</a>` : ''}</div>
            <h2 class="ws-name">${esc(x.name)}</h2>
            <p class="ws-mission">${esc(x.mission || 'No mission yet. What does winning here look like?')}</p>
          </div>
          ${cd ? `<div class="ws-count ${cd.cls}"><b>${cd.n >= 0 ? cd.n : -cd.n}</b><span>${cd.n >= 0 ? (cd.n === 1 ? 'day to' : 'days to') : 'days past'}</span><small>${esc(x.deadlineLabel || 'Deadline')} · ${fmtDay(x.deadline, { day: 'numeric', month: 'short' })}</small></div>` : `<button class="btn sm ghost" onclick="Spaces.edit('${x.id}')">${I('clock', 14)}Set a deadline</button>`}
        </div>
        <div class="ws-actions">
          <button class="btn primary" onclick="Spaces.askClaude('${x.id}','plan')">${I('sparkles', 15)}Plan my next moves with Claude</button>
          <button class="btn" onclick="Tasks.edit(null,{spaceId:'${x.id}',bizId:'${x.bizId || ''}'})">${I('plus', 15)}Task</button>
          <button class="btn" onclick="App.go('dashboard');setTimeout(()=>Focus.toggle(),250)">${I('play', 15)}Start a focus block</button>
          <span class="grow"></span>
          <button class="btn ghost icon" title="Edit section" onclick="Spaces.edit('${x.id}')">${I('edit', 16)}</button>
        </div>
      </div>

      <div class="glass card s7">
        <div class="card-h"><h2>${I('tasks')}Tasks</h2><span class="sub">${open.length} open</span></div>
        <div class="quick-add inset">${I('plus', 18)}<input id="spQa" placeholder="Add to ${esc(x.name)}… (try “Email 3 garages tomorrow !high”)" onkeydown="if(event.key==='Enter'){event.preventDefault();Tasks.quick(this,{spaceId:'${x.id}',bizId:'${x.bizId || ''}'})}"><button class="btn primary sm" onclick="Tasks.quick($('#spQa'),{spaceId:'${x.id}',bizId:'${x.bizId || ''}'})">Add</button></div>
        ${open.map(t => Tasks.row(t)).join('') || `<p class="faint" style="font-size:13px;padding:6px 2px">Nothing open. Add the next move, or ask Claude to break the next rung into tasks.</p>`}
        ${done.length ? `<details class="guide"><summary>${I('check', 15)}Completed (${done.length})</summary><div style="padding:10px">${done.slice(0, 15).map(t => Tasks.row(t)).join('')}</div></details>` : ''}
      </div>

      <div class="s5 col-stack">
        <div class="glass card">
          <div class="card-h"><h2>${I('ladder')}The ladder</h2><span class="sub">one rung at a time</span></div>
          ${(x.rungs || []).length ? `<ol class="ladder">${x.rungs.map((r, i) => { const isNext = !r.done && x.rungs.findIndex(z => !z.done) === i; return `<li class="${r.done ? 'done' : ''} ${isNext ? 'next' : ''}"><button class="lad-k" onclick="Spaces.toggleRung('${x.id}','${r.id}')" aria-label="${r.done ? 'Mark not reached' : 'Mark reached'}">${r.done ? I('check', 13, 3) : i + 1}</button><span>${esc(r.text)}</span>${isNext ? `<button class="btn xs ghost" title="Break into tasks with Claude" onclick="Spaces.askClaude('${x.id}','rung')">${I('sparkles', 13)}</button>` : ''}</li>`; }).join('')}</ol>` : `<p class="faint" style="font-size:13px">Set the first rung low: one sale, one client, one pass.</p>`}
          <div class="row mt-s"><input class="input" id="rungNew" placeholder="Add a rung" onkeydown="if(event.key==='Enter'){event.preventDefault();Spaces.addRung('${x.id}')}"><button class="btn icon" onclick="Spaces.addRung('${x.id}')">${I('plus', 16)}</button></div>
        </div>

        ${(x.daily || []).length || x.status === 'Focus' ? `<div class="glass card">
          <div class="card-h"><h2>${I('flame')}Every day</h2><span class="sub">${this.dailyDone(x)}/${(x.daily || []).length} today</span></div>
          ${(x.daily || []).map(dl => { const st = Habits.streak({ days: dl.days || {} }); return `<button class="dly ${dl.days?.[t0] ? 'on' : ''}" onclick="Spaces.toggleDaily('${x.id}','${dl.id}')"><span class="hk">${I('check', 12, 3)}</span><span class="grow">${esc(dl.text)}</span>${st > 1 ? `<span class="streak">${I('flame', 12)}${st}</span>` : ''}</button>`; }).join('')}
          <div class="row mt-s"><input class="input" id="dlyNew" placeholder="Add a daily non-negotiable" onkeydown="if(event.key==='Enter'){event.preventDefault();Spaces.addDaily('${x.id}')}"><button class="btn icon" onclick="Spaces.addDaily('${x.id}')">${I('plus', 16)}</button></div>
        </div>` : ''}

        <div class="glass card">
          <div class="card-h"><h2>${I('link')}Launchpad</h2><div class="right"><button class="btn xs ghost" onclick="Spaces.addLink('${x.id}')">${I('plus', 13)}Link</button></div></div>
          <div class="launch">
            ${links.map(l => { const u = l.url.startsWith('#/') ? l.url : safeUrl(l.url); return u ? `<div class="lnk"><a href="${esc(u)}" ${u.startsWith('#') ? '' : 'target="_blank" rel="noopener"'}>${I(u.startsWith('#') ? 'arrowR' : 'globe', 15)}<span class="ellipsis">${esc(l.label || u)}</span></a><button class="btn ghost xs icon" onclick="Spaces.rmLink('${x.id}','${l.id}')" aria-label="Remove link">${I('x', 12)}</button></div>` : ''; }).join('')}
            ${x.repo ? `<a class="lnk gh" href="https://github.com/${esc(x.repo)}" target="_blank" rel="noopener">${I('github', 15)}<span class="ellipsis">${esc(x.repo)}</span></a>` : ''}
          </div>
          ${x.repo ? `<div id="ghBox" class="gh-box" data-repo="${esc(x.repo)}"><p class="faint" style="font-size:12.5px">Loading repo activity…</p></div>` : ''}
        </div>
      </div>

      <div class="glass card s12">
        <div class="card-h"><h2>${I('book')}Notes</h2><span class="sub" id="spSaved">Saves as you type</span></div>
        <div class="field"><textarea id="spNotes" rows="8" placeholder="Offers, contacts, scripts, ideas — everything for ${esc(x.name)} in one place." style="min-height:180px">${esc(x.notes || '')}</textarea></div>
      </div>
    </div>`;
  },

  // ── Actions ─────────────────────────────────────────────────────────
  mut(id, fn) { const x = Store.space(id); if (!x) return; fn(x); App.refresh(); },
  toggleRung(id, rid) {
    let reached = null;
    this.mut(id, x => { const r = x.rungs.find(z => z.id === rid); r.done = !r.done; r.doneAt = r.done ? Date.now() : 0; if (r.done) reached = r; });
    if (reached) UI.toast(`${I('ladder', 16)} Rung reached: ${esc(reached.text)}. Next one up.`, 'success');
  },
  addRung(id) { const i = $('#rungNew'); const v = i?.value.trim(); if (!v) return; this.mut(id, x => (x.rungs ||= []).push({ id: uid(), text: v, done: false })); $('#rungNew')?.focus(); },
  toggleDaily(id, did) { this.mut(id, x => { const d = x.daily.find(z => z.id === did); d.days ||= {}; if (d.days[today()]) delete d.days[today()]; else d.days[today()] = 1; }); },
  addDaily(id) { const i = $('#dlyNew'); const v = i?.value.trim(); if (!v) return; this.mut(id, x => (x.daily ||= []).push({ id: uid(), text: v, days: {} })); },
  addLink(id) {
    UI.modal({ title: 'Add link', small: true,
      body: `<form class="form" id="lnkForm" onsubmit="return false">${F({ name: 'label', label: 'Name', full: true, placeholder: 'e.g. Stripe dashboard' })}${F({ name: 'url', label: 'Link', type: 'url', full: true, placeholder: 'https://…' })}</form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Add link', cls: 'primary', onClick: m => {
        const o = readForm($('#lnkForm', m.el)); if (!safeUrl(o.url)) { UI.toast('Paste a full link starting with https://', 'warn'); return false; }
        this.mut(id, x => (x.links ||= []).push({ id: uid(), label: o.label, url: o.url }));
      } }] });
  },
  rmLink(id, lid) { this.mut(id, x => { x.links = x.links.filter(l => l.id !== lid); }); },

  context(x) {
    const ts = this.tasks(x).filter(t => !t.done).sort((a, b) => Tasks.smartSort(a, b)).slice(0, 15);
    return [`Section: ${x.name} (${x.status})`, x.mission && `Mission: ${x.mission}`,
      x.deadline && `Deadline: ${x.deadlineLabel || 'deadline'} on ${x.deadline} (${daysBetween(today(), x.deadline)} days from today, ${today()})`,
      (x.rungs || []).length && `Ladder: ${x.rungs.map((r, i) => `${i + 1}. ${r.text}${r.done ? ' [reached]' : ''}`).join('; ')}`,
      (x.daily || []).length && `Daily non-negotiables: ${x.daily.map(d => d.text).join('; ')}`,
      ts.length && `Open tasks: ${ts.map(t => t.text + (t.due ? ` (due ${t.due})` : '')).join('; ')}`,
      x.notes && `Notes: ${x.notes.slice(0, 1500)}`].filter(Boolean).join('\n');
  },
  askClaude(id, kind) {
    const x = Store.space(id); if (!x) return;
    const nr = this.nextRung(x);
    const ask = kind === 'rung' && nr
      ? `Break my next rung — “${nr.text}” — into 5-8 concrete tasks I can start this week, smallest first, each doable in under 2 hours.`
      : `Look at this section and tell me the 3 highest-leverage moves for the next 7 days to hit the next rung${x.deadline ? ' before the deadline' : ''}. Be specific, and give each as a task I can do.`;
    Claude.start({ title: `${x.emoji || ''} ${x.name}`.trim(), context: this.context(x), ask, spaceId: x.id, bizId: x.bizId });
  },

  edit(id) {
    const ex = id ? Store.space(id) : null;
    const x = ex || { name: '', emoji: '', color: SPACE_COLORS[Store.d.spaces.length % SPACE_COLORS.length], status: 'Active', mission: '', deadline: '', deadlineLabel: '', bizId: '', repo: '' };
    UI.modal({
      title: ex ? 'Edit section' : 'New section',
      body: `<form class="form" id="spForm" onsubmit="return false">
        ${F({ name: 'name', label: 'Name', value: x.name, placeholder: 'e.g. Content engine' })}
        ${F({ name: 'emoji', label: 'Emoji', value: x.emoji, placeholder: '🚀', attrs: ' maxlength="4"' })}
        ${F({ name: 'status', label: 'Status', type: 'seg', value: x.status, full: true, options: [['Focus', 'Focus'], ['Active', 'Active'], ['Side', 'Side'], ['Paused', 'Paused']] })}
        ${F({ name: 'mission', label: 'Mission', type: 'textarea', rows: 2, value: x.mission, full: true, placeholder: 'What does winning here look like?' })}
        ${F({ name: 'deadlineLabel', label: 'Deadline is for', value: x.deadlineLabel, placeholder: 'e.g. First paying client' })}
        ${F({ name: 'deadline', label: 'Deadline', type: 'date', value: x.deadline })}
        ${F({ name: 'bizId', label: 'Linked business', type: 'select', value: x.bizId, options: [['', '— None —'], ...Store.d.businesses.map(b => [b.id, b.name])], hint: 'Its tasks show up here too' })}
        ${F({ name: 'repo', label: 'GitHub repo', value: x.repo, placeholder: 'YRB1/repo-name' })}
        <div class="field full"><span>Colour</span><div class="swatches">${SPACE_COLORS.map(c => `<label><input type="radio" name="color" value="${c}" ${c === x.color ? 'checked' : ''}><i style="background:${c}"></i></label>`).join('')}</div></div>
      </form>`,
      footer: [ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: m => { UI.confirm('Delete section?', `“${esc(ex.name)}” will be removed. Its tasks stay in your task list.`, 'Delete', () => { Store.d.spaces = Store.d.spaces.filter(s => s.id !== ex.id); Store.d.tasks.forEach(t => { if (t.spaceId === ex.id) t.spaceId = ''; }); Store.save(); m.close(); App.go('spaces'); }); return false; } },
        'spacer', { label: 'Cancel', cls: 'ghost' }, { label: ex ? 'Save' : 'Create section', cls: 'primary', onClick: () => {
          const o = readForm($('#spForm'));
          if (!o.name) { UI.toast('Give the section a name', 'warn'); return false; }
          o.repo = (o.repo || '').replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
          if (o.status === 'Focus') Store.d.spaces.forEach(s => { if (s.status === 'Focus' && s !== ex) s.status = 'Active'; });
          if (ex) Object.assign(ex, o);
          else { const n = { id: 'sp_' + uid(), rungs: [], daily: [], links: [], notes: '', createdAt: Date.now(), order: Store.d.spaces.length, ...o }; Store.d.spaces.push(n); Store.save(); App.go('space/' + n.id); return; }
          App.refresh();
        } }],
    });
  },
};

const SpaceView = {
  title(p) { const x = Store.space(p[0]); return x ? esc(x.name) : 'Section'; },
  sub(p) { const x = Store.space(p[0]); return x ? `<a href="#/spaces" class="crumb">${I('chevL', 13)}All sections</a>` : ''; },
  actions(p) { return `<button class="btn" onclick="Spaces.askClaude('${esc(p[0])}','plan')">${I('sparkles', 16)}<span class="hide-sm">Ask Claude</span></button>`; },
  render(p) {
    const x = Store.space(p[0]);
    return x ? Spaces.detail(x) : `<div class="glass card">${empty('folder', 'Section not found', 'It may have been deleted.', `<a class="btn" href="#/spaces">All sections</a>`)}</div>`;
  },
  after(el, p) {
    const x = Store.space(p[0]); if (!x) return;
    const ta = $('#spNotes', el);
    if (ta) { const save = debounce(() => { x.notes = ta.value; Store.save(); const s = $('#spSaved'); if (s) s.textContent = 'Saved'; }, 500); ta.oninput = () => { const s = $('#spSaved'); if (s) s.textContent = 'Saving…'; save(); }; }
    const gb = $('#ghBox', el); if (gb) GitHub.repoBox(gb);
  },
};
App.register('spaces', Spaces);
App.register('space', SpaceView);
