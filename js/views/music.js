'use strict';
/* Music — Apple Music / Spotify / YouTube embeds in a dock that keeps playing across pages */

const MUSIC_SEARCHES = ['Deep focus', 'Lofi beats', 'Classical for studying', 'Motivation mix', 'Trading focus', 'Gym motivation'];

const Music = {
  st() { return Store.s.music || (Store.s.music = { playlists: [], current: '', open: false }); },
  parse(raw) {
    let u; try { u = new URL(String(raw || '').trim()); } catch { return null; }
    const h = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    const ok = s => /^[\w.-]+$/.test(s || '');
    if (h === 'music.apple.com' || h === 'embed.music.apple.com') {
      const segs = u.pathname.split('/').filter(Boolean);
      if (segs.length < 2) return null;
      const path = '/' + segs.map(encodeURIComponent).join('/') + (u.searchParams.get('i') ? '?i=' + encodeURIComponent(u.searchParams.get('i')) : '');
      return { kind: 'apple', service: 'Apple Music', embed: 'https://embed.music.apple.com' + path, open: 'https://music.apple.com' + path, h: 175,
        name: decodeURIComponent(segs[2] && !/^(pl|\d)/.test(segs[2]) ? segs[2] : segs[1]).replace(/-/g, ' ') };
    }
    if (h === 'open.spotify.com') {
      const segs = u.pathname.replace(/^\/intl-[a-z-]+/i, '').split('/').filter(Boolean);
      const [type, id] = segs;
      if (!['playlist', 'album', 'track', 'artist', 'show', 'episode'].includes(type) || !ok(id)) return null;
      return { kind: 'spotify', service: 'Spotify', embed: `https://open.spotify.com/embed/${type}/${id}?theme=0`, open: `https://open.spotify.com/${type}/${id}`, h: 152, name: 'Spotify ' + type };
    }
    if (['youtube.com', 'music.youtube.com', 'youtu.be'].includes(h)) {
      let id = h === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
      if (!id) { const m = u.pathname.match(/^\/(?:live|embed|shorts)\/([\w-]+)/); if (m) id = m[1]; }
      const list = u.searchParams.get('list');
      if (id && !ok(id)) return null; if (list && !ok(list)) return null;
      if (!id && !list) return null;
      const embed = id ? `https://www.youtube.com/embed/${id}${list ? '?list=' + list : ''}` : `https://www.youtube.com/embed/videoseries?list=${list}`;
      return { kind: 'youtube', service: 'YouTube', embed, open: u.href, h: 203, name: 'YouTube ' + (list ? 'playlist' : 'mix') };
    }
    return null;
  },
  current() { const s = this.st(); return s.playlists.find(p => p.id === s.current) || null; },
  icon(kind) { return { apple: '#fa2d48', spotify: '#1db954', youtube: '#ff0033' }[kind] || 'var(--accent)'; },

  add(url, name) {
    const info = this.parse(url);
    if (!info) { UI.toast('That link isn’t an Apple Music, Spotify or YouTube link', 'error'); return null; }
    const s = this.st();
    let p = s.playlists.find(x => x.url === url.trim());
    if (!p) { p = { id: uid(), url: url.trim(), name: (name || '').trim() || info.name }; s.playlists.unshift(p); }
    Store.save();
    return p;
  },
  play(id) {
    const s = this.st(); s.current = id; s.open = true; Store.save();
    this.renderDock();
    if (App.cur === 'music') App.render();
    const p = this.current(), info = p && this.parse(p.url);
    if (info) UI.toast(`${I('music', 16)} ${esc(p.name)} — press play in the player`, 'success');
  },
  toggle(force) { const s = this.st(); s.open = force ?? !s.open; Store.save(); $('#musicDock')?.classList.toggle('open', s.open); },
  stop() { const s = this.st(); s.current = ''; Store.save(); this.renderDock(); if (App.cur === 'music') App.render(); },
  remove(id) {
    const s = this.st(); s.playlists = s.playlists.filter(p => p.id !== id);
    if (s.current === id) s.current = '';
    Store.save(); this.renderDock(); App.render();
  },
  focusMusic() { const p = this.current(); if (p) this.toggle(true); else App.go('music'); },

  // The dock lives outside #view, so the iframe (and the music) survives page changes.
  renderDock() {
    const dock = $('#musicDock'); if (!dock) return;
    const p = this.current(), info = p && this.parse(p.url);
    if (!info) { dock.className = 'music-dock'; dock.innerHTML = ''; dock.dataset.src = ''; return; }
    if (dock.dataset.src !== info.embed) {
      dock.dataset.src = info.embed;
      dock.innerHTML = `<div class="md-bar">
          <button class="md-pill" onclick="Music.toggle()" aria-label="Show or hide player"><span class="md-ic" style="background:${this.icon(info.kind)}">${I('music', 14, 2.4)}</span><span class="md-name">${esc(p.name)}</span><span class="md-chev">${I('chevR', 14)}</span></button>
          <a class="btn ghost xs icon md-x" href="${esc(info.open)}" target="_blank" rel="noopener" title="Open in ${info.service}">${I('external', 14)}</a>
          <button class="btn ghost xs icon md-x" onclick="Music.stop()" title="Stop and close">${I('x', 14)}</button>
        </div>
        <div class="md-frame"><iframe title="${esc(p.name)}" src="${esc(info.embed)}" height="${info.h}" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write; picture-in-picture" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    }
    dock.className = 'music-dock on' + (this.st().open ? ' open' : '');
  },

  title: 'Music',
  sub() { const p = this.current(); return p ? `Now playing · ${esc(p.name)}` : 'Soundtrack your deep work'; },
  actions() { return `<button class="btn primary" onclick="$('#muUrl')?.focus()">${I('plus', 16)}<span class="hide-sm">Add playlist</span></button>`; },
  render() {
    const s = this.st(), cur = this.current(), info = cur && this.parse(cur.url);
    const apple = q => `https://music.apple.com/search?term=${encodeURIComponent(q)}`;
    const spot = q => `https://open.spotify.com/search/${encodeURIComponent(q)}`;
    return `<div class="dash">
      <div class="glass card s7">
        <div class="card-h"><h2>${I('music')}Now playing</h2></div>
        ${info ? `<div class="row" style="gap:16px;flex-wrap:wrap">
            <div class="biz-av xl" style="--c:${this.icon(info.kind)}">${I('music', 30, 2.2)}</div>
            <div class="grow" style="min-width:180px"><div class="goal-title">${esc(cur.name)}</div><div class="faint" style="font-size:13px">${info.service} · plays in the bar at the bottom of the screen, on every page</div></div>
          </div>
          <div class="row wrap mt">
            <button class="btn primary" onclick="Music.toggle(true)">${I('play', 15)}Show player</button>
            <a class="btn gold" href="${esc(info.open)}" target="_blank" rel="noopener">${I('external', 15)}Open in ${info.kind === 'apple' ? 'Music app' : info.service}</a>
            <button class="btn ghost" onclick="Music.stop()">${I('x', 15)}Stop</button>
          </div>`
        : empty('music', 'Nothing playing', 'Paste a playlist, album or song link from Apple Music, Spotify or YouTube below, then press play.')}
      </div>
      <div class="glass card s5">
        <div class="card-h"><h2>${I('plus')}Add music</h2></div>
        <form class="form" id="muForm" onsubmit="return false">
          <div class="field full"><span>Link</span><input id="muUrl" name="url" placeholder="https://music.apple.com/…/playlist/…" autocomplete="off" inputmode="url"></div>
          ${F({ name: 'name', label: 'Name (optional)', full: true, placeholder: 'e.g. Deep work' })}
        </form>
        <div class="row wrap mt"><button class="btn primary" onclick="Music.addFromForm(true)">${I('play', 15)}Add & play</button><button class="btn" onclick="Music.addFromForm(false)">Save</button></div>
        <p class="hint">In Apple Music: open a playlist → <b>⋯</b> → <b>Share</b> → <b>Copy Link</b>, then paste it here.</p>
      </div>
      <div class="glass card s7">
        <div class="card-h"><h2>${I('list')}Your playlists</h2><span class="sub">${s.playlists.length}</span></div>
        ${s.playlists.map(p => { const i = this.parse(p.url); if (!i) return ''; const on = s.current === p.id; return `<div class="li"><div class="li-ic" style="background:${this.icon(i.kind)};color:#fff">${I('music', 16)}</div><div class="li-b"><div class="li-t">${esc(p.name)}</div><div class="li-s">${i.service}</div></div>
          ${on ? chip('Playing', 'green', 'zap') : `<button class="btn sm primary" onclick="Music.play('${p.id}')">${I('play', 13)}Play</button>`}
          <a class="btn sm icon" href="${esc(i.open)}" target="_blank" rel="noopener" title="Open in ${i.service}">${I('external', 14)}</a>
          <button class="btn sm icon ghost" onclick="Music.remove('${p.id}')" title="Remove">${I('trash', 14)}</button></div>`; }).join('') || '<p class="faint" style="font-size:13px">No saved music yet.</p>'}
        <div class="li"><div class="li-ic" style="background:#ff0033;color:#fff">${I('music', 16)}</div><div class="li-b"><div class="li-t">Quick start: Lofi Girl radio</div><div class="li-s">YouTube · free 24/7 study beats</div></div><button class="btn sm" onclick="Music.quick()">${I('play', 13)}Play</button></div>
      </div>
      <div class="glass card s5">
        <div class="card-h"><h2>${I('search')}Find music</h2></div>
        <div class="row wrap" style="gap:6px">${MUSIC_SEARCHES.map(q => `<a class="chip lg" style="text-decoration:none;background:color-mix(in srgb,#fa2d48 14%,transparent);color:#fa2d48" href="${apple(q)}" target="_blank" rel="noopener">${I('music', 12)}${q}</a>`).join('')}</div>
        <div class="row wrap mt-s" style="gap:6px">${MUSIC_SEARCHES.slice(0, 4).map(q => `<a class="chip lg" style="text-decoration:none;background:color-mix(in srgb,#1db954 14%,transparent);color:#1db954" href="${spot(q)}" target="_blank" rel="noopener">${I('music', 12)}${q}</a>`).join('')}</div>
        <details class="guide"><summary>${I('info', 16)}How playback works</summary><ul>
          <li><b>Apple Music</b> plays full songs in the player when you’re signed in to Apple Music in this browser (tap <b>Sign in</b> inside the player). Otherwise you get 30-second previews.</li>
          <li><b>On iPhone</b>, the most reliable option is <b>Open in Music app</b>: it plays through the Music app in the background while you keep using YRB’s World, with lock-screen controls.</li>
          <li><b>Spotify</b> plays full tracks when you’re logged in to Spotify in this browser.</li>
          <li>The player keeps going while you switch pages. Tap the bar at the bottom to show or hide it.</li>
        </ul></details>
      </div>
    </div>`;
  },
  addFromForm(andPlay) {
    const o = readForm($('#muForm'));
    if (!o.url) { UI.toast('Paste a link first', 'warn'); return; }
    const p = this.add(o.url, o.name);
    if (!p) return;
    if (andPlay) this.play(p.id); else { App.render(); UI.toast(`${I('check', 16)} Saved`, 'success'); }
  },
  quick() { const p = this.add('https://www.youtube.com/watch?v=jfKfPfyJRdk', 'Lofi Girl radio'); if (p) this.play(p.id); },
};
App.register('music', Music);
