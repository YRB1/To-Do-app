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
  ["Do things that don't scale.","Paul Graham"],
  ["Make something people want.","Paul Graham"],
  ["If you are not embarrassed by the first version of your product, you've launched too late.","Reid Hoffman"],
  ["Ideas are easy. Implementation is hard.","Guy Kawasaki"],
  ["Hard work beats talent when talent doesn't work hard.","Tim Notke"],
  ["Losers have goals. Winners have systems.","Scott Adams"],
  ["Your most unhappy customers are your greatest source of learning.","Bill Gates"],
  ["Chase the vision, not the money; the money will end up following you.","Tony Hsieh"],
  ["Work like there is someone working 24 hours a day to take it all away from you.","Mark Cuban"],
  ["When something is important enough, you do it even if the odds are not in your favor.","Elon Musk"],
  ["Amateurs sit and wait for inspiration, the rest of us just get up and go to work.","Stephen King"],
  ["Make it work, make it right, make it fast.","Kent Beck"],
  ["The goal of a successful trader is to make the best trades. Money is secondary.","Alexander Elder"],
  ["Motivation is what gets you started. Habit is what keeps you going.","Jim Ryun"],
  ["Amateurs hope. Professionals work.","Garson Kanin"],
];
// A new quote each day (same quote all day, cycles through the list).
// A fresh quote every hour (same one all hour); tap to cycle.
const Quotes = {
  off: 0,
  now() { const n = new Date(), h = Math.floor(n.getTime() / 36e5); return QUOTES[(((h * 7 + this.off) % QUOTES.length) + QUOTES.length) % QUOTES.length]; },
  next() { this.off++; const el = $('#nowQuote'); if (!el) return; const [q, a] = this.now(); el.classList.remove('in'); void el.offsetWidth; el.innerHTML = this.html(q, a); el.classList.add('in'); },
  html(q, a) { return `<p>“${esc(q)}”</p><span>${esc(a)}</span>`; },
};
const DayClock = {
  html() {
    const n = new Date();
    const hm = n.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `<b>${hm}</b><i>${pad(n.getSeconds())}</i>`;
  },
  dayLeft() {
    const n = new Date(), start = new Date(n); start.setHours(0, 0, 0, 0);
    const p = (n - start) / 864e5, left = 864e5 - (n - start);
    const h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4);
    return { p, txt: `${h}h ${pad(m)}m left today` };
  },
  tick() {
    const c = $('#nowClock'); if (!c) return;
    c.innerHTML = this.html();
    const d = this.dayLeft(), b = $('#nowBar'), t = $('#nowLeft');
    if (b) b.style.width = (d.p * 100).toFixed(2) + '%';
    if (t) t.textContent = d.txt;
  },
};
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
  title() { return `Welcome, ${esc((Store.s.name || 'Yrb').split(' ')[0])}`; },
  sub() { return `${greet()} · ${fmtDay(today(), { weekday: 'long', day: 'numeric', month: 'long' })}`; },
  actions() { return ''; },
  render() {
    const d = Store.d, t0 = today();
    const nowHM = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
    const fSort = (a, b) => (a.done - b.done) || ((!!b.due && b.due < t0) - (!!a.due && a.due < t0)) || ((a.time ? 0 : 1) - (b.time ? 0 : 1)) || (a.time || '').localeCompare(b.time || '') || (PRI[a.priority] - PRI[b.priority]);
    const focus = d.tasks.filter(t => (!t.done && ((t.due && t.due <= t0) || t.doing)) || (t.done && t.doneAt && ymd(new Date(t.doneAt)) === t0 && t.due && t.due <= t0)).sort(fSort);
    const nowTask = focus.filter(t => !t.done && t.due === t0 && t.time && t.time <= nowHM).pop();
    const top3 = ((d.journal || []).find(e => e.date === t0)?.top3 || []).filter(Boolean);
    const rnow = Routine.now();
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
      <div class="now s12">
        <div class="now-time">
          <div class="now-clock" id="nowClock" aria-label="Current time">${DayClock.html()}</div>
          <div class="now-day"><b>${fmtDay(t0, { weekday: 'long' })}</b><span>${fmtDay(t0, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <div class="now-bar"><i id="nowBar" style="width:${(DayClock.dayLeft().p * 100).toFixed(2)}%"></i></div><small id="nowLeft">${DayClock.dayLeft().txt}</small></div>
        </div>
        <button class="now-quote in" id="nowQuote" onclick="Quotes.next()" title="Tap for another quote">${Quotes.html(...Quotes.now())}</button>
        <div class="now-extra">
          <div id="nowRoutine">${Routine.pill()}</div>
          <button class="now-aff ${Vision.saidToday() ? 'done' : ''}" onclick="Vision.read()">${I(Vision.saidToday() ? 'check' : 'sparkles', 16)}<span>${Vision.saidToday() ? 'Affirmations said today' : 'Say your affirmations'}</span>${Vision.affStreak() > 1 ? `<em>${I('flame', 12)}${Vision.affStreak()}</em>` : ''}</button>
        </div>
      </div>
      <div class="glass card hero s8">
        <div class="hero-grid">
          <div>
            <div class="eyebrow">${I('crown', 15)} Net worth</div>
            <div class="big">${money(nw)}</div>
            <div class="row wrap">${prev != null ? `<span class="delta">${I(nw >= prev ? 'up' : 'down', 14)}${money(nw - prev, { sign: true })}</span>` : ''}<span class="delta">${pct(Store.s.freedomNumber ? nw / Store.s.freedomNumber : 0, 1)} to freedom</span></div>

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

      <div class="s12 dash-spaces">
        <div class="ds-h"><h2>${I('folder')}Sections</h2><a class="btn sm ghost" href="#/spaces">All ${I('arrowR', 14)}</a></div>
        <div class="ds-row">${Spaces.list().filter(x => x.status !== 'Paused').map(x => { const nr = Spaces.nextRung(x), cd = Spaces.countdown(x), open = Spaces.tasks(x).filter(t => !t.done).length; return `<a class="ds-chip ${x.status === 'Focus' ? 'focus' : ''}" href="#/space/${x.id}" style="--c:${esc(x.color)}"><span class="sp-emoji">${esc(x.emoji || '•')}</span><span class="grow"><b class="ellipsis">${esc(x.name)}</b><small class="ellipsis">${nr ? esc(nr.text) : open + ' open tasks'}</small></span>${cd ? `<em class="${cd.cls}">${cd.txt}</em>` : ''}</a>`; }).join('')}</div>
      </div>
      <div class="glass card s7">${EndGoal.card(true)}</div>
      <div class="glass card s5">
        <div class="card-h"><h2>${I('sparkles')}Coach</h2><div class="right"><a class="btn sm ghost" href="#/coach">All ${I('arrowR', 14)}</a></div></div>
        ${(() => { const ins = Coach.insights().slice(0, 3); return ins.length ? ins.map((s, i) => Coach.sugHTML(s, i, 'rule')).join('') : '<p class="faint" style="font-size:13px">Nothing urgent. Keep executing.</p>'; })()}
      </div>

      <div class="glass card s7 tf-card">
        <div class="card-h"><h2>${I('zap')}Today’s focus</h2><span class="sub">${focus.filter(t => !t.done).length} open · ${focus.filter(t => t.done).length} done</span><div class="right"><a class="btn sm ghost" href="#/tasks">All tasks ${I('arrowR', 14)}</a></div></div>
        <a class="tf-top3 ${top3.length ? '' : 'empty'}" href="#/journal">${top3.length ? `<small>Your top 3</small>${top3.map((x, i) => `<span><b>${i + 1}</b>${esc(x)}</span>`).join('')}` : `${I('edit', 14)}<span>Set today’s top 3 — the three things that make today a win</span>`}</a>
        ${rnow ? `<div class="tf-now">${I('clock', 14)}<span>Routine now: <b>${esc(rnow.cur.l)}</b></span></div>` : ''}
        <div class="quick-add" style="border:1px solid var(--stroke-2);background:var(--field);margin-bottom:12px">${I('plus', 18)}<input id="dashQa" placeholder="Add for today… (try “Call bank 2pm !high”)" onkeydown="if(event.key==='Enter'){event.preventDefault();Dashboard.quick()}"><button class="btn primary sm" onclick="Dashboard.quick()">Add</button></div>
        <div class="tf-list">${focus.length ? focus.slice(0, 14).map(t => (t === nowTask ? '<div class="tf-now-row">' : '') + Tasks.row(t) + (t === nowTask ? '</div>' : '')).join('') : empty('check', 'Today is clear', 'Nothing due. Pull something forward from your goals.')}</div>
        ${focus.length > 14 ? `<a class="btn sm ghost block mt-s" href="#/tasks/f/today">${focus.length - 14} more today ${I('arrowR', 14)}</a>` : ''}
      </div>
      <div class="glass card s5">
        <div class="card-h"><h2>${I('calendar')}Next 7 days</h2><div class="right"><a class="btn sm ghost" href="#/calendar">Calendar ${I('arrowR', 14)}</a></div></div>
        ${upcoming.length ? upcoming.slice(0, 5).map(([ds, ts, evs]) => `<div class="agenda-day">${relDate(ds)} · ${fmtDay(ds, { day: 'numeric', month: 'short' })}</div>
          ${evs.map(e => `<a class="ev-row" href="${esc(safeUrl(e.link))}" target="_blank" rel="noopener"><span class="t">${e.time ? fmtTime(e.time) : 'All day'}</span><span class="n">${esc(e.title)}</span></a>`).join('')}
          ${ts.slice(0, 3).map(t => Tasks.row(t)).join('')}`).join('') : `<p class="faint" style="font-size:13px">Nothing scheduled this week.${GCal.configured() ? '' : ' <a href="#/profile/integrations">Connect Google Calendar</a> to see your events here.'}</p>`}
      </div>

      <div class="glass card s4">
        <div class="card-h"><h2>${I('target')}Goals</h2><div class="right"><a class="btn sm ghost" href="#/goals">${I('arrowR', 14)}</a></div></div>
        ${activeGoals.slice(0, 4).map(g => { const p = Goals.progress(g), pc = Goals.pace(g); return `<div class="li click" onclick="App.go('goals/${g.id}')">${ring(p, 42, 5, (GOAL_CATS[g.cat] || {}).ring || '')}<div class="li-b"><div class="li-t">${esc(g.title)}</div><div class="li-s">${pc ? pc.label : g.cat}</div></div><div class="li-v">${pct(p)}</div></div>`; }).join('') || `<p class="faint" style="font-size:13px">No active goals. <a href="javascript:Goals.edit()">Set one</a>.</p>`}
      </div>
      <div class="glass card s4">
        <div class="card-h"><h2>${I('briefcase')}Businesses</h2><div class="right"><a class="btn sm ghost" href="#/business">${I('arrowR', 14)}</a></div></div>
        ${d.businesses.slice(0, 5).map(b => { const p = b.target ? b.revenue / b.target : 0; return `<div class="li click" onclick="App.go('${(Store.d.spaces.find(x => x.bizId === b.id) ? 'space/' + Store.d.spaces.find(x => x.bizId === b.id).id : 'business/' + b.id)}')">${Business.av(b, 'sm')}<div class="li-b"><div class="li-t">${esc(b.name)}</div>${bar(p, 'gold thin')}</div><div class="li-v">${money(b.revenue, { compact: true })}</div></div>`; }).join('') || `<p class="faint" style="font-size:13px">No businesses yet. <a href="javascript:Business.edit()">Add one</a>.</p>`}
      </div>
      <div class="glass card s4">
        <div class="card-h"><h2>${I('flame')}Habits</h2><span class="sub">${d.habits.filter(h => h.days[t0]).length}/${d.habits.length}</span><div class="right"><a class="btn sm ghost" href="#/habits">${I('arrowR', 14)}</a></div></div>
        <div class="habit-chips">${d.habits.map(h => `<button class="hchip ${h.days[t0] ? 'on' : ''}" onclick="Habits.toggle('${h.id}')"><span class="hk">${I('check', 12, 3)}</span>${esc(h.emoji || '')} ${esc(h.name)}${Habits.streak(h) > 1 ? `<span class="streak" style="font-size:12px">${I('flame', 12)}${Habits.streak(h)}</span>` : ''}</button>`).join('') || `<p class="faint" style="font-size:13px">No habits yet. <a href="javascript:Habits.edit()">Add one</a>.</p>`}</div>
      </div>

      ${d.trades.some(t => t.account !== 'backtest') ? '' : `<div class="glass card s6">
        <div class="card-h"><h2>${I('candles')}Trading</h2><div class="right"><button class="btn sm primary" onclick="Trading.edit()">${I('plus', 14)}Log a trade</button></div></div>
        <p class="faint" style="font-size:13.5px">No trades logged yet. Your sweep + FVG playbook is ready — log each trade and the stats build themselves.</p>
        <div class="row wrap mt"><a class="btn sm" href="#/trading/playbook">${I('shield', 14)}Playbook</a><a class="btn sm ghost" href="#/trading/accounts">${I('wallet', 14)}Add your accounts</a></div>
      </div>`}
      <div class="glass card s6" ${d.trades.some(t => t.account !== 'backtest') ? '' : 'hidden'}>
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
