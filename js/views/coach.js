'use strict';
/* Coach — end goal tracking, rule-based suggestions, and optional Claude coaching (user's own API key) */

const EndGoal = {
  get g() { return Store.s.endGoal || (Store.s.endGoal = { title: 'Financial freedom', metric: 'networth', target: Store.s.freedomNumber || 1000000, current: 0, deadline: '' }); },
  METRICS: [['networth', 'Net worth'], ['income', 'Monthly income'], ['revenue', 'Business revenue / month'], ['custom', 'Custom number (I update it)']],
  current() {
    const g = this.g;
    return g.metric === 'networth' ? Wealth.netWorth() : g.metric === 'income' ? Wealth.monthlyIncome() : g.metric === 'revenue' ? sum(Store.d.businesses, b => b.revenue) : +g.current || 0;
  },
  progress() { const t = +this.g.target || 0; return t ? clamp(this.current() / t, 0, 1) : 0; },
  // Months to target from the net worth trend (only meaningful for the net worth metric).
  eta() {
    if (this.g.metric !== 'networth') return null;
    const h = Store.d.nwHistory; if (h.length < 2) return null;
    const a = h[0], b = h[h.length - 1], days = daysBetween(a.date, b.date);
    if (days < 20) return null;
    const perMonth = (b.value - a.value) / days * 30.4;
    if (perMonth <= 0) return { perMonth, months: null };
    return { perMonth, months: Math.max(0, (this.g.target - this.current()) / perMonth) };
  },
  edit() {
    const g = this.g;
    UI.modal({
      title: 'Your end goal', small: true,
      body: `<p class="muted" style="margin-bottom:14px">The one number everything else builds towards. Goals, businesses and trading all roll up into it.</p>
        <form class="form" id="egForm" onsubmit="return false">
          ${F({ name: 'title', label: 'End goal', value: g.title, full: true, placeholder: 'e.g. Financial freedom, £1M net worth, £50k/month' })}
          ${F({ name: 'metric', label: 'Measured by', type: 'select', value: g.metric, full: true, options: this.METRICS })}
          ${F({ name: 'target', label: 'Target', type: 'number', value: g.target })}
          ${F({ name: 'current', label: 'Current (custom only)', type: 'number', value: g.current })}
          ${F({ name: 'deadline', label: 'Target date (optional)', type: 'date', value: g.deadline, full: true })}
        </form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Save', cls: 'primary', onClick: m => {
        const o = readForm($('#egForm', m.el));
        if (!o.title || !isNum(o.target)) { UI.toast('Add a name and target', 'warn'); return false; }
        Store.s.endGoal = { ...g, ...o, current: o.current || 0 };
        if (o.metric === 'networth') Store.s.freedomNumber = o.target;
        App.refresh();
      } }],
    });
  },
  card(compact = false) {
    const g = this.g, p = this.progress(), cur = this.current(), eta = this.eta();
    const fmt = v => g.metric === 'custom' ? num(v) : money(v, { compact: true });
    const left = daysLeft(g.deadline);
    return `<div class="endgoal">
      ${ring(p, compact ? 92 : 128, compact ? 9 : 11, 'gold', `${(p * 100).toFixed(p < .1 ? 1 : 0)}%`)}
      <div class="grow" style="min-width:200px">
        <div class="eyebrow-s">${I('crown', 14)} End goal</div>
        <div class="eg-title">${esc(g.title)}</div>
        <div class="goal-val"><b>${fmt(cur)}</b><span>of ${fmt(g.target)} · ${esc(this.METRICS.find(m => m[0] === g.metric)?.[1] || '')}</span></div>
        <div class="mt-s">${bar(p, 'gold thick')}</div>
        <div class="row wrap mt-s" style="gap:6px">
          ${chip(`${fmt(Math.max(0, g.target - cur))} to go`, 'gold', 'flag')}
          ${eta ? (eta.months != null ? chip(`~${eta.months < 12 ? Math.ceil(eta.months) + ' months' : (eta.months / 12).toFixed(1) + ' years'} at current pace`, 'green', 'clock') : chip('Net worth trend is flat or down', 'red', 'down')) : ''}
          ${eta && eta.perMonth > 0 ? chip(`+${money(eta.perMonth, { compact: true })}/month`, 'accent', 'up') : ''}
          ${left != null ? chip(left >= 0 ? `${left} days left` : `${-left} days past target`, left >= 0 ? '' : 'red', 'calendar') : ''}
        </div>
      </div>
      ${compact ? '' : `<button class="btn sm" onclick="EndGoal.edit()">${I('edit', 14)}Edit</button>`}
    </div>`;
  },
};
function daysLeft(d) { return d ? daysBetween(today(), d) : null; }

const Coach = {
  // ── Built-in suggestions (no API key needed) ─────────────────────────
  insights() {
    const d = Store.d, t0 = today(), out = [];
    const add = (o) => out.push({ priority: 'med', ...o });
    const overdue = d.tasks.filter(t => !t.done && t.due && t.due < t0);
    if (overdue.length) add({ id: 'overdue', area: 'Tasks', priority: 'high', icon: 'flag', title: `Clear ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`, detail: `Oldest: “${overdue.sort((a, b) => a.due.localeCompare(b.due))[0].text}”. Do it, reschedule it, or delete it — overdue lists kill momentum.`, go: ['Open overdue', "Tasks.f='overdue';App.go('tasks')"] });
    const eg = Store.s.endGoal;
    if (!eg) add({ id: 'endgoal', area: 'Goals', priority: 'high', icon: 'crown', title: 'Set your end goal', detail: 'Pick the one number everything builds towards so the app can show how close you are.', go: ['Set end goal', 'EndGoal.edit()'] });
    d.goals.filter(g => Goals.pace(g)?.cls === 'red').slice(0, 2).forEach(g => add({ id: 'behind_' + g.id, area: 'Goals', priority: 'high', icon: 'target', title: `“${g.title}” is behind pace`, detail: `${Goals.pace(g).label}. ${pct(Goals.progress(g))} done. Block time for it this week.`, task: { text: `Push forward: ${g.title}`, goalId: g.id, bizId: g.bizId, priority: 'high', due: t0 } }));
    d.goals.filter(g => Goals.progress(g) < 1 && !d.tasks.some(t => t.goalId === g.id && !t.done)).slice(0, 2).forEach(g => add({ id: 'nostep_' + g.id, area: 'Goals', icon: 'target', title: `No next step for “${g.title}”`, detail: 'A goal without a scheduled next action is just a wish. Add one.', task: { text: `Next step: ${g.title}`, goalId: g.id, bizId: g.bizId, due: addDays(t0, 1) } }));
    d.businesses.forEach(b => {
      if (b.status === 'Paused') return;
      if (!d.tasks.some(t => t.bizId === b.id && !t.done)) add({ id: 'biznotasks_' + b.id, area: 'Business', icon: 'briefcase', title: `${b.name} has no open tasks`, detail: 'Plan the next three moves that bring in revenue.', task: { text: `Plan next 3 revenue moves for ${b.name}`, bizId: b.id, priority: 'high', due: t0 } });
      if (!+b.revenue && b.status !== 'Idea') add({ id: 'bizrev_' + b.id, area: 'Business', priority: 'high', icon: 'coins', title: `Get ${b.name} its first revenue`, detail: 'Fastest path is direct outreach. Make a list and start today.', task: { text: `Reach out to 10 prospects for ${b.name}`, bizId: b.id, priority: 'high', due: t0 } });
      if (!b.url) add({ id: 'bizurl_' + b.id, area: 'Business', priority: 'low', icon: 'globe', title: `Add ${b.name}’s website`, detail: 'Its logo will appear automatically once the site is linked.', go: ['Edit', `Business.edit('${b.id}')`] });
      if (b.status === 'Testing') add({ id: 'biztest_' + b.id, area: 'Business', priority: 'low', icon: 'zap', title: `Decide on ${b.name}`, detail: 'Set a kill-or-commit date and the number it must hit by then.', task: { text: `Kill-or-commit review: ${b.name}`, bizId: b.id, due: addDays(t0, 14) } });
    });
    const recent = d.trades.filter(t => t.account !== 'backtest' && t.date.slice(0, 10) >= addDays(t0, -30));
    if (recent.length >= 5) {
      const s = tStats(recent);
      const mist = groupStats(recent.filter(t => tMistakes(t).length), tMistakes).sort((a, b) => a.s.net - b.s.net)[0];
      if (mist && mist.s.net < 0) add({ id: 'mistake_' + mist.label, area: 'Trading', priority: 'high', icon: 'flag', title: `“${mist.label}” cost you ${money(-mist.s.net)} this month`, detail: `${mist.s.n} trades. Write one hard rule that makes this mistake impossible.`, task: { text: `Write a rule to stop “${mist.label}”`, priority: 'high', due: t0 } });
      if (s.rules != null && s.rules < .8) add({ id: 'rules', area: 'Trading', priority: 'high', icon: 'shield', title: `Rules followed on only ${pct(s.rules)} of trades`, detail: 'Before every entry, read your strategy checklist out loud. No checklist, no trade.' });
      const sess = groupStats(recent, 'session').filter(g => g.s.n >= 3).sort((a, b) => a.s.net - b.s.net)[0];
      if (sess && sess.s.net < 0) add({ id: 'session_' + sess.label, area: 'Trading', icon: 'clock', title: `${sess.label} session is losing (${money(sess.s.net, { sign: true })})`, detail: `${sess.s.n} trades, ${pct(sess.s.wr)} win rate. Consider sitting it out or halving size there.` });
      const best = groupStats(recent, 'setup').filter(g => g.s.n >= 3 && g.label !== '—').sort((a, b) => b.s.net - a.s.net)[0];
      if (best && best.s.net > 0) add({ id: 'best_' + best.label, area: 'Trading', priority: 'low', icon: 'star', title: `${best.label} is your edge right now`, detail: `${money(best.s.net, { sign: true })} over ${best.s.n} trades. Focus on A+ versions of it.` });
    }
    d.accounts.filter(a => a.status === 'Active').forEach(a => {
      const st = acctStats(a);
      if (st.ddLimit && st.ddWorst / st.ddLimit > .6) add({ id: 'dd_' + a.id, area: 'Trading', priority: 'high', icon: 'down', title: `${a.name}: ${pct(st.ddWorst / st.ddLimit)} of max drawdown used`, detail: `Only ${money(st.ddLimit - st.ddWorst)} left. Cut risk per trade until you’re back above water.` });
      if (st.dailyLimit && -st.day / st.dailyLimit > .5) add({ id: 'daily_' + a.id, area: 'Trading', priority: 'high', icon: 'x', title: `Stop trading ${a.name} today`, detail: `You’ve used ${pct(-st.day / st.dailyLimit)} of the daily loss limit.` });
      if (st.hit && a.type === 'prop' && a.phase !== 'Funded') add({ id: 'hit_' + a.id, area: 'Trading', priority: 'high', icon: 'crown', title: `${a.name} hit its profit target 🎯`, detail: 'Stop trading it and move to the next phase.', task: { text: `Request next phase for ${a.name}`, priority: 'high', due: t0 } });
    });
    const h = new Date().getHours();
    d.habits.forEach(hb => { const s = Habits.streak(hb); if (s >= 3 && !hb.days[t0] && h >= 17) add({ id: 'streak_' + hb.id, area: 'Habits', priority: 'high', icon: 'flame', title: `Keep your ${s}-day “${hb.name}” streak alive`, detail: 'Do it before the day ends.', go: ['Mark done', `Habits.toggle('${hb.id}')`] }); });
    const lastNw = d.nwHistory[d.nwHistory.length - 1];
    if (!lastNw || daysBetween(lastNw.date, t0) > 30) add({ id: 'nw', area: 'Wealth', icon: 'wallet', title: 'Update your net worth', detail: 'It’s been over a month. Update balances so your end goal stays accurate.', go: ['Open wealth', "App.go('wealth')"] });
    if (Store.s.monthlyExpenses) { const cash = sum(d.assets.filter(a => a.kind !== 'liability' && a.cat === 'Cash'), a => a.value); if (cash / Store.s.monthlyExpenses < 3) add({ id: 'runway', area: 'Wealth', priority: 'high', icon: 'clock', title: `Cash runway under 3 months`, detail: `${money(cash)} cash vs ${money(Store.s.monthlyExpenses)}/month. Build a buffer before taking bigger risks.` }); }
    if (!Focus.todayMin() && h >= 10 && h < 20) add({ id: 'focus', area: 'Mindset', priority: 'low', icon: 'zap', title: 'No deep work yet today', detail: 'One 25-minute block on your most important task changes the day.', go: ['Start focus', "App.go('dashboard');setTimeout(()=>Focus.toggle(),300)"] });
    const lb = +localStorage.getItem('empire_lastBackup');
    if (!lb || Date.now() - lb > 14 * 864e5) add({ id: 'backup', area: 'Mindset', priority: 'low', icon: 'download', title: 'Back up your data', detail: 'Your data lives on this device. Download a backup every couple of weeks.', go: ['Back up now', 'Backup.export();App.render()'] });
    const dis = Store.s.dismissed || {};
    const rank = { high: 0, med: 1, low: 2 };
    return out.filter(s => dis[s.id] !== t0).sort((a, b) => rank[a.priority] - rank[b.priority]);
  },
  dismiss(id) { (Store.s.dismissed ||= {})[id] = today(); App.refresh(); },
  addTask(task) {
    const t = normTask({ id: uid(), ...task });
    Store.d.tasks.unshift(t); App.refresh();
    UI.toast(`${I('check', 16)} Added to your tasks${t.due ? ' for ' + relDate(t.due).toLowerCase() : ''}`, 'success');
  },
  sugHTML(s, i, src) {
    const key = `${src}:${i}`;
    (this._tasks ||= {})[key] = s.task;
    (this._go ||= {})[key] = s.go?.[1];
    (this._ids ||= {})[key] = s.id;
    return `<div class="sug ${s.priority === 'high' ? 'high' : ''}">
      <div class="s-ic">${I(s.icon || { Tasks: 'tasks', Goals: 'target', Business: 'briefcase', Trading: 'candles', Wealth: 'wallet', Habits: 'flame' }[s.area] || 'sparkles', 17)}</div>
      <div class="grow"><div class="row wrap" style="gap:6px;margin-bottom:3px">${tag(s.area)}${s.priority === 'high' ? tag('Priority') : ''}</div>
        <b>${esc(s.title)}</b>${s.detail ? `<p>${esc(s.detail)}</p>` : ''}
        <div class="s-act">
          ${s.task?.text ? `<button class="btn xs primary" onclick="Coach.addTask(Coach._tasks['${key}'])">${I('plus', 12)}Add task: ${esc(s.task.text.length > 42 ? s.task.text.slice(0, 40) + '…' : s.task.text)}</button>` : ''}
          ${s.go ? `<button class="btn xs" onclick="(new Function(Coach._go['${key}']))()">${esc(s.go[0])}</button>` : ''}
          ${src === 'rule' ? `<button class="btn xs ghost" onclick="Coach.dismiss(Coach._ids['${key}'])">Not today</button>` : ''}
        </div></div></div>`;
  },

  // ── Claude coaching (calls the Claude API directly with the user's key) ─
  SCHEMA: {
    type: 'object', additionalProperties: false, required: ['summary', 'suggestions'],
    properties: {
      summary: { type: 'string' },
      suggestions: { type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['title', 'detail', 'area', 'priority', 'task', 'due_in_days', 'business'],
        properties: {
          title: { type: 'string' }, detail: { type: 'string' },
          area: { type: 'string', enum: ['Tasks', 'Goals', 'Business', 'Trading', 'Wealth', 'Habits', 'Mindset'] },
          priority: { type: 'string', enum: ['high', 'med', 'low'] },
          task: { type: 'string' }, due_in_days: { type: 'integer' }, business: { type: 'string' },
        },
      } },
    },
  },
  SYSTEM: `You are the personal performance coach built into the user's productivity app. The user is an entrepreneur and trader building several businesses and working towards an end goal. You receive a JSON snapshot of their tasks, goals, businesses, trading journal stats, prop/live accounts, wealth and habits.

Give direct, specific, data-grounded coaching. Reference real numbers and names from the snapshot. Prioritise what moves them closest to the end goal fastest; call out risks (drawdown, overdue work, stalled businesses, costly trading mistakes). Avoid generic advice.

Return a short summary (2-4 sentences, plain text) and 4-8 suggestions. For each suggestion: a punchy title, a 1-2 sentence detail explaining why, an area, a priority, and one concrete task they can do (an empty string if none fits), with due_in_days (0 = today) and the exact business name it relates to (empty string if none). If the user asks a question, answer it in the summary and tailor the suggestions to it.`,
  snapshot() {
    const d = Store.d, t0 = today();
    const recent = d.trades.filter(t => t.account !== 'backtest' && t.date.slice(0, 10) >= addDays(t0, -30));
    const s = tStats(recent);
    const g = Store.s.endGoal || EndGoal.g;
    return {
      today: t0, name: Store.s.name || undefined, currency: Store.s.currency,
      end_goal: { title: g.title, metric: g.metric, target: g.target, current: Math.round(EndGoal.current()), progress_pct: Math.round(EndGoal.progress() * 100), deadline: g.deadline || undefined },
      goals: d.goals.map(x => ({ title: x.title, category: x.cat, progress_pct: Math.round(Goals.progress(x) * 100), deadline: x.deadline || undefined, pace: Goals.pace(x)?.label, business: Store.biz(x.bizId)?.name })),
      businesses: d.businesses.map(b => ({ name: b.name, status: b.status, revenue_month: +b.revenue || 0, costs_month: +b.costs || 0, target_month: +b.target || 0, open_tasks: d.tasks.filter(t => t.bizId === b.id && !t.done).slice(0, 6).map(t => t.text) })),
      tasks: { open: d.tasks.filter(t => !t.done).length, overdue: d.tasks.filter(t => !t.done && t.due && t.due < t0).length, due_today: d.tasks.filter(t => !t.done && t.due === t0).length, done_last_7_days: d.tasks.filter(t => t.done && t.doneAt > Date.now() - 7 * 864e5).length,
        top_open: d.tasks.filter(t => !t.done).sort((a, b) => Tasks.smartSort(a, b)).slice(0, 12).map(t => ({ text: t.text, due: t.due || undefined, priority: t.priority, business: Store.biz(t.bizId)?.name })) },
      trading_last_30_days: { trades: s.n, net: Math.round(s.net), win_rate_pct: s.wr == null ? null : Math.round(s.wr * 100), profit_factor: s.pf === Infinity ? 'inf' : s.pf && +s.pf.toFixed(2), avg_r: s.avgR && +s.avgR.toFixed(2), rules_followed_pct: s.rules == null ? null : Math.round(s.rules * 100),
        by_strategy: groupStats(recent, 'setup').map(x => ({ strategy: x.label, trades: x.s.n, net: Math.round(x.s.net) })),
        by_session: groupStats(recent, 'session').map(x => ({ session: x.label, trades: x.s.n, net: Math.round(x.s.net) })),
        mistakes: groupStats(recent.filter(t => tMistakes(t).length), tMistakes).map(x => ({ mistake: x.label, times: x.s.n, net: Math.round(x.s.net) })) },
      accounts: d.accounts.map(a => { const st = acctStats(a); return { name: a.name, type: a.type, phase: a.phase || undefined, size: a.size, balance: Math.round(st.bal), profit_target_pct_reached: st.targetAmt ? Math.round(st.net / st.targetAmt * 100) : undefined, max_dd_used_pct: st.ddLimit ? Math.round(st.ddWorst / st.ddLimit * 100) : undefined, status: a.status }; }),
      wealth: { net_worth: Math.round(Wealth.netWorth()), monthly_income: Math.round(Wealth.monthlyIncome()), monthly_expenses: Store.s.monthlyExpenses, passive_income: Wealth.passive() },
      habits: d.habits.map(h => ({ name: h.name, streak: Habits.streak(h), last_30_days_pct: Math.round(Habits.rate(h) * 100), done_today: !!h.days[t0] })),
      focus_minutes_today: Focus.todayMin(),
    };
  },
  loading: false,
  async ask(question = '') {
    const key = (Store.s.claudeKey || '').trim();
    if (!key) { UI.toast(`${I('info', 16)} Add your Claude API key in Profile → Integrations`, 'warn'); App.go('profile/integrations'); return; }
    if (this.loading) return;
    this.loading = true; this.lastQ = question; App.render();
    try {
      const { default: Anthropic } = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm');
      this.Anthropic = Anthropic;
      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
      const res = await client.beta.messages.create({
        model: Store.s.claudeModel || 'claude-opus-5-5',
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: this.SCHEMA } },
        system: this.SYSTEM,
        messages: [{ role: 'user', content: `My current snapshot:\n${JSON.stringify(this.snapshot())}\n\n${question ? 'My question: ' + question : 'Review everything and tell me what to focus on next to get closer to my end goal.'}` }],
      });
      if (res.stop_reason === 'refusal') throw new Error('Claude declined this request. Try rephrasing your question.');
      const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
      const out = JSON.parse(text);
      Store.d.coach = { at: Date.now(), question, model: res.model, summary: out.summary, suggestions: out.suggestions };
      Store.save();
    } catch (e) {
      const A = this.Anthropic;
      let msg = e.message || 'Something went wrong';
      if (A && e instanceof A.AuthenticationError) msg = 'Your Claude API key was rejected. Check it in Profile → Integrations.';
      else if (A && e instanceof A.PermissionDeniedError) msg = 'This API key doesn’t have access to that model.';
      else if (A && e instanceof A.RateLimitError) msg = 'Rate limited by the Claude API. Wait a minute and try again.';
      else if (A && e instanceof A.APIConnectionError) msg = 'Couldn’t reach the Claude API. Check your connection.';
      else if (A && e instanceof A.APIError) msg = `Claude API error ${e.status ?? ''}: ${e.message}`;
      else if (e instanceof SyntaxError) msg = 'Claude’s reply couldn’t be read. Try again.';
      UI.toast(`${I('info', 16)} ${esc(msg)}`, 'error');
    }
    this.loading = false;
    App.render();
  },
  aiTask(s) {
    const biz = Store.d.businesses.find(b => b.name.toLowerCase() === String(s.business || '').toLowerCase());
    return s.task ? { text: s.task, priority: s.priority === 'med' ? 'med' : s.priority, due: addDays(today(), clamp(+s.due_in_days || 0, 0, 365)), bizId: biz?.id || '' } : null;
  },

  title: 'Coach',
  sub() { return 'How close you are, and what to do next'; },
  actions() { return Store.s.claudeKey ? `<button class="btn primary" onclick="Coach.ask()" ${this.loading ? 'disabled' : ''}>${I('sparkles', 16)}<span class="hide-sm">Ask Claude</span></button>` : ''; },
  render() {
    const ins = this.insights(), ai = Store.d.coach, hasKey = !!Store.s.claudeKey;
    const goals = Store.d.goals.map(g => ({ g, p: Goals.progress(g) })).sort((a, b) => b.p - a.p);
    const bizs = Store.d.businesses;
    return `<div class="dash">
      <div class="glass card s12">${EndGoal.card()}</div>
      <div class="glass card s7">
        <div class="card-h"><h2>${I('sparkles')}Claude coach</h2>${ai ? `<span class="sub">${fmtDT(ai.at)}</span>` : ''}</div>
        ${hasKey ? `<div class="quick-add" style="border:1px solid var(--stroke-2);background:var(--field);margin-bottom:12px">${I('sparkles', 18)}<input id="coachQ" placeholder="Ask anything — “What should I focus on this week?”" onkeydown="if(event.key==='Enter'){event.preventDefault();Coach.ask(this.value)}" ${this.loading ? 'disabled' : ''}><button class="btn primary sm" onclick="Coach.ask($('#coachQ').value)" ${this.loading ? 'disabled' : ''}>${this.loading ? 'Thinking…' : 'Ask'}</button></div>`
          : `<div class="banner" style="margin-bottom:12px">${I('sparkles', 18)}<div class="grow">Connect Claude for personal coaching based on all your data: tasks, businesses, trading and money. You use your own Claude API key, from platform.claude.com.</div><a class="btn sm gold" href="#/profile/integrations">Connect</a></div>`}
        ${this.loading ? `<div class="sug"><div class="s-ic">${I('sparkles', 17)}</div><div class="grow"><b>Claude is reviewing your data…</b><p>This usually takes 10–40 seconds.</p></div></div>` : ''}
        ${ai && !this.loading ? `${ai.question ? `<p class="faint" style="font-size:12.5px;margin-bottom:6px">You asked: “${esc(ai.question)}”</p>` : ''}<p style="margin-bottom:12px;white-space:pre-wrap">${esc(ai.summary)}</p>${(ai.suggestions || []).map((s, i) => this.sugHTML({ ...s, task: this.aiTask(s) }, i, 'ai')).join('')}` : ''}
        ${!ai && hasKey && !this.loading ? `<p class="faint" style="font-size:13px">Tap <b>Ask Claude</b> for a full review, or ask a specific question above.</p>` : ''}
      </div>
      <div class="glass card s5">
        <div class="card-h"><h2>${I('zap')}Suggestions</h2><span class="sub">${ins.length}</span></div>
        ${ins.length ? ins.slice(0, 10).map((s, i) => this.sugHTML(s, i, 'rule')).join('') : empty('check', 'You’re on top of everything', 'No suggestions right now. Keep executing.')}
      </div>
      <div class="glass card s6">
        <div class="card-h"><h2>${I('target')}How close you are — goals</h2><div class="right"><a class="btn sm ghost" href="#/goals">${I('arrowR', 14)}</a></div></div>
        ${goals.map(({ g, p }) => { const pc = Goals.pace(g); return `<div class="close-row"><div class="row between"><b class="ellipsis">${esc(g.title)}</b><b>${pct(p)}</b></div>${bar(p, p >= 1 ? 'green' : (GOAL_CATS[g.cat] || {}).ring || '')}<div class="faint" style="font-size:12px">${pc ? pc.label : g.deadline ? 'By ' + fmtDay(g.deadline, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline'}${g.kind !== 'milestones' ? ` · ${Goals.fmtVal(g, Math.max(0, g.target - g.current))} to go` : ` · ${g.milestones.filter(m => !m.done).length} milestones left`}</div></div>`; }).join('') || '<p class="faint" style="font-size:13px">No goals yet.</p>'}
      </div>
      <div class="glass card s6">
        <div class="card-h"><h2>${I('briefcase')}How close you are — businesses</h2><div class="right"><a class="btn sm ghost" href="#/business">${I('arrowR', 14)}</a></div></div>
        ${bizs.map(b => { const p = b.target ? (+b.revenue || 0) / b.target : 0; return `<div class="close-row"><div class="row" style="gap:10px">${Business.av(b, 'sm')}<b class="grow ellipsis">${esc(b.name)}</b><b>${pct(p)}</b></div>${bar(p, 'gold')}<div class="faint" style="font-size:12px">${money(b.revenue)}/mo of ${money(b.target)} target · ${money(Math.max(0, b.target - b.revenue))} to go</div></div>`; }).join('') || '<p class="faint" style="font-size:13px">No businesses yet.</p>'}
      </div>
    </div>`;
  },
};
App.register('coach', Coach);
