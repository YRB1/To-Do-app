'use strict';
/* Calendar — month grid with tasks + live Google Calendar events */

const Cal = {
  y: new Date().getFullYear(), m: new Date().getMonth(), sel: today(), loading: false,
  title: 'Calendar',
  sub() {
    if (GCal.connected()) return `<span class="status on">Google Calendar connected</span>`;
    if (GCal.configured()) return `<span class="status warn">Google Calendar — tap Connect</span>`;
    return 'Tasks by due date · connect Google in Profile';
  },
  actions() {
    if (!GCal.configured()) return `<a class="btn" href="#/profile/integrations">${I('link', 16)}<span class="hide-sm">Connect Google</span></a>`;
    if (!GCal.connected()) return `<button class="btn" onclick="Cal.connect()">${I('link', 16)}<span class="hide-sm">Connect Google</span></button>`;
    return `<button class="btn" onclick="Cal.sync()" title="Refresh Google events">${I('refresh', 16)}<span class="hide-sm">Refresh</span></button>`;
  },
  async connect() { if (await GCal.connect()) this.sync(); },
  async sync() {
    try { this.loading = true; await GCal.fetchMonth(this.y, this.m, true); } catch (e) { if (e.message !== 'not connected') UI.toast(esc(e.message), 'error'); }
    this.loading = false; App.render();
  },
  move(d) { this.m += d; if (this.m < 0) { this.m = 11; this.y--; } if (this.m > 11) { this.m = 0; this.y++; } App.render(); },
  goToday() { const n = new Date(); this.y = n.getFullYear(); this.m = n.getMonth(); this.sel = today(); App.render(); },
  pick(ds) { this.sel = ds; const p = $('#calDay'); if (p) { $$('.cal-cell.sel').forEach(c => c.classList.remove('sel')); $(`.cal-cell[data-d="${ds}"]`)?.classList.add('sel'); p.innerHTML = this.dayHTML(ds); if (matchMedia('(max-width: 900px)').matches) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },

  render() {
    const ws = Store.s.weekStart ?? 1;
    const first = new Date(this.y, this.m, 1);
    const offset = (first.getDay() - ws + 7) % 7;
    const start = new Date(this.y, this.m, 1 - offset);
    const dows = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + ws + i).toLocaleDateString(LOCALE, { weekday: 'short' }));
    const byDate = {};
    Store.d.tasks.forEach(t => { if (t.due) (byDate[t.due] ||= []).push(t); });
    const t0 = today();
    let cells = '';
    const weeks = Math.ceil((offset + new Date(this.y, this.m + 1, 0).getDate()) / 7);
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const ds = ymd(d);
      const ts = (byDate[ds] || []).sort((a, b) => Tasks.smartSort(a, b));
      const evs = GCal.eventsOn(ds);
      const items = [...evs.map(e => `<div class="cal-ev g">${e.time ? fmtTime(e.time) + ' ' : ''}${esc(e.title)}</div>`), ...ts.map(t => `<div class="cal-ev ${t.priority}${t.done ? ' done' : ''}">${esc(t.text)}</div>`)];
      const dots = [...evs.map(() => '<i class="g"></i>'), ...ts.map(t => `<i class="${t.done ? 'done' : ''}"></i>`)].slice(0, 6).join('');
      cells += `<div class="cal-cell${d.getMonth() !== this.m ? ' out' : ''}${ds === t0 ? ' today' : ''}${ds === this.sel ? ' sel' : ''}" data-d="${ds}" onclick="Cal.pick('${ds}')">
        <div class="cal-n">${d.getDate()}</div>${items.slice(0, 3).join('')}${items.length > 3 ? `<div class="cal-more">+${items.length - 3} more</div>` : ''}<div class="cal-dots">${dots}</div></div>`;
    }
    return `<div class="dash">
      <div class="glass card s8">
        <div class="cal-head">
          <h2>${first.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })}</h2>
          <button class="btn sm" onclick="Cal.goToday()">Today</button>
          <button class="btn sm icon" onclick="Cal.move(-1)" aria-label="Previous month">${I('chevL', 16)}</button>
          <button class="btn sm icon" onclick="Cal.move(1)" aria-label="Next month">${I('chevR', 16)}</button>
        </div>
        <div class="cal">${dows.map(d => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
        <div class="row wrap mt faint" style="font-size:12px;gap:14px">
          <span class="row" style="gap:6px"><i class="dot" style="background:var(--accent)"></i>Your tasks</span>
          <span class="row" style="gap:6px"><i class="dot" style="background:var(--info)"></i>Google Calendar</span>
          ${this.loading ? '<span>Loading events…</span>' : ''}
        </div>
      </div>
      <div class="s4" style="display:flex;flex-direction:column;gap:16px">
        <div class="glass card" id="calDay">${this.dayHTML(this.sel)}</div>
        <div class="glass card">
          <div class="card-h"><h2>${I('link')}Sync</h2></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${GCal.connected()
              ? `<button class="btn block" onclick="GCal.pushUpcoming()">${I('upload', 16)}Push upcoming tasks to Google</button>`
              : `<button class="btn block" onclick="${GCal.configured() ? 'Cal.connect()' : "App.go('profile/integrations')"}">${I('calendar', 16)}Connect Google Calendar</button>`}
            <button class="btn block" onclick="Reminders.send(Store.d.tasks.filter(t=>!t.done&&t.due&&t.due>=today()))">${I('phone', 16)}Send upcoming to iPhone Reminders</button>
            <button class="btn block" onclick="ICS.download(Store.d.tasks.filter(t=>!t.done&&t.due))">${I('download', 16)}Export to Apple Calendar (.ics)</button>
          </div>
          <p class="hint" style="margin:10px 2px 0">Google Calendar also appears in your iPhone Calendar app automatically once your Google account is added in iOS Settings → Calendar → Accounts.</p>
        </div>
      </div>
    </div>`;
  },
  dayHTML(ds) {
    const ts = Store.d.tasks.filter(t => t.due === ds).sort((a, b) => Tasks.smartSort(a, b));
    const evs = GCal.eventsOn(ds);
    return `<div class="card-h"><h2>${I('calendar')}${ds === today() ? 'Today' : fmtDay(ds, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
      <div class="right"><button class="btn sm primary" onclick="Tasks.edit(null,{due:'${ds}'})">${I('plus', 15)}Task</button></div></div>
      ${!ts.length && !evs.length ? `<p class="faint" style="font-size:13px;padding:8px 2px">Nothing scheduled. A clear day is a chance to build.</p>` : ''}
      ${evs.map(e => `<a class="ev-row" href="${esc(safeUrl(e.link))}" target="_blank" rel="noopener"><span class="t">${e.time ? fmtTime(e.time) : 'All day'}</span><span class="n">${esc(e.title)}</span>${I('external', 14)}</a>`).join('')}
      ${ts.map(t => Tasks.row(t)).join('')}`;
  },
  after() {
    if (GCal.connected() && !GCal.cache[`${this.y}-${this.m}`] && !this.loading) {
      this.loading = true;
      GCal.fetchMonth(this.y, this.m).then(ch => { this.loading = false; if (ch && App.cur === 'calendar') App.render(); })
        .catch(e => { this.loading = false; UI.toast(esc(e.message), 'error'); });
    }
  },
};
App.register('calendar', Cal);
