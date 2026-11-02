'use strict';
/* Weekly review — what actually happened this week, and the plan for next week. */

const Review = {
  wk(d = today()) { const x = parseYmd(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return ymd(x); }, // Monday
  st(k) { const w = (Store.d.weeks ||= {}); return (w[k] ||= { top3: ['', '', ''], lesson: '', reviewed: 0 }); },
  reviewed(k = this.wk()) { return !!Store.d.weeks?.[k]?.reviewed; },
  inWeek(ms, k) { if (!ms) return false; const d = ymd(new Date(ms)); return d >= k && d <= addDays(k, 6); },

  stats(k) {
    const d = Store.d, end = addDays(k, 6), t0 = today(), last = end < t0 ? end : t0;
    const elapsed = Math.max(1, daysBetween(k, last) + 1);
    const done = d.tasks.filter(t => t.done && this.inWeek(t.doneAt, k));
    const prevDone = d.tasks.filter(t => t.done && this.inWeek(t.doneAt, addDays(k, -7))).length;
    const routineDone = done.filter(t => t.repeat !== 'none').length;
    let expected = 0;
    for (const t of d.tasks.filter(t => !t.done && t.repeat !== 'none' && t.time)) {
      for (let i = 0; i < elapsed; i++) { const dd = parseYmd(addDays(k, i)), w = dd.getDay(), ds = addDays(k, i);
        if (t.repeat === 'daily' || (t.repeat === 'weekdays' && w > 0 && w < 6) || (t.repeat === 'weekly' && parseYmd(t.due || ds).getDay() === w)) expected++; }
    }
    const bySpace = Spaces.list().map(s => ({ s, n: done.filter(t => t.spaceId === s.id || (s.bizId && t.bizId === s.bizId)).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
    const habits = d.habits.map(h => { let n = 0; for (let i = 0; i < elapsed; i++) if (h.days[addDays(k, i)]) n++; return { h, n, p: n / elapsed }; });
    const focus = sum(d.focus.filter(f => f.date >= k && f.date <= end), f => f.min);
    const js = (d.journal || []).filter(e => e.date >= k && e.date <= end && Journal.hasContent(e));
    const moods = js.filter(e => e.mood).map(e => e.mood);
    const trades = d.trades.filter(t => t.account !== 'backtest' && t.date.slice(0, 10) >= k && t.date.slice(0, 10) <= end);
    const aff = Object.keys(d.vision?.affDays || {}).filter(x => x >= k && x <= end).length;
    return { done, prevDone, routineDone, expected, bySpace, habits, focus, js, mood: moods.length ? sum(moods) / moods.length : null, trades: tStats(trades), aff, elapsed, overdue: d.tasks.filter(t => !t.done && t.due && t.due < t0).length };
  },

  title: 'Weekly review',
  sub(p) { const k = p[0] || this.wk(); return `${fmtDay(k, { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(k, 6), { day: 'numeric', month: 'short' })}`; },
  actions() { return `<button class="btn" onclick="Journal.reflect()">${I('sparkles', 16)}<span class="hide-sm">Review with Claude</span></button>`; },
  render(p) {
    const k = p[0] && /^\d{4}-\d{2}-\d{2}$/.test(p[0]) ? this.wk(p[0]) : this.wk(), s = this.stats(k), w = this.st(k), nk = addDays(k, 7), nw = this.st(nk);
    const cur = k === this.wk(), adh = s.expected ? Math.min(1, s.routineDone / s.expected) : null;
    const moodE = s.mood ? (MOODS.find(m => m[0] === Math.round(s.mood)) || [])[1] : '—';
    const tile = (label, val, sub = '') => `<div class="rv-tile"><small>${label}</small><b>${val}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    const wins = s.js.filter(e => e.wins).map(e => `<li><small>${fmtDay(e.date, { weekday: 'short' })}</small>${esc(e.wins)}</li>`).join('');
    const lessons = s.js.filter(e => e.lesson).map(e => `<li><small>${fmtDay(e.date, { weekday: 'short' })}</small>${esc(e.lesson)}</li>`).join('');
    return `<div class="dash review">
      <div class="s12 rv-nav"><a class="btn icon ghost" href="#/review/${addDays(k, -7)}" aria-label="Previous week">${I('chevL', 18)}</a><b>${cur ? 'This week' : fmtDay(k, { day: 'numeric', month: 'long' })}</b>${!cur ? `<a class="btn sm" href="#/review">This week</a>` : ''}<a class="btn icon ghost" href="#/review/${nk}" aria-label="Next week">${I('chevR', 18)}</a><span class="grow"></span>${w.reviewed ? chip('Reviewed', 'green', 'check') : ''}</div>
      <div class="s12 rv-tiles">
        ${tile('Tasks done', s.done.length, s.prevDone ? `${s.done.length >= s.prevDone ? '+' : ''}${s.done.length - s.prevDone} vs last week` : '')}
        ${tile('Routine kept', adh == null ? '—' : pct(adh), `${s.routineDone} of ${s.expected} so far`)}
        ${tile('Deep work', s.focus >= 60 ? (s.focus / 60).toFixed(1) + 'h' : s.focus + 'm', 'focus timer')}
        ${tile('Journal', `${s.js.length}/7`, `mood ${moodE}`)}
        ${tile('Affirmations', `${s.aff}/${s.elapsed}`, 'days said')}
        ${tile('Trading', s.trades.n ? money(s.trades.net, { sign: true }) : '—', s.trades.n ? `${s.trades.n} trades · ${pct(s.trades.wr)} win` : 'no trades logged')}
      </div>

      <div class="glass card s6">
        <div class="card-h"><h2>${I('flame')}Habits</h2><span class="sub">${s.elapsed} day${s.elapsed > 1 ? 's' : ''} counted</span></div>
        ${s.habits.map(({ h, n, p }) => `<div class="rv-hab"><span class="grow ellipsis">${esc(h.emoji || '')} ${esc(h.name)}</span><div class="rv-dots">${Array.from({ length: 7 }, (_, i) => { const ds = addDays(k, i); return `<i class="${h.days[ds] ? 'on' : ds > today() ? 'fut' : ''}" title="${fmtDay(ds, { weekday: 'short' })}"></i>`; }).join('')}</div><b>${pct(p)}</b></div>`).join('') || '<p class="faint">No habits yet.</p>'}
      </div>
      <div class="glass card s6">
        <div class="card-h"><h2>${I('folder')}Where the work went</h2></div>
        ${s.bySpace.length ? Chart.hbars(s.bySpace.map(x => ({ label: (x.s.emoji ? x.s.emoji + ' ' : '') + x.s.name, value: x.n })), { signed: false, fmt: v => v + ' done' }) : '<p class="faint" style="font-size:13.5px">No section tasks finished yet this week.</p>'}
        ${(() => { const f = Store.d.spaces.find(x => x.status === 'Focus'); const n = f ? (s.bySpace.find(x => x.s.id === f.id)?.n || 0) : 0; return f ? `<p class="rv-note">${n ? `${n} of ${s.done.length} finished tasks were on your focus, ${esc(f.name)}.` : `Nothing finished on your focus, ${esc(f.name)}, yet this week.`}</p>` : ''; })()}
        ${s.overdue ? `<p class="rv-note neg">${s.overdue} task${s.overdue > 1 ? 's are' : ' is'} overdue — <a href="#/tasks/f/overdue">sort them</a>.</p>` : ''}
      </div>

      <div class="glass card s6">
        <div class="card-h"><h2>${I('star')}Wins</h2><span class="sub">from your journal</span></div>
        ${wins ? `<ul class="rv-list">${wins}</ul>` : '<p class="faint" style="font-size:13.5px">No wins written this week. Add them in the evening part of the <a href="#/journal">journal</a>.</p>'}
      </div>
      <div class="glass card s6">
        <div class="card-h"><h2>${I('info')}Lessons</h2></div>
        ${lessons ? `<ul class="rv-list">${lessons}</ul>` : '<p class="faint" style="font-size:13.5px">No lessons written this week.</p>'}
      </div>

      <div class="glass card s12 rv-plan">
        <div class="card-h"><h2>${I('target')}${cur ? 'Next week' : 'The week after'}</h2><span class="sub">${fmtDay(nk, { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(nk, 6), { day: 'numeric', month: 'short' })}</span></div>
        <form class="form" id="rvForm" onsubmit="return false">
          <div class="field full"><span>One thing to do differently</span><input class="input" name="lesson" value="${esc(w.lesson)}" placeholder="e.g. Cold emails before uni, not after"></div>
          <div class="field full"><span>Top 3 for the week — the outcomes that make it a win</span>${[0, 1, 2].map(i => `<input class="input" name="t${i}" value="${esc(nw.top3[i] || '')}" placeholder="${['Most important', 'Second', 'Third'][i]}" style="margin-top:${i ? 6 : 0}px">`).join('')}</div>
        </form>
        <div class="row wrap mt"><button class="btn primary" onclick="Review.save('${k}','${nk}')">${I('check', 15)}${w.reviewed ? 'Update' : 'Finish review'}</button><button class="btn" onclick="Review.toTasks('${nk}')">${I('plus', 15)}Add top 3 as tasks</button></div>
      </div>
    </div>`;
  },
  save(k, nk) {
    const o = readForm($('#rvForm')), w = this.st(k), nw = this.st(nk);
    w.lesson = o.lesson; nw.top3 = [o.t0, o.t1, o.t2].map(x => (x || '').trim()); w.reviewed = Date.now();
    App.refresh(); UI.toast(`${I('check', 16)} Week reviewed. Next week’s top 3 is on Home.`, 'success', 'dashboard');
  },
  toTasks(nk) {
    const o = readForm($('#rvForm')), items = [o.t0, o.t1, o.t2].map(x => (x || '').trim()).filter(Boolean);
    if (!items.length) return UI.toast('Write next week’s top 3 first', 'warn');
    const have = new Set(Store.d.tasks.filter(t => !t.done).map(t => t.text.toLowerCase()));
    const due = nk < today() ? today() : nk;
    items.filter(x => !have.has(x.toLowerCase())).forEach(text => Store.d.tasks.push(normTask({ id: uid(), text, due, priority: 'high' })));
    this.st(nk).top3 = [o.t0, o.t1, o.t2].map(x => (x || '').trim());
    App.refresh(); UI.toast(`${I('check', 16)} Added for ${relDate(due).toLowerCase()}`, 'success', 'tasks');
  },
  weekTop3() { return (Store.d.weeks?.[this.wk()]?.top3 || []).filter(Boolean); },
};
App.register('review', Review);
