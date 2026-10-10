'use strict';
/* Habits — daily check-ins, streaks, 30-day consistency */

const Habits = {
  streak(h) {
    let d = h.days[today()] ? today() : addDays(today(), -1), n = 0;
    while (h.days[d]) { n++; d = addDays(d, -1); }
    return n;
  },
  best(h) {
    const ds = Object.keys(h.days).sort(); let best = 0, cur = 0, prev = null;
    for (const d of ds) { cur = prev && daysBetween(prev, d) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
    return best;
  },
  rate(h, n = 30) { let c = 0; for (let i = 0; i < n; i++) if (h.days[addDays(today(), -i)]) c++; return c / n; },
  toggle(id, d = today()) {
    const h = Store.d.habits.find(x => x.id === id); if (!h) return;
    if (h.days[d]) delete h.days[d]; else h.days[d] = 1;
    App.refresh();
    if (h.days[d] && d === today()) { const s = this.streak(h); UI.toast(`${I('flame', 16)} ${esc(h.name)} — ${s} day streak`, 'success'); }
  },

  title: 'Habits',
  sub() { const hs = Store.d.habits; return `${hs.filter(h => h.days[today()]).length} of ${hs.length} done today`; },
  actions() { return `<button class="btn primary" onclick="Habits.edit()">${I('plus', 16)}<span class="hide-sm">New habit</span></button>`; },
  render() {
    const hs = Store.d.habits;
    if (!hs.length) return `<div class="glass card">${empty('flame', 'Build your daily system', 'Winners have routines. Add the habits that make everything else easier.', `<button class="btn primary" onclick="Habits.edit()">${I('plus', 16)}New habit</button>`)}</div>`;
    const doneToday = hs.filter(h => h.days[today()]).length;
    const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
    const avg = sum(hs, h => this.rate(h)) / hs.length;
    const bestNow = Math.max(...hs.map(h => this.streak(h)));
    return `
      <div class="kpis">
        <div class="kpi glass"><div class="row between"><div><div class="k-top"><div class="k-ic green">${I('check', 17)}</div><div class="label">Today</div></div><div class="value">${doneToday} / ${hs.length}</div><div class="sub">${doneToday === hs.length ? 'Perfect day 🔥' : `${hs.length - doneToday} to go`}</div></div>${ring(doneToday / hs.length, 58, 7, 'green')}</div></div>
        ${kpi('Longest active streak', `${bestNow} days`, { icon: 'flame', tone: 'gold' })}
        ${kpi('30-day consistency', pct(avg), { icon: 'up', sub: bar(avg, 'green') })}
      </div>
      <div class="glass card mt">
        <div class="habit" style="padding-top:0;border:0"><div class="faint" style="font-size:12px;font-weight:700">HABIT</div>
          <div class="days-wrap"><div class="days-h">${days.map((d, i) => `<span class="${i < 7 ? 'old' : ''}">${parseYmd(d).toLocaleDateString(LOCALE, { weekday: 'narrow' })}<br>${parseYmd(d).getDate()}</span>`).join('')}</div></div>
          <div class="h-pct faint" style="font-size:12px;font-weight:700">30 DAYS</div><div></div></div>
        ${hs.map(h => { const s = this.streak(h), r = this.rate(h); return `<div class="habit">
          <div class="habit-name"><div class="em">${esc(h.emoji || '✅')}</div><div style="min-width:0"><b>${esc(h.name)}</b><small>${s ? `<span class="streak">${I('flame', 13)}${s}</span> day streak` : 'Start today'} · best ${this.best(h)}</small></div></div>
          <div class="days-wrap"><div class="days">${days.map((d, i) => `<button class="day ${h.days[d] ? 'on' : ''} ${d === today() ? 'today' : ''} ${i < 7 ? 'old' : ''}" onclick="Habits.toggle('${h.id}','${d}')" aria-label="${fmtDay(d)}">${h.days[d] ? I('check', 13, 3) : ''}</button>`).join('')}</div></div>
          <div class="h-pct"><div class="row between" style="font-size:12px;margin-bottom:4px"><span class="faint">Consistency</span><b>${pct(r)}</b></div>${bar(r, 'green')}</div>
          <button class="btn ghost sm icon" onclick="Habits.edit('${h.id}')" title="Edit">${I('edit', 15)}</button>
        </div>`; }).join('')}
      </div>`;
  },
  edit(id) {
    const ex = id ? Store.d.habits.find(h => h.id === id) : null;
    const h = ex || { id: uid(), name: '', emoji: '✅', days: {}, createdAt: Date.now() };
    const emojis = ['✅', '🏋️', '📚', '🧘', '💧', '🏃', '📓', '📊', '🥗', '😴', '🧠', '💰', '🚫', '🙏', '✍️', '🎯'];
    UI.modal({
      title: ex ? 'Edit habit' : 'New habit', small: true,
      body: `<form class="form" id="hForm" onsubmit="return false">
        ${F({ name: 'name', label: 'Habit', value: h.name, full: true, placeholder: 'e.g. Gym, Read 20 pages, No phone before 9' })}
        <div class="field full"><span>Icon</span><div class="emoji-pick" id="hPick">${emojis.map(e => `<button type="button" class="${e === h.emoji ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div><input type="hidden" name="emoji" value="${esc(h.emoji)}"></div>
      </form>`,
      footer: [ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: m => { UI.confirm('Delete habit?', 'Its whole history will be removed.', 'Delete', () => { Store.d.habits = Store.d.habits.filter(x => x.id !== h.id); m.close(); App.refresh(); }); return false; } },
        'spacer', { label: 'Cancel', cls: 'ghost' },
        { label: 'Save', cls: 'primary', onClick: m => { const o = readForm($('#hForm', m.el)); if (!o.name) return false; const out = { ...h, ...o }; delete out.sample; if (ex) Object.assign(ex, out); else Store.d.habits.push(out); App.refresh(); } }],
      onOpen: m => { $('#hPick', m.el).onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; $$('#hPick button', m.el).forEach(x => x.classList.toggle('on', x === b)); $('[name=emoji]', m.el).value = b.dataset.e; }; },
    });
  },
};
App.register('habits', Habits);
