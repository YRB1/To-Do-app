'use strict';
/* Vision & routine — the vision, reasons why, long-range goals, daily affirmations and the weekly routine.
   Seeded once from Yrb's handwritten pages; every block is editable. */

function seedVision() {
  return {
    statement: 'Be financially independent by 2027',
    target: 'Earn at least £5,000 a month through diversified, scalable income streams.',
    streams: ['Stable income: front-end development', 'Scalable hustle: successful online stores', 'Smart investing: disciplined trading', 'Long-term asset: real estate'],
    tagline: '2026 is the year I become unrecognisable!',
    motto: 'Wake, move, build, reflect, repeat!',
    reminder: 'This journey will require discipline, testing and persistence — but remember: no one is coming to save you!',
    reasons: ['So I never have to worry about money again', 'To make up for all the times down', 'Because we have lived average for too long', 'To make my mum proud', 'To prove people wrong', 'To inspire my sister'],
    fiveYear: { date: '2027-05-20', items: ['I will be financially free', 'I will have a successful business', 'I will buy a BMW M140i and an E63', 'I will have £1m+', 'I will move my mum out and buy her a house', 'I will send £20k to my brothers each month', 'I will fly private each month'] },
    tenYear: { date: '2033-05-11', text: 'I will have £5 billion in 10 years from today.', how: ['Trading', 'Web dev', 'Etsy business', 'Rent 2 Rent', 'Cleaning company'] },
    affirmations: ['I am blessed', 'I am favoured', 'I am rich', 'I am healthy', 'Anything I want I get', 'My desires are met daily', 'My life is always getting better', 'I have created generational wealth', 'I always have more than enough money to meet my needs', 'My bank account never stops growing!!!', 'I am the greatest', 'I am the best', 'I am him', 'I attract, not chase', 'People love to be around me', 'I am unstoppable', 'I am the best at what I do', 'I am a winner!'],
    affDays: {},
    routine: {
      weekdays: [['06:00', '07:00', 'Gym or walk + audiobook / podcast (business, dev, mind)'], ['07:00', '09:00', 'Study dev (freeCodeCamp)'], ['09:00', '15:00', 'Uni + assignments'], ['15:00', '17:00', 'Dinner + chill'], ['17:00', '19:00', 'Etsy / eBay research and improve listings'], ['19:00', '22:00', 'Dev practice / project work / trading'], ['22:00', '00:00', 'PS / reading (30 mins minimum)'], ['00:00', '01:00', 'Backtesting'], ['01:00', '06:00', 'Sleep']],
      saturday: [['06:00', '12:00', 'Morning: build a portfolio project or freelance outreach'], ['12:00', '17:00', 'Afternoon: product photography / listings / research trends'], ['17:00', '01:00', 'Evening: backtest, then PS, read'], ['01:00', '06:00', 'Sleep']],
      sunday: [['06:00', '12:00', 'Morning: review the week / review and journal trades'], ['12:00', '17:00', 'Afternoon: batch create content for Teez'], ['17:00', '01:00', 'Evening: plan the week / meal prep / light dev practice'], ['01:00', '06:00', 'Sleep']],
    },
  };
}

