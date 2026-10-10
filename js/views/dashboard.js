'use strict';
/* Dashboard — today's focus, money snapshot, goals, businesses, habits, focus timer */

const QUOTES = [
  ["The best time to plant a tree was 20 years ago. The second best time is now.","Chinese proverb"],
  ["Rule No. 1: Never lose money. Rule No. 2: Never forget rule No. 1.","Warren Buffett"],
  ["Someone's sitting in the shade today because someone planted a tree a long time ago.","Warren Buffett"],
  ["Price is what you pay. Value is what you get.","Warren Buffett"],
  ["The stock market is a device for transferring money from the impatient to the patient.","Warren Buffett"],
  ["Be fearful when others are greedy, and greedy when others are fearful.","Warren Buffett"],
  ["Risk comes from not knowing what you're doing.","Warren Buffett"],
  ["We are what we repeatedly do. Excellence, then, is not an act, but a habit.","Will Durant"],
  ["You do not rise to the level of your goals. You fall to the level of your systems.","James Clear"],
  ["Every action you take is a vote for the type of person you wish to become.","James Clear"],
  ["Discipline equals freedom.","Jocko Willink"],
  ["It always seems impossible until it's done.","Nelson Mandela"],
  ["Whether you think you can, or you think you can't, you're right.","Henry Ford"],
  ["Don't watch the clock; do what it does. Keep going.","Sam Levenson"],
  ["The way to get started is to quit talking and begin doing.","Walt Disney"],
  ["If you are not willing to risk the usual, you will have to settle for the ordinary.","Jim Rohn"],
  ["Formal education will make you a living; self-education will make you a fortune.","Jim Rohn"],
  ["Discipline is the bridge between goals and accomplishment.","Jim Rohn"],
  ["Success is nothing more than a few simple disciplines, practiced every day.","Jim Rohn"],
  ["The four most dangerous words in investing are: this time it's different.","Sir John Templeton"],
  ["In investing, what is comfortable is rarely profitable.","Robert Arnott"],
  ["Earn with your mind, not your time.","Naval Ravikant"],
  ["Play long-term games with long-term people.","Naval Ravikant"],
  ["You're not going to get rich renting out your time.","Naval Ravikant"],
  ["Hard choices, easy life. Easy choices, hard life.","Jerzy Gregorek"],
  ["It does not matter how slowly you go as long as you do not stop.","Confucius"],
  ["Done is better than perfect.","Sheryl Sandberg"],
  ["Your time is limited, so don't waste it living someone else's life.","Steve Jobs"],
  ["The biggest risk is not taking any risk.","Mark Zuckerberg"],
  ["What gets measured gets managed.","Peter Drucker"],
  ["The best way to predict the future is to create it.","Peter Drucker"],
  ["Focus is a matter of deciding what things you're not going to do.","John Carmack"],
  ["Courage is being scared to death, but saddling up anyway.","John Wayne"],
  ["I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times.","Bruce Lee"],
  ["The successful warrior is the average man, with laser-like focus.","Bruce Lee"],
  ["Be so good they can't ignore you.","Steve Martin"],
  ["The impediment to action advances action. What stands in the way becomes the way.","Marcus Aurelius"],
  ["Waste no more time arguing what a good man should be. Be one.","Marcus Aurelius"],
  ["We suffer more often in imagination than in reality.","Seneca"],
  ["Luck is what happens when preparation meets opportunity.","Seneca"],
  ["First say to yourself what you would be; and then do what you have to do.","Epictetus"],
  ["Never spend your money before you have it.","Thomas Jefferson"],
  ["An investment in knowledge pays the best interest.","Benjamin Franklin"],
  ["Beware of little expenses. A small leak will sink a great ship.","Benjamin Franklin"],
  ["Well done is better than well said.","Benjamin Franklin"],
  ["Energy and persistence conquer all things.","Benjamin Franklin"],
  ["Plan the trade. Trade the plan.","Trader's proverb"],
  ["Cut your losses short and let your winners run.","Trader's proverb"],
  ["The trend is your friend.","Trader's proverb"],
  ["Revenue is vanity, profit is sanity, cash is king.","Business proverb"],
  ["Fortune favours the bold.","Virgil"],
  ["Small daily improvements over time lead to stunning results.","Robin Sharma"],
  ["Opportunities don't happen. You create them.","Chris Grosser"],
  ["Wealth is not about having a lot of money; it's about having a lot of options.","Chris Rock"],
  ["Do not save what is left after spending, but spend what is left after saving.","Warren Buffett"],
];
// A new quote each day (same quote all day, cycles through the list).
function quoteOfDay() {
  const n = new Date(), day = Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5);
  return QUOTES[(day * 7) % QUOTES.length];
}

