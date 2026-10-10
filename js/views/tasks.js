'use strict';
/* Tasks — list + board, natural-language quick add, editor, repeat logic */

const REPEAT_OPTS = [['none', 'Does not repeat'], ['daily', 'Daily'], ['weekdays', 'Weekdays'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']];
const PRI = { high: 0, med: 1, low: 2 };

const Tasks = {
  f: 'open', q: '', biz: '', mode: null,
  isOverdue: t => !t.done && t.due && t.due < today(),
  filters() {
    const t0 = today(), ts = Store.d.tasks;
    return [
      ['open', 'Open', t => !t.done],
      ['today', 'Today', t => !t.done && t.due && t.due <= t0],
      ['upcoming', 'Upcoming', t => !t.done && t.due > t0],
      ['overdue', 'Overdue', t => this.isOverdue(t)],
      ['nodate', 'No date', t => !t.done && !t.due],
      ['done', 'Completed', t => t.done],
    ].map(([id, label, fn]) => ({ id, label, fn, n: ts.filter(fn).length }));
  },
  smartSort(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done) return (b.doneAt || 0) - (a.doneAt || 0);
    const ad = a.due || '9999', bd = b.due || '9999';
    if (ad !== bd) return ad.localeCompare(bd);
    if (PRI[a.priority] !== PRI[b.priority]) return PRI[a.priority] - PRI[b.priority];
    return (a.time || '99').localeCompare(b.time || '99');
  },
  shown() {
    const f = this.filters().find(x => x.id === this.f) || this.filters()[0];
    const q = this.q.toLowerCase();
    return Store.d.tasks.filter(t => f.fn(t) && (!this.biz || t.bizId === this.biz) &&
      (!q || t.text.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q) || (Store.biz(t.bizId)?.name || '').toLowerCase().includes(q)))
      .sort((a, b) => this.smartSort(a, b));
  },

  title: 'Tasks',
  sub() { const o = Store.d.tasks.filter(t => !t.done).length, od = Store.d.tasks.filter(t => this.isOverdue(t)).length; return `${o} open${od ? ` · <span class="neg">${od} overdue</span>` : ''}`; },
  actions() { return `<button class="btn primary" onclick="Tasks.edit()">${I('plus', 16)}<span class="hide-sm">New task</span></button>`; },
  render() {
    const mode = this.mode || Store.s.taskView || 'list';
    const bizs = Store.d.businesses;
    return `
      <div class="quick-add glass">
        ${I('plus', 20)}
        <input id="qaInput" placeholder="Add a task — try “Call supplier tomorrow 3pm !high #${esc((bizs[0]?.name || 'Agency').split(' ')[0])}”" autocomplete="off" enterkeyhint="done"
          onkeydown="if(event.key==='Enter'){event.preventDefault();Tasks.quick(this)}">
        <button class="btn primary sm" onclick="Tasks.quick($('#qaInput'))">Add</button>
      </div>
      <p class="hint">Shortcuts: <code>today</code> <code>tomorrow</code> <code>friday</code> <code>3pm</code> <code>!high</code> <code>#business</code></p>
      <div class="toolbar">
        <div class="pills">${this.filters().map(f => `<button class="pill ${this.f === f.id ? 'active' : ''}" onclick="Tasks.f='${f.id}';App.render()">${f.label}${f.n ? `<span class="n">${f.n}</span>` : ''}</button>`).join('')}</div>
        <div class="right">
          <div class="search">${I('search', 15)}<input id="taskSearch" placeholder="Search tasks" value="${esc(this.q)}" oninput="Tasks.q=this.value;Tasks.renderList()"></div>
          ${bizs.length ? `<select class="input sm" style="width:auto" onchange="Tasks.biz=this.value;App.render()"><option value="">All businesses</option>${bizs.map(b => `<option value="${b.id}"${this.biz === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select>` : ''}
          <div class="seg btns" role="group" aria-label="View">
            <button class="${mode === 'list' ? 'on' : ''}" title="List" onclick="Tasks.setMode('list')">${I('list', 16)}</button>
            <button class="${mode === 'board' ? 'on' : ''}" title="Board" onclick="Tasks.setMode('board')">${I('columns', 16)}</button>
          </div>
        </div>
      </div>
      <div id="taskList">${mode === 'board' ? this.boardHTML() : this.listHTML()}</div>`;
  },
  setMode(m) { this.mode = m; Store.s.taskView = m; Store.save(); App.render(); },
  renderList() { const el = $('#taskList'); if (el) el.innerHTML = (this.mode || Store.s.taskView) === 'board' ? this.boardHTML() : this.listHTML(); },
  after(el) { this.bindDrag(el); },

  listHTML() {
    const list = this.shown();
    if (!list.length) {
      const msg = { open: ['All clear', 'Nothing open. Add the next move that makes you money.'], today: ['Nothing due today', 'Plan tomorrow while you’re ahead.'], overdue: ['No overdue tasks', 'You’re on top of it.'], done: ['Nothing completed yet', 'Tick something off — momentum compounds.'] }[this.f] || ['Nothing here', ''];
      return `<div class="glass card">${empty(this.q ? 'search' : 'tasks', this.q ? 'No matches' : msg[0], this.q ? 'Try a different search.' : msg[1], this.q ? '' : `<button class="btn primary" onclick="Tasks.edit()">${I('plus', 16)}New task</button>`)}</div>`;
    }
    if (this.f !== 'open') return `<div class="glass card">${list.map(t => this.row(t)).join('')}</div>`;
    const t0 = today(), wk = addDays(t0, 7);
    const groups = [
      ['Overdue', 'red', list.filter(t => t.due && t.due < t0)],
      ['In progress', '', list.filter(t => t.doing && !(t.due && t.due < t0))],
      ['Today', '', list.filter(t => !t.doing && t.due === t0)],
      ['Next 7 days', '', list.filter(t => !t.doing && t.due > t0 && t.due <= wk)],
      ['Later', '', list.filter(t => !t.doing && t.due > wk)],
      ['No date', '', list.filter(t => !t.doing && !t.due)],
    ].filter(g => g[2].length);
    return `<div class="glass card">${groups.map(([h, cls, items]) => `<div class="list-group"><div class="lg-h ${cls}">${h}<span class="n">${items.length}</span></div>${items.map(t => this.row(t)).join('')}</div>`).join('')}</div>`;
  },
  boardHTML() {
    const q = this.q.toLowerCase();
    const base = Store.d.tasks.filter(t => (!this.biz || t.bizId === this.biz) && (!q || t.text.toLowerCase().includes(q)));
    const cols = [
      ['todo', 'To do', 'list', base.filter(t => !t.done && !t.doing)],
      ['doing', 'In progress', 'zap', base.filter(t => t.doing && !t.done)],
      ['done', 'Done', 'check', base.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 25)],
    ];
    return `<div class="board">${cols.map(([id, label, ic, items]) => `
      <div class="col glass" data-col="${id}">
        <div class="col-h">${I(ic, 16)} ${label}<span class="n">${items.length}</span></div>
        ${items.sort((a, b) => this.smartSort(a, b)).map(t => this.row(t, true)).join('') || `<p class="faint" style="padding:10px 4px;font-size:13px">Drop tasks here</p>`}
      </div>`).join('')}</div>`;
  },
  bindDrag(el) {
    $$('.board .task', el).forEach(n => {
      n.draggable = true;
      n.ondragstart = e => { e.dataTransfer.setData('text/plain', n.dataset.id); };
    });
    $$('.board .col', el).forEach(c => {
      c.ondragover = e => { e.preventDefault(); c.classList.add('drop'); };
      c.ondragleave = () => c.classList.remove('drop');
      c.ondrop = e => { e.preventDefault(); c.classList.remove('drop'); this.moveTo(e.dataTransfer.getData('text/plain'), c.dataset.col); };
    });
  },
  moveTo(id, col) {
    const t = Store.d.tasks.find(x => x.id === id); if (!t) return;
    if (col === 'done') { if (!t.done) return this.toggle(id); return; }
    if (t.done) { t.done = false; t.doneAt = 0; }
    t.doing = col === 'doing';
    App.refresh();
  },

  row(t, board = false) {
    const biz = Store.biz(t.bizId), goal = Store.goal(t.goalId), t0 = today();
    const od = this.isOverdue(t);
    const st = t.subtasks.length ? `${t.subtasks.filter(x => x.done).length}/${t.subtasks.length}` : '';
    const meta = [
      t.priority === 'high' ? chip('High', 'red', 'flag') : t.priority === 'med' ? chip('Medium', 'amber', 'flag') : '',
      t.doing && !board ? chip('In progress', 'accent', 'zap') : '',
      biz ? `<span class="chip"><i class="dot" style="background:${esc(biz.color)}"></i>${esc(biz.name)}</span>` : '',
      t.due ? chip(relDate(t.due) + (t.time ? ' · ' + fmtTime(t.time) : ''), od ? 'red' : t.due === t0 ? 'blue' : '', 'calendar') : '',
      t.repeat !== 'none' ? chip(REPEAT_OPTS.find(r => r[0] === t.repeat)?.[1] || '', '', 'repeat') : '',
      t.reminder && !t.done ? chip(fmtDT(t.reminder), t.reminderFired ? '' : 'amber', 'bell') : '',
      st ? chip(st, '', 'layers') : '',
      goal ? chip(esc(goal.title), 'gold', 'target') : '',
      t.cat ? chip(esc(t.cat), '', 'tag') : '',
      t.gcalId ? chip('Google', 'blue', 'calendar') : '',
    ].join('');
    return `<div class="task p-${t.priority}${t.done ? ' done' : ''}${t.doing ? ' doing' : ''}" data-id="${t.id}">
      <button class="tcheck" onclick="Tasks.toggle('${t.id}')" aria-label="${t.done ? 'Mark not done' : 'Complete'}">${I('check', 14, 3)}</button>
      <div class="tbody" onclick="Tasks.edit('${t.id}')">
        <div class="ttitle">${esc(t.text)}</div>
        ${t.notes && !board ? `<div class="tnotes">${esc(t.notes)}</div>` : ''}
        <div class="tmeta">${meta}</div>
      </div>
      <div class="tactions">
        ${!t.done && !board ? `<button class="btn ghost xs icon" title="${t.doing ? 'Pause' : 'Start'}" onclick="Tasks.setDoing('${t.id}',${!t.doing})">${I(t.doing ? 'pause' : 'play', 13)}</button>` : ''}
        <button class="btn ghost xs icon" title="Delete" onclick="Tasks.del('${t.id}')">${I('trash', 14)}</button>
      </div>
    </div>`;
  },

  parseQuick(raw) {
    let s = ' ' + raw + ' ', due = '', time = '', priority = '', bizId = '';
    const m1 = s.match(/\s!(high|h|med|medium|m|low|l)(?=\s)/i);
    if (m1) { priority = { h: 'high', high: 'high', m: 'med', med: 'med', medium: 'med', l: 'low', low: 'low' }[m1[1].toLowerCase()]; s = s.replace(m1[0], ' '); }
    const m2 = s.match(/\s#([\w-]+)/);
    if (m2) {
      const key = m2[1].toLowerCase();
      const b = Store.d.businesses.find(b => b.name.toLowerCase().replace(/\s+/g, '').startsWith(key)) || Store.d.businesses.find(b => b.name.toLowerCase().includes(key));
      if (b) { bizId = b.id; s = s.replace(m2[0], ' '); }
    }
    const m3 = s.match(/\s(?:at\s)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i) || s.match(/\s(?:at\s)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/);
    if (m3) {
      let h = +m3[1]; const mi = +(m3[2] || 0), ap = (m3[3] || '').toLowerCase();
      if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
      if (h < 24 && mi < 60) { time = `${pad(h)}:${pad(mi)}`; s = s.replace(m3[0], ' '); }
    }
    const m4 = s.match(/\s(today|tonight|tomorrow|tmrw|tmr)(?=\s)/i);
    if (m4) { due = /^t(om|mr)/i.test(m4[1]) ? addDays(today(), 1) : today(); s = s.replace(m4[0], ' '); }
    else {
      const m5 = s.match(/\s(?:on\s|next\s)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?=\s)/i);
      if (m5) {
        const idx = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(m5[1].toLowerCase());
        due = addDays(today(), ((idx - new Date().getDay() + 7) % 7) || 7); s = s.replace(m5[0], ' ');
      }
    }
    if (time && !due) due = today();
    return { text: s.replace(/\s+/g, ' ').trim(), due, time, priority, bizId };
  },
  quick(input, extra = {}) {
    const raw = input.value.trim();
    if (!raw) { input.focus(); return; }
    const p = this.parseQuick(raw);
    if (!p.text) return;
    const t = normTask({ ...extra, id: uid(), text: p.text, due: p.due || extra.due || '', time: p.time || extra.time || '', priority: p.priority || extra.priority || 'low', bizId: p.bizId || extra.bizId || '' });
    Store.d.tasks.unshift(t);
    input.value = '';
    App.refresh();
    const again = $('#' + input.id); again && again.focus();
    UI.toast(`${I('check', 16)} Added${t.due ? ' for ' + relDate(t.due).toLowerCase() : ''}`, 'success');
  },

  toggle(id) {
    const t = Store.d.tasks.find(x => x.id === id); if (!t) return;
    t.done = !t.done; t.doing = false; t.doneAt = t.done ? Date.now() : 0;
    if (t.done && t.repeat !== 'none' && !t.spawned) {
      t.spawned = true;
      const next = normTask({ ...t, spawned: false, id: uid(), done: false, doneAt: 0, reminderFired: false, gcalId: '', subtasks: t.subtasks.map(s => ({ ...s, done: false })), createdAt: Date.now() });
      next.due = this.nextDate(t.due || today(), t.repeat);
      if (t.reminder) next.reminder = new Date(t.reminder).getTime() + (daysBetween(t.due || today(), next.due) * 864e5);
      Store.d.tasks.push(next);
    }
    App.refresh();
    if (t.done) {
      const el = $(`.task[data-id="${id}"]`); el && el.classList.add('pop');
      const left = Store.d.tasks.filter(x => !x.done && x.due && x.due <= today()).length;
      UI.toast(`${I('check', 16)} ${left ? `Done — ${left} left for today` : 'Done — today is cleared 🔥'}`, 'success');
    }
  },
  nextDate(d, rep) {
    const x = parseYmd(d);
    if (rep === 'daily') x.setDate(x.getDate() + 1);
    else if (rep === 'weekdays') { do x.setDate(x.getDate() + 1); while (x.getDay() === 0 || x.getDay() === 6); }
    else if (rep === 'weekly') x.setDate(x.getDate() + 7);
    else if (rep === 'monthly') x.setMonth(x.getMonth() + 1);
    else if (rep === 'yearly') x.setFullYear(x.getFullYear() + 1);
    const n = ymd(x);
    return n < today() && rep !== 'yearly' ? this.nextDate(n, rep) : n;
  },
  setDoing(id, v) { const t = Store.d.tasks.find(x => x.id === id); if (t) { t.doing = v; App.refresh(); } },
  del(id, after) {
    const t = Store.d.tasks.find(x => x.id === id); if (!t) return;
    UI.confirm('Delete task?', `“${esc(t.text)}” will be permanently removed.`, 'Delete', () => {
      Store.d.tasks = Store.d.tasks.filter(x => x.id !== id);
      App.refresh(); after && after();
      UI.toast(`${I('trash', 16)} Task deleted`);
    });
  },
  clearDone() {
    const n = Store.d.tasks.filter(t => t.done).length; if (!n) return;
    UI.confirm('Clear completed?', `${n} completed task${n > 1 ? 's' : ''} will be removed. Your productivity history for them will be lost.`, 'Clear', () => {
      Store.d.tasks = Store.d.tasks.filter(t => !t.done); App.refresh();
    });
  },

  edit(id, preset = {}) {
    let existing = id ? Store.d.tasks.find(x => x.id === id) : null;
    const wasNew = !existing;
    const t = existing ? { ...existing, subtasks: existing.subtasks.map(s => ({ ...s })) } : normTask({ id: uid(), ...preset });
    const draft = { subtasks: t.subtasks };
    const bizOpts = [['', '— None —'], ...Store.d.businesses.map(b => [b.id, b.name])];
    const goalOpts = [['', '— None —'], ...Store.d.goals.map(g => [g.id, g.title])];
    const cats = Store.d.tasks.map(x => x.cat);
    const ckHTML = () => draft.subtasks.map((s, i) => `<div class="ck ${s.done ? 'done' : ''}"><input type="checkbox" ${s.done ? 'checked' : ''} data-i="${i}"><span>${esc(s.text)}</span><button type="button" class="btn ghost xs icon" data-rm="${i}">${I('x', 13)}</button></div>`).join('');
    const body = `
      <form class="form" id="taskForm" onsubmit="return false">
        ${F({ name: 'text', label: 'Task', value: t.text, full: true, placeholder: 'What needs doing?' })}
        ${F({ name: 'priority', label: 'Priority', type: 'seg', value: t.priority, full: true, options: [['low', 'Low'], ['med', `${I('flag', 13)}Medium`], ['high', `${I('flag', 13)}High`]] })}
        ${F({ name: 'due', label: 'Due date', type: 'date', value: t.due })}
        ${F({ name: 'time', label: 'Time', type: 'time', value: t.time })}
        ${F({ name: 'repeat', label: 'Repeat', type: 'select', value: t.repeat, options: REPEAT_OPTS })}
        ${F({ name: 'reminder', label: 'Reminder', type: 'datetime-local', value: t.reminder ? toLocalInput(t.reminder) : '' })}
        ${F({ name: 'bizId', label: 'Business', type: 'select', value: t.bizId, options: bizOpts })}
        ${F({ name: 'goalId', label: 'Goal', type: 'select', value: t.goalId, options: goalOpts })}
        ${F({ name: 'cat', label: 'Tag', value: t.cat, placeholder: 'e.g. Sales, Admin', list: 'catList' })}
        ${F({ name: 'doing', label: 'In progress', type: 'switch', value: t.doing })}
        <div class="field full"><span>Checklist</span>
          <div class="checklist" id="ckList">${ckHTML()}</div>
          <div class="row"><input class="input" id="ckNew" placeholder="Add a step and press Enter" autocomplete="off"><button type="button" class="btn" id="ckAdd">${I('plus', 16)}</button></div>
        </div>
        ${F({ name: 'notes', label: 'Notes', type: 'textarea', value: t.notes, full: true, rows: 3, placeholder: 'Links, context, next steps…' })}
      </form>
      ${datalist('catList', cats)}
      <div class="send-row"><span>Send to</span>
        <button class="btn sm" data-send="gcal">${I('calendar', 15)}Google Calendar</button>
        <button class="btn sm" data-send="rem">${I('phone', 15)}iPhone Reminders</button>
        <button class="btn sm" data-send="ics">${I('download', 15)}Apple / .ics</button>
      </div>`;
    const save = m => {
      const o = readForm($('#taskForm', m.el));
      if (!o.text) { $('[name=text]', m.el).focus(); UI.toast('Give the task a name', 'warn'); return null; }
      const rem = o.reminder ? new Date(o.reminder).getTime() : 0;
      const changedRem = rem !== (existing?.reminder || 0);
      const out = normTask({ ...t, ...o, reminder: rem, reminderFired: changedRem ? false : t.reminderFired, subtasks: draft.subtasks, done: existing ? existing.done : false, doneAt: existing?.doneAt || 0 });
      if (out.done) out.doing = false;
      if (existing) Object.assign(existing, out); else { Store.d.tasks.unshift(out); existing = out; }
      Store.save();
      return existing;
    };
    UI.modal({
      title: wasNew ? 'New task' : 'Edit task', body,
      footer: [
        !wasNew && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: m => { this.del(existing.id, () => m.close()); return false; } },
        'spacer',
        { label: 'Cancel', cls: 'ghost' },
        { label: wasNew ? 'Add task' : 'Save', cls: 'primary', onClick: m => { if (!save(m)) return false; App.render(); UI.toast(`${I('check', 16)} ${wasNew ? 'Task added' : 'Saved'}`, 'success'); } },
      ],
      onOpen: m => {
        if (wasNew && matchMedia('(hover:hover)').matches) setTimeout(() => $('[name=text]', m.el).focus(), 50);
        const list = $('#ckList', m.el), inp = $('#ckNew', m.el);
        const add = () => { const v = inp.value.trim(); if (!v) return; draft.subtasks.push({ id: uid(), text: v, done: false }); inp.value = ''; list.innerHTML = ckHTML(); inp.focus(); };
        inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
        $('#ckAdd', m.el).onclick = add;
        list.onclick = e => {
          const rm = e.target.closest('[data-rm]'); if (rm) { draft.subtasks.splice(+rm.dataset.rm, 1); list.innerHTML = ckHTML(); return; }
          const cb = e.target.closest('input[data-i]'); if (cb) { draft.subtasks[+cb.dataset.i].done = cb.checked; list.innerHTML = ckHTML(); }
        };
        $$('[data-send]', m.el).forEach(b => b.onclick = async () => {
          const task = save(m); if (!task) return;
          const kind = b.dataset.send;
          if (kind === 'gcal') await GCal.send(task);
          else if (kind === 'rem') Reminders.send(task);
          else ICS.download(task, `${task.text.replace(/[^\w]+/g, '-').slice(0, 40) || 'task'}.ics`);
          App.render();
        });
      },
    });
  },
};
App.register('tasks', Tasks);