const NEW_GOALS = () => {
  const now = Date.now(), y = '2026-12-31';
  const ms = (...xs) => xs.map(text => ({ id: uid(), text, done: false }));
  const G = (title, cat, o = {}) => ({ id: 'g_' + uid(), title, cat, kind: 'milestones', unit: 'number', start: 0, target: 0, current: 0, deadline: y, why: '', bizId: '', milestones: [], log: [], createdAt: now, ...o });
  const N = (title, cat, target, unit, o = {}) => G(title, cat, { kind: 'number', unit, target, ...o });
  return [
    N('Financially independent by 2027 — £5,000 a month', 'Wealth', 5000, 'money', { deadline: '2027-12-31', why: 'Front-end dev, online stores, disciplined trading, real estate.' }),
    N('Make £500,000 in 2026', 'Wealth', 500000, 'money', { why: 'Financial goal for 2026.' }),
    N('Hit £10,000 a month', 'Wealth', 10000, 'money', { why: 'Originally set for the first half of 2026 — keep climbing.' }),
    G('Get closer to God', 'Personal', { why: 'Pray daily, read the Bible daily, and live in faith, discipline and gratitude.', milestones: ms('Pray every day for 30 days straight', 'Read the Bible every day for 30 days straight') }),
    G('Retire mum and remove all financial stress from her life', 'Personal', { why: 'To make my mum proud.', milestones: ms('Cover her monthly bills', 'Move her out and buy her a house') }),
    G('Build my dream body', 'Health', { why: 'Train in the gym 4 times a week, stay consistent, eat well.', milestones: ms('4 gym sessions a week for 4 weeks straight', '4 gym sessions a week for 12 weeks straight') }),
    G('Master coding and get paid highly', 'Learning', { why: 'Build apps, games and websites.', milestones: ms('Job-ready in front-end (React, Git, APIs)', 'Portfolio: 1 clone, 1 custom, 1 team project', 'First paid freelance dev work', 'Ship an app') }),
    G('Max allocation funding at multiple prop firms', 'Trading', { why: 'Trading no longer leads to account blow-ups — strategy, not speed.', milestones: ms('Pass one evaluation with zero rule breaks', 'Funded at a second firm', 'Max allocation') }),
    G('Build Teez into a big online name', 'Business', { why: 'Batch-create content every Sunday.', milestones: ms('Post consistently for 30 days', 'First 1,000 followers', 'First 10,000 followers') }),
    N('Travel somewhere fancy each month — 5+ holidays', 'Personal', 5, 'number', { why: 'Fun and travel.' }),
    G('Own one of my dream cars and a dedicated office', 'Personal', { why: 'An office for focus and execution.', milestones: ms('Dedicated office', 'BMW M140i', 'Mercedes E63') }),
    G('Operate with elite discipline — no wasted days', 'Personal', { why: 'No excuses.', milestones: ms('Follow the routine 7 days straight', 'Follow the routine 30 days straight') }),
    G('Full control over my time, location and money', 'Personal', { why: 'Live life on my terms.' }),
    G('5-year goals (set 20 May 2022)', 'Wealth', { deadline: '2027-05-20', why: 'So I never have to worry about money again.', milestones: ms('Financially free', 'A successful business', 'BMW M140i and an E63', '£1m+', 'Move mum out and buy her a house', 'Send £20k to my brothers each month', 'Fly private each month') }),
    N('£5 billion by 11 May 2033', 'Wealth', 5e9, 'money', { deadline: '2033-05-11', why: 'Trading, web dev, Etsy business, Rent 2 Rent, cleaning company.' }),
    G('Mastery & foundation plan', 'Learning', { deadline: '', why: 'Original plan: July–December 2025.', milestones: ms('Job-ready in front-end development', 'Rebuild trading discipline — strategy, not speed', 'Audit and rebuild Etsy / eBay / Vinted with a better product', 'Find 1 niche with EverBee / eRank and double down', 'Brand the store: logo, banner, packaging', 'First freelance dev income or internship', 'One product getting consistent weekly sales', 'Read Trading in the Zone and The Daily Trading Coach') }),
    G('Pass my driving test', 'Personal', { deadline: '', why: 'Freedom to get anywhere — and the first step to the Scirocco.', milestones: ms('Reverse bay parking every time', 'Book the practical test', 'Mock test with my instructor', 'Pass the driving test') }),
    G('Buy a VW Scirocco', 'Personal', { deadline: '', why: 'My first car.', milestones: ms('Pass the driving test', 'Get 3 insurance quotes for a Scirocco', 'Pick the model, year and budget', 'Save the money', 'Buy the Scirocco') }),
    N('Read 1 book a month — 30 minutes a day', 'Learning', 1, 'number', { deadline: '2026-11-30', why: 'November: Trading in the Zone. Next: The Daily Trading Coach.' }),
  ];
};