const Focus = {
  s: { mode: 'focus', len: 25, end: 0, remaining: 1500, running: false },
  load() {
    try { const s = JSON.parse(localStorage.getItem('empire_focus') || 'null'); if (s) Object.assign(this.s, s); } catch {}
    if (this.s.running && this.s.end <= Date.now()) this.finish(true);
  },
  persist() { try { localStorage.setItem('empire_focus', JSON.stringify(this.s)); } catch {} },
  left() { return this.s.running ? Math.max(0, Math.round((this.s.end - Date.now()) / 1000)) : this.s.remaining; },
  set(len, mode) { if (this.s.running) return; Object.assign(this.s, { len, mode, remaining: len * 60 }); this.persist(); this.paint(true); },
  toggle() {
    const s = this.s;
    if (s.running) { s.remaining = this.left(); s.running = false; }
    else { s.end = Date.now() + s.remaining * 1000; s.running = true; if (Notify.state() === 'default') Notify.request(); }
    this.persist(); this.paint(true);
  },
  reset() { Object.assign(this.s, { running: false, remaining: this.s.len * 60 }); this.persist(); this.paint(true); },
  tick() { if (this.s.running) { if (this.left() <= 0) this.finish(); else this.paint(); } },
  finish(silent) {
    const s = this.s, wasFocus = s.mode === 'focus';
    if (wasFocus) { Store.d.focus.push({ date: today(), min: s.len }); Store.save(); }
    Object.assign(s, { running: false, remaining: s.len * 60 });
    this.persist();
    if (!silent) {
      Notify.show(wasFocus ? 'Focus session complete 🔥' : 'Break over', wasFocus ? `${s.len} minutes banked. Take 5.` : 'Back to building.');
      UI.toast(`${I('flame', 16)} ${wasFocus ? `${s.len} focused minutes banked` : 'Break over — back to it'}`, 'success');
      if (App.cur === 'dashboard') App.render();
    }
  },
  todayMin() { return sum(Store.d.focus.filter(f => f.date === today()), f => f.min); },
  paint(full) {
    const el = $('#focusTime'); if (!el) return;
    const secs = this.left();
    el.textContent = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
    const fg = $('#focusRing .ring-fg');
    if (fg) { const c = +fg.getAttribute('stroke-dasharray'); fg.setAttribute('stroke-dashoffset', (c * (1 - (1 - secs / (this.s.len * 60)))).toFixed(2)); }
    if (full) { const w = $('#focusWidget'); if (w) w.outerHTML = this.widget(); }
  },
  widget() {
    const s = this.s, secs = this.left();
    return `<div class="focus-wrap" id="focusWidget">
      <div class="seg" style="width:100%">${[[25, 'focus', 'Focus 25'], [50, 'focus', 'Deep 50'], [5, 'break', 'Break 5']].map(([l, m, lab]) => `<label><input type="radio" name="fmode" ${s.len === l && s.mode === m ? 'checked' : ''} ${s.running ? 'disabled' : ''} onchange="Focus.set(${l},'${m}')"><span>${lab}</span></label>`).join('')}</div>
      <div class="ring-wrap" id="focusRing">${ring(1 - secs / (s.len * 60), 170, 10, s.mode === 'break' ? 'green' : 'gold')}<div><span class="focus-time" id="focusTime">${pad(Math.floor(secs / 60))}:${pad(secs % 60)}</span><small>${s.mode === 'break' ? 'Break' : s.running ? 'Deep work' : 'Ready'}</small></div></div>
      <div class="row"><button class="btn ${s.running ? '' : 'gold'}" style="min-width:120px" onclick="Focus.toggle()">${I(s.running ? 'pause' : 'play', 16)}${s.running ? 'Pause' : 'Start'}</button><button class="btn icon" onclick="Focus.reset()" title="Reset">${I('reset', 16)}</button><button class="btn icon" onclick="Music.focusMusic()" title="Focus music">${I('music', 16)}</button></div>
      <p class="faint" style="font-size:12.5px">${this.todayMin()} focused minutes today</p>
    </div>`;
  },
};

