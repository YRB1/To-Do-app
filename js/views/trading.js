'use strict';
/* Trading journal — master-journal style: accounts & setup · analytics · journal (table + gallery) · backtesting · playbook */

const ACCOUNT_TYPES = [['live', 'Live'], ['prop', 'Prop firm'], ['demo', 'Demo'], ['backtest', 'Backtest']];
const ACCOUNTS = ACCOUNT_TYPES; // legacy name used by older code paths
const PHASES = ['Challenge', 'Verification', 'Funded'];
const GRADES = ['A+', 'A', 'B', 'C'];
const typeLabel = v => (ACCOUNT_TYPES.find(a => a[0] === v) || ['', v || '—'])[1];

const tNet = t => isNum(t.pnl) ? (+t.pnl) - (+t.fees || 0) : (isNum(t.r) && isNum(t.risk) ? t.r * t.risk : 0);
function tR(t) {
  if (isNum(t.r)) return +t.r;
  if (isNum(t.risk) && +t.risk > 0 && isNum(t.pnl)) return tNet(t) / +t.risk;
  return null;
}
const tOut = t => { const v = isNum(t.pnl) ? tNet(t) : (tR(t) ?? 0); return v > 0 ? 1 : v < 0 ? -1 : 0; };
const outLabel = t => ['Loss', 'Break-even', 'Win'][tOut(t) + 1];
function plannedRR(t) {
  const e = +t.entry, s = +t.sl, p = +t.tp;
  if (!isNum(t.entry) || !isNum(t.sl) || !isNum(t.tp) || e === s) return null;
  return Math.abs(p - e) / Math.abs(e - s);
}
function sessionFor(h) { return h < 7 ? 'Asia' : h < 12 ? 'London' : h < 21 ? 'New York' : 'Asia'; }
function durMin(t) { if (!t.exitDate || !t.date) return null; const m = (new Date(t.exitDate) - new Date(t.date)) / 60000; return isNaN(m) || m < 0 ? null : m; }
function fmtDur(m) { if (m == null) return '—'; if (m < 60) return Math.round(m) + 'm'; if (m < 1440) return Math.floor(m / 60) + 'h ' + (Math.round(m % 60) ? Math.round(m % 60) + 'm' : ''); return Math.floor(m / 1440) + 'd ' + Math.floor((m % 1440) / 60) + 'h'; }
const tMistakes = t => [...(t.mistakes || []), ...String(t.tags || '').split(',').map(s => s.trim()).filter(Boolean)];
const tAcct = t => Store.d.accounts.find(a => a.id === t.accountId);

function tStats(trades) {
  const ts = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let eq = 0, eqR = 0, peak = 0, maxDD = 0, cw = 0, cl = 0, maxW = 0, maxL = 0, wins = 0, losses = 0, be = 0, gw = 0, gl = 0, rSum = 0, rN = 0, best = null, worst = null;
  const curve = [0], curveR = [0];
  for (const t of ts) {
    const n = tNet(t), o = tOut(t), r = tR(t);
    eq += n; curve.push(eq); peak = Math.max(peak, eq); maxDD = Math.max(maxDD, peak - eq);
    if (r != null) { rSum += r; rN++; eqR += r; } curveR.push(eqR);
    if (o > 0) { wins++; gw += Math.max(n, 0); cw++; cl = 0; } else if (o < 0) { losses++; gl += Math.max(-n, 0); cl++; cw = 0; } else { be++; }
    maxW = Math.max(maxW, cw); maxL = Math.max(maxL, cl);
    if (best === null || n > best) best = n; if (worst === null || n < worst) worst = n;
  }
  const n = ts.length;
  return { n, wins, losses, be, net: eq, wr: wins + losses ? wins / (wins + losses) : null, pf: gl ? gw / gl : gw ? Infinity : null,
    avgW: wins ? gw / wins : 0, avgL: losses ? gl / losses : 0, exp: n ? eq / n : 0, avgR: rN ? rSum / rN : null, totalR: rSum,
    maxDD, maxW, maxL, curve, curveR, best, worst, rules: n ? ts.filter(t => t.rules).length / n : null };
}
const pfFmt = pf => pf == null ? '—' : pf === Infinity ? '∞' : pf.toFixed(2);
function groupStats(trades, key) {
  const m = {};
  trades.forEach(t => { const ks = typeof key === 'function' ? key(t) : t[key]; [].concat(ks || '—').forEach(k => (m[k || '—'] ||= []).push(t)); });
  return Object.entries(m).map(([label, ts]) => ({ label, ts, s: tStats(ts) }));
}
function acctStats(a) {
  const ts = Store.d.trades.filter(t => t.accountId === a.id).sort((x, y) => x.date.localeCompare(y.date));
  const size = +a.size || 0;
  let eq = size, low = size;
  ts.forEach(t => { eq += tNet(t); low = Math.min(low, eq); });
  const day = sum(ts.filter(t => t.date.startsWith(today())), tNet);
  const targetAmt = size * (+a.target || 0) / 100, ddLimit = size * (+a.maxDD || 0) / 100, dailyLimit = size * (+a.dailyDD || 0) / 100;
  const net = eq - size;
  return { ts, s: tStats(ts), net, bal: eq, day, ddNow: Math.max(0, size - eq), ddWorst: Math.max(0, size - low), targetAmt, ddLimit, dailyLimit,
    breached: (ddLimit && size - low >= ddLimit) || (dailyLimit && -day >= dailyLimit), hit: targetAmt > 0 && net >= targetAmt, defaultRisk: Math.round(eq * (+a.riskPct || 0)) / 100 };
}

// Notion-style tag picker: single or multi select, with "+ Add" that saves new options to your lists.
const Pick = {
  html(name, list, value, { multi = false, options } = {}) {
    const opts = options || (list === 'setups' ? Store.d.setups.map(s => s.name) : Store.d.tjLists[list] || []);
    const vals = multi ? (value || []) : [value].filter(Boolean);
    const all = [...new Set([...opts, ...vals])];
    return `<div class="cp" data-multi="${multi ? 1 : ''}" data-list="${list || ''}">${all.map(o => `<button type="button" class="tg pick ${vals.includes(o) ? 'on' : ''}" style="--tc:${tagColor(o)}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}${list ? `<button type="button" class="tg add">${I('plus', 12)}Add</button>` : ''}<input type="hidden" name="${name}" value="${esc(multi ? JSON.stringify(vals) : vals[0] || '')}"></div>`;
  },
  sync(cp) {
    const vals = $$('.tg.pick.on', cp).map(x => x.dataset.v);
    const h = $('input[type=hidden]', cp);
    h.value = cp.dataset.multi ? JSON.stringify(vals) : vals[0] || '';
    h.dispatchEvent(new Event('input', { bubbles: true }));
  },
  addOption(list, v) {
    if (list === 'setups') { if (!Store.d.setups.some(s => s.name === v)) Store.d.setups.push({ id: uid(), name: v, rules: '', notes: '' }); }
    else { const L = Store.d.tjLists[list] ||= []; if (!L.includes(v)) L.push(v); }
    Store.save();
  },
  bind(root, onChange) {
    root.addEventListener('click', e => {
      const b = e.target.closest('.tg.pick');
      if (b) {
        const cp = b.closest('.cp');
        if (!cp.dataset.multi) $$('.tg.pick', cp).forEach(x => { if (x !== b) x.classList.remove('on'); });
        b.classList.toggle('on'); this.sync(cp); onChange && onChange(cp);
        return;
      }
      const a = e.target.closest('.tg.add');
      if (!a) return;
      const cp = a.closest('.cp');
      const inp = document.createElement('input');
      inp.className = 'cp-in'; inp.placeholder = 'New option…'; inp.setAttribute('autocapitalize', cp.dataset.list === 'pairs' ? 'characters' : 'sentences');
      a.replaceWith(inp); inp.focus();
      let done = false;
      const finish = commit => {
        if (done) return; done = true;
        let v = inp.value.trim();
        if (cp.dataset.list === 'pairs') v = v.toUpperCase().replace(/\s+/g, '');
        if (commit && v) {
          this.addOption(cp.dataset.list, v);
          let nb = $$('.tg.pick', cp).find(x => x.dataset.v === v);
          if (!nb) { nb = document.createElement('button'); nb.type = 'button'; nb.className = 'tg pick'; nb.style.setProperty('--tc', tagColor(v)); nb.dataset.v = v; nb.textContent = v; inp.before(nb); }
          if (!cp.dataset.multi) $$('.tg.pick', cp).forEach(x => x.classList.remove('on'));
          nb.classList.add('on');
        }
        inp.replaceWith(a); this.sync(cp); onChange && onChange(cp);
      };
      inp.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); finish(true); } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); } };
      inp.onblur = () => finish(true);
    });
  },
};
const prop = (icon, label, ctl, cls = '') => `<div class="prop ${cls}"><label>${I(icon, 15)}<span>${label}</span></label><div class="ctl">${ctl}</div></div>`;