function ensureVision(d) {
  if (d.settings.visionSeeded) return;
  d.vision ||= seedVision();
  const haveG = new Set(d.goals.map(g => g.title.toLowerCase()));
  NEW_GOALS().forEach(g => { if (!haveG.has(g.title.toLowerCase())) d.goals.push(g); });
  const H = (name, emoji) => ({ id: 'h_' + uid(), name, emoji, days: {}, createdAt: Date.now() });
  const has = re => d.habits.some(h => re.test(h.name));
  [[/pray/i, 'Pray', '🙏'], [/bible/i, 'Read the Bible', '📖'], [/read 30|30 min/i, 'Read 30 minutes', '📚'], [/affirm/i, 'Say my affirmations', '✨'], [/code|coding/i, 'Code 1–2 hours', '💻'], [/gym|walk/i, 'Gym or walk', '🏋️']]
    .forEach(([re, n, e]) => { if (!has(re)) d.habits.push(H(n, e)); });
  if (!d.spaces.some(s => /driv|scirocco/i.test(s.name))) d.spaces.push({ id: 'sp_drive', name: 'Driving & Scirocco', emoji: '🚗', color: '#38bdf8', status: 'Active', bizId: '', order: d.spaces.length,
    mission: 'Pass the driving test, then buy a VW Scirocco.', deadline: '', deadlineLabel: 'Driving test',
    rungs: ['Reverse bay parking every time', 'Book the practical test', 'Pass the driving test', 'Get insurance quotes for a Scirocco', 'Buy the Scirocco'].map(text => ({ id: uid(), text, done: false })),
    daily: [], links: [{ id: uid(), label: 'Book your practical test (GOV.UK)', url: 'https://www.gov.uk/book-driving-test' }, { id: uid(), label: 'Scirocco on AutoTrader', url: 'https://www.autotrader.co.uk/car-search?make=Volkswagen&model=Scirocco&postcode=LE11' }], repo: '', notes: '', createdAt: Date.now() });
  const haveT = new Set(d.tasks.map(t => t.text.toLowerCase()));
  [['Read Trading in the Zone (November book) — 30 mins a day', '2026-11-30', 'sp_trading'], ['Get The Daily Trading Coach ready for December', '2026-11-28', 'sp_trading'], ['Book the practical driving test and set the date as the deadline', addDays(today(), 1), 'sp_drive'], ['Practise reverse bay parking', addDays(today(), 2), 'sp_drive'], ['Get 3 insurance quotes for a VW Scirocco', addDays(today(), 7), 'sp_drive']]
    .forEach(([text, due, spaceId]) => { if (!haveT.has(text.toLowerCase())) d.tasks.push(normTask({ id: uid(), text, due, spaceId: d.spaces.some(s => s.id === spaceId) ? spaceId : '', priority: 'med' })); });
  d.settings.visionSeeded = true;
}

// Turn the routine + goals into real recurring tasks with reminders (once). Sample tasks are removed.
function nextDow(dow) { const x = parseYmd(today()); while (x.getDay() !== dow) x.setDate(x.getDate() + 1); return ymd(x); }
function nextWeekday() { const x = parseYmd(today()); while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + 1); return ymd(x); }
function ensureRoutineTasks(d) {
  if (d.settings.routineTasks) return;
  d.tasks = d.tasks.filter(t => !t.sample);
  const goal = re => d.goals.find(g => re.test(g.title))?.id || '';
  const sp = id => d.spaces.some(s => s.id === id) ? id : '';
  const wk = nextWeekday(), tom = addDays(today(), 1);
  const R = [
    ['Pray, read the Bible and say my affirmations', '06:00', 'daily', today(), '', goal(/closer to god/i), 'high', 'Spiritual'],
    ['Gym or walk + audiobook / podcast', '06:10', 'weekdays', wk, '', goal(/dream body/i), 'med', 'Health'],
    ['Study dev — freeCodeCamp (2 hours)', '07:00', 'weekdays', wk, '', goal(/master coding/i), 'med', 'Dev'],
    ['Etsy / eBay: research and improve listings', '17:00', 'weekdays', wk, sp('sp_supreme'), '', 'med', 'Store'],
    ['Project work / trading', '20:00', 'weekdays', wk, '', '', 'med', 'Build'],
    ['Read 30 minutes', '22:00', 'daily', today(), '', goal(/1 book a month/i), 'med', 'Reading'],
    ['Backtest for 1 hour', '00:00', 'daily', tom, sp('sp_trading'), goal(/prop firms/i), 'med', 'Trading'],
    ['Build a portfolio project or do freelance outreach', '09:00', 'weekly', nextDow(6), '', goal(/master coding/i), 'med', 'Dev'],
    ['Product photography, listings and trend research', '13:00', 'weekly', nextDow(6), sp('sp_supreme'), '', 'med', 'Store'],
    ['Review the week and journal trades', '09:00', 'weekly', nextDow(0), sp('sp_trading'), '', 'high', 'Review'],
    ['Batch create content for Teez', '13:00', 'weekly', nextDow(0), '', goal(/teez/i), 'med', 'Content'],
    ['Plan the week, meal prep, light dev practice', '18:00', 'weekly', nextDow(0), '', '', 'med', 'Planning'],
  ];
  const have = new Set(d.tasks.map(t => t.text.toLowerCase()));
  for (const [text, time, repeat, due, spaceId, goalId, priority, cat] of R) {
    if (have.has(text.toLowerCase())) continue;
    const s = d.spaces.find(x => x.id === spaceId);
    d.tasks.push(normTask({ id: uid(), text, time, repeat, due, spaceId, goalId, priority, cat, bizId: s?.bizId || '', reminder: new Date(`${due}T${time}:00`).getTime() }));
  }
  // Give the daily business must-dos a slot in the 7–10pm block
  const ce = d.tasks.find(t => !t.done && /^send 30 cold emails/i.test(t.text));
  if (ce) { ce.time = '19:00'; ce.due = ce.due && ce.due > today() ? ce.due : wk; ce.reminder = new Date(`${ce.due}T19:00:00`).getTime(); ce.reminderFired = false; }
  const jt = d.tasks.find(t => !t.done && /^journal every trade$/i.test(t.text));
  if (jt) { jt.time = '21:45'; jt.reminder = new Date(`${jt.due || today()}T21:45:00`).getTime(); jt.reminderFired = false; }
  d.settings.routineTasks = true;
}

