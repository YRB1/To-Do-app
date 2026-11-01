'use strict';
/* Command bar (Ctrl/⌘+K): jump to any page, section, task, goal or business — or act on what you typed */

const Palette = {
  items(q) {
    const d = Store.d, out = [];
    const ql = q.toLowerCase().trim();
    const hit = s => !ql || String(s).toLowerCase().includes(ql);
    if (ql) {
      out.push({ g: 'Do', icon: 'plus', label: `Add task “${q}”`, run: () => { const i = { value: q, id: 'palFake', focus() {} }; Tasks.quick(i); } });
      out.push({ g: 'Do', icon: 'sparkles', label: `Ask Claude “${q}”`, run: () => Claude.mode() === 'link' ? Claude.openApp('Context from my YRB’s World app:\n' + JSON.stringify(Coach.snapshot()) + '\n\n' + q) : Claude.start({ title: q.slice(0, 40), ask: q }) });
    }
    d.spaces.filter(x => !x.archived && (hit(x.name) || hit(x.mission))).forEach(x => out.push({ g: 'Sections', emoji: x.emoji, color: x.color, label: x.name, sub: Spaces.nextRung(x)?.text || x.status, run: () => App.go('space/' + x.id) }));
    NAV.filter(n => n.id && hit(n.label)).forEach(n => out.push({ g: 'Pages', icon: n.icon, label: n.label, run: () => App.go(n.id) }));
    if (hit('Profile settings appearance')) out.push({ g: 'Pages', icon: 'user', label: 'Profile & appearance', run: () => App.go('profile') });
    if (ql) {
      d.tasks.filter(t => !t.done && hit(t.text)).slice(0, 6).forEach(t => out.push({ g: 'Tasks', icon: 'tasks', label: t.text, sub: t.due ? relDate(t.due) : '', run: () => App.go('tasks/' + t.id) }));
      d.goals.filter(x => hit(x.title)).slice(0, 4).forEach(x => out.push({ g: 'Goals', icon: 'target', label: x.title, sub: pct(Goals.progress(x)), run: () => App.go('goals/' + x.id) }));
      d.businesses.filter(x => hit(x.name)).forEach(x => out.push({ g: 'Businesses', icon: 'briefcase', label: x.name, sub: 'Finances', run: () => App.go('business/' + x.id) }));
    } else {
      out.push({ g: 'Do', icon: 'plus', label: 'New task', sub: 'N', run: () => Tasks.edit() });
      out.push({ g: 'Do', icon: 'folder', label: 'New section', run: () => Spaces.edit() });
      out.push({ g: 'Do', icon: 'candles', label: 'Log a trade', sub: 'T', run: () => Trading.edit() });
      out.push({ g: 'Do', icon: 'play', label: 'Start a 25-minute focus block', run: () => { App.go('dashboard'); setTimeout(() => Focus.toggle(), 250); } });
      out.push({ g: 'Do', icon: Theme.resolved() === 'dark' ? 'sun' : 'moon', label: `Switch to ${Theme.resolved() === 'dark' ? 'light' : 'dark'} mode`, run: () => Theme.toggle() });
    }
    return out.slice(0, 40);
  },
  open() {
    if ($('.pal-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'pal-wrap';
    wrap.innerHTML = `<div class="pal" role="dialog" aria-label="Command bar"><div class="pal-in">${I('search', 18)}<input id="palQ" placeholder="Jump to a section, task or page — or type to add a task or ask Claude" autocomplete="off" spellcheck="false"><kbd>esc</kbd></div><div class="pal-list" id="palList" role="listbox"></div></div>`;
    document.body.appendChild(wrap);
    const inp = $('#palQ'), list = $('#palList');
    let sel = 0, cur = [];
    const draw = () => {
      cur = this.items(inp.value);
      sel = Math.min(sel, Math.max(0, cur.length - 1));
      let g = '';
      list.innerHTML = cur.map((it, i) => (it.g !== g ? `<div class="pal-g">${(g = it.g)}</div>` : '') +
        `<button class="pal-it ${i === sel ? 'on' : ''}" data-i="${i}" role="option" aria-selected="${i === sel}">${it.emoji ? `<span class="pal-em" style="--c:${esc(it.color || 'var(--accent)')}">${esc(it.emoji)}</span>` : `<span class="pal-ic">${I(it.icon || 'arrowR', 16)}</span>`}<span class="grow ellipsis">${esc(it.label)}</span>${it.sub ? `<small class="ellipsis">${esc(it.sub)}</small>` : ''}</button>`).join('') || `<p class="pal-empty">Nothing matches. Press Enter to add it as a task.</p>`;
      list.querySelector('.pal-it.on')?.scrollIntoView({ block: 'nearest' });
    };
    const close = () => { wrap.classList.add('closing'); setTimeout(() => wrap.remove(), 140); document.removeEventListener('keydown', key, true); };
    const run = i => { const it = cur[i]; close(); it && setTimeout(() => it.run(), 10); };
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, cur.length); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + cur.length) % Math.max(1, cur.length); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    };
    document.addEventListener('keydown', key, true);
    inp.oninput = () => { sel = 0; draw(); };
    list.onclick = e => { const b = e.target.closest('.pal-it'); if (b) run(+b.dataset.i); };
    wrap.addEventListener('pointerdown', e => { if (e.target === wrap) close(); });
    draw(); inp.focus();
  },
};
