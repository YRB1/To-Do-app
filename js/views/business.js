'use strict';
/* Businesses — portfolio overview + per-business command page */

const BIZ_STATUS = { Idea: 'blue', Testing: 'blue', Building: 'amber', Launched: 'accent', Scaling: 'green', Paused: '' };
const BIZ_COLORS = ['#7c5cff', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#ef4444', '#14b8a6', '#a855f7'];

const Business = {
  // Logo: an uploaded image wins; otherwise the website's own icon; otherwise the emoji.
  logoSrc(b) {
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.logo || '') || /^icons\/biz\/[\w.-]+$/.test(b.logo || '')) return b.logo;
    const u = safeUrl(b.url); if (!u) return '';
    try { return 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(new URL(u).hostname); } catch { return ''; }
  },
  av(b, cls = '') {
    const src = this.logoSrc(b);
    const emoji = esc(b.emoji || (b.name || '•')[0]);
    return `<div class="biz-av ${cls}${src ? ' has-logo' : ''}" style="--c:${esc(b.color)}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('has-logo');this.replaceWith(document.createTextNode('${emoji}'))">` : emoji}</div>`;
  },
  uploadLogo(cb) {
    pickFile('image/*', f => {
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => {
        const S = 256, k = Math.min(S / img.naturalWidth, S / img.naturalHeight);
        const c = document.createElement('canvas'); c.width = c.height = S;
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        c.getContext('2d').drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        URL.revokeObjectURL(url); cb(c.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); UI.toast('Couldn’t read that image', 'error'); };
      img.src = url;
    });
  },
  profit: b => (+b.revenue || 0) - (+b.costs || 0),
  title(p) { const b = p[0] && Store.biz(p[0]); return b ? `${esc(b.emoji || '')} ${esc(b.name)}` : 'Businesses'; },
  sub(p) {
    const b = p[0] && Store.biz(p[0]);
    if (b) return esc(b.desc || b.status);
    const rev = sum(Store.d.businesses, x => x.revenue);
    return `${Store.d.businesses.length} businesses · ${money(rev)}/mo revenue`;
  },
  actions(p) {
    const b = p[0] && Store.biz(p[0]);
    if (b) return `<a class="btn ghost icon" href="#/business" title="All businesses">${I('chevL', 16)}</a><button class="btn" onclick="Business.edit('${b.id}')">${I('edit', 16)}<span class="hide-sm">Edit</span></button>`;
    return `<button class="btn primary" onclick="Business.edit()">${I('plus', 16)}<span class="hide-sm">New business</span></button>`;
  },
  render(p) {
    if (p[0]) { const b = Store.biz(p[0]); return b ? this.detail(b) : `<div class="glass card">${empty('briefcase', 'Business not found', '', `<a class="btn" href="#/business">Back</a>`)}</div>`; }
    const bs = Store.d.businesses;
    if (!bs.length) return `<div class="glass card">${empty('briefcase', 'Add your businesses', 'Track revenue, costs and every task per business — your whole portfolio in one place.', `<button class="btn primary" onclick="Business.edit()">${I('plus', 16)}Add business</button>`)}</div>`;
    const rev = sum(bs, b => b.revenue), prof = sum(bs, b => this.profit(b)), tgt = sum(bs, b => b.target);
    const open = Store.d.tasks.filter(t => t.bizId && !t.done).length;
    return `
      <div class="kpis">
        ${kpi('Monthly revenue', money(rev), { icon: 'coins', tone: 'gold', sub: `${money(rev * 12, { compact: true })} annual run-rate` })}
        ${kpi('Monthly profit', `<span class="${pnlCls(prof)}">${money(prof)}</span>`, { icon: 'up', tone: 'green', sub: rev ? `${pct(prof / rev)} margin` : '' })}
        ${kpi('Revenue vs target', pct(tgt ? rev / tgt : 0), { icon: 'target', sub: bar(tgt ? rev / tgt : 0, 'gold') })}
        ${kpi('Open tasks', open, { icon: 'tasks', tone: 'blue', sub: 'Across all businesses' })}
      </div>
      <div class="grid auto mt">${bs.map(b => this.card(b)).join('')}</div>`;
  },
  card(b) {
    const ts = Store.d.tasks.filter(t => t.bizId === b.id && !t.done).sort((x, y) => Tasks.smartSort(x, y));
    const p = b.target ? (+b.revenue || 0) / b.target : 0;
    return `<div class="glass card biz-card" style="--c:${esc(b.color)}" onclick="if(!event.target.closest('button,a'))App.go('business/${b.id}')">
      <div class="row" style="gap:14px">${this.av(b)}
        <div class="grow"><div class="row between"><b style="font-size:16px" class="ellipsis">${esc(b.name)}</b>${chip(esc(b.status), BIZ_STATUS[b.status] || '')}</div>
        <div class="faint ellipsis" style="font-size:12.5px">${esc(b.desc || '')}</div></div></div>
      <div class="stat-row"><div><small>Revenue/mo</small><b>${money(b.revenue)}</b></div><div><small>Profit/mo</small><b class="${pnlCls(this.profit(b))}">${money(this.profit(b))}</b></div><div><small>Open tasks</small><b>${ts.length}</b></div></div>
      <div><div class="row between" style="font-size:12px;margin-bottom:6px"><span class="muted">Towards ${money(b.target)}/mo</span><b>${pct(p)}</b></div>${bar(p, 'gold')}</div>
      ${ts.length ? `<div>${ts.slice(0, 2).map(t => Tasks.row(t)).join('')}</div>` : ''}
      <div class="card-foot"><button class="btn sm" onclick="Tasks.edit(null,{bizId:'${b.id}'})">${I('plus', 14)}Task</button>${safeUrl(b.url) ? `<a class="btn sm icon" href="${esc(safeUrl(b.url))}" target="_blank" rel="noopener" title="Website">${I('globe', 15)}</a>` : ''}<span class="grow"></span><a class="btn sm ghost" href="#/business/${b.id}">Open ${I('arrowR', 14)}</a></div>
    </div>`;
  },
  detail(b) {
    const ts = Store.d.tasks.filter(t => t.bizId === b.id);
    const open = ts.filter(t => !t.done).sort((x, y) => Tasks.smartSort(x, y));
    const done = ts.filter(t => t.done).sort((x, y) => (y.doneAt || 0) - (x.doneAt || 0));
    const goals = Store.d.goals.filter(g => g.bizId === b.id);
    const log = [...(b.log || [])].sort((x, y) => x.month.localeCompare(y.month));
    const prof = this.profit(b);
    const mlabel = m => new Date(m + '-01T00:00').toLocaleDateString(LOCALE, { month: 'short' });
    return `
      <div class="glass card" style="--c:${esc(b.color)}">
        <div class="profile-hero">${this.av(b, 'xl')}
          <div class="grow"><div class="row wrap">${chip(esc(b.status), BIZ_STATUS[b.status] || '', 'zap')}${safeUrl(b.url) ? `<a class="chip blue" href="${esc(safeUrl(b.url))}" target="_blank" rel="noopener" style="text-decoration:none">${I('globe', 12)}${esc(safeUrl(b.url).replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : ''}</div>
          <p class="muted mt-s">${esc(b.desc || 'Add a one-line description of what this business does.')}</p></div>
          <div class="row"><button class="btn gold" onclick="Business.logMonth('${b.id}')">${I('coins', 16)}Log month</button></div>
        </div>
      </div>
      <div class="kpis mt">
        ${kpi('Revenue / month', money(b.revenue), { icon: 'coins', tone: 'gold' })}
        ${kpi('Costs / month', money(b.costs), { icon: 'down', tone: 'red' })}
        ${kpi('Profit / month', `<span class="${pnlCls(prof)}">${money(prof)}</span>`, { icon: 'up', tone: 'green', sub: b.revenue ? pct(prof / b.revenue) + ' margin' : '' })}
        ${kpi('Target', money(b.target), { icon: 'target', sub: bar(b.target ? b.revenue / b.target : 0, 'gold') })}
      </div>
      <div class="dash mt">
        <div class="glass card s7">
          <div class="card-h"><h2>${I('up')}Revenue history</h2><span class="sub">${log.length} month${log.length === 1 ? '' : 's'}</span></div>
          ${log.length >= 2 ? Chart.bars(log.slice(-12).map(l => ({ label: l.month, short: mlabel(l.month), value: +l.revenue || 0 })), { h: 190, fmt: v => money(v) }) : `<div class="chart-empty" style="height:190px">Log at least two months to see the trend</div>`}
          ${log.length ? `<div class="table-wrap" style="margin-top:24px"><table class="table"><thead><tr><th>Month</th><th>Revenue</th><th>Costs</th><th>Profit</th><th></th></tr></thead><tbody>${log.slice(-6).reverse().map(l => `<tr><td>${new Date(l.month + '-01T00:00').toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })}</td><td>${money(l.revenue)}</td><td>${money(l.costs)}</td><td class="${pnlCls(l.revenue - l.costs)}"><b>${money((+l.revenue || 0) - (+l.costs || 0))}</b></td><td style="text-align:right"><button class="btn ghost xs icon" onclick="Business.logMonth('${b.id}','${l.month}')">${I('edit', 13)}</button></td></tr>`).join('')}</tbody></table></div>` : ''}
        </div>
        <div class="glass card s5">
          <div class="card-h"><h2>${I('book')}Notes</h2><span class="sub" id="bizSaved"></span></div>
          <div class="field"><textarea id="bizNotes" rows="10" placeholder="Strategy, offers, key contacts, ideas…" style="min-height:220px">${esc(b.notes || '')}</textarea></div>
        </div>
        <div class="glass card s7">
          <div class="card-h"><h2>${I('tasks')}Tasks</h2><span class="sub">${open.length} open</span></div>
          <div class="quick-add" style="border:1px solid var(--stroke-2);background:var(--field);margin-bottom:12px">${I('plus', 18)}<input id="bizQa" placeholder="Add a task for ${esc(b.name)}…" onkeydown="if(event.key==='Enter'){event.preventDefault();Tasks.quick(this,{bizId:'${b.id}'})}"><button class="btn primary sm" onclick="Tasks.quick($('#bizQa'),{bizId:'${b.id}'})">Add</button></div>
          ${open.map(t => Tasks.row(t)).join('') || '<p class="faint" style="font-size:13px;padding:6px 2px">No open tasks. What’s the next move?</p>'}
          ${done.length ? `<details class="guide"><summary>${I('check', 15)}Completed (${done.length})</summary><div style="padding:10px">${done.slice(0, 20).map(t => Tasks.row(t)).join('')}</div></details>` : ''}
        </div>
        <div class="glass card s5">
          <div class="card-h"><h2>${I('target')}Goals</h2><div class="right"><button class="btn sm" onclick="Goals.edit(null,{bizId:'${b.id}',cat:'Business'})">${I('plus', 14)}Goal</button></div></div>
          ${goals.map(g => { const p = Goals.progress(g); return `<div class="li click" onclick="App.go('goals')"><div class="li-ic">${I('target', 16)}</div><div class="li-b"><div class="li-t">${esc(g.title)}</div>${bar(p, p >= 1 ? 'green' : '')}</div><div class="li-v">${pct(p)}</div></div>`; }).join('') || '<p class="faint" style="font-size:13px">No goals linked yet.</p>'}
        </div>
      </div>`;
  },
  after(el, p) {
    const ta = $('#bizNotes', el); if (!ta) return;
    const b = Store.biz(p[0]);
    const save = debounce(() => { b.notes = ta.value; Store.save(); const s = $('#bizSaved'); if (s) s.textContent = 'Saved'; }, 500);
    ta.oninput = () => { const s = $('#bizSaved'); if (s) s.textContent = 'Saving…'; save(); };
  },
  logMonth(id, month) {
    const b = Store.biz(id); if (!b) return;
    b.log ||= [];
    const ex = b.log.find(l => l.month === (month || monthKey()));
    UI.modal({
      title: `Log month — ${esc(b.name)}`, small: true,
      body: `<form class="form" id="lmForm" onsubmit="return false">
        ${F({ name: 'month', label: 'Month', type: 'month', value: month || monthKey(), full: true })}
        ${F({ name: 'revenue', label: 'Revenue', type: 'number', value: ex?.revenue ?? b.revenue })}
        ${F({ name: 'costs', label: 'Costs', type: 'number', value: ex?.costs ?? b.costs })}
      </form>`,
      footer: [ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: () => { b.log = b.log.filter(l => l !== ex); App.refresh(); } }, 'spacer', { label: 'Cancel', cls: 'ghost' }, {
        label: 'Save', cls: 'primary', onClick: m => {
          const o = readForm($('#lmForm', m.el));
          if (!o.month) return false;
          b.log = b.log.filter(l => l.month !== o.month).concat({ month: o.month, revenue: o.revenue || 0, costs: o.costs || 0 });
          const latest = [...b.log].sort((x, y) => y.month.localeCompare(x.month))[0];
          if (latest.month === o.month) { b.revenue = o.revenue || 0; b.costs = o.costs || 0; }
          App.refresh(); UI.toast(`${I('check', 16)} Month logged`, 'success');
        },
      }],
    });
  },
  edit(id) {
    const ex = id ? Store.biz(id) : null;
    const b = ex || { id: uid(), name: '', emoji: '💼', color: BIZ_COLORS[Store.d.businesses.length % BIZ_COLORS.length], status: 'Building', url: '', desc: '', revenue: 0, target: 10000, costs: 0, notes: '', log: [], createdAt: Date.now() };
    const emojis = ['💼', '🚀', '🛍️', '📈', '🏠', '🎯', '💡', '🧠', '🎬', '🛠️', '☕', '💎', '🌍', '📱', '🏋️', '🎨'];
    UI.modal({
      title: ex ? 'Edit business' : 'New business',
      body: `<form class="form" id="bForm" onsubmit="return false">
        ${F({ name: 'name', label: 'Name', value: b.name, full: true, placeholder: 'e.g. Growth Agency' })}
        <div class="field full"><span>Logo</span><div class="row wrap"><div id="logoPrev">${this.av(b)}</div><button type="button" class="btn sm" id="logoUp">${I('upload', 14)}Upload logo</button><button type="button" class="btn sm ghost" id="logoRm" ${b.logo ? '' : 'style="display:none"'}>Remove</button></div><small>No upload? The logo is pulled from the website automatically.</small><input type="hidden" name="logo" value="${esc(b.logo || '')}"></div>
        <div class="field full"><span>Icon (fallback)</span><div class="emoji-pick" id="emPick">${emojis.map(e => `<button type="button" class="${e === b.emoji ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div><input type="hidden" name="emoji" value="${esc(b.emoji)}"></div>
        <div class="field full"><span>Colour</span><div class="emoji-pick" id="colPick">${BIZ_COLORS.map(c => `<button type="button" class="${c === b.color ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div><input type="hidden" name="color" value="${esc(b.color)}"></div>
        ${F({ name: 'status', label: 'Stage', type: 'select', value: b.status, options: Object.keys(BIZ_STATUS) })}
        ${F({ name: 'url', label: 'Website', type: 'url', value: b.url, placeholder: 'https://' })}
        ${F({ name: 'desc', label: 'One-liner', value: b.desc, full: true, placeholder: 'What it does, for whom' })}
        ${F({ name: 'revenue', label: 'Revenue / month', type: 'number', value: b.revenue })}
        ${F({ name: 'costs', label: 'Costs / month', type: 'number', value: b.costs })}
        ${F({ name: 'target', label: 'Target revenue / month', type: 'number', value: b.target, full: true })}
      </form>`,
      footer: [
        ex && { label: 'Delete', cls: 'ghost danger', icon: 'trash', onClick: m => { UI.confirm('Delete business?', `“${esc(b.name)}” will be removed. Its tasks stay but are unlinked.`, 'Delete', () => { Store.d.businesses = Store.d.businesses.filter(x => x.id !== b.id); Store.d.tasks.forEach(t => { if (t.bizId === b.id) t.bizId = ''; }); m.close(); App.go('business'); Store.save(); }); return false; } },
        'spacer', { label: 'Cancel', cls: 'ghost' },
        { label: ex ? 'Save' : 'Add business', cls: 'primary', onClick: m => {
          const o = readForm($('#bForm', m.el));
          if (!o.name) { UI.toast('Name your business', 'warn'); return false; }
          const out = { ...b, ...o, revenue: o.revenue || 0, costs: o.costs || 0, target: o.target || 0 };
          delete out.sample;
          if (ex) Object.assign(ex, out); else Store.d.businesses.push(out);
          App.refresh(); UI.toast(`${I('check', 16)} Saved`, 'success');
        } },
      ],
      onOpen: m => {
        const pick = (wrap, attr, input) => $(wrap, m.el).onclick = e => { const x = e.target.closest(`[data-${attr}]`); if (!x) return; $$(`${wrap} button`, m.el).forEach(y => y.classList.toggle('on', y === x)); $(`[name=${input}]`, m.el).value = x.dataset[attr]; };
        pick('#emPick', 'e', 'emoji'); pick('#colPick', 'c', 'color');
        const prev = () => { const o = readForm($('#bForm', m.el)); $('#logoPrev', m.el).innerHTML = this.av({ ...b, ...o }); $('#logoRm', m.el).style.display = o.logo ? '' : 'none'; };
        $('#logoUp', m.el).onclick = () => this.uploadLogo(d => { $('[name=logo]', m.el).value = d; prev(); });
        $('#logoRm', m.el).onclick = () => { $('[name=logo]', m.el).value = ''; prev(); };
        $('[name=url]', m.el).addEventListener('change', prev);
        $('#bForm', m.el).addEventListener('click', e => { if (e.target.closest('#emPick,#colPick')) setTimeout(prev); });
      },
    });
  },
};
App.register('business', Business);