// One-off clean-up: drop example data, keep real goals (progress reset), tidy businesses, trading playbook.
function cleanUpV1(d) {
  if (d.settings.cleanV1) return;
  for (const k of ['trades', 'backtests', 'setups', 'accounts', 'habits', 'assets', 'incomes', 'nwHistory', 'tasks']) d[k] = (d[k] || []).filter(x => !x.sample);
  if (!d.nwHistory.length) d.nwHistory = [{ date: today(), value: 0 }];
  if (!d.habits.some(h => /gym|walk/i.test(h.name))) d.habits.push({ id: 'h_' + uid(), name: 'Gym or walk', emoji: '🏋️', days: {}, createdAt: Date.now() });
  d.goals.forEach(g => { if (g.sample) { g.current = g.start || 0; g.log = []; g.milestones.forEach(m => { m.done = false; }); g.sample = false; } });
  // VoiceDesk lives inside YRB Nova now
  const voice = d.businesses.find(b => b.id === 'b_voice');
  if (voice) { d.tasks.forEach(t => { if (t.bizId === 'b_voice') t.bizId = 'b_nova'; }); d.goals.forEach(g => { if (g.bizId === 'b_voice') g.bizId = 'b_nova'; }); d.businesses = d.businesses.filter(b => b.id !== 'b_voice'); }
  // Taher Cleaning: business idea
  if (!d.businesses.some(b => /taher/i.test(b.name))) d.businesses.push({ id: 'b_taher', name: 'Taher Cleaning', emoji: '🧽', color: '#a3e635', status: 'Idea', url: '', logo: '', desc: 'Cleaning business — website built, first paying job next.', revenue: 0, target: 3000, costs: 0, notes: '', log: [], createdAt: Date.now() });
  const tb = d.businesses.find(b => /taher/i.test(b.name)), ts = d.spaces.find(x => /taher/i.test(x.name));
  if (ts && tb) { ts.bizId = tb.id; ts.status = ts.status === 'Focus' ? 'Focus' : 'Side'; d.tasks.forEach(t => { if (t.spaceId === ts.id) t.bizId = tb.id; }); }
  // Trading: sweep of high/low + FVG
  const L = d.tjLists || (d.tjLists = {});
  L.confluences = [...new Set(['Sweep of high/low', 'FVG', ...(L.confluences || [])])];
  if (!d.setups.some(s => /sweep/i.test(s.name))) d.setups.unshift({ id: 'st_sweepfvg', name: 'Sweep + FVG', rules: 'Mark the key highs and lows (Asia, London, previous day)\nWait for price to sweep a high or low — wick through, close back inside\nLook for displacement that leaves an FVG in the opposite direction\nEnter on the retrace into the FVG\nStop beyond the sweep wick\nTarget the opposite liquidity — minimum 2R\nNo trade if the sweep or the FVG is unclear', notes: 'Main gold setup.' });
  const tr = d.spaces.find(x => x.id === 'sp_trading');
  if (tr) {
    tr.mission = 'Gold, traded by hand: sweep of a high or low, then an FVG entry. Protect the account first.';
    tr.links ||= []; if (!tr.links.some(l => l.url === '#/trading/playbook')) tr.links.unshift({ id: uid(), label: 'Sweep + FVG playbook', url: '#/trading/playbook' });
    tr.daily ||= []; if (!tr.daily.some(x => /sweep/i.test(x.text))) tr.daily.push({ id: uid(), text: 'Mark today’s highs and lows to watch for a sweep', days: {} });
  }
  if (!d.settings.name) d.settings.name = 'Yrb';
  d.settings.sampleBanner = false;
  d.settings.cleanV1 = true;
}
function gymV1(d) {
  if (d.settings.gymV1) return;
  const g = d.goals.find(x => /dream body/i.test(x.title));
  if (g && !g.milestones.some(m => /membership/i.test(m.text))) g.milestones.unshift({ id: uid(), text: 'Start a gym membership', done: false });
  if (!d.spaces.some(s => /gym/i.test(s.name))) d.spaces.push({ id: 'sp_gym', name: 'Gym & body', emoji: '🏋️', color: '#fb7185', status: 'Active', bizId: '', order: d.spaces.length,
    mission: 'Train 4 times a week, stay consistent, eat well — build the dream body.', deadline: addDays(today(), 7), deadlineLabel: 'Gym membership started',
    rungs: ['Start a gym membership', 'First session done', '4 sessions a week for 4 weeks', '4 sessions a week for 12 weeks'].map(text => ({ id: uid(), text, done: false })),
    daily: [{ id: uid(), text: 'Hit your protein and water', days: {} }],
    links: [{ id: uid(), label: 'PureGym — find a gym', url: 'https://www.puregym.com/gyms/' }, { id: uid(), label: 'The Gym Group — find a gym', url: 'https://www.thegymgroup.com/find-a-gym/' }],
    repo: '', notes: 'Gym days (pick 4): Mon · Tue · Thu · Fri at 06:10\nSplit idea: Upper / Lower / Upper / Lower', createdAt: Date.now() });
  const have = new Set(d.tasks.map(t => t.text.toLowerCase())), gid = g?.id || '';
  [['Compare 3 gyms near you — price, opening hours, distance', 1, 'med'], ['Sign up for a gym membership', 3, 'high'], ['Plan a 4-day split (upper / lower / upper / lower)', 4, 'med'], ['First gym session', 4, 'high'], ['Buy gym basics: bottle, towel, trainers check', 3, 'low']]
    .forEach(([text, dd, priority]) => { if (!have.has(text.toLowerCase())) d.tasks.push(normTask({ id: uid(), text, due: addDays(today(), dd), priority, goalId: gid, spaceId: 'sp_gym' })); });
  d.settings.gymV1 = true;
}
function proV1(d) {
  if (d.settings.proV1) return;
  if (!d.settings.endGoal) d.settings.endGoal = { title: 'Financially independent by 2027', metric: 'income', target: 5000, current: 0, deadline: '2027-12-31' };
  // The four original goals had back-dated start dates from the example data, which made them look 'behind pace'
  d.goals.forEach(g => { if (['g_income', 'g_funded', 'g_store', 'g_books'].includes(g.id)) g.createdAt = Date.now(); });
  d.settings.proV1 = true;
}