const Trading = {
  acct: 'real', acctId: '', range: '90', setup: '', curveMode: 'money', pnlM: null,
  jq: '', jacct: '', jpair: '', jsetup: '', jout: '', jbt: '',
  filtered() {
    const now = new Date(); let from = '';
    if (this.range === 'ytd') from = `${now.getFullYear()}-01-01`;
    else if (this.range !== 'all') from = addDays(today(), -(+this.range));
    return Store.d.trades.filter(t =>
      (this.acctId ? t.accountId === this.acctId : (this.acct === 'all' || (this.acct === 'real' ? (t.account === 'live' || t.account === 'prop') : t.account === this.acct))) &&
      (!from || t.account === 'backtest' || t.date.slice(0, 10) >= from) && (!this.setup || t.setup === this.setup));
  },

  title: 'Trading Journal',
  sub() { const s = tStats(Store.d.trades.filter(t => t.account !== 'backtest' && t.date.startsWith(monthKey()))); return `This month: <b class="${pnlCls(s.net)}">${money(s.net, { sign: true })}</b> · ${s.n} trade${s.n === 1 ? '' : 's'}`; },
  actions() {
    return `<button class="btn hide-sm" onclick="Trading.importCSV()">${I('upload', 16)}Import</button>
      <button class="btn primary" onclick="Trading.edit()">${I('plus', 16)}<span class="hide-sm">Log trade</span></button>`;
  },
  render(p) {
    const tab = p[0] || 'overview';
    const tabs = [['overview', 'Overview', 'pie'], ['journal', 'Journal', 'book'], ['accounts', 'Accounts & setup', 'wallet'], ['backtest', 'Backtesting', 'rewind'], ['playbook', 'Playbook', 'shield']];
    const nav = `<div class="subnav glass">${tabs.map(([id, l, ic]) => `<a href="#/trading${id === 'overview' ? '' : '/' + id}" class="${tab === id ? 'active' : ''}">${I(ic, 16)}${l}</a>`).join('')}</div>`;
    const setupNudge = !Store.d.accounts.length && tab !== 'accounts' ? `<div class="banner">${I('wallet', 18)}<div class="grow"><b>Start here:</b> add your trading accounts (live, prop firm, demo) so balances and drawdown update automatically from every trade.</div><a class="btn sm gold" href="#/trading/accounts">Set up accounts</a></div>` : '';
    const views = { overview: () => this.overview(), journal: () => this.journal(), accounts: () => this.accounts(), backtest: () => this.backtests(), playbook: () => this.playbook() };
    return nav + setupNudge + (views[tab] || views.overview)();
  },
  after(el) { Img.hydrate(el); },

  // ── Overview ────────────────────────────────────────────────────────
  overview() {
    const ts = this.filtered(), s = tStats(ts);
    const setups = [...new Set(Store.d.trades.map(t => t.setup).filter(Boolean))];
    const filters = `<div class="toolbar" style="margin-top:0">
      <div class="pills">${[['real', 'Live + Prop'], ['live', 'Live'], ['prop', 'Prop'], ['demo', 'Demo'], ['backtest', 'Backtest'], ['all', 'All']].map(([v, l]) => `<button class="pill ${!this.acctId && this.acct === v ? 'active' : ''}" onclick="Trading.acct='${v}';Trading.acctId='';App.render()">${l}</button>`).join('')}</div>
      <div class="right">
        ${Store.d.accounts.length ? `<select class="input sm" style="width:auto" onchange="Trading.acctId=this.value;App.render()"><option value="">Any account</option>${Store.d.accounts.map(a => `<option value="${a.id}"${this.acctId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>` : ''}
        ${setups.length ? `<select class="input sm" style="width:auto" onchange="Trading.setup=this.value;App.render()"><option value="">All strategies</option>${setups.map(x => `<option${this.setup === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>` : ''}
        <div class="pills">${[['30', '30D'], ['90', '90D'], ['ytd', 'YTD'], ['all', 'All']].map(([v, l]) => `<button class="pill ${this.range === v ? 'active' : ''}" onclick="Trading.range='${v}';App.render()">${l}</button>`).join('')}</div>
      </div></div>`;
    if (!ts.length) return filters + `<div class="glass card">${empty('candles', 'No trades in this view', 'Log a trade, import a CSV from your broker or FX Replay, or change the filters.', `<div class="row" style="justify-content:center"><button class="btn primary" onclick="Trading.edit()">${I('plus', 16)}Log trade</button><button class="btn" onclick="Trading.importCSV()">${I('upload', 16)}Import CSV</button></div>`)}</div>`;

    const byWd = [1, 2, 3, 4, 5].map(d => ({ label: new Date(2024, 0, d).toLocaleDateString(LOCALE, { weekday: 'short' }), value: sum(ts.filter(t => parseYmd(t.date).getDay() === d), tNet) }));
    const grp = (k, lim = 6) => groupStats(ts, k).sort((a, b) => b.s.net - a.s.net).slice(0, lim).map(g => ({ label: g.label, sub: `${g.s.n} · ${pct(g.s.wr)}`, value: g.s.net }));
    const follow = tStats(ts.filter(t => t.rules)), broke = tStats(ts.filter(t => !t.rules));
    const emo = groupStats(ts, 'emotion').filter(g => g.label !== '—').sort((a, b) => b.s.net - a.s.net);
    const mist = groupStats(ts.filter(t => tMistakes(t).length), tMistakes).sort((a, b) => a.s.net - b.s.net).slice(0, 5).map(g => ({ label: g.label, sub: `${g.s.n}×`, value: g.s.net }));
    const useR = this.curveMode === 'r';
    return filters + `
      <div class="kpis">
        ${kpi('Net P&L', `<span class="${pnlCls(s.net)}">${money(s.net, { sign: true })}</span>`, { icon: 'coins', tone: s.net >= 0 ? 'green' : 'red', sub: `${s.n} trades · ${rFmt(s.totalR)}` })}
        <div class="kpi glass"><div class="row between"><div><div class="k-top"><div class="k-ic">${I('target', 17)}</div><div class="label">Win rate</div></div><div class="value">${pct(s.wr)}</div><div class="sub">${s.wins}W · ${s.losses}L · ${s.be}BE</div></div>${ring(s.wr || 0, 58, 7, (s.wr || 0) >= .5 ? 'green' : 'red')}</div></div>
        ${kpi('Profit factor', pfFmt(s.pf), { icon: 'up', tone: 'gold', sub: `Avg win ${money(s.avgW)} · loss ${money(s.avgL)}` })}
        ${kpi('Expectancy', `<span class="${pnlCls(s.exp)}">${money(s.exp, { sign: true })}</span>`, { icon: 'zap', sub: `Avg ${rFmt(s.avgR)} per trade` })}
        ${kpi('Max drawdown', `<span class="neg">${money(-s.maxDD)}</span>`, { icon: 'down', tone: 'red', sub: `Worst streak ${s.maxL}L · best ${s.maxW}W` })}
      </div>
      <div class="dash mt">
        <div class="glass card s8">
          <div class="card-h"><h2>${I('up')}Equity curve</h2><div class="right"><div class="seg btns"><button class="${!useR ? 'on' : ''}" onclick="Trading.curveMode='money';App.render()">${esc(Store.s.currency)}</button><button class="${useR ? 'on' : ''}" onclick="Trading.curveMode='r';App.render()">R</button></div></div></div>
          ${Chart.area(useR ? s.curveR : s.curve, { h: 240, cls: s.net >= 0 ? 'green' : 'red', zero: true, fmt: v => useR ? rFmt(v) : money(v, { compact: true }) })}
        </div>
        <div class="glass card s4">
          <div class="card-h"><h2>${I('shield')}Discipline</h2></div>
          <div class="row" style="gap:16px">${ring(s.rules || 0, 84, 9, (s.rules || 0) >= .8 ? 'green' : 'gold', pct(s.rules))}<div><b style="font-size:15px">Rules followed</b><p class="faint" style="font-size:12.5px">The edge only works if you execute it.</p></div></div>
          <div class="stat-row mt"><div><small>Followed</small><b class="${pnlCls(follow.net)}">${money(follow.net, { compact: true, sign: true })}</b></div><div><small>Broken</small><b class="${pnlCls(broke.net)}">${money(broke.net, { compact: true, sign: true })}</b></div><div><small>Win rate</small><b>${pct(follow.wr)} / ${pct(broke.wr)}</b></div></div>
          ${emo.length ? `<p class="faint mt" style="font-size:12.5px">Best state: <b class="pos">${esc(emo[0].label)}</b>${emo.length > 1 ? ` · Costliest: <b class="neg">${esc(emo[emo.length - 1].label)}</b>` : ''}</p>` : ''}
        </div>
        <div class="glass card s6">${this.pnlCalendar(ts)}</div>
        <div class="glass card s6"><div class="card-h"><h2>${I('calendar')}By weekday</h2></div>${Chart.bars(byWd, { h: 210, signed: true, fmt: v => money(v) })}</div>
        <div class="glass card s4"><div class="card-h"><h2>${I('shield')}By strategy</h2></div>${Chart.hbars(grp('setup'), { fmt: v => money(v, { compact: true, sign: true }) })}</div>
        <div class="glass card s4"><div class="card-h"><h2>${I('globe')}By pair</h2></div>${Chart.hbars(grp('symbol'), { fmt: v => money(v, { compact: true, sign: true }) })}</div>
        <div class="glass card s4"><div class="card-h"><h2>${I('clock')}By session</h2></div>${Chart.hbars(grp('session'), { fmt: v => money(v, { compact: true, sign: true }) })}</div>
        <div class="glass card s4"><div class="card-h"><h2>${I('compass')}By bias</h2></div>${Chart.hbars(grp('bias'), { fmt: v => money(v, { compact: true, sign: true }) })}</div>
        <div class="glass card s4"><div class="card-h"><h2>${I('layers')}By trade type</h2></div>${Chart.hbars(grp('tradeType'), { fmt: v => money(v, { compact: true, sign: true }) })}</div>
        <div class="glass card s4"><div class="card-h"><h2>${I('flag')}Costliest mistakes</h2></div>${Chart.hbars(mist, { fmt: v => money(v, { compact: true, sign: true }) })}</div>
        <div class="glass card s12"><div class="card-h"><h2>${I('book')}Recent trades</h2><div class="right"><a class="btn sm ghost" href="#/trading/journal">Open journal ${I('arrowR', 14)}</a></div></div>${this.table([...ts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8))}</div>
      </div>`;
  },
  pnlCalendar(ts) {
    const last = ts.length ? [...ts].sort((a, b) => b.date.localeCompare(a.date))[0].date.slice(0, 7) : monthKey();
    const mk = this.pnlM || last;
    const [y, m] = mk.split('-').map(Number);
    const ws = Store.s.weekStart ?? 1;
    const first = new Date(y, m - 1, 1), off = (first.getDay() - ws + 7) % 7, dim = new Date(y, m, 0).getDate();
    const byDay = {}; ts.forEach(t => { (byDay[t.date.slice(0, 10)] ||= []).push(t); });
    const dows = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + ws + i).toLocaleDateString(LOCALE, { weekday: 'narrow' }));
    let cells = '', mNet = 0, days = 0, green = 0;
    for (let i = 0; i < off; i++) cells += '<div></div>';
    for (let d = 1; d <= dim; d++) {
      const ds = `${y}-${pad(m)}-${pad(d)}`, list = byDay[ds] || [], n = sum(list, tNet);
      if (list.length) { mNet += n; days++; if (n > 0) green++; }
      cells += `<div class="cal-cell ${list.length ? (n > 0 ? 'win' : n < 0 ? 'loss' : '') : ''}" style="min-height:58px;cursor:${list.length ? 'pointer' : 'default'}" ${list.length ? `onclick="Trading.jq='${ds}';App.go('trading/journal')"` : ''}><div class="cal-n" style="font-size:11px;width:20px;height:20px">${d}</div>${list.length ? `<div class="cal-pnl ${pnlCls(n)}">${money(n, { compact: true, sign: true })}</div>` : ''}</div>`;
    }
    const shift = k => monthKey(new Date(y, m - 1 + k, 1));
    return `<div class="card-h"><h2>${I('calendar')}${first.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })}</h2>
      <div class="right"><b class="${pnlCls(mNet)}" style="font-size:13px">${money(mNet, { sign: true })}</b><button class="btn xs icon" onclick="Trading.pnlM='${shift(-1)}';App.render()">${I('chevL', 14)}</button><button class="btn xs icon" onclick="Trading.pnlM='${shift(1)}';App.render()">${I('chevR', 14)}</button></div></div>
      <div class="cal mini">${dows.map(d => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
      <p class="faint mt-s" style="font-size:12px">${days} trading day${days === 1 ? '' : 's'} · ${green} green</p>`;
  },

  // ── Journal (Notion-style database) ─────────────────────────────────
  table(list) {
    if (!list.length) return `<p class="faint" style="font-size:13px;padding:8px">No trades match.</p>`;
    return `<div class="table-wrap nt-wrap"><table class="table nt"><thead><tr><th>Date</th><th>Pair</th><th>Direction</th><th>Account</th><th>Strategy</th><th>Session</th><th>Bias</th><th>Type</th><th>Result</th><th style="text-align:right">R</th><th style="text-align:right">P&L</th><th></th></tr></thead><tbody>
      ${list.map(t => { const n = tNet(t), r = tR(t), a = tAcct(t); return `<tr class="click" onclick="Trading.view('${t.id}')">
        <td class="muted">${fmtDay(t.date, { day: 'numeric', month: 'short' })} <span class="faint">${t.date.slice(11, 16)}</span></td>
        <td><b>${esc(t.symbol)}</b></td>
        <td>${tag(t.side === 'long' ? 'Long' : 'Short')}</td>
        <td class="muted">${esc(a ? a.name : typeLabel(t.account))}</td>
        <td>${tag(t.setup)}</td><td>${tag(t.session)}</td><td>${tag(t.bias)}</td><td>${tag(t.tradeType)}</td>
        <td>${tag(outLabel(t))}</td>
        <td class="${pnlCls(r)}" style="text-align:right;font-weight:700">${rFmt(r)}</td>
        <td class="${pnlCls(n)}" style="text-align:right;font-weight:750">${isNum(t.pnl) ? money(n, { sign: true }) : '—'}</td>
        <td class="faint">${t.images?.length ? I('image', 14) : ''}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  },
  gallery(list) {
    if (!list.length) return `<p class="faint" style="font-size:13px;padding:8px">No trades match.</p>`;
    return `<div class="gallery">${list.map(t => { const n = tNet(t), r = tR(t), a = tAcct(t); return `<div class="gcard" onclick="Trading.view('${t.id}')">
      <div class="gthumb" ${t.images?.length ? `data-img="${t.images[0]}"` : ''}>${t.images?.length ? '' : `<span class="gph">${esc(t.symbol)}</span>`}<span class="res">${tag(outLabel(t))}</span></div>
      <div class="gbody">
        <div class="row between"><b style="font-size:15px">${esc(t.symbol)} ${tag(t.side === 'long' ? 'Long' : 'Short')}</b><b class="${pnlCls(n)}">${isNum(t.pnl) ? money(n, { sign: true }) : rFmt(r)}</b></div>
        <div class="faint" style="font-size:12px">${fmtDay(t.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${t.date.slice(11, 16)} · ${esc(a ? a.name : typeLabel(t.account))}</div>
        <div class="row wrap" style="gap:5px">${tag(t.setup)}${tag(t.session)}${tag(t.bias)}${tag(t.tradeType)}</div>
      </div></div>`; }).join('')}</div>`;
  },
  journal() {
    const q = this.jq.toLowerCase();
    const list = Store.d.trades.filter(t => (!this.jacct || t.accountId === this.jacct) && (!this.jbt || t.backtestId === this.jbt) && (!this.jpair || t.symbol === this.jpair) && (!this.jsetup || t.setup === this.jsetup) &&
      (!this.jout || (this.jout === 'win' ? tOut(t) > 0 : this.jout === 'loss' ? tOut(t) < 0 : tOut(t) === 0)) &&
      (!q || [t.symbol, t.setup, t.date, t.notes, t.emotion, t.session, t.bias, t.tradeType, ...(t.confluences || []), ...tMistakes(t)].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date));
    const s = tStats(list);
    const bt = this.jbt && Store.d.backtests.find(b => b.id === this.jbt);
    const view = Store.s.tjView || 'table';
    const pairs = [...new Set(Store.d.trades.map(t => t.symbol))].sort(), setups = [...new Set(Store.d.trades.map(t => t.setup).filter(Boolean))];
    const sel = (key, label, opts) => `<select class="input sm" style="width:auto" onchange="Trading.${key}=this.value;App.render()"><option value="">${label}</option>${opts.map(([v, l]) => `<option value="${esc(v)}"${this[key] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    return `
      <div class="toolbar" style="margin-top:0">
        <div class="search" style="min-width:190px">${I('search', 15)}<input placeholder="Search trades…" value="${esc(this.jq)}" onchange="Trading.jq=this.value;App.render()"></div>
        ${sel('jacct', 'All accounts', Store.d.accounts.map(a => [a.id, a.name]))}
        ${sel('jpair', 'All pairs', pairs.map(p => [p, p]))}
        ${sel('jsetup', 'All strategies', setups.map(p => [p, p]))}
        ${sel('jout', 'All results', [['win', 'Wins'], ['loss', 'Losses'], ['be', 'Break-even']])}
        ${bt ? `<button class="pill active" onclick="Trading.jbt='';App.render()">${esc(bt.name)} ${I('x', 13)}</button>` : ''}
        <div class="right">
          <div class="seg btns"><button class="${view === 'table' ? 'on' : ''}" title="Table" onclick="Store.s.tjView='table';Store.save();App.render()">${I('list', 16)}</button><button class="${view === 'gallery' ? 'on' : ''}" title="Gallery" onclick="Store.s.tjView='gallery';Store.save();App.render()">${I('grid', 16)}</button></div>
          <button class="btn sm" onclick="Trading.exportCSV()">${I('download', 15)}<span class="hide-sm">Export</span></button>
        </div>
      </div>
      <div class="kpis" style="margin-bottom:16px">
        ${kpi('Trades', s.n, { icon: 'book' })}
        ${kpi('Net', `<span class="${pnlCls(s.net)}">${money(s.net, { sign: true })}</span>`, { icon: 'coins', tone: 'gold' })}
        ${kpi('Win rate', pct(s.wr), { icon: 'target', tone: 'green', sub: `${s.wins}W · ${s.losses}L · ${s.be}BE` })}
        ${kpi('Total R', `<span class="${pnlCls(s.totalR)}">${rFmt(s.totalR)}</span>`, { icon: 'zap', tone: 'blue', sub: `PF ${pfFmt(s.pf)}` })}
      </div>
      ${list.length ? (view === 'gallery' ? this.gallery(list) : `<div class="glass card" style="padding:10px 12px">${this.table(list)}</div>`)
        : `<div class="glass card">${empty('book', 'No trades yet', 'Every trade you log makes your edge clearer.', `<button class="btn primary" onclick="Trading.edit()">${I('plus', 16)}Log trade</button>`)}</div>`}`;
  },

  // ── Accounts & setup ────────────────────────────────────────────────
  accounts() {
    const as = Store.d.accounts;
    const real = as.filter(a => a.type === 'live' || a.type === 'prop');
    const cap = sum(real, a => acctStats(a).bal);
    const funded = as.filter(a => a.type === 'prop' && a.phase === 'Funded' && a.status !== 'Failed').length;
    const L = Store.d.tjLists;
    const lists = [['pairs', 'Pairs', 'globe'], ['sessions', 'Sessions', 'clock'], ['biases', 'Bias', 'compass'], ['types', 'Trade types', 'layers'], ['timeframes', 'Timeframes', 'calendar'], ['confluences', 'Confluences', 'check'], ['mistakes', 'Mistakes', 'flag'], ['emotions', 'Emotions', 'sparkles'], ['firms', 'Prop firms / brokers', 'briefcase']];
    return `
      <div class="kpis">
        ${kpi('Trading capital', money(cap), { icon: 'coins', tone: 'gold', sub: `${real.length} live & prop account${real.length === 1 ? '' : 's'}` })}
        ${kpi('Funded accounts', funded, { icon: 'crown', tone: 'green' })}
        ${kpi('Accounts', as.length, { icon: 'wallet', sub: `${as.filter(a => a.status === 'Active').length} active` })}
        ${kpi('Strategies', Store.d.setups.length, { icon: 'shield', tone: 'blue', sub: '<a href="#/trading/playbook">Edit playbook</a>' })}
      </div>
      <div class="row between mt" style="margin-bottom:12px"><div class="section-title" style="margin:0">Your accounts</div><button class="btn primary" onclick="Trading.editAccount()">${I('plus', 16)}New account</button></div>
      ${as.length ? `<div class="grid auto">${as.map(a => this.acctCard(a)).join('')}</div>` : `<div class="glass card">${empty('wallet', 'Add your first account', 'Live broker, prop firm challenge, demo or backtest. Set the size and rules once — balance, profit target and drawdown then update from every trade.', `<button class="btn primary" onclick="Trading.editAccount()">${I('plus', 16)}New account</button>`)}</div>`}
      <div class="glass card mt">
        <div class="card-h"><h2>${I('settings')}Journal options</h2><span class="sub">These are the tags you pick from when logging a trade</span></div>
        <div class="grid g2">${lists.map(([k, l, ic]) => `<div class="optlist"><div class="ol-h">${I(ic, 14)}${l}<span class="faint">${(L[k] || []).length}</span></div>
          <div class="row wrap" style="gap:6px">${(L[k] || []).map((v, i) => `<span class="tg" style="--tc:${tagColor(v)}">${esc(v)}<button class="tg-x" onclick="Trading.rmOption('${k}',${i})" aria-label="Remove">${I('x', 11, 3)}</button></span>`).join('')}
          <input class="cp-in" placeholder="+ Add" onkeydown="if(event.key==='Enter'){event.preventDefault();Trading.addOption('${k}',this.value)}" onblur="if(this.value.trim())Trading.addOption('${k}',this.value)"></div></div>`).join('')}</div>
        <div class="row mt"><button class="btn sm ghost" onclick="UI.confirm('Reset journal options?','Your pick-lists go back to the defaults. Existing trades are not changed.','Reset',()=>{Store.d.tjLists=JSON.parse(JSON.stringify(TJ_DEFAULTS));App.refresh();},false)">${I('reset', 14)}Reset to defaults</button></div>
      </div>`;
  },
  addOption(k, v) { v = String(v || '').trim(); if (k === 'pairs') v = v.toUpperCase().replace(/\s+/g, ''); if (!v) return; const L = Store.d.tjLists[k] ||= []; if (!L.includes(v)) L.push(v); App.refresh(); setTimeout(() => { const ins = $$('.optlist .cp-in'); const idx = Object.keys(Store.d.tjLists).indexOf(k); ins.find(x => x.getAttribute('onkeydown').includes(`'${k}'`))?.focus(); }, 30); },
  rmOption(k, i) { Store.d.tjLists[k].splice(i, 1); App.refresh(); },
  acctCard(a) {
    const st = acctStats(a), s = st.s;
    const prop_ = a.type === 'prop';
    const status = st.breached ? tag('Breached') : st.hit && a.phase !== 'Funded' ? `<span class="tg" style="--tc:#10b981">Target hit 🎯</span>` : tag(a.status || 'Active');
    return `<div class="glass card goal-card">
      <div class="row between" style="align-items:flex-start"><div class="grow"><div class="row wrap" style="gap:5px;margin-bottom:6px">${tag(typeLabel(a.type))}${a.phase && prop_ ? tag(a.phase) : ''}${status}</div>
        <div class="goal-title">${esc(a.name)}</div><div class="goal-why">${esc(a.firm || '')}${a.firm ? ' · ' : ''}${money(a.size)} account · risk ${num(a.riskPct, 2)}%</div></div>
        <button class="btn sm icon ghost" onclick="Trading.editAccount('${a.id}')" title="Edit">${I('edit', 15)}</button></div>
      <div><div class="faint" style="font-size:12px;font-weight:650">Balance</div><div style="font-size:26px;font-weight:850;letter-spacing:-.03em" class="tnum">${money(st.bal)}</div><div class="${pnlCls(st.net)}" style="font-size:13px;font-weight:700">${money(st.net, { sign: true })} (${pct(a.size ? st.net / a.size : 0, 2)})</div></div>
      ${s.n > 1 ? Chart.area(s.curve.map(v => v + (+a.size || 0)), { h: 70, cls: st.net >= 0 ? 'green' : 'red', fmt: v => money(v, { compact: true }) }) : ''}
      ${st.targetAmt ? `<div><div class="row between" style="font-size:12px;margin-bottom:5px"><span class="muted">Profit target ${num(a.target)}% (${money(st.targetAmt, { compact: true })})</span><b>${pct(clamp(st.net / st.targetAmt, 0, 1))}</b></div>${bar(st.net / st.targetAmt, 'green')}</div>` : ''}
      ${st.ddLimit ? `<div><div class="row between" style="font-size:12px;margin-bottom:5px"><span class="muted">Max drawdown ${num(a.maxDD)}% · ${money(st.ddLimit - st.ddWorst, { compact: true })} left</span><b class="${st.ddWorst / st.ddLimit > .7 ? 'neg' : ''}">${pct(st.ddWorst / st.ddLimit)}</b></div>${bar(st.ddWorst / st.ddLimit, 'red')}</div>` : ''}
      ${st.dailyLimit ? `<div><div class="row between" style="font-size:12px;margin-bottom:5px"><span class="muted">Daily loss limit ${num(a.dailyDD)}% · today ${money(st.day, { sign: true })}</span><b>${pct(Math.max(0, -st.day) / st.dailyLimit)}</b></div>${bar(Math.max(0, -st.day) / st.dailyLimit, 'red')}</div>` : ''}
      <div class="stat-row"><div><small>Trades</small><b>${s.n}</b></div><div><small>Win rate</small><b>${pct(s.wr)}</b></div><div><small>Next risk</small><b>${money(st.defaultRisk)}</b></div></div>
      <div class="card-foot"><button class="btn sm primary" onclick="Trading.edit(null,{accountId:'${a.id}'})">${I('plus', 14)}Log trade</button><span class="grow"></span><button class="btn sm ghost" onclick="Trading.jacct='${a.id}';App.go('trading/journal')">Trades ${I('arrowR', 14)}</button></div>
    </div>`;
  },
  editAccount(id, onSaved) {
    const ex = id ? Store.d.accounts.find(a => a.id === id) : null;
    const a = ex || { id: uid(), name: '', type: 'prop', firm: '', phase: 'Challenge', size: 100000, riskPct: 1, target: 10, maxDD: 10, dailyDD: 5, status: 'Active', start: today(), notes: '' };
    UI.modal({
      title: ex ? 'Edit account' : 'New trading account',
      body: `<form class="form" id="acForm" onsubmit="return false">
        ${F({ name: 'name', label: 'Account name', value: a.name, full: true, placeholder: 'e.g. FTMO 100k Challenge, Live – IC Markets' })}
        ${F({ name: 'type', label: 'Account type', type: 'seg', value: a.type, full: true, options: ACCOUNT_TYPES })}
        ${F({ name: 'firm', label: 'Prop firm / broker', value: a.firm, list: 'firmList', placeholder: 'FTMO, FundedNext, IC Markets…' })}
        ${F({ name: 'phase', label: 'Phase (prop)', type: 'select', value: a.phase, options: [['', '—'], ...PHASES.map(p => [p, p])] })}
        ${F({ name: 'size', label: `Account size / starting balance (${Store.s.currency})`, type: 'number', value: a.size })}
        ${F({ name: 'riskPct', label: 'Risk per trade %', type: 'number', value: a.riskPct, hint: 'Pre-fills the risk on every trade for this account.' })}
        ${F({ name: 'target', label: 'Profit target %', type: 'number', value: a.target, hint: '0 = none (e.g. live accounts)' })}
        ${F({ name: 'maxDD', label: 'Max drawdown %', type: 'number', value: a.maxDD })}
        ${F({ name: 'dailyDD', label: 'Daily loss limit %', type: 'number', value: a.dailyDD })}
        ${F({ name: 'status', label: 'Status', type: 'select', value: a.status, options: ['Active', 'Passed', 'Failed', 'Paused', 'Closed'] })}
        ${F({ name: 'start', label: 'Start date', type: 'date', value: a.start })}
        ${F({ name: 'notes', label: 'Notes / rules', type: 'textarea', value: a.notes, full: true, rows: 3, placeholder: 'e.g. No trading 2 minutes around news, min 4 trading days' })}
      </form>${datalist('firmList', Store.d.tjLists.firms || [])}`,
      footer: [
        ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: m => { UI.confirm('Delete account?', `“${esc(a.name)}” is removed. Its trades stay in the journal, unassigned.`, 'Delete', () => { Store.d.accounts = Store.d.accounts.filter(x => x.id !== a.id); Store.d.trades.forEach(t => { if (t.accountId === a.id) t.accountId = ''; }); m.close(); App.refresh(); }); return false; } },
        'spacer', { label: 'Cancel', cls: 'ghost' },
        { label: ex ? 'Save' : 'Create account', cls: 'primary', onClick: m => {
          const o = readForm($('#acForm', m.el));
          if (!o.name) { UI.toast('Name the account', 'warn'); return false; }
          if (!isNum(o.size)) { UI.toast('Add the account size', 'warn'); return false; }
          const out = { ...a, ...o, riskPct: o.riskPct || 0, target: o.target || 0, maxDD: o.maxDD || 0, dailyDD: o.dailyDD || 0 };
          delete out.sample;
          if (ex) { Object.assign(ex, out); Store.d.trades.forEach(t => { if (t.accountId === ex.id) t.account = ex.type; }); }
          else Store.d.accounts.push(out);
          if (o.firm && !(Store.d.tjLists.firms || []).includes(o.firm)) (Store.d.tjLists.firms ||= []).push(o.firm);
          Store.save();
          if (onSaved) onSaved(ex || out); else App.render();
          UI.toast(`${I('check', 16)} Account saved`, 'success');
        } },
      ],
    });
  },

  // ── Backtesting (FX Replay) ─────────────────────────────────────────
  backtests() {
    const bts = Store.d.backtests;
    const fx = safeUrl(Store.s.fxReplayUrl) || 'https://app.fxreplay.com';
    const setups = [...new Set(Store.d.trades.map(t => t.setup).filter(Boolean))];
    const cmp = setups.map(name => ({ name, bt: tStats(Store.d.trades.filter(t => t.setup === name && t.account === 'backtest')), lv: tStats(Store.d.trades.filter(t => t.setup === name && (t.account === 'live' || t.account === 'prop'))) })).filter(x => x.bt.n || x.lv.n);
    return `
      <div class="glass card"><div class="fx-hero">
        <div class="fx-ic">${I('rewind', 28)}</div>
        <div class="grow" style="min-width:220px"><h2 style="font-size:18px;font-weight:800">Backtest on FX Replay</h2>
          <p class="muted" style="font-size:13.5px">Replay the market candle by candle in FX Replay, then log each trade here (or import FX Replay's CSV export) so backtest stats sit next to your live results.</p></div>
        <div class="row wrap"><a class="btn gold" href="${esc(fx)}" target="_blank" rel="noopener">${I('external', 16)}Open FX Replay</a><button class="btn primary" onclick="Trading.editBT()">${I('plus', 16)}New session</button></div>
      </div></div>
      ${bts.length ? `<div class="grid auto mt">${bts.map(b => this.btCard(b)).join('')}</div>` : `<div class="glass card mt">${empty('rewind', 'No backtest sessions yet', 'Create a session for each strategy test — pair, timeframe and date range — then log trades into it.')}</div>`}
      ${cmp.length ? `<div class="glass card mt"><div class="card-h"><h2>${I('shield')}Backtest vs live — is your edge holding?</h2></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Strategy</th><th>BT trades</th><th>BT win rate</th><th>BT avg R</th><th>Live trades</th><th>Live win rate</th><th>Live avg R</th><th>Edge</th></tr></thead><tbody>
        ${cmp.map(({ name, bt, lv }) => { const d = (lv.avgR ?? 0) - (bt.avgR ?? 0); const st = !lv.n || !bt.n ? chip('Need data', '') : d >= -0.1 ? chip('Holding', 'green') : d >= -0.4 ? chip('Slipping', 'amber') : chip('Decaying', 'red');
          return `<tr><td><b>${esc(name)}</b></td><td>${bt.n}</td><td>${pct(bt.wr)}</td><td class="${pnlCls(bt.avgR)}">${rFmt(bt.avgR)}</td><td>${lv.n}</td><td>${pct(lv.wr)}</td><td class="${pnlCls(lv.avgR)}">${rFmt(lv.avgR)}</td><td>${st}</td></tr>`; }).join('')}
        </tbody></table></div></div>` : ''}`;
  },
  btCard(b) {
    const s = tStats(Store.d.trades.filter(t => t.backtestId === b.id));
    const url = safeUrl(b.url) || safeUrl(Store.s.fxReplayUrl) || 'https://app.fxreplay.com';
    return `<div class="glass card goal-card">
      <div><div class="row wrap" style="gap:5px;margin-bottom:6px">${tag(b.status || 'Active')}${tag(b.symbol)}${tag(b.timeframe)}</div>
        <div class="goal-title">${esc(b.name)}</div><div class="goal-why">${esc(b.setup || '')}${b.from ? ` · ${fmtDay(b.from, { month: 'short', year: 'numeric' })} → ${b.to ? fmtDay(b.to, { month: 'short', year: 'numeric' }) : 'now'}` : ''}</div></div>
      ${Chart.area(s.curveR, { h: 90, cls: s.totalR >= 0 ? 'green' : 'red', zero: true, fmt: v => rFmt(v) })}
      <div class="stat-row"><div><small>Trades</small><b>${s.n}</b></div><div><small>Win rate</small><b>${pct(s.wr)}</b></div><div><small>Total R</small><b class="${pnlCls(s.totalR)}">${rFmt(s.totalR)}</b></div></div>
      <div class="stat-row"><div><small>Profit factor</small><b>${pfFmt(s.pf)}</b></div><div><small>Avg R</small><b>${rFmt(s.avgR)}</b></div><div><small>Max DD</small><b class="neg">${money(-s.maxDD, { compact: true })}</b></div></div>
      <div class="card-foot">
        <a class="btn sm gold" href="${esc(url)}" target="_blank" rel="noopener" title="Resume in FX Replay">${I('play', 13)}Resume</a>
        <button class="btn sm" onclick="Trading.edit(null,{account:'backtest',backtestId:'${b.id}',setup:${esc(JSON.stringify(b.setup || ''))},symbol:${esc(JSON.stringify(b.symbol || ''))},timeframe:${esc(JSON.stringify(b.timeframe || ''))}})">${I('plus', 14)}Trade</button>
        <span class="grow"></span>
        <button class="btn sm icon" title="Import CSV into this session" onclick="Trading.importCSV('${b.id}')">${I('upload', 15)}</button>
        <button class="btn sm icon" title="View trades" onclick="Trading.jbt='${b.id}';App.go('trading/journal')">${I('list', 15)}</button>
        <button class="btn sm icon" title="Edit" onclick="Trading.editBT('${b.id}')">${I('edit', 15)}</button>
      </div></div>`;
  },
  editBT(id) {
    const ex = id ? Store.d.backtests.find(b => b.id === id) : null;
    const b = ex || { id: uid(), name: '', setup: '', symbol: '', timeframe: '15m', from: '', to: '', url: '', balance: 10000, riskPct: 1, status: 'Active', notes: '', createdAt: Date.now() };
    UI.modal({
      title: ex ? 'Edit backtest session' : 'New backtest session',
      body: `<form class="form" id="btForm" onsubmit="return false">
        ${F({ name: 'name', label: 'Session name', value: b.name, full: true, placeholder: 'e.g. London Breakout — EURUSD 2024' })}
        <div class="field full"><span>Strategy</span>${Pick.html('setup', 'setups', b.setup)}</div>
        <div class="field full"><span>Pair</span>${Pick.html('symbol', 'pairs', b.symbol)}</div>
        <div class="field full"><span>Timeframe</span>${Pick.html('timeframe', 'timeframes', b.timeframe)}</div>
        ${F({ name: 'status', label: 'Status', type: 'select', value: b.status, options: ['Active', 'Complete', 'Paused'] })}
        ${F({ name: 'balance', label: 'Starting balance', type: 'number', value: b.balance })}
        ${F({ name: 'from', label: 'Data from', type: 'date', value: b.from })}
        ${F({ name: 'to', label: 'Data to', type: 'date', value: b.to })}
        ${F({ name: 'url', label: 'FX Replay session link', type: 'url', value: b.url, full: true, placeholder: 'Paste the URL of this session in FX Replay', hint: 'Open your session in FX Replay, copy the address bar link, paste it here — “Resume” jumps straight back in.' })}
        ${F({ name: 'notes', label: 'Notes / hypothesis', type: 'textarea', value: b.notes, full: true })}
      </form>`,
      footer: [
        ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: m => { UI.confirm('Delete session?', 'The session is removed. Its trades stay in your journal as backtest trades.', 'Delete', () => { Store.d.backtests = Store.d.backtests.filter(x => x.id !== b.id); Store.d.trades.forEach(t => { if (t.backtestId === b.id) t.backtestId = ''; }); m.close(); App.refresh(); }); return false; } },
        'spacer', { label: 'Cancel', cls: 'ghost' },
        { label: 'Save', cls: 'primary', onClick: m => {
          const o = readForm($('#btForm', m.el));
          if (!o.name) { UI.toast('Name the session', 'warn'); return false; }
          const out = { ...b, ...o }; delete out.sample;
          if (ex) Object.assign(ex, out); else Store.d.backtests.unshift(out);
          App.refresh();
        } },
      ],
      onOpen: m => Pick.bind(m.el),
    });
  },

  // ── Playbook ────────────────────────────────────────────────────────
  playbook() {
    const sts = Store.d.setups;
    return `<div class="row between" style="margin-bottom:16px;flex-wrap:wrap"><p class="muted" style="font-size:13.5px;max-width:620px">Your playbook is the set of strategies you’re allowed to trade. Write the rules, then let the stats tell you which ones actually pay. Strategies appear as options when you log a trade.</p><button class="btn primary" onclick="Trading.editSetup()">${I('plus', 16)}New strategy</button></div>
      ${sts.length ? `<div class="grid auto">${sts.map(s => {
        const lv = tStats(Store.d.trades.filter(t => t.setup === s.name && t.account !== 'backtest'));
        const bt = tStats(Store.d.trades.filter(t => t.setup === s.name && t.account === 'backtest'));
        return `<div class="glass card goal-card">
          <div class="row between"><div class="goal-title">${esc(s.name)}</div><button class="btn sm icon ghost" onclick="Trading.editSetup('${s.id}')">${I('edit', 15)}</button></div>
          <div>${s.rules.split('\n').filter(Boolean).map(r => `<div class="ms"><i style="border-color:var(--accent);color:var(--accent)">${I('check', 12, 3)}</i>${esc(r)}</div>`).join('') || '<p class="faint">No rules written yet.</p>'}</div>
          <div class="stat-row"><div><small>Live trades</small><b>${lv.n}</b></div><div><small>Live WR</small><b>${pct(lv.wr)}</b></div><div><small>Live net</small><b class="${pnlCls(lv.net)}">${money(lv.net, { compact: true, sign: true })}</b></div></div>
          <div class="stat-row"><div><small>BT trades</small><b>${bt.n}</b></div><div><small>BT WR</small><b>${pct(bt.wr)}</b></div><div><small>BT avg R</small><b class="${pnlCls(bt.avgR)}">${rFmt(bt.avgR)}</b></div></div>
          <div class="card-foot"><button class="btn sm" onclick="Trading.edit(null,{setup:${esc(JSON.stringify(s.name))}})">${I('plus', 14)}Log trade</button><span class="grow"></span><button class="btn sm ghost" onclick="Trading.acct='all';Trading.acctId='';Trading.range='all';Trading.setup=${esc(JSON.stringify(s.name))};App.go('trading')">Stats ${I('arrowR', 14)}</button></div>
        </div>`; }).join('')}</div>` : `<div class="glass card">${empty('shield', 'Build your playbook', 'Add each strategy you trade with its entry rules. Trades tagged with a strategy roll up into its stats.')}</div>`}`;
  },
  editSetup(id) {
    const ex = id ? Store.d.setups.find(s => s.id === id) : null;
    const s = ex || { id: uid(), name: '', rules: '', notes: '' };
    UI.modal({
      title: ex ? 'Edit strategy' : 'New strategy',
      body: `<form class="form" id="sForm" onsubmit="return false">
        ${F({ name: 'name', label: 'Strategy name', value: s.name, full: true, placeholder: 'e.g. London Breakout' })}
        ${F({ name: 'rules', label: 'Entry checklist (one rule per line)', type: 'textarea', rows: 6, value: s.rules, full: true })}
        ${F({ name: 'notes', label: 'Notes', type: 'textarea', value: s.notes, full: true })}
      </form>`,
      footer: [
        ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: () => { Store.d.setups = Store.d.setups.filter(x => x.id !== s.id); App.refresh(); } },
        'spacer', { label: 'Cancel', cls: 'ghost' },
        { label: 'Save', cls: 'primary', onClick: m => {
          const o = readForm($('#sForm', m.el)); if (!o.name) return false;
          if (ex && ex.name !== o.name) Store.d.trades.forEach(t => { if (t.setup === ex.name) t.setup = o.name; });
          const out = { ...s, ...o }; delete out.sample;
          if (ex) Object.assign(ex, out); else Store.d.setups.push(out);
          App.refresh();
        } },
      ],
    });
  },

  // ── Trade page (view) ───────────────────────────────────────────────
  view(id) {
    const t = Store.d.trades.find(x => x.id === id); if (!t) return;
    const n = tNet(t), r = tR(t), rr = plannedRR(t), bt = Store.d.backtests.find(b => b.id === t.backtestId), a = tAcct(t);
    const setup = Store.d.setups.find(s => s.name === t.setup);
    const links = [[safeUrl(t.chartUrl), 'Open chart', 'external'], [safeUrl(t.replayUrl), 'Open in FX Replay', 'rewind']].filter(l => l[0]);
    const tags = arr => arr.length ? arr.map(x => tag(x)).join(' ') : '<span class="faint">—</span>';
    UI.modal({
      title: `${esc(t.symbol)} ${tag(t.side === 'long' ? 'Long' : 'Short')} ${tag(outLabel(t))}`, wide: true,
      body: `
        <div class="result-strip">
          <div><small>Net P&L</small><b class="${pnlCls(n)}">${isNum(t.pnl) ? money(n, { sign: true }) : '—'}</b></div>
          <div><small>R multiple</small><b class="${pnlCls(r)}">${rFmt(r)}</b></div>
          <div><small>Planned R:R</small><b>${rr ? '1 : ' + rr.toFixed(2) : '—'}</b></div>
          <div><small>Duration</small><b>${fmtDur(durMin(t))}</b></div>
        </div>
        <div class="props mt">
          ${prop('wallet', 'Account', a ? `<b>${esc(a.name)}</b> ${tag(typeLabel(a.type))}` : tag(typeLabel(t.account)))}
          ${prop('shield', 'Strategy', tag(t.setup) || '<span class="faint">—</span>')}
          ${prop('clock', 'Start', esc(fmtDay(t.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + t.date.slice(11, 16)))}
          ${prop('clock', 'End', t.exitDate ? esc(fmtDay(t.exitDate, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + t.exitDate.slice(11, 16)) : '<span class="faint">—</span>')}
          ${prop('globe', 'Session', tag(t.session) || '—')}
          ${prop('compass', 'Bias', tag(t.bias) || '<span class="faint">—</span>')}
          ${prop('layers', 'Trade type', tag(t.tradeType) || '<span class="faint">—</span>')}
          ${prop('calendar', 'Timeframe', tag(t.timeframe) || '<span class="faint">—</span>')}
          ${prop('check', 'Confluences', tags(t.confluences || []))}
          ${prop('target', 'Entry / SL / TP / Exit', `<span class="tnum">${num(t.entry, 5)} / ${num(t.sl, 5)} / ${num(t.tp, 5)} / ${num(t.exit, 5)}</span>`)}
          ${prop('coins', 'Size · Risk · Fees', `<span class="tnum">${num(t.size)} lots · ${money(t.risk)} · ${money(t.fees || 0)}</span>`)}
          ${prop('sparkles', 'Emotion · Grade', `${tag(t.emotion) || '—'} ${tag(t.grade)}`)}
          ${prop('shield', 'Followed rules', t.rules ? tag('Yes') : `<span class="tg" style="--tc:#f43f5e">No</span>`)}
          ${prop('flag', 'Mistakes', tags(tMistakes(t)))}
          ${bt ? prop('rewind', 'Backtest session', esc(bt.name)) : ''}
        </div>
        ${setup?.rules ? `<details class="guide"><summary>${I('shield', 15)}${esc(setup.name)} checklist</summary><ul>${setup.rules.split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
        ${t.notes ? `<div class="mt"><div class="section-title" style="margin:0 0 6px">Notes</div><p style="white-space:pre-wrap">${esc(t.notes)}</p></div>` : ''}
        ${t.lesson ? `<div class="banner mt">${I('sparkles', 18)}<div><b>Lesson:</b> ${esc(t.lesson)}</div></div>` : ''}
        ${links.length ? `<div class="row wrap mt">${links.map(([u, l, ic]) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${I(ic, 16)}${l}</a>`).join('')}</div>` : ''}
        ${t.images?.length ? `<div class="mt" style="display:flex;flex-direction:column;gap:12px">${t.images.map(i => `<img class="shot" data-img="${i}" alt="Trade screenshot">`).join('')}</div>` : ''}`,
      footer: [{ label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: m => { this.del(t.id, () => m.close()); return false; } }, 'spacer', { label: 'Duplicate', icon: 'layers', onClick: () => { this.edit(null, { ...t, id: undefined, images: [], date: undefined, exitDate: undefined }); } }, { label: 'Edit', cls: 'primary', icon: 'edit', onClick: () => { this.edit(t.id); } }],
      onOpen: m => Img.hydrate(m.el),
    });
  },
  del(id, after) {
    const t = Store.d.trades.find(x => x.id === id); if (!t) return;
    UI.confirm('Delete trade?', `${esc(t.symbol)} on ${fmtDay(t.date, { day: 'numeric', month: 'short' })} will be removed with its screenshots.`, 'Delete', () => {
      (t.images || []).forEach(i => Img.del(i));
      Store.d.trades = Store.d.trades.filter(x => x.id !== id); App.refresh(); after && after();
    });
  },

  // ── Trade page (edit) ───────────────────────────────────────────────
  edit(id, preset = {}) {
    const ex = id ? Store.d.trades.find(x => x.id === id) : null;
    const now = new Date(), nowStr = `${ymd(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const clean = Object.fromEntries(Object.entries(preset).filter(([, v]) => v !== undefined));
    const accts = Store.d.accounts;
    let acct = clean.accountId ? accts.find(a => a.id === clean.accountId)
      : clean.account ? accts.find(a => a.type === clean.account && a.status !== 'Closed')
      : accts.find(a => a.id === Store.s.lastAcct) || accts.find(a => a.type !== 'backtest' && a.status === 'Active') || accts[0];
    const t = ex ? { ...ex, images: [...(ex.images || [])], confluences: [...(ex.confluences || [])], mistakes: tMistakes(ex) } : {
      date: nowStr, exitDate: '', symbol: Store.s.lastPair || '', side: 'long', backtestId: '', setup: Store.s.lastSetup || '', session: sessionFor(now.getHours()),
      bias: '', tradeType: '', timeframe: '', confluences: [], entry: null, exit: null, sl: null, tp: null, size: null, risk: null, pnl: null, fees: null, r: null,
      emotion: 'Calm', grade: 'A', rules: true, mistakes: [], tags: '', notes: '', lesson: '', chartUrl: '', replayUrl: '', images: [], ...clean, id: uid(),
    };
    if (!ex) { t.images = []; t.accountId = acct?.id || ''; t.account = acct?.type || clean.account || 'live'; if (!isNum(t.risk) && acct) t.risk = acctStats(acct).defaultRisk || null; }
    let riskAuto = !ex && isNum(t.risk);
    const imgs = t.images;
    const acctOpts = `<select class="input" name="accountId"><option value="">— No account —</option>${ACCOUNT_TYPES.map(([ty, lbl]) => { const g = accts.filter(a => a.type === ty); return g.length ? `<optgroup label="${lbl}">${g.map(a => `<option value="${a.id}"${t.accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</optgroup>` : ''; }).join('')}</select>`;
    const thumbs = () => imgs.map((i, k) => `<div class="thumb" data-img="${i}"><button type="button" data-rmimg="${k}" aria-label="Remove">${I('x', 12, 3)}</button></div>`).join('');
    const nIn = (name, ph) => `<input class="input" type="number" step="any" inputmode="decimal" name="${name}" value="${esc(t[name] ?? '')}" placeholder="${ph || ''}">`;
    const body = `<form id="trForm" onsubmit="return false">
      <div class="result-strip" id="trCalc"></div>
      <div class="section-title">Trade details</div>
      <div class="props">
        ${prop('wallet', 'Account', `<div class="row" style="gap:6px">${acctOpts}<button type="button" class="btn icon" id="trNewAcct" title="New account">${I('plus', 16)}</button></div><small class="faint" id="trAcctHint"></small>`)}
        ${prop('shield', 'Strategy', Pick.html('setup', 'setups', t.setup))}
        ${prop('globe', 'Pair', Pick.html('symbol', 'pairs', t.symbol))}
        ${prop('up', 'Direction', `<div class="seg">${[['long', 'Long'], ['short', 'Short']].map(([v, l]) => `<label><input type="radio" name="side" value="${v}"${t.side === v ? ' checked' : ''}><span>${I(v === 'long' ? 'up' : 'down', 14)}${l}</span></label>`).join('')}</div>`)}
        ${prop('clock', 'Start of trade', `<input class="input" type="datetime-local" name="date" value="${esc(t.date)}">`)}
        ${prop('clock', 'End of trade', `<input class="input" type="datetime-local" name="exitDate" value="${esc(t.exitDate || '')}">`)}
        ${prop('globe', 'Session', Pick.html('session', 'sessions', t.session))}
        ${prop('compass', 'Bias', Pick.html('bias', 'biases', t.bias))}
        ${prop('layers', 'Trade type', Pick.html('tradeType', 'types', t.tradeType))}
        ${prop('calendar', 'Timeframe', Pick.html('timeframe', 'timeframes', t.timeframe))}
        ${prop('check', 'Confluences', Pick.html('confluences', 'confluences', t.confluences, { multi: true }))}
        ${prop('rewind', 'Backtest session', `<select class="input" name="backtestId"><option value="">— None —</option>${Store.d.backtests.map(b => `<option value="${b.id}"${t.backtestId === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select>`)}
      </div>
      <div class="section-title">Execution</div>
      <div class="form three">
        <div class="field"><span>Entry</span>${nIn('entry')}</div><div class="field"><span>Stop loss</span>${nIn('sl')}</div><div class="field"><span>Take profit</span>${nIn('tp')}</div>
        <div class="field"><span>Exit</span>${nIn('exit')}</div><div class="field"><span>Lots</span>${nIn('size')}</div><div class="field"><span>Risk (${esc(Store.s.currency)})</span>${nIn('risk')}</div>
        <div class="field"><span>P&L (${esc(Store.s.currency)})</span>${nIn('pnl', 'Loss = negative')}</div><div class="field"><span>Fees</span>${nIn('fees')}</div><div class="field"><span>Result in R</span>${nIn('r', 'optional')}</div>
      </div>
      <div class="section-title">Psychology</div>
      <div class="props">
        ${prop('sparkles', 'Emotion', Pick.html('emotion', 'emotions', t.emotion))}
        ${prop('star', 'Execution grade', `<div class="seg">${GRADES.map(g => `<label><input type="radio" name="grade" value="${g}"${t.grade === g ? ' checked' : ''}><span>${g}</span></label>`).join('')}</div>`)}
        ${prop('shield', 'Followed my rules', `<label class="switch-row" style="padding:0"><input type="checkbox" name="rules"${t.rules ? ' checked' : ''}><span class="sw"></span></label>`)}
        ${prop('flag', 'Mistakes', Pick.html('mistakes', 'mistakes', t.mistakes, { multi: true }))}
      </div>
      <div class="section-title">Screenshots & links</div>
      <div class="thumbs" id="trThumbs">${thumbs()}</div>
      <div class="row wrap mt-s"><button type="button" class="btn" id="trAddImg">${I('image', 16)}Add screenshots</button><span class="faint" style="font-size:12px">or paste an image (Ctrl/⌘+V) anywhere in this form</span></div>
      <div class="form mt">
        ${F({ name: 'chartUrl', label: 'Chart link (TradingView etc.)', type: 'url', value: t.chartUrl, placeholder: 'https://www.tradingview.com/x/…' })}
        ${F({ name: 'replayUrl', label: 'FX Replay link', type: 'url', value: t.replayUrl, placeholder: 'https://app.fxreplay.com/…' })}
      </div>
      <div class="section-title">Review</div>
      <div class="form">
        ${F({ name: 'notes', label: 'Notes', type: 'textarea', value: t.notes, full: true, rows: 3, placeholder: 'Why you took it, what you saw, how you managed it' })}
        ${F({ name: 'lesson', label: 'Lesson', value: t.lesson, full: true, placeholder: 'One sentence you’d tell yourself next time' })}
      </div>
    </form>`;
    let added = [];
    UI.modal({
      title: ex ? 'Edit trade' : 'Log trade', body, wide: true,
      footer: [
        ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: mm => { this.del(ex.id, () => mm.close()); return false; } },
        'spacer', { label: 'Cancel', cls: 'ghost', onClick: () => { added.forEach(i => Img.del(i)); } },
        { label: ex ? 'Save trade' : 'Log trade', cls: 'primary', onClick: mm => {
          const o = readForm($('#trForm', mm.el));
          o.confluences = JSON.parse(o.confluences || '[]'); o.mistakes = JSON.parse(o.mistakes || '[]');
          if (!o.symbol) { UI.toast('Pick the pair', 'warn'); return false; }
          if (!o.date) o.date = t.date;
          o.symbol = o.symbol.toUpperCase().replace(/\s+/g, '');
          if (!isNum(o.pnl) && isNum(o.r) && isNum(o.risk)) o.pnl = +(o.r * o.risk).toFixed(2);
          const a = Store.d.accounts.find(x => x.id === o.accountId);
          o.account = a ? a.type : (o.backtestId ? 'backtest' : (ex?.account || 'live'));
          const out = { ...t, ...o, tags: '', images: imgs };
          delete out.sample;
          if (ex) { (ex.images || []).filter(i => !imgs.includes(i)).forEach(i => Img.del(i)); Object.assign(ex, out); } else Store.d.trades.push(out);
          Object.assign(Store.s, { lastAcct: o.accountId, lastSetup: o.setup, lastPair: o.symbol });
          added = [];
          App.refresh();
          const n = tNet(out);
          UI.toast(`${I('check', 16)} Trade ${ex ? 'saved' : 'logged'} · <b class="${pnlCls(n)}">${isNum(out.pnl) ? money(n, { sign: true }) : rFmt(tR(out))}</b>${a ? ` · ${esc(a.name)} ${money(acctStats(a).bal)}` : ''}`, 'success');
        } },
      ],
      onOpen: mm => {
        const form = $('#trForm', mm.el), calc = $('#trCalc', mm.el), th = $('#trThumbs', mm.el);
        const acctSel = $('[name=accountId]', mm.el), riskIn = $('[name=risk]', mm.el), hint = $('#trAcctHint', mm.el);
        const upd = () => {
          const o = readForm(form), rr = plannedRR(o);
          const net = isNum(o.pnl) ? o.pnl - (o.fees || 0) : (isNum(o.r) && isNum(o.risk) ? o.r * o.risk : null);
          const r = isNum(o.r) ? o.r : (isNum(o.risk) && o.risk > 0 && net != null ? net / o.risk : null);
          const out = net == null ? null : net > 0 ? 'Win' : net < 0 ? 'Loss' : 'Break-even';
          const a = Store.d.accounts.find(x => x.id === o.accountId);
          let bal = null;
          if (a) { const st = acctStats(a); bal = st.bal - (ex && ex.accountId === a.id ? tNet(ex) : 0) + (net || 0); }
          calc.innerHTML = `<div><small>Result</small><b>${out ? tag(out) : '—'}</b></div><div><small>R</small><b class="${pnlCls(r)}">${rFmt(r)}</b></div><div><small>Net</small><b class="${pnlCls(net)}">${net != null ? money(net, { sign: true }) : '—'}</b></div><div><small>Planned R:R</small><b>${rr ? '1 : ' + rr.toFixed(2) : '—'}</b></div><div><small>Duration</small><b>${fmtDur(durMin(o))}</b></div>${a ? `<div><small>${esc(a.name)} after</small><b>${money(bal)}</b></div>` : ''}`;
          hint.textContent = a ? `${typeLabel(a.type)}${a.firm ? ' · ' + a.firm : ''} · balance ${money(acctStats(a).bal)} · risk ${num(a.riskPct, 2)}% = ${money(acctStats(a).defaultRisk)}` : 'Pick an account so its balance updates automatically';
        };
        Pick.bind(form, cp => {
          if (cp.dataset.list === 'setups') { const sname = $('input[type=hidden]', cp).value; const bt = Store.d.backtests.find(b => b.id === $('[name=backtestId]', mm.el).value); if (bt && !bt.setup) bt.setup = sname; }
          upd();
        });
        acctSel.onchange = () => { const a = Store.d.accounts.find(x => x.id === acctSel.value); if (a && (riskAuto || riskIn.value === '')) { riskIn.value = acctStats(a).defaultRisk || ''; riskAuto = true; } upd(); };
        riskIn.addEventListener('input', () => { riskAuto = false; });
        $('[name=backtestId]', mm.el).onchange = e => { if (e.target.value) { const bta = Store.d.accounts.find(a => a.type === 'backtest'); if (bta) { acctSel.value = bta.id; acctSel.onchange(); } } };
        $('#trNewAcct', mm.el).onclick = () => this.editAccount(null, a => {
          acctSel.insertAdjacentHTML('beforeend', `<option value="${a.id}">${esc(a.name)}</option>`);
          acctSel.value = a.id; acctSel.onchange();
        });
        form.addEventListener('input', upd); upd();
        const addFiles = async files => {
          for (const f of files) if (f.type.startsWith('image/')) { const iid = await Img.add(f); imgs.push(iid); added.push(iid); }
          th.innerHTML = thumbs(); Img.hydrate(th);
        };
        $('#trAddImg', mm.el).onclick = () => pickFile('image/*', fs => addFiles(fs), true);
        th.onclick = e => { const b = e.target.closest('[data-rmimg]'); if (!b) return; const [rid] = imgs.splice(+b.dataset.rmimg, 1); if (added.includes(rid)) Img.del(rid); th.innerHTML = thumbs(); Img.hydrate(th); };
        mm.el.addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/')); if (fs.length) { e.preventDefault(); addFiles(fs); } });
        Img.hydrate(th);
      },
    });
  },

  // ── CSV import / export ─────────────────────────────────────────────
  exportCSV() {
    const cols = ['date', 'exitDate', 'symbol', 'side', 'account', 'accountName', 'setup', 'session', 'bias', 'tradeType', 'timeframe', 'confluences', 'entry', 'sl', 'tp', 'exit', 'size', 'risk', 'pnl', 'fees', 'r', 'result', 'emotion', 'grade', 'rules', 'mistakes', 'notes', 'lesson', 'chartUrl', 'replayUrl'];
    const val = (t, c) => c === 'r' ? (tR(t) ?? '') : c === 'accountName' ? (tAcct(t)?.name || '') : c === 'result' ? outLabel(t) : c === 'confluences' ? (t.confluences || []).join('; ') : c === 'mistakes' ? tMistakes(t).join('; ') : t[c];
    const rows = [cols.join(','), ...[...Store.d.trades].sort((a, b) => a.date.localeCompare(b.date)).map(t => cols.map(c => csvCell(val(t, c))).join(','))];
    downloadFile(`trades-${today()}.csv`, rows.join('\n'), 'text/csv');
  },
  importCSV(btId = '') {
    pickFile('.csv,text/csv,.txt', async f => {
      const rows = parseCSV(await f.text());
      if (rows.length < 2) return UI.toast('No rows found in that file', 'error');
      const head = rows[0].map(h => h.trim().toLowerCase().replace(/[“”"]/g, ''));
      const MAP = {
        date: ['open time', 'opentime', 'entry time', 'entry date', 'open date', 'date opened', 'opened', 'date', 'time', 'open'],
        exitDate: ['close time', 'exit time', 'closed', 'close date', 'exitdate'],
        symbol: ['symbol', 'pair', 'instrument', 'market', 'asset', 'ticker', 'item'],
        side: ['side', 'direction', 'type', 'action', 'buy/sell', 'position', 'trade type'],
        entry: ['entry price', 'open price', 'entry', 'price open', 'avg entry', 'entry_price', 'open_price', 'price'],
        exit: ['exit price', 'close price', 'exit', 'price close', 'close_price', 'exit_price', 'avg exit'],
        sl: ['sl', 'stop loss', 's/l', 'stoploss', 'stop'],
        tp: ['tp', 'take profit', 't/p', 'takeprofit', 'target'],
        size: ['size', 'lots', 'volume', 'lot size', 'quantity', 'qty', 'amount', 'units'],
        pnl: ['pnl', 'p&l', 'net profit', 'profit', 'realized pnl', 'realised pnl', 'profit/loss', 'net p&l', 'p/l', 'result', 'gross p&l', 'net pnl'],
        fees: ['commission', 'commissions', 'fees', 'fee'],
        r: ['r multiple', 'r-multiple', 'r', 'rr', 'result r', 'r:r'],
        setup: ['setup', 'strategy', 'playbook'],
        notes: ['notes', 'comment', 'comments', 'note'],
      };
      const col = {}, used = new Set();
      for (const pass of ['exact', 'partial']) for (const [k, names] of Object.entries(MAP)) {
        if (col[k] != null) continue;
        for (const nm of names) {
          const i = head.findIndex((h, j) => !used.has(j) && (pass === 'exact' ? h === nm : h.includes(nm) && nm.length > 2));
          if (i >= 0) { col[k] = i; used.add(i); break; }
        }
      }
      if (col.symbol == null || (col.pnl == null && col.r == null && col.exit == null)) return UI.toast('Couldn’t find pair and P&L columns in that CSV', 'error');
      const numv = v => { if (v == null) return null; let s = String(v).trim(); const neg = /^\(.*\)$/.test(s); s = s.replace(/[^0-9.\-eE]/g, ''); if (s === '' || isNaN(s)) return null; return neg ? -Math.abs(+s) : +s; };
      const dt = v => {
        v = String(v || '').trim(); if (!v) return '';
        let m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})[ T]?(\d{1,2})?:?(\d{2})?/);
        if (m) { const a = +m[1], b = +m[2]; const [dd, mm] = a > 12 ? [a, b] : b > 12 ? [b, a] : LOCALE.startsWith('en-US') ? [b, a] : [a, b]; return `${m[3]}-${pad(mm)}-${pad(dd)}T${pad(+(m[4] || 0))}:${pad(+(m[5] || 0))}`; }
        m = v.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})[ T]?(\d{1,2})?:?(\d{2})?/);
        if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}T${pad(+(m[4] || 0))}:${pad(+(m[5] || 0))}`;
        const d = new Date(v); return isNaN(d) ? '' : `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      const parsed = rows.slice(1).map(r => {
        const g = k => col[k] != null ? r[col[k]] : '';
        const date = dt(g('date')) || `${today()}T00:00`;
        return {
          id: uid(), date, exitDate: dt(g('exitDate')), symbol: String(g('symbol')).toUpperCase().replace(/[^A-Z0-9.!/_-]/g, ''), side: /sell|short/i.test(g('side')) ? 'short' : 'long',
          account: 'live', accountId: '', backtestId: btId, setup: String(g('setup') || ''), session: sessionFor(+date.slice(11, 13)), bias: '', tradeType: '', timeframe: '', confluences: [],
          entry: numv(g('entry')), exit: numv(g('exit')), sl: numv(g('sl')), tp: numv(g('tp')), size: numv(g('size')), risk: null, pnl: numv(g('pnl')),
          fees: col.fees != null ? Math.abs(numv(g('fees')) || 0) : null, r: numv(g('r')),
          emotion: '', grade: '', rules: true, mistakes: [], tags: '', notes: String(g('notes') || ''), lesson: '', chartUrl: '', replayUrl: '', images: [],
        };
      }).filter(t => t.symbol);
      const found = Object.keys(col).map(k => `<span class="chip green">${k} → “${esc(rows[0][col[k]])}”</span>`).join(' ');
      const defAcct = btId ? Store.d.accounts.find(a => a.type === 'backtest') : Store.d.accounts.find(a => a.id === Store.s.lastAcct);
      UI.modal({
        title: 'Import trades', body: `<p class="muted">Found <b>${parsed.length}</b> trades in <b>${esc(f.name)}</b>.</p>
          <div class="row wrap mt-s" style="gap:6px">${found}</div>
          <form class="form mt" id="impForm" onsubmit="return false">
            ${F({ name: 'accountId', label: 'Into account', type: 'select', value: defAcct?.id || '', options: [['', '— No account (live) —'], ...Store.d.accounts.map(a => [a.id, `${a.name} (${typeLabel(a.type)})`])] })}
            ${F({ name: 'backtestId', label: 'Backtest session', type: 'select', value: btId, options: [['', '— None —'], ...Store.d.backtests.map(b => [b.id, b.name])] })}
            ${F({ name: 'risk', label: 'Risk per trade (for R)', type: 'number', value: Store.s.defaultRisk || '', hint: 'Optional — lets the app compute R multiples' })}
            ${F({ name: 'setup', label: 'Strategy (if not in file)', list: 'impSetups', value: btId ? (Store.d.backtests.find(b => b.id === btId)?.setup || '') : '' })}
          </form>${datalist('impSetups', Store.d.setups.map(s => s.name))}`,
        footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: `Import ${parsed.length}`, cls: 'primary', onClick: m => {
          const o = readForm($('#impForm', m.el));
          const a = Store.d.accounts.find(x => x.id === o.accountId);
          parsed.forEach(t => { t.accountId = o.accountId; t.account = a ? a.type : (o.backtestId ? 'backtest' : 'live'); t.backtestId = o.backtestId; if (isNum(o.risk)) t.risk = o.risk; if (!t.setup && o.setup) t.setup = o.setup; });
          Store.d.trades.push(...parsed); App.refresh();
          UI.toast(`${I('check', 16)} Imported ${parsed.length} trades`, 'success');
        } }],
      });
    });
  },
};
App.register('trading', Trading);