const Dashboard = {
  title() { return `${greet()}${Store.s.name ? ', ' + esc(Store.s.name.split(' ')[0]) : ''}`; },
  sub() { return fmtDay(today(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
  actions() { return ''; },
  render() {
    const d = Store.d, t0 = today();
    const focus = d.tasks.filter(t => (!t.done && ((t.due && t.due <= t0) || t.doing || (!t.due && t.priority === 'high'))) || (t.done && t.doneAt && ymd(new Date(t.doneAt)) === t0 && t.due && t.due <= t0))
      .sort((a, b) => Tasks.smartSort(a, b)).slice(0, 8);
    const todayAll = d.tasks.filter(t => t.due === t0 || (t.due && t.due < t0 && !t.done) || (t.done && t.doneAt && ymd(new Date(t.doneAt)) === t0));
    const doneToday = d.tasks.filter(t => t.done && t.doneAt && ymd(new Date(t.doneAt)) === t0).length;
    const nw = Wealth.netWorth(), hist = d.nwHistory, prev = hist.length > 1 ? hist[hist.length - 2].value : null;
    const rev = sum(d.businesses, b => b.revenue);
    const tm = tStats(d.trades.filter(t => t.account !== 'backtest' && t.date.startsWith(monthKey())));
    const activeGoals = d.goals.filter(g => Goals.progress(g) < 1);
    const gAvg = activeGoals.length ? sum(activeGoals, g => Goals.progress(g)) / activeGoals.length : 0;
    const [quote, author] = quoteOfDay();
    const days14 = Array.from({ length: 14 }, (_, i) => addDays(t0, i - 13));
    const prod = days14.map(ds => ({ label: ds, short: parseYmd(ds).toLocaleDateString(LOCALE, { weekday: 'narrow' }), value: d.tasks.filter(t => t.done && t.doneAt && ymd(new Date(t.doneAt)) === ds).length }));
    const week = sum(prod.slice(7), p => p.value), lastWeek = sum(prod.slice(0, 7), p => p.value);
    const upcoming = [];
    for (let i = 1; i <= 7; i++) {
      const ds = addDays(t0, i);
      const ts = d.tasks.filter(t => !t.done && t.due === ds), evs = GCal.eventsOn(ds);
      if (ts.length || evs.length) upcoming.push([ds, ts, evs]);
    }
    const sampleBanner = Store.s.sampleBanner && hasSample()
      ? `<div class="banner s12">${I('sparkles', 18)}<div class="grow">You’re looking at <b>sample data</b> so you can see how everything works. Your old tasks were kept.</div><button class="btn sm" onclick="UI.confirm('Clear sample data?','All sample tasks, goals, businesses, trades, habits and assets will be removed. Anything you added stays.','Clear',clearSample,false)">Clear sample data</button><button class="btn ghost xs icon" onclick="Store.s.sampleBanner=false;App.refresh()" aria-label="Dismiss">${I('x', 14)}</button></div>` : '';
    const installTip = !matchMedia('(display-mode: standalone)').matches && navigator.standalone !== true && /iPhone|iPad/.test(navigator.userAgent) && !localStorage.getItem('empire_installTip')
      ? `<div class="banner s12">${I('phone', 18)}<div class="grow"><b>Install on your iPhone:</b> tap the Share button in Safari, then <b>Add to Home Screen</b>. YRB’s World opens full-screen like a native app.</div><button class="btn ghost xs icon" onclick="localStorage.setItem('empire_installTip','1');App.render()">${I('x', 14)}</button></div>` : '';

    return `<div class="dash">
      ${sampleBanner}${installTip}
      <div class="glass card hero s8">
        <div class="hero-grid">
          <div>
            <div class="eyebrow">${I('crown', 15)} Net worth</div>
            <div class="big">${money(nw)}</div>
            <div class="row wrap">${prev != null ? `<span class="delta">${I(nw >= prev ? 'up' : 'down', 14)}${money(nw - prev, { sign: true })}</span>` : ''}<span class="delta">${pct(Store.s.freedomNumber ? nw / Store.s.freedomNumber : 0, 1)} to freedom</span></div>
            <div class="quote">“${esc(quote)}”<span class="quote-by">— ${esc(author)} · quote of the day</span></div>
          </div>
          <div>${Chart.area(hist.map(h => h.value), { h: 150, fmt: v => money(v, { compact: true }) })}</div>
        </div>
      </div>
      <div class="glass card s4">${Focus.widget()}</div>

      <div class="s12 kpis">
        <a href="#/tasks" style="text-decoration:none;color:inherit">${kpi('Today', `${doneToday} / ${Math.max(todayAll.length, doneToday)}`, { icon: 'tasks', sub: bar(todayAll.length ? doneToday / todayAll.length : 0, 'green') })}</a>
        <a href="#/business" style="text-decoration:none;color:inherit">${kpi('Business revenue', money(rev) + '<small class="faint" style="font-size:13px;font-weight:600"> /mo</small>', { icon: 'briefcase', tone: 'gold', sub: `${d.businesses.length} business${d.businesses.length === 1 ? '' : 'es'}` })}</a>
        <a href="#/trading" style="text-decoration:none;color:inherit">${kpi('Trading this month', `<span class="${pnlCls(tm.net)}">${money(tm.net, { sign: true })}</span>`, { icon: 'candles', tone: tm.net >= 0 ? 'green' : 'red', sub: `${tm.n} trades · ${pct(tm.wr)} win rate` })}</a>
        <a href="#/goals" style="text-decoration:none;color:inherit">${kpi('Goal progress', pct(gAvg), { icon: 'target', tone: 'blue', sub: `${activeGoals.length} active goals` })}</a>
      </div>

      <div class="glass card s7">${EndGoal.card(true)}</div>
      <div class="glass card s5">
        <div class="card-h"><h2>${I('sparkles')}Coach</h2><div class="right"><a class="btn sm ghost" href="#/coach">All ${I('arrowR', 14)}</a></div></div>
        ${(() => { const ins = Coach.insights().slice(0, 3); return ins.length ? ins.map((s, i) => Coach.sugHTML(s, i, 'rule')).join('') : '<p class="faint" style="font-size:13px">Nothing urgent. Keep executing.</p>'; })()}
      </div>

      <div class="glass card s7">
        <div class="card-h"><h2>${I('zap')}Today’s focus</h2><span class="sub">${focus.filter(t => !t.done).length} open</span><div class="right"><a class="btn sm ghost" href="#/tasks">All tasks ${I('arrowR', 14)}</a></div></div>
        <div class="quick-add" style="border:1px solid var(--stroke-2);background:var(--field);margin-bottom:12px">${I('plus', 18)}<input id="dashQa" placeholder="Add for today… (try “Call bank 2pm !high”)" onkeydown="if(event.key==='Enter'){event.preventDefault();Dashboard.quick()}"><button class="btn primary sm" onclick="Dashboard.quick()">Add</button></div>
        ${focus.length ? focus.map(t => Tasks.row(t)).join('') : empty('check', 'Today is clear', 'Nothing due. Pull something forward from your goals.')}
      </div>
      <div class="glass card s5">
        <div class="card-h"><h2>${I('calendar')}Next 7 days</h2><div class="right"><a class="btn sm ghost" href="#/calendar">Calendar ${I('arrowR', 14)}</a></div></div>
        ${upcoming.length ? upcoming.slice(0, 5).map(([ds, ts, evs]) => `<div class="agenda-day">${relDate(ds)} · ${fmtDay(ds, { day: 'numeric', month: 'short' })}</div>
          ${evs.map(e => `<a class="ev-row" href="${esc(safeUrl(e.link))}" target="_blank" rel="noopener"><span class="t">${e.time ? fmtTime(e.time) : 'All day'}</span><span class="n">${esc(e.title)}</span></a>`).join('')}
          ${ts.slice(0, 3).map(t => Tasks.row(t)).join('')}`).join('') : `<p class="faint" style="font-size:13px">Nothing scheduled this week.${GCal.configured() ? '' : ' <a href="#/profile/integrations">Connect Google Calendar</a> to see your events here.'}</p>`}
      </div>

      <div class="glass card s4">
        <div class="card-h"><h2>${I('target')}Goals</h2><div class="right"><a class="btn sm ghost" href="#/goals">${I('arrowR', 14)}</a></div></div>
        ${activeGoals.slice(0, 4).map(g => { const p = Goals.progress(g), pc = Goals.pace(g); return `<div class="li click" onclick="App.go('goals')">${ring(p, 42, 5, (GOAL_CATS[g.cat] || {}).ring || '')}<div class="li-b"><div class="li-t">${esc(g.title)}</div><div class="li-s">${pc ? pc.label : g.cat}</div></div><div class="li-v">${pct(p)}</div></div>`; }).join('') || `<p class="faint" style="font-size:13px">No active goals. <a href="javascript:Goals.edit()">Set one</a>.</p>`}
      </div>
      <div class="glass card s4">
        <div class="card-h"><h2>${I('briefcase')}Businesses</h2><div class="right"><a class="btn sm ghost" href="#/business">${I('arrowR', 14)}</a></div></div>
        ${d.businesses.slice(0, 5).map(b => { const p = b.target ? b.revenue / b.target : 0; return `<div class="li click" onclick="App.go('business/${b.id}')">${Business.av(b, 'sm')}<div class="li-b"><div class="li-t">${esc(b.name)}</div>${bar(p, 'gold thin')}</div><div class="li-v">${money(b.revenue, { compact: true })}</div></div>`; }).join('') || `<p class="faint" style="font-size:13px">No businesses yet. <a href="javascript:Business.edit()">Add one</a>.</p>`}
      </div>
      <div class="glass card s4">
        <div class="card-h"><h2>${I('flame')}Habits</h2><span class="sub">${d.habits.filter(h => h.days[t0]).length}/${d.habits.length}</span><div class="right"><a class="btn sm ghost" href="#/habits">${I('arrowR', 14)}</a></div></div>
        <div class="habit-chips">${d.habits.map(h => `<button class="hchip ${h.days[t0] ? 'on' : ''}" onclick="Habits.toggle('${h.id}')"><span class="hk">${I('check', 12, 3)}</span>${esc(h.emoji || '')} ${esc(h.name)}${Habits.streak(h) > 1 ? `<span class="streak" style="font-size:12px">${I('flame', 12)}${Habits.streak(h)}</span>` : ''}</button>`).join('') || `<p class="faint" style="font-size:13px">No habits yet. <a href="javascript:Habits.edit()">Add one</a>.</p>`}</div>
      </div>

      <div class="glass card s6">
        <div class="card-h"><h2>${I('candles')}Trading — this month</h2><div class="right"><a class="btn sm" href="#/trading">${I('pie', 14)}Analytics</a><button class="btn sm primary" onclick="Trading.edit()">${I('plus', 14)}Trade</button></div></div>
        ${Chart.area(tm.curve, { h: 130, cls: tm.net >= 0 ? 'green' : 'red', zero: true, fmt: v => money(v, { compact: true }) })}
        <div class="stat-row mt"><div><small>Net</small><b class="${pnlCls(tm.net)}">${money(tm.net, { sign: true, compact: true })}</b></div><div><small>Win rate</small><b>${pct(tm.wr)}</b></div><div><small>Profit factor</small><b>${pfFmt(tm.pf)}</b></div></div>
      </div>
      <div class="glass card s6">
        <div class="card-h"><h2>${I('up')}Productivity</h2><span class="sub">${week} done this week ${lastWeek ? `· ${week >= lastWeek ? '+' : ''}${week - lastWeek} vs last` : ''}</span></div>
        ${Chart.bars(prod, { h: 150, fmt: v => v + ' tasks' })}
      </div>
    </div>`;
  },
  quick() { Tasks.quick($('#dashQa'), { due: today() }); },
};
App.register('dashboard', Dashboard);