const Routine = {
  day(dt = new Date()) { const w = dt.getDay(); return w === 6 ? 'saturday' : w === 0 ? 'sunday' : 'weekdays'; },
  mins(hm) { const [h, m] = hm.split(':').map(Number); return h * 60 + m; },
  // Blocks before 6am belong to the previous day's schedule (you go to bed after midnight).
  now(dt = new Date()) {
    const v = Store.d.vision; if (!v) return null;
    let m = dt.getHours() * 60 + dt.getMinutes(), ref = dt;
    if (m < 360) { ref = new Date(dt.getTime() - 864e5); m += 1440; }
    const list = v.routine[this.day(ref)] || [];
    const norm = list.map(([s, e, l]) => { let a = this.mins(s), b = this.mins(e); if (a < 360) a += 1440; if (b <= a) b += 1440; return { s, e, l, a, b }; });
    const i = norm.findIndex(x => m >= x.a && m < x.b);
    return i < 0 ? null : { cur: norm[i], next: norm[(i + 1) % norm.length], left: norm[i].b - m, list: norm, i };
  },
  pill() {
    const r = this.now(); if (!r) return '';
    const l = r.left >= 60 ? `${Math.floor(r.left / 60)}h ${pad(r.left % 60)}m` : `${r.left}m`;
    return `<a class="now-routine" href="#/vision"><span class="nr-dot"></span><span class="grow"><b>Now: ${esc(r.cur.l)}</b><small>${l} left · next: ${esc(r.next.l)}</small></span></a>`;
  },
};

