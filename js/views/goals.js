'use strict';
/* Goals — numeric or milestone goals, pace tracking, linked tasks */

const GOAL_CATS = {
  Wealth: { icon: 'wallet', ring: 'gold' }, Business: { icon: 'briefcase', ring: '' }, Trading: { icon: 'candles', ring: 'green' },
  Health: { icon: 'flame', ring: 'red' }, Personal: { icon: 'star', ring: '' }, Learning: { icon: 'book', ring: '' },
};

const Goals = {
  cat: '',
  progress(g) {
    if (g.kind === 'milestones') return g.milestones.length ? g.milestones.filter(m => m.done).length / g.milestones.length : 0;
    const span = (+g.target || 0) - (+g.start || 0);
    return span ? clamp(((+g.current || 0) - (+g.start || 0)) / span, 0, 1) : 0;
  },
  fmtVal(g, v) { return g.unit === 'money' ? money(v) : g.unit === 'percent' ? num(v, 1) + '%' : num(v, 2); },
  pace(g) {
    if (!g.deadline || g.done) return null;
    const startD = ymd(new Date(g.createdAt || Date.now()));
    const total = daysBetween(startD, g.deadline), left = daysBetween(today(), g.deadline);
    const p = this.progress(g);
    if (p >= 1) return { label: 'Achieved', cls: 'green' };
    if (left < 0) return { label: `${-left}d overdue`, cls: 'red' };
    if (total <= 0) return { label: `${left}d left`, cls: '' };
    const expected = clamp(1 - left / total, 0, 1);
    const cls = p >= expected - .05 ? 'green' : p >= expected - .2 ? 'amber' : 'red';
    return { label: (cls === 'green' ? 'On track' : cls === 'amber' ? 'Slightly behind' : 'Behind') + ` · ${left}d left`, cls };
  },

  title: 'Goals',
  sub() { const a = Store.d.goals.filter(g => this.progress(g) < 1); return `${a.length} active · ${Store.d.goals.length - a.length} achieved`; },
  actions() { return `<button class="btn primary" onclick="Goals.edit()">${I('plus', 16)}<span class="hide-sm">New goal</span></button>`; },
  render() {
    const gs = Store.d.goals;
    const active = gs.filter(g => this.progress(g) < 1);
    const avg = active.length ? sum(active, g => this.progress(g)) / active.length : 0;
    const soon = active.filter(g => g.deadline && daysBetween(today(), g.deadline) <= 30 && daysBetween(today(), g.deadline) >= 0).length;
    const behind = active.filter(g => this.pace(g)?.cls === 'red').length;
    const cats = Object.keys(GOAL_CATS).filter(c => gs.some(g => g.cat === c));
    const list = gs.filter(g => !this.cat || g.cat === this.cat).sort((a, b) => (this.progress(a) >= 1) - (this.progress(b) >= 1) || (a.deadline || '9').localeCompare(b.deadline || '9'));
    return `
      <div class="glass card" style="margin-bottom:16px">${EndGoal.card()}</div>
      <div class="kpis">
        ${kpi('Active goals', active.length, { icon: 'target' })}
        ${kpi('Average progress', pct(avg), { icon: 'up', tone: 'green', sub: bar(avg, 'green') })}
        ${kpi('Due in 30 days', soon, { icon: 'clock', tone: 'blue' })}
        ${kpi('Behind pace', behind, { icon: 'flag', tone: behind ? 'red' : 'green', sub: behind ? 'Time to push' : 'Everything on track' })}
      </div>
      ${cats.length > 1 ? `<div class="toolbar"><div class="pills"><button class="pill ${!this.cat ? 'active' : ''}" onclick="Goals.cat='';App.render()">All</button>${cats.map(c => `<button class="pill ${this.cat === c ? 'active' : ''}" onclick="Goals.cat='${c}';App.render()">${I(GOAL_CATS[c].icon, 14)}${c}</button>`).join('')}</div></div>` : '<div class="mt"></div>'}
      ${list.length ? `<div class="grid auto">${list.map(g => this.card(g)).join('')}</div>`
        : `<div class="glass card">${empty('target', 'Set your first goal', 'Big, specific, with a deadline. Then link tasks to it so every day moves the needle.', `<button class="btn primary" onclick="Goals.edit()">${I('plus', 16)}New goal</button>`)}</div>`}`;
  },
  card(g) {
    const p = this.progress(g), pc = this.pace(g), meta = GOAL_CATS[g.cat] || GOAL_CATS.Personal;
    const linked = Store.d.tasks.filter(t => t.goalId === g.id && !t.done).length;
    const biz = Store.biz(g.bizId);
    return `<div class="glass card goal-card">
      <div class="goal-top">
        ${ring(p, 76, 8, p >= 1 ? 'green' : meta.ring, Math.round(p * 100) + '%')}
        <div class="grow">
          <div class="row wrap" style="gap:6px;margin-bottom:6px">${chip(esc(g.cat || 'Personal'), 'accent', meta.icon)}${pc ? chip(pc.label, pc.cls) : ''}</div>
          <div class="goal-title">${esc(g.title)}</div>
          ${g.why ? `<div class="goal-why">${esc(g.why)}</div>` : ''}
        </div>
      </div>
      ${g.kind === 'milestones'
        ? `<div>${g.milestones.map(m => `<div class="ms ${m.done ? 'done' : ''}" onclick="Goals.toggleMs('${g.id}','${m.id}')"><i>${I('check', 12, 3)}</i>${esc(m.text)}</div>`).join('') || '<p class="faint" style="font-size:13px">Add milestones to track progress.</p>'}</div>`
        : `<div><div class="goal-val"><b>${this.fmtVal(g, g.current)}</b><span>of ${this.fmtVal(g, g.target)}</span></div><div class="mt-s">${bar(p, p >= 1 ? 'green' : meta.ring)}</div></div>`}
      <div class="card-foot">
        <span class="faint grow" style="font-size:12px">${g.deadline ? 'By ' + fmtDay(g.deadline, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline'}${linked ? ` · ${linked} task${linked > 1 ? 's' : ''}` : ''}${biz ? ` · ${esc(biz.name)}` : ''}</span>
        ${g.kind !== 'milestones' ? `<button class="btn sm primary" onclick="Goals.update('${g.id}')">${I('up', 14)}Update</button>` : ''}
        <button class="btn sm icon" title="Add task" onclick="Tasks.edit(null,{goalId:'${g.id}',bizId:'${g.bizId || ''}'})">${I('plus', 15)}</button>
        <button class="btn sm icon" title="Edit" onclick="Goals.edit('${g.id}')">${I('edit', 15)}</button>
      </div>
    </div>`;
  },
  toggleMs(gid, mid) {
    const g = Store.goal(gid), m = g?.milestones.find(x => x.id === mid); if (!m) return;
    m.done = !m.done;
    App.refresh();
    if (this.progress(g) >= 1) UI.toast(`${I('crown', 16)} Goal achieved: ${esc(g.title)}`, 'success');
  },
  update(id) {
    const g = Store.goal(id); if (!g) return;
    UI.modal({
      title: 'Update progress', small: true,
      body: `<p class="muted" style="margin-bottom:14px">${esc(g.title)}</p>
        <form class="form" id="gUp" onsubmit="return false">
          ${F({ name: 'current', label: 'New value', type: 'number', value: g.current, full: true })}
          ${F({ name: 'add', label: 'Or add to it', type: 'number', placeholder: 'e.g. 500', full: true })}
        </form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, {
        label: 'Save', cls: 'primary', onClick: m => {
          const o = readForm($('#gUp', m.el));
          const before = this.progress(g);
          g.current = isNum(o.add) ? (+g.current || 0) + o.add : isNum(o.current) ? o.current : g.current;
          g.log = (g.log || []).filter(l => l.date !== today()).concat({ date: today(), value: g.current });
          App.refresh();
          if (before < 1 && this.progress(g) >= 1) UI.toast(`${I('crown', 16)} Goal achieved: ${esc(g.title)} — legendary`, 'success');
          else UI.toast(`${I('check', 16)} Progress saved`, 'success');
        },
      }],
      onOpen: m => setTimeout(() => $('[name=current]', m.el).select(), 60),
    });
  },
  edit(id, preset = {}) {
    const ex = id ? Store.goal(id) : null;
    const g = ex || { id: uid(), title: '', cat: 'Wealth', kind: 'number', unit: 'money', start: 0, target: null, current: 0, deadline: '', why: '', bizId: '', milestones: [], log: [], createdAt: Date.now(), ...preset };
    const body = `<form class="form" id="gForm" onsubmit="return false">
      ${F({ name: 'title', label: 'Goal', value: g.title, full: true, placeholder: 'e.g. £10k/month, pass prop challenge, run a marathon' })}
      ${F({ name: 'cat', label: 'Category', type: 'select', value: g.cat, options: Object.keys(GOAL_CATS) })}
      ${F({ name: 'deadline', label: 'Deadline', type: 'date', value: g.deadline })}
      ${F({ name: 'kind', label: 'Track by', type: 'seg', value: g.kind, full: true, options: [['number', `${I('up', 14)}A number`], ['milestones', `${I('list', 14)}Milestones`]] })}
      <div class="field full" id="numFields" style="display:${g.kind === 'milestones' ? 'none' : 'contents'}">
        ${F({ name: 'unit', label: 'Unit', type: 'select', value: g.unit, options: [['money', 'Money (' + (Store.s.currency) + ')'], ['number', 'Number'], ['percent', 'Percent']] })}
        ${F({ name: 'start', label: 'Starting value', type: 'number', value: g.start })}
        ${F({ name: 'current', label: 'Current value', type: 'number', value: g.current })}
        ${F({ name: 'target', label: 'Target', type: 'number', value: g.target })}
      </div>
      <div class="field full" id="msFields" style="display:${g.kind === 'milestones' ? 'flex' : 'none'}">
        ${F({ name: 'milestones', label: 'Milestones (one per line)', type: 'textarea', rows: 5, value: g.milestones.map(m => m.text).join('\n'), full: true })}
      </div>
      ${F({ name: 'bizId', label: 'Business', type: 'select', value: g.bizId, options: [['', '— None —'], ...Store.d.businesses.map(b => [b.id, b.name])] })}
      ${F({ name: 'why', label: 'Why it matters', value: g.why, placeholder: 'Your reason — read it on hard days' })}
    </form>`;
    UI.modal({
      title: ex ? 'Edit goal' : 'New goal', body,
      footer: [
        ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: m => { UI.confirm('Delete goal?', `“${esc(g.title)}” will be removed. Linked tasks stay.`, 'Delete', () => { Store.d.goals = Store.d.goals.filter(x => x.id !== g.id); Store.d.tasks.forEach(t => { if (t.goalId === g.id) t.goalId = ''; }); m.close(); App.refresh(); }); return false; } },
        'spacer', { label: 'Cancel', cls: 'ghost' },
        { label: ex ? 'Save' : 'Create goal', cls: 'primary', onClick: m => {
          const o = readForm($('#gForm', m.el));
          if (!o.title) { UI.toast('Name your goal', 'warn'); return false; }
          const lines = (o.milestones || '').split('\n').map(s => s.trim()).filter(Boolean);
          const ms = lines.map(text => g.milestones.find(x => x.text === text) || { id: uid(), text, done: false });
          if (o.kind === 'number' && !isNum(o.target)) { UI.toast('Set a target number', 'warn'); return false; }
          const out = { ...g, ...o, milestones: ms, start: o.start ?? 0, current: o.current ?? 0 };
          delete out.sample;
          if (ex) Object.assign(ex, out); else Store.d.goals.push(out);
          App.refresh(); UI.toast(`${I('check', 16)} Goal saved`, 'success');
        } },
      ],
      onOpen: m => {
        $$('[name=kind]', m.el).forEach(r => r.onchange = () => {
          const ms = r.value === 'milestones' && r.checked;
          if (!r.checked) return;
          $('#numFields', m.el).style.display = ms ? 'none' : 'contents';
          $('#msFields', m.el).style.display = ms ? 'flex' : 'none';
        });
      },
    });
  },
};
App.register('goals', Goals);
