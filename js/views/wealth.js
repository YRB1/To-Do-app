'use strict';
/* Wealth — net worth, assets & liabilities, income streams, freedom number */

const ASSET_CATS = ['Cash', 'Investments', 'Trading', 'Crypto', 'Property', 'Business equity', 'Pension', 'Other'];
const LIAB_CATS = ['Credit card', 'Loan', 'Mortgage', 'Car finance', 'Tax owed', 'Other'];

const Wealth = {
  assets() { return sum(Store.d.assets.filter(a => a.kind !== 'liability'), a => a.value); },
  liabilities() { return sum(Store.d.assets.filter(a => a.kind === 'liability'), a => a.value); },
  netWorth() { return Store.d ? this.assets() - this.liabilities() : 0; },
  snapshot() {
    const v = this.netWorth(), d = today();
    Store.d.nwHistory = Store.d.nwHistory.filter(x => x.date !== d).concat({ date: d, value: v }).sort((a, b) => a.date.localeCompare(b.date));
  },
  bizProfit() { return sum(Store.d.businesses, b => (+b.revenue || 0) - (+b.costs || 0)); },
  tradingAvg() {
    const months = [1, 2, 3].map(k => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k); return monthKey(d); });
    return sum(months, m => sum(Store.d.trades.filter(t => (t.account === 'live' || t.account === 'prop') && t.date.startsWith(m)), tNet)) / 3;
  },
  passive() { return sum(Store.d.incomes.filter(i => i.type === 'passive'), i => i.amount); },
  monthlyIncome() { return this.bizProfit() + sum(Store.d.incomes, i => i.amount) + Math.max(0, this.tradingAvg()); },

  title: 'Wealth',
  sub() { return `Net worth ${money(this.netWorth())} · Freedom number ${money(Store.s.freedomNumber, { compact: true })}`; },
  actions() { return `<button class="btn" onclick="Wealth.targets()">${I('target', 16)}<span class="hide-sm">Targets</span></button><button class="btn primary" onclick="Wealth.editAsset()">${I('plus', 16)}<span class="hide-sm">Add</span></button>`; },
  render() {
    const nw = this.netWorth(), hist = Store.d.nwHistory;
    const prev = hist.length > 1 ? hist[hist.length - 2].value : null;
    const first = hist[0]?.value;
    const ff = Store.s.freedomNumber ? nw / Store.s.freedomNumber : 0;
    const exp = +Store.s.monthlyExpenses || 0, passive = this.passive(), income = this.monthlyIncome();
    const runway = exp ? (sum(Store.d.assets.filter(a => a.kind !== 'liability' && a.cat === 'Cash'), a => a.value)) / exp : null;
    const groups = {};
    Store.d.assets.forEach(a => (groups[(a.kind === 'liability' ? 'L·' : 'A·') + a.cat] ||= []).push(a));
    const allocation = Object.entries(groups).filter(([k]) => k.startsWith('A·')).map(([k, v]) => ({ label: k.slice(2), value: sum(v, a => a.value) })).sort((a, b) => b.value - a.value);
    const row = a => `<div class="li click" onclick="Wealth.editAsset('${a.id}')"><div class="li-ic" style="${a.kind === 'liability' ? 'background:color-mix(in srgb,var(--loss) 14%,transparent);color:var(--loss-t)' : ''}">${I(a.kind === 'liability' ? 'down' : a.cat === 'Trading' ? 'candles' : a.cat === 'Crypto' ? 'coins' : a.cat === 'Property' ? 'home' : a.cat === 'Investments' ? 'up' : 'wallet', 16)}</div><div class="li-b"><div class="li-t">${esc(a.name)}</div><div class="li-s">${esc(a.cat)}</div></div><div class="li-v ${a.kind === 'liability' ? 'neg' : ''}">${a.kind === 'liability' ? '−' : ''}${money(a.value)}</div></div>`;
    return `
      <div class="glass card hero">
        <div class="hero-grid">
          <div>
            <div class="eyebrow">${I('crown', 15)} Net worth</div>
            <div class="big">${money(nw)}</div>
            <div class="row wrap">${prev != null ? `<span class="delta">${I(nw >= prev ? 'up' : 'down', 14)}${money(nw - prev, { sign: true })} since last update</span>` : ''}${first != null && hist.length > 2 ? `<span class="delta">${money(nw - first, { sign: true, compact: true })} all time</span>` : ''}</div>
            <div class="mt" style="max-width:420px"><div class="row between" style="font-size:12.5px;margin-bottom:6px;opacity:.9"><span>Freedom number ${money(Store.s.freedomNumber, { compact: true })}</span><b>${pct(ff, 1)}</b></div>${bar(ff, 'gold thick')}</div>
          </div>
          <div>${Chart.area(hist.map(h => h.value), { h: 170, fmt: v => money(v, { compact: true }) })}</div>
        </div>
      </div>
      <div class="kpis mt">
        ${kpi('Assets', money(this.assets()), { icon: 'up', tone: 'green' })}
        ${kpi('Liabilities', `<span class="neg">${money(this.liabilities())}</span>`, { icon: 'down', tone: 'red' })}
        ${kpi('Monthly income', money(income), { icon: 'coins', tone: 'gold', sub: `vs ${money(exp)} expenses` })}
        ${kpi('Freedom ratio', pct(exp ? passive / exp : 0), { icon: 'sparkles', sub: `${money(passive)}/mo passive covers ${pct(exp ? passive / exp : 0)} of costs` })}
        ${kpi('Cash runway', runway != null ? `${num(runway, 1)} mo` : '—', { icon: 'clock', tone: 'blue', sub: 'Cash ÷ monthly expenses' })}
      </div>
      <div class="dash mt">
        <div class="glass card s7">
          <div class="card-h"><h2>${I('wallet')}Assets & liabilities</h2><div class="right"><button class="btn sm" onclick="Wealth.editAsset(null,'liability')">${I('plus', 14)}Liability</button><button class="btn sm primary" onclick="Wealth.editAsset()">${I('plus', 14)}Asset</button></div></div>
          ${Store.d.assets.length ? Store.d.assets.filter(a => a.kind !== 'liability').sort((a, b) => b.value - a.value).map(row).join('') + (Store.d.assets.some(a => a.kind === 'liability') ? `<div class="lg-h" style="margin-top:14px">Liabilities</div>` + Store.d.assets.filter(a => a.kind === 'liability').map(row).join('') : '')
            : empty('wallet', 'Add what you own and owe', 'Bank, investments, trading accounts, crypto, property — and debts. Your net worth chart updates automatically.')}
        </div>
        <div class="s5" style="display:flex;flex-direction:column;gap:16px">
          <div class="glass card"><div class="card-h"><h2>${I('pie')}Allocation</h2></div>${Chart.hbars(allocation.map(a => ({ ...a, sub: pct(this.assets() ? a.value / this.assets() : 0) })), { fmt: v => money(v, { compact: true }), signed: false })}</div>
          <div class="glass card">
            <div class="card-h"><h2>${I('coins')}Income streams</h2><div class="right"><button class="btn sm" onclick="Wealth.editIncome()">${I('plus', 14)}Stream</button></div></div>
            ${Store.d.businesses.map(b => `<div class="li click" onclick="App.go('business/${b.id}')"><div class="li-ic">${esc(b.emoji || '💼')}</div><div class="li-b"><div class="li-t">${esc(b.name)}</div><div class="li-s">Business profit · active</div></div><div class="li-v ${pnlCls(b.revenue - b.costs)}">${money((+b.revenue || 0) - (+b.costs || 0))}</div></div>`).join('')}
            <div class="li click" onclick="App.go('trading')"><div class="li-ic">${I('candles', 16)}</div><div class="li-b"><div class="li-t">Trading</div><div class="li-s">3-month average · active</div></div><div class="li-v ${pnlCls(this.tradingAvg())}">${money(this.tradingAvg())}</div></div>
            ${Store.d.incomes.map(i => `<div class="li click" onclick="Wealth.editIncome('${i.id}')"><div class="li-ic" style="background:var(--gold-soft);color:var(--gold)">${I(i.type === 'passive' ? 'sparkles' : 'briefcase', 16)}</div><div class="li-b"><div class="li-t">${esc(i.name)}</div><div class="li-s">${i.type === 'passive' ? 'Passive' : 'Active'}</div></div><div class="li-v">${money(i.amount)}</div></div>`).join('')}
            <div class="row between mt" style="font-weight:800"><span>Total / month</span><span class="gold-t">${money(income)}</span></div>
          </div>
        </div>
      </div>`;
  },
  editAsset(id, kind = 'asset') {
    const ex = id ? Store.d.assets.find(a => a.id === id) : null;
    const a = ex || { id: uid(), name: '', kind, cat: kind === 'liability' ? 'Credit card' : 'Cash', value: null };
    const catOpts = k => (k === 'liability' ? LIAB_CATS : ASSET_CATS);
    UI.modal({
      title: ex ? `Update ${esc(a.name)}` : kind === 'liability' ? 'Add liability' : 'Add asset', small: true,
      body: `<form class="form" id="aForm" onsubmit="return false">
        ${F({ name: 'kind', label: 'Type', type: 'seg', value: a.kind, full: true, options: [['asset', 'Asset'], ['liability', 'Liability']] })}
        ${F({ name: 'name', label: 'Name', value: a.name, full: true, placeholder: 'e.g. Vanguard ISA' })}
        ${F({ name: 'cat', label: 'Category', type: 'select', value: a.cat, options: catOpts(a.kind) })}
        ${F({ name: 'value', label: a.kind === 'liability' ? 'Amount owed' : 'Current value', type: 'number', value: a.value })}
      </form>`,
      footer: [
        ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: () => { Store.d.assets = Store.d.assets.filter(x => x.id !== a.id); this.snapshot(); App.refresh(); } },
        'spacer', { label: 'Cancel', cls: 'ghost' },
        { label: 'Save', cls: 'primary', onClick: m => {
          const o = readForm($('#aForm', m.el));
          if (!o.name || !isNum(o.value)) { UI.toast('Add a name and value', 'warn'); return false; }
          const out = { ...a, ...o, value: Math.abs(o.value) }; delete out.sample;
          if (ex) Object.assign(ex, out); else Store.d.assets.push(out);
          this.snapshot(); App.refresh(); UI.toast(`${I('check', 16)} Net worth now ${money(this.netWorth())}`, 'success');
        } },
      ],
      onOpen: m => $$('[name=kind]', m.el).forEach(r => r.onchange = () => { if (r.checked) $('[name=cat]', m.el).innerHTML = catOpts(r.value).map(c => `<option>${c}</option>`).join(''); }),
    });
  },
  editIncome(id) {
    const ex = id ? Store.d.incomes.find(i => i.id === id) : null;
    const i = ex || { id: uid(), name: '', amount: null, type: 'passive' };
    UI.modal({
      title: ex ? 'Edit income stream' : 'New income stream', small: true,
      body: `<form class="form" id="iForm" onsubmit="return false">
        ${F({ name: 'name', label: 'Name', value: i.name, full: true, placeholder: 'e.g. Dividends, Rental, YouTube' })}
        ${F({ name: 'amount', label: 'Per month', type: 'number', value: i.amount })}
        ${F({ name: 'type', label: 'Type', type: 'select', value: i.type, options: [['passive', 'Passive'], ['active', 'Active']] })}
      </form>`,
      footer: [ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: () => { Store.d.incomes = Store.d.incomes.filter(x => x.id !== i.id); App.refresh(); } }, 'spacer', { label: 'Cancel', cls: 'ghost' },
        { label: 'Save', cls: 'primary', onClick: m => { const o = readForm($('#iForm', m.el)); if (!o.name) return false; const out = { ...i, ...o, amount: o.amount || 0 }; delete out.sample; if (ex) Object.assign(ex, out); else Store.d.incomes.push(out); App.refresh(); } }],
    });
  },
  targets() {
    UI.modal({
      title: 'Wealth targets', small: true,
      body: `<form class="form" id="wtForm" onsubmit="return false">
        ${F({ name: 'freedomNumber', label: 'Freedom number', type: 'number', value: Store.s.freedomNumber, full: true, hint: 'The net worth that would make work optional. A common rule: 25× your yearly spending.' })}
        ${F({ name: 'monthlyExpenses', label: 'Monthly expenses', type: 'number', value: Store.s.monthlyExpenses, full: true })}
      </form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Save', cls: 'primary', onClick: m => { const o = readForm($('#wtForm', m.el)); Store.s.freedomNumber = o.freedomNumber || 0; Store.s.monthlyExpenses = o.monthlyExpenses || 0; App.refresh(); } }],
    });
  },
};
App.register('wealth', Wealth);