const Vision = {
  v() { return Store.d.vision || (Store.d.vision = seedVision()); },
  saidToday() { return !!this.v().affDays?.[today()]; },
  affStreak() { return Habits.streak({ days: this.v().affDays || {} }); },

  title: 'Vision & routine',
  sub() { return 'Why you’re doing this, and how each day runs'; },
  actions() { return `<button class="btn gold" onclick="Vision.read()">${I('sparkles', 16)}<span class="hide-sm">Say affirmations</span></button>`; },
  render() {
    const v = this.v(), r = Routine.now(), dk = Routine.day(new Date(Date.now() - (new Date().getHours() < 6 ? 864e5 : 0)));
    const yrs = d => Math.max(0, daysBetween(today(), d));
    const block = (k, list) => `<div class="rt-day ${k === dk ? 'on' : ''}"><div class="rt-h"><b>${{ weekdays: 'Weekdays', saturday: 'Saturday', sunday: 'Sunday' }[k]}</b>${k === dk ? chip('Today', 'gold') : ''}</div>
      ${list.map(([s, e, l]) => { const on = k === dk && r && r.cur.s === s && r.cur.l === l; return `<div class="rt-row ${on ? 'now' : ''}"><span class="rt-t">${s}–${e}</span><span>${esc(l)}</span></div>`; }).join('')}</div>`;
    return `<div class="dash vision">
      <div class="glass card s12 vi-hero">
        <div class="vi-tag">Vision</div>
        <h2 class="vi-statement">${esc(v.statement)}</h2>
        <p class="vi-target">${esc(v.target)}</p>
        <div class="vi-streams">${v.streams.map(s => { const [a, b] = s.split(':'); return `<div><small>${esc(a)}</small><b>${esc((b || '').trim())}</b></div>`; }).join('')}</div>
        <p class="vi-tagline">${esc(v.tagline)}</p>
        <button class="btn xs ghost vi-edit" onclick="Vision.editText()">${I('edit', 13)}Edit</button>
      </div>

      <div class="glass card s5 aff-card">
        <div class="card-h"><h2>${I('sparkles')}Daily affirmations</h2><span class="sub">${this.saidToday() ? 'Said today' : 'Not yet today'}${this.affStreak() > 1 ? ` · ${this.affStreak()} day streak` : ''}</span><div class="right"><button class="btn xs ghost" onclick="Vision.editList('affirmations','Daily affirmations')">${I('edit', 13)}</button></div></div>
        <ol class="aff-list">${v.affirmations.map(a => `<li>${esc(a)}</li>`).join('')}</ol>
        <button class="btn gold block mt" onclick="Vision.read()">${I('play', 15)}${this.saidToday() ? 'Say them again' : 'Say them now'}</button>
      </div>

      <div class="s7 col-stack">
        <div class="glass card">
          <div class="card-h"><h2>${I('clock')}Routine</h2><span class="sub">${esc(v.motto)}</span><div class="right"><button class="btn xs ghost" onclick="Vision.editRoutine()">${I('edit', 13)}</button></div></div>
          ${r ? `<div class="rt-now"><small>Right now</small><b>${esc(r.cur.l)}</b><span>${r.cur.s}–${r.cur.e} · next: ${esc(r.next.l)} at ${r.next.s}</span></div>` : ''}
          <div class="rt-grid">${block('weekdays', v.routine.weekdays)}<div class="col-stack">${block('saturday', v.routine.saturday)}${block('sunday', v.routine.sunday)}</div></div>
          <div class="row wrap mt"><button class="btn sm" onclick="Vision.toReminders()">${I('phone', 14)}Send today’s routine to iPhone Reminders</button><a class="btn sm ghost" href="#/tasks">${I('tasks', 14)}Routine tasks</a></div>
          <p class="vi-reminder">${esc(v.reminder)}</p>
        </div>
      </div>

      <div class="glass card s4">
        <div class="card-h"><h2>${I('flame')}Reasons why</h2><div class="right"><button class="btn xs ghost" onclick="Vision.editList('reasons','Reasons why')">${I('edit', 13)}</button></div></div>
        <ul class="vi-list">${v.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
      <div class="glass card s4">
        <div class="card-h"><h2>${I('target')}5-year goals</h2><span class="sub">by ${fmtDay(v.fiveYear.date, { day: 'numeric', month: 'short', year: 'numeric' })} · ${yrs(v.fiveYear.date)} days</span></div>
        <ul class="vi-list">${v.fiveYear.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
      <div class="glass card s4">
        <div class="card-h"><h2>${I('crown')}10-year goal</h2><span class="sub">by ${fmtDay(v.tenYear.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        <p class="vi-ten">${esc(v.tenYear.text)}</p>
        <div class="row wrap" style="gap:6px">${v.tenYear.how.map(h => chip(esc(h), 'gold')).join('')}</div>
      </div>
      <div class="glass card s12">
        <div class="card-h"><h2>${I('target')}All your goals</h2><div class="right"><a class="btn sm ghost" href="#/goals">Goals ${I('arrowR', 14)}</a></div></div>
        <div class="vi-goals">${Store.d.goals.map(g => { const p = Goals.progress(g); return `<a href="#/goals/${g.id}" class="vi-goal">${ring(p, 36, 4, (GOAL_CATS[g.cat] || {}).ring || '')}<span class="grow ellipsis">${esc(g.title)}</span><small>${pct(p)}</small></a>`; }).join('')}</div>
      </div>
    </div>`;
  },

  toReminders() {
    const t0 = today(), ts = Store.d.tasks.filter(t => !t.done && t.time && t.due === t0).sort((a, b) => a.time.localeCompare(b.time));
    if (!ts.length) return UI.toast('No timed tasks left today');
    Reminders.send(ts);
  },
  read() {
    const list = this.v().affirmations; let i = 0;
    const m = UI.modal({ title: 'Daily affirmations', body: `<div class="aff-read" id="affRead"></div>`, footer: [] });
    const box = $('#affRead', m.el);
    const draw = () => {
      if (i >= list.length) {
        (this.v().affDays ||= {})[today()] = 1;
        const h = Store.d.habits.find(x => /affirm/i.test(x.name)); if (h) h.days[today()] = 1;
        Store.save();
        box.innerHTML = `<div class="aff-done">${I('check', 30, 3)}<b>Done for today</b><span>${this.affStreak()} day streak</span><button class="btn gold" onclick="UI.close();App.render()">Close</button></div>`;
        return;
      }
      box.innerHTML = `<div class="aff-n">${i + 1} / ${list.length}</div><p class="aff-big">${esc(list[i])}</p><div class="aff-bar"><i style="width:${(i / list.length) * 100}%"></i></div><button class="btn gold block" id="affNext">${i === list.length - 1 ? 'Finish' : 'Next'}</button><p class="hint" style="text-align:center">Say it out loud, then tap anywhere</p>`;
      $('#affNext', box).focus();
    };
    box.onclick = e => { if (e.target.closest('.aff-done')) return; i++; draw(); };
    draw();
  },

  editList(key, title) {
    const v = this.v();
    UI.modal({ title, body: `<p class="muted" style="margin-bottom:10px">One per line.</p><textarea class="input" id="vlTa" rows="14" style="height:auto;padding:12px;line-height:1.6">${esc(v[key].join('\n'))}</textarea>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Save', cls: 'primary', onClick: m => { v[key] = $('#vlTa', m.el).value.split('\n').map(s => s.trim()).filter(Boolean); App.refresh(); } }] });
  },
  editText() {
    const v = this.v();
    UI.modal({ title: 'Edit vision', body: `<form class="form" id="viForm" onsubmit="return false">
      ${F({ name: 'statement', label: 'Vision', value: v.statement, full: true })}${F({ name: 'target', label: 'Target', type: 'textarea', rows: 2, value: v.target, full: true })}
      ${F({ name: 'streams', label: 'Income streams (one per line, “Label: what”)', type: 'textarea', rows: 4, value: v.streams.join('\n'), full: true })}
      ${F({ name: 'tagline', label: 'Tagline', value: v.tagline, full: true })}${F({ name: 'motto', label: 'Routine motto', value: v.motto, full: true })}${F({ name: 'reminder', label: 'Reminder', type: 'textarea', rows: 2, value: v.reminder, full: true })}</form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Save', cls: 'primary', onClick: m => { const o = readForm($('#viForm', m.el)); Object.assign(v, o, { streams: o.streams.split('\n').map(s => s.trim()).filter(Boolean) }); App.refresh(); } }] });
  },
  editRoutine() {
    const v = this.v(), fmt = l => l.map(([s, e, t]) => `${s}-${e} ${t}`).join('\n');
    UI.modal({ title: 'Edit routine', wide: true, body: `<p class="muted" style="margin-bottom:10px">One block per line: <code>06:00-07:00 Gym or walk</code></p><form class="form" id="rtForm" onsubmit="return false">
      ${F({ name: 'weekdays', label: 'Weekdays', type: 'textarea', rows: 10, value: fmt(v.routine.weekdays), full: true })}${F({ name: 'saturday', label: 'Saturday', type: 'textarea', rows: 5, value: fmt(v.routine.saturday) })}${F({ name: 'sunday', label: 'Sunday', type: 'textarea', rows: 5, value: fmt(v.routine.sunday) })}</form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Save', cls: 'primary', onClick: m => {
        const o = readForm($('#rtForm', m.el)), out = {};
        for (const k of ['weekdays', 'saturday', 'sunday']) {
          out[k] = o[k].split('\n').map(l => l.match(/^\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(.+)$/)).filter(Boolean).map(x => [x[1].padStart(5, '0'), x[2].padStart(5, '0'), x[3].trim()]);
          if (!out[k].length) { UI.toast(`Check the ${k} lines — use 06:00-07:00 Activity`, 'warn'); return false; }
        }
        v.routine = out; App.refresh();
      } }] });
  },
};
App.register('vision', Vision);

// Instagram posting schedule (Nov 2026): one reminder every day, in the right Section, at the best times
// from Instagram's October insights (Wed 6–9pm, Thu 3–6pm and 6–9pm). You post yourself; this just reminds you.
function postingV1(d) {
  if (d.settings.postingV1) return;
  const sp = id => d.spaces.some(s => s.id === id) ? id : '';
  const bizOf = id => d.spaces.find(s => s.id === id)?.bizId || '';
  const steps = (...xs) => xs.map(text => ({ id: uid(), text, done: false }));
  const NOVA = 'sp_nova', SUP = 'sp_supreme';
  const novaSlides = steps('Open this week’s YRB Nova slideshow', 'Post to Instagram (and Facebook)', 'Caption ends with one action: “Comment AUDIT for a free site review”', 'Reply to every comment within the hour');
  const supReel = steps('Pick a product you haven’t posted this week', 'POV hook on screen (e.g. “pov: your fit was mid until you added these”)', 'Caption: product + the live code (BLACKFRIDAY25 = 25% off till 1 Dec, then XMAS25)', 'Post to Instagram + TikTok', 'Reply to comments');
  const S = [
    // [text, day (0=Sun), time, space, notes, checklist]
    ['📲 Post: YRB Nova slideshow', 1, '18:30', NOVA, 'Outcome first, price on screen, one clear action. Your VoiceDesk “Every call answered” post got 1K+ views in October — copy that style.', novaSlides],
    ['📲 Post: YRBSUPREME reel', 1, '19:00', SUP, 'Your best October reel: POV caption + one bold piece on a dark background (iced skull pendant, 284 views).', supReel],
    ['📲 Stories on both accounts (2–3 each)', 2, '18:30', NOVA, 'Quick and casual: a poll, a behind-the-scenes clip, re-share yesterday’s posts.', steps('YRB Nova: 2–3 stories (poll or demo clip)', 'YRBSUPREME: 2–3 stories (product close-up, sale code)')],
    ['📲 Post: YRB Nova slideshow (best time 6–9pm)', 3, '18:30', NOVA, 'Wednesday 6–9pm is one of your best times.', novaSlides],
    ['📲 Post: YRBSUPREME reel', 3, '19:30', SUP, 'Different product from Monday.', supReel],
    ['📲 Post: YRB Nova slideshow (best time 3–6pm)', 4, '15:30', NOVA, 'Thursday 3–6pm is one of your best times.', novaSlides],
    ['📲 Post: YRBSUPREME reel (best time 6–9pm)', 4, '18:30', SUP, 'Thursday 6–9pm is one of your best times.', supReel],
    ['📲 Post: YRBSUPREME sale post', 5, '18:30', SUP, 'Carousel of 3–5 pieces with the live code. Check the code on the site first (BLACKFRIDAY25 until 1 Dec, then XMAS25 from 2 Dec).', steps('3–5 product photos in one carousel', 'Live sale code in the first slide and caption', 'Post to Instagram + Facebook')],
    ['📲 Post: YRBSUPREME reel', 6, '12:00', SUP, 'Weekend reel: gift angle works well (“gift for him he’ll actually wear”).', supReel],
    ['📲 Plan next week’s posts (both accounts)', 0, '18:00', NOVA, 'Check last week’s best post on each account, then line up 3 YRB Nova slideshows and 4 YRBSUPREME reels.', steps('Check last week’s top post on each account', 'Pick 4 different YRBSUPREME products', 'Pick 3 YRB Nova slideshow topics (one per service)', 'Ask Claude to make the week’s content')],
  ];
  const have = new Set(d.tasks.map(t => t.text.toLowerCase()));
  for (const [text, dow, time, space, notes, sub] of S) {
    if (have.has(text.toLowerCase())) continue;
    const due = nextDow(dow), spaceId = sp(space);
    d.tasks.push(normTask({ id: uid(), text, notes, due, time, repeat: 'weekly', spaceId, bizId: bizOf(spaceId), priority: 'high', cat: 'Content',
      subtasks: sub.map(s => ({ ...s, id: uid() })), reminder: new Date(`${due}T${time}:00`).getTime() }));
  }
  d.settings.postingV1 = true;
}
