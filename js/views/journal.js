'use strict';
/* Journal — one page per day: morning intention, evening review, mood & energy, free writing.
   Streak, 12-week heatmap, mood trend, search, optional PIN lock, and weekly reflection with Claude. */

const MOODS = [[1, '😞', 'Rough'], [2, '😕', 'Meh'], [3, '🙂', 'Okay'], [4, '😄', 'Good'], [5, '🔥', 'Locked in']];
const J_PROMPTS = [
  'What would make today a win, even if nothing else got done?',
  'What did you avoid today, and why?',
  'Who are you becoming — what did today’s actions vote for?',
  'What’s one thing a customer said or did that you can learn from?',
  'What would you do differently if you ran today again?',
  'What are you overthinking that just needs doing?',
  'Which rung are you on right now, and what’s the very next step up?',
  'What drained your energy today? What gave it back?',
  'If you only had two hours of work tomorrow, what would they be for?',
  'What did you finish today that past-you would be proud of?',
];

const Journal = {
  q: '', unlocked: false,
  list() { return (Store.d.journal ||= []); },
  get(date) { return this.list().find(e => e.date === date); },
  ensure(date) {
    let e = this.get(date);
    if (!e) { e = { id: uid(), date, mood: 0, energy: 0, intention: '', top3: ['', '', ''], wins: '', lesson: '', grateful: '', text: '', prompt: '', promptAns: '', spaceIds: [], createdAt: Date.now(), updatedAt: Date.now() }; this.list().push(e); }
    return e;
  },
  hasContent(e) { return !!e && !!(e.mood || e.intention || e.wins || e.lesson || e.grateful || e.text || e.promptAns || (e.top3 || []).some(Boolean)); },
  words(e) { return [e.intention, ...(e.top3 || []), e.wins, e.lesson, e.grateful, e.text, e.promptAns].join(' ').split(/\s+/).filter(Boolean).length; },
  streak() {
    let d = this.hasContent(this.get(today())) ? today() : addDays(today(), -1), n = 0;
    while (this.hasContent(this.get(d))) { n++; d = addDays(d, -1); }
    return n;
  },
  promptFor(date) { const n = Math.floor(parseYmd(date) / 864e5); return J_PROMPTS[((n % J_PROMPTS.length) + J_PROMPTS.length) % J_PROMPTS.length]; },
  locked() { return !!Store.s.journalPin && !this.unlocked; },
  hash(s) { let h = 5381; for (const c of 'yrb:' + s) h = (h * 33) ^ c.charCodeAt(0); return (h >>> 0).toString(36); },

  title: 'Journal',
  sub(p) { const d = p[0] && /^\d{4}-\d{2}-\d{2}$/.test(p[0]) ? p[0] : today(); return fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
  actions() { return this.locked() ? '' : `<button class="btn" onclick="Journal.reflect()">${I('sparkles', 16)}<span class="hide-sm">Weekly reflection</span></button>`; },

  render(p) {
    if (this.locked()) return this.lockScreen();
    const date = p[0] && /^\d{4}-\d{2}-\d{2}$/.test(p[0]) ? p[0] : today();
    const e = this.get(date) || { mood: 0, energy: 0, intention: '', top3: ['', '', ''], wins: '', lesson: '', grateful: '', text: '', promptAns: '', spaceIds: [] };
    const isToday = date === today(), future = date > today();
    const evening = new Date().getHours() >= 17 || !isToday;
    const prompt = e.prompt || this.promptFor(date);
    const ta = (k, ph, rows = 3) => `<textarea class="j-ta" data-k="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(e[k] || '')}</textarea>`;
    const morning = `<section class="j-sec">
        <h3>${I('sun', 16)}Morning</h3>
        <label class="j-l">Today I will…</label>${ta('intention', 'The one thing that makes today a win', 2)}
        <label class="j-l">Top 3</label>
        <div class="j-top3">${[0, 1, 2].map(i => `<div class="j-t3"><span>${i + 1}</span><input class="input" data-top="${i}" value="${esc(e.top3?.[i] || '')}" placeholder="${['Most important', 'Second', 'Third'][i]}"></div>`).join('')}
          <button class="btn xs ghost" onclick="Journal.top3ToTasks('${date}')">${I('plus', 12)}Add these as tasks</button></div>
      </section>`;
    const eve = `<section class="j-sec">
        <h3>${I('moon', 16)}Evening</h3>
        <label class="j-l">Wins</label>${ta('wins', 'What went right — big or small')}
        <label class="j-l">Lesson</label>${ta('lesson', 'What you’d do differently', 2)}
        <label class="j-l">Grateful for</label>${ta('grateful', 'Three things', 2)}
      </section>`;
    return `<div class="dash journal">
      <div class="glass card s8 j-page">
        <div class="j-nav">
          <a class="btn icon ghost" href="#/journal/${addDays(date, -1)}" aria-label="Previous day">${I('chevL', 18)}</a>
          <div class="j-date"><b>${isToday ? 'Today' : relDate(date)}</b><small>${fmtDay(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</small></div>
          <a class="btn icon ghost" href="#/journal/${addDays(date, 1)}" aria-label="Next day">${I('chevR', 18)}</a>
          <span class="grow"></span>
          ${!isToday ? `<a class="btn sm" href="#/journal">Today</a>` : ''}
          <input type="date" class="input sm j-pick" value="${date}" onchange="this.value&&App.go('journal/'+this.value)" aria-label="Pick a date">
          <span class="j-saved" id="jSaved">${this.hasContent(this.get(date)) ? 'Saved' : ''}</span>
        </div>
        ${future ? `<div class="banner">${I('clock', 18)}<div class="grow">This day hasn’t happened yet. You can still plan it.</div></div>` : ''}
        <div class="j-mood">
          <div><label class="j-l">Mood</label><div class="j-moods">${MOODS.map(([v, em, l]) => `<button class="${e.mood === v ? 'on' : ''}" onclick="Journal.set('${date}','mood',${e.mood === v ? 0 : v})" title="${l}" aria-pressed="${e.mood === v}"><span>${em}</span><small>${l}</small></button>`).join('')}</div></div>
          <div><label class="j-l">Energy</label><div class="j-energy">${[1, 2, 3, 4, 5].map(v => `<button class="${e.energy >= v ? 'on' : ''}" onclick="Journal.set('${date}','energy',${e.energy === v ? 0 : v})" aria-label="Energy ${v} of 5"><i></i></button>`).join('')}</div></div>
        </div>
        <div class="j-cols">${evening ? eve + morning : morning + eve}</div>
        <section class="j-sec">
          <h3>${I('info', 16)}Prompt</h3>
          <p class="j-prompt">${esc(prompt)} <button class="btn xs ghost" onclick="Journal.shuffle('${date}')" title="Different prompt">${I('refresh', 12)}</button></p>
          ${ta('promptAns', 'Answer honestly — nobody else reads this', 3)}
        </section>
        <section class="j-sec">
          <h3>${I('edit', 16)}Free write</h3>
          ${ta('text', 'Brain dump. Ideas, worries, plans — get it out of your head.', 8)}
        </section>
        <div class="j-tags"><span class="faint">About</span>${Spaces.list().filter(x => x.status !== 'Paused').map(x => `<button class="j-tag ${(e.spaceIds || []).includes(x.id) ? 'on' : ''}" style="--c:${esc(x.color)}" onclick="Journal.tagSpace('${date}','${x.id}')">${esc(x.emoji || '')} ${esc(x.name)}</button>`).join('')}</div>
      </div>

      <div class="s4 col-stack">
        <div class="glass card j-streak">
          <div class="row between"><div><b class="j-big">${this.streak()}</b><span class="faint"> day streak</span></div><span class="faint" style="font-size:12.5px">${(n => n + (n === 1 ? ' entry' : ' entries'))(this.list().filter(x => this.hasContent(x)).length)}</span></div>
          ${this.heatmap(date)}
        </div>
        <div class="glass card">
          <div class="card-h"><h2>${I('up')}Mood — last 30 days</h2></div>
          ${(() => { const vals = Array.from({ length: 30 }, (_, i) => this.get(addDays(today(), i - 29))?.mood || 0); const pts = vals.filter(Boolean); if (pts.length < 2) return `<div class="chart-empty" style="height:110px">Log your mood a few days to see the trend</div>`; let last = pts[0]; const f = vals.map(v => (last = v || last)); return Chart.area(f, { h: 110, fmt: v => (MOODS.find(m => m[0] === Math.round(v)) || [, ''])[1] }); })()}
        </div>
        <div class="glass card">
          <div class="card-h"><h2>${I('search')}Past entries</h2></div>
          <div class="search" style="margin-bottom:10px">${I('search', 15)}<input id="jSearch" placeholder="Search your journal" value="${esc(this.q)}" oninput="Journal.q=this.value;Journal.paintList()"></div>
          <div id="jList">${this.listHTML()}</div>
        </div>
        <div class="glass card">
          <div class="row between"><span class="faint" style="font-size:13px">${I('shield', 14)}</span><span class="grow faint" style="font-size:13px;margin-left:8px">${Store.s.journalPin ? 'PIN lock is on' : 'Add a PIN so nobody can open your journal on this device'}</span>
          ${Store.s.journalPin ? `<button class="btn xs" onclick="Journal.lock()">Lock now</button><button class="btn xs ghost" onclick="Journal.setPin(true)">Remove</button>` : `<button class="btn xs" onclick="Journal.setPin()">Set PIN</button>`}</div>
        </div>
      </div>
    </div>`;
  },
  heatmap(sel) {
    const start = addDays(today(), -83 - ((parseYmd(today()).getDay() + 6) % 7) + 6);
    const cells = [];
    for (let i = 0; i < 84; i++) {
      const d = addDays(start, i), e = this.get(d), w = e && this.hasContent(e) ? this.words(e) : 0;
      const lv = !w ? 0 : w < 30 ? 1 : w < 120 ? 2 : 3;
      cells.push(d > today() ? '<i class="fut"></i>' : `<a href="#/journal/${d}" class="l${lv} ${d === sel ? 'sel' : ''}" title="${fmtDay(d, { day: 'numeric', month: 'short' })}${w ? ' · ' + w + ' words' : ''}"></a>`);
    }
    return `<div class="j-heat">${cells.join('')}</div><div class="j-heat-k"><span>12 weeks</span><span>less <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i> more</span></div>`;
  },
  listHTML() {
    const q = this.q.toLowerCase().trim();
    const es = this.list().filter(e => this.hasContent(e) && (!q || JSON.stringify(e).toLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, q ? 30 : 8);
    return es.map(e => { const snip = e.wins || e.text || e.intention || e.promptAns || e.lesson || ''; return `<a class="j-item" href="#/journal/${e.date}"><span class="j-em">${(MOODS.find(m => m[0] === e.mood) || [, '·'])[1]}</span><span class="grow"><b>${relDate(e.date)}</b><small class="ellipsis">${esc(snip.slice(0, 90)) || '—'}</small></span></a>`; }).join('') || `<p class="faint" style="font-size:13px">${q ? 'Nothing matches.' : 'Your entries will show here.'}</p>`;
  },
  paintList() { const el = $('#jList'); if (el) el.innerHTML = this.listHTML(); },

  after(el, p) {
    if (this.locked()) { setTimeout(() => $('#jPin')?.focus(), 50); return; }
    const date = p[0] && /^\d{4}-\d{2}-\d{2}$/.test(p[0]) ? p[0] : today();
    const mark = t => { const s = $('#jSaved'); if (s) s.textContent = t; };
    const save = debounce(() => { const e = this.get(date); if (e) { e.updatedAt = Date.now(); Store.save(); } mark('Saved'); this.paintList(); }, 600);
    $$('.j-ta', el).forEach(t => {
      const grow = () => { t.style.height = 'auto'; t.style.height = Math.max(t.scrollHeight, 60) + 'px'; };
      grow();
      t.oninput = () => { this.ensure(date)[t.dataset.k] = t.value; grow(); mark('Saving…'); save(); };
    });
    $$('[data-top]', el).forEach(i => { i.oninput = () => { const e = this.ensure(date); e.top3 ||= ['', '', '']; e.top3[+i.dataset.top] = i.value; mark('Saving…'); save(); }; });
  },
  set(date, k, v) { const e = this.ensure(date); e[k] = v; e.updatedAt = Date.now(); App.refresh(); },
  shuffle(date) { const e = this.ensure(date); const cur = e.prompt || this.promptFor(date); const opts = J_PROMPTS.filter(x => x !== cur); e.prompt = opts[Math.floor(Math.random() * opts.length)]; App.refresh(); },
  tagSpace(date, id) { const e = this.ensure(date); e.spaceIds ||= []; e.spaceIds = e.spaceIds.includes(id) ? e.spaceIds.filter(x => x !== id) : [...e.spaceIds, id]; App.refresh(); },
  top3ToTasks(date) {
    const e = this.get(date), items = (e?.top3 || []).map(s => s.trim()).filter(Boolean);
    if (!items.length) return UI.toast('Write your top 3 first', 'warn');
    const have = new Set(Store.d.tasks.filter(t => !t.done).map(t => t.text.toLowerCase()));
    const add = items.filter(s => !have.has(s.toLowerCase()));
    add.reverse().forEach((text, i) => Store.d.tasks.unshift(normTask({ id: uid(), text, due: date < today() ? today() : date, priority: i === add.length - 1 ? 'high' : 'med' })));
    App.refresh();
    UI.toast(`${I('check', 16)} ${add.length ? add.length + ' added to tasks' : 'Already in your tasks'}`, 'success', 'tasks');
  },

  // ── Weekly reflection with Claude ───────────────────────────────────
  weekText() {
    return Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6)).map(d => { const e = this.get(d); if (!this.hasContent(e)) return `${d}: (no entry)`;
      return `${d} — mood ${e.mood || '?'}/5, energy ${e.energy || '?'}/5\nIntention: ${e.intention}\nTop 3: ${(e.top3 || []).filter(Boolean).join('; ')}\nWins: ${e.wins}\nLesson: ${e.lesson}\nGrateful: ${e.grateful}\nPrompt (${e.prompt || this.promptFor(d)}): ${e.promptAns}\nNotes: ${e.text}`; }).join('\n\n');
  },
  reflect() {
    const done = Store.d.tasks.filter(t => t.done && t.doneAt > Date.now() - 7 * 864e5).map(t => t.text).slice(0, 25);
    Claude.start({ title: 'Weekly reflection', context: `My journal for the last 7 days:\n\n${this.weekText()}\n\nTasks I completed this week: ${done.join('; ') || 'none logged'}`,
      ask: 'Read my week like a sharp mentor. 1) What patterns do you see in my mood, energy and what I actually did? 2) Where did I stay on my one focus and where did I drift? 3) The one lesson to carry into next week. 4) Three specific actions for next week. Be honest, not flattering.' });
  },

  // ── PIN lock (privacy on a shared device; data stays on this device) ─
  lockScreen() {
    return `<div class="glass card j-lock"><div class="j-lock-ic">${I('shield', 28)}</div><h2>Journal locked</h2><p class="faint">Enter your PIN</p>
      <input id="jPin" class="input" type="password" inputmode="numeric" maxlength="8" autocomplete="off" onkeydown="if(event.key==='Enter')Journal.unlock(this.value)">
      <button class="btn primary" onclick="Journal.unlock($('#jPin').value)">Unlock</button></div>`;
  },
  unlock(v) { if (this.hash(v) === Store.s.journalPin) { this.unlocked = true; App.render(); } else { UI.toast('Wrong PIN', 'error'); const i = $('#jPin'); if (i) { i.value = ''; i.focus(); } } },
  lock() { this.unlocked = false; App.render(); },
  setPin(remove) {
    if (remove) return UI.confirm('Remove PIN?', 'Anyone using this device will be able to open your journal.', 'Remove', () => { Store.s.journalPin = ''; App.refresh(); });
    UI.modal({ title: 'Set a journal PIN', small: true,
      body: `<p class="muted" style="margin-bottom:12px">Asked each time you open the journal. It hides your entries from anyone picking up your phone — it isn’t encryption, and if you forget it you can remove it by restoring a backup.</p><form class="form" id="pinForm" onsubmit="return false">${F({ name: 'a', label: 'PIN (4–8 digits)', type: 'password', full: true, inputmode: 'numeric', attrs: ' maxlength="8" autocomplete="new-password"' })}${F({ name: 'b', label: 'Repeat PIN', type: 'password', full: true, inputmode: 'numeric', attrs: ' maxlength="8" autocomplete="new-password"' })}</form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Set PIN', cls: 'primary', onClick: m => {
        const o = readForm($('#pinForm', m.el));
        if (!/^\d{4,8}$/.test(o.a)) { UI.toast('Use 4 to 8 digits', 'warn'); return false; }
        if (o.a !== o.b) { UI.toast('The PINs don’t match', 'warn'); return false; }
        Store.s.journalPin = this.hash(o.a); this.unlocked = true; App.refresh(); UI.toast(`${I('shield', 16)} Journal PIN set`, 'success');
      } }] });
  },
};
App.register('journal', Journal);
