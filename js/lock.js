'use strict';
/* Welcome screen + app PIN lock + sound.
   Step 1 (gate): PIN pad, or "Tap to enter" — iPhone only allows sound after a tap.
   Step 2 (intro): Y · R · B land one by one — a voice says each letter as it lands (or a note per letter),
   then "Welcome, Yrb", then the app. Locks again after 2 minutes away. */

const Lock = {
  locked: false, entry: '', hiddenAt: 0, AWAY_MS: 2 * 60e3,

  async hash(pin) {
    const data = new TextEncoder().encode('yrbs-world:' + pin);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  },
  hasPin() { return !!Store.s.appPin; },
  first() { return (Store.s.name || 'Yrb').split(' ')[0]; },
  name() { return esc(this.first()); },
  mode() { return Store.s.welcomeSound || 'voice'; },

  // ── Chime: rendered to a real audio file (Web Audio is muted by the iPhone silent switch) ──
  _url: '', _a: null,
  wav() {
    if (this._url) return this._url;
    const sr = 44100, len = Math.floor(sr * 2.3), pcm = new Float32Array(len);
    [[783.99, 0.25], [1174.66, 0.57], [1567.98, 0.89]].forEach(([f, start]) => {
      const s0 = Math.floor(start * sr);
      for (let i = 0; s0 + i < len; i++) {
        const t = i / sr, env = Math.min(1, t / 0.008) * Math.exp(-t * 3.2);
        pcm[s0 + i] += env * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t) + 0.08 * Math.sin(2 * Math.PI * f * 3 * t)) * 0.28;
      }
    });
    const buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf), w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
    return (this._url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
  },
  audio() { if (!this._a) { this._a = new Audio(this.wav()); this._a.preload = 'auto'; this._a.setAttribute('playsinline', ''); } return this._a; },
  session() { try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {} },
  playChime() { this.session(); const a = this.audio(); a.muted = false; a.volume = 1; a.currentTime = 0; return a.play(); },

  // ── Voice: picks the most natural voice installed on the device ──
  BAD: /compact|eloquence|grandma|grandpa|bad news|bells|bubbles|jester|organ|trinoids|whisper|zarvox|albert|fred|junior|ralph|kathy|boing|cellos|wobble|superstar|rocko|shelley|sandy|flo|eddy|reed|good news|hysterical|deranged|pipe/i,
  score(v) {
    let s = 0;
    if (/premium/i.test(v.name)) s += 8; if (/enhanced|neural|natural/i.test(v.name)) s += 6;
    if (/^en[-_]GB/i.test(v.lang)) s += 3; else if (/^en/i.test(v.lang)) s += 1;
    if (/jamie|serena|daniel|arthur|martha|oliver|stephanie|kate|malcolm|siri|google uk english/i.test(v.name)) s += 2;
    if (this.BAD.test(v.name)) s -= 10;
    return s;
  },
  voices() { if (!('speechSynthesis' in window)) return []; return speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => this.score(b) - this.score(a)); },
  voice() { const vs = this.voices(); return vs.find(v => v.name === Store.s.voiceName) || vs[0] || null; },
  say(text, { rate = 0.92, pitch = 1, onstart, onend } = {}) {
    const u = new SpeechSynthesisUtterance(text);
    const v = this.voice(); try { if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB'; } catch { u.lang = 'en-GB'; }
    u.rate = rate; u.pitch = pitch; u.onstart = onstart; u.onend = onend; u.onerror = onend;
    speechSynthesis.speak(u); return u;
  },
  testVoice() { if (!('speechSynthesis' in window)) return UI.toast('This browser has no voices'); speechSynthesis.cancel(); this.session(); this.say(this.LINE, { rate: 0.9 }); },
  LINE: 'Welcome, y r b',

  // ── Screen ──
  el() { return $('#lockScreen'); },
  touch() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; },
  show(firstOpen) {
    let el = this.el();
    if (!el) { el = document.createElement('div'); el.id = 'lockScreen'; document.body.appendChild(el); }
    this.entry = ''; this.locked = this.hasPin(); this.started = false;
    document.body.classList.add('is-locked');
    const h = new Date().getHours(), part = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const m = this.mode();
    el.className = 'lock-screen first' + (m === 'voice' ? ' voice' : '');
    el.innerHTML = `<div class="ls-dust" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 53) % 100}%;--d:${(i * 0.37) % 3.2}s;--s:${3 + (i % 5)}px;--t:${5 + (i % 4)}s"></i>`).join('')}</div>
      <div class="ls-inner">
        <div class="ls-gate">
          <div class="ls-mark"><svg viewBox="104 96 304 330" fill="currentColor" aria-hidden="true"><path d="M118 104h78l60 104 60-104h78L292 268h-72z"/><rect x="220" y="262" width="22" height="160" rx="4"/><rect x="270" y="262" width="22" height="160" rx="4"/><rect x="220" y="300" width="72" height="16" rx="3"/><rect x="220" y="346" width="72" height="16" rx="3"/><rect x="220" y="392" width="72" height="16" rx="3"/></svg></div>
          <p class="ls-gate-t">${part}, ${this.name()}</p>
          ${this.locked ? `
            <div class="ls-dots" id="lsDots">${'<i></i>'.repeat(Store.s.appPinLen || 4)}</div>
            <p class="ls-msg" id="lsMsg">Enter your PIN</p>
            <div class="ls-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button onclick="Lock.key('${n}')">${n}</button>`).join('')}
              ${this.bioOn() ? `<button class="ls-alt" onclick="Lock.bio()" aria-label="Use Face ID">${I('user', 22)}</button>` : '<span></span>'}
              <button onclick="Lock.key('0')">0</button>
              <button class="ls-alt" onclick="Lock.back()" aria-label="Delete">${I('chevL', 22)}</button></div>`
          : `<button class="ls-enter" id="lsEnter" onclick="Lock.go()" hidden>${I('play', 15)}Tap to enter</button>`}
        </div>
        <div class="ls-show">
          <div class="ls-yrb" aria-label="YRB">${['Y', 'R', 'B'].map((l, i) => `<span class="ls-l" style="--i:${i}"><b>${l}</b><em class="ls-rung"></em></span>`).join('')}</div>
          <h1 class="ls-title">Welcome, Y·R·B</h1>
          <p class="ls-sub">${fmtDay(today(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>`;
    requestAnimationFrame(() => el.classList.add('on'));
    el.onclick = e => { const b = $('#lsEnter'); if (b && !b.hidden && !e.target.closest('button')) this.go(); };
    if (this.locked) { if (this.bioOn() && firstOpen) setTimeout(() => this.bio(true), 450); return; }
    if (!firstOpen) return this.intro(false);
    if (m === 'off') return this.intro(false);
    if (m === 'chime') { // try straight away (works on desktop); otherwise wait for a tap
      this.playChime().then(() => this.intro(false, true)).catch(() => { $('#lsEnter').hidden = false; });
      return;
    }
    if (this.touch()) { $('#lsEnter').hidden = false; return; } // voice needs a tap on phones
    this.intro(true);
  },
  go() { this.session(); if (this.mode() === 'chime') this.playChime().catch(() => {}); this.intro(this.mode() !== 'off', this.mode() === 'chime'); },

  // Step 2: the letters. withSound = play the chosen sound now (chimeAlready = chime is already playing)
  intro(withSound, chimeAlready) {
    if (this.started) return; this.started = true;
    const el = this.el(); if (!el) return;
    el.classList.add('play');
    const letters = $$('.ls-l', el), land = i => letters[i] && letters[i].classList.add('go');
    const finish = ms => { clearTimeout(this._safety); setTimeout(() => this.open(), ms); };
    this._safety = setTimeout(() => { letters.forEach(l => l.classList.add('go')); this.open(); }, 8000);
    if (withSound && this.mode() === 'voice' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      let started = false, fell = false;
      const fallback = () => { if (started || fell) return; fell = true; speechSynthesis.cancel(); letters.forEach((x, i) => setTimeout(() => land(i), i * 320)); setTimeout(() => el.classList.add('greet'), 1000); finish(2600); };
      // One natural line, "Welcome, y r b" (lowercase so iOS never says "capital"); letters land as each is said
      const at = [9, 11, 13], t = [];
      const u = this.say(this.LINE, { rate: 0.9,
        onstart: () => { if (fell) return; started = true; el.classList.add('greet'); [620, 900, 1180].forEach((ms, i) => t.push(setTimeout(() => land(i), ms))); },
        onend: () => { [0, 1, 2].forEach(land); started ? finish(900) : fallback(); } });
      if (u) u.onboundary = e => { const i = at.indexOf(e.charIndex); if (i > -1) land(i); };
      setTimeout(fallback, 1300); // no voice on this device → letters land on a beat instead
      return;
    }
    if (withSound && this.mode() === 'chime' && !chimeAlready) this.playChime().catch(() => {});
    letters.forEach((x, i) => setTimeout(() => land(i), 250 + i * 320));
    setTimeout(() => el.classList.add('greet'), 1250);
    finish(2900);
  },
  key(n) {
    this.session();
    const len = Store.s.appPinLen || 4;
    if (this.entry.length >= len) return;
    this.entry += n; this.dots();
    if (this.entry.length === len) this.check(); // stays inside the tap, so sound is allowed
  },
  back() { this.entry = this.entry.slice(0, -1); this.dots(); },
  dots() { $$('#lsDots i').forEach((d, i) => d.classList.toggle('on', i < this.entry.length)); },
  check() {
    const m = this.mode();
    // Start the sound synchronously inside the tap, then verify; stop it if the PIN is wrong
    if (m === 'chime') { this.playChime().catch(() => {}); }
    if (m === 'voice' && 'speechSynthesis' in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); }
    this.hash(this.entry).then(hv => {
      if (hv === Store.s.appPin) { this.locked = false; return this.intro(m === 'voice', m === 'chime'); }
      try { this._a && this._a.pause(); speechSynthesis.cancel(); } catch {}
      const d = $('#lsDots'); d?.classList.add('shake'); $('#lsMsg').textContent = 'Wrong PIN — try again';
      if (navigator.vibrate) navigator.vibrate(120);
      setTimeout(() => { d?.classList.remove('shake'); this.entry = ''; this.dots(); }, 450);
    });
  },
  open() {
    const el = this.el(); if (!el) return;
    this.locked = false; document.body.classList.remove('is-locked');
    el.classList.add('out');
    setTimeout(() => el.remove(), 500);
  },

  // ── Face ID / Touch ID (WebAuthn, stays on this device) ───────────
  bioOn() { return !!localStorage.getItem('yrb_bio') && !!window.PublicKeyCredential; },
  async bioSetup() {
    try {
      const cred = await navigator.credentials.create({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'YRB’s World' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: Store.s.name || 'Yrb', displayName: Store.s.name || 'Yrb' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, timeout: 60000 } });
      localStorage.setItem('yrb_bio', btoa(String.fromCharCode(...new Uint8Array(cred.rawId))));
      UI.toast(`${I('check', 16)} Face ID is on for this device`, 'success'); App.render();
    } catch { UI.toast('Face ID wasn’t set up', 'warn'); }
  },
  async bio(silent) {
    try {
      const id = Uint8Array.from(atob(localStorage.getItem('yrb_bio')), c => c.charCodeAt(0));
      await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id }], userVerification: 'required', timeout: 60000 } });
      this.locked = false; this.intro(this.mode() !== 'off');
    } catch { if (!silent) { const m = $('#lsMsg'); if (m) m.textContent = 'Face ID didn’t work — use your PIN'; } }
  },

  // ── Settings ──────────────────────────────────────────────────────
  setPin() {
    UI.modal({ title: this.hasPin() ? 'Change app PIN' : 'Set an app PIN', small: true,
      body: `<p class="muted" style="margin-bottom:12px">Asked every time you open YRB’s World, and after 2 minutes away. 4 or 6 digits.</p><form class="form" id="apForm" onsubmit="return false">${F({ name: 'a', label: 'New PIN', type: 'password', full: true, inputmode: 'numeric', attrs: ' maxlength="6" autocomplete="new-password"' })}${F({ name: 'b', label: 'Repeat PIN', type: 'password', full: true, inputmode: 'numeric', attrs: ' maxlength="6" autocomplete="new-password"' })}</form>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label: 'Save PIN', cls: 'primary', onClick: async m => {
        const o = readForm($('#apForm', m.el));
        if (!/^(\d{4}|\d{6})$/.test(o.a)) { UI.toast('Use 4 or 6 digits', 'warn'); return false; }
        if (o.a !== o.b) { UI.toast('The PINs don’t match', 'warn'); return false; }
        Store.s.appPin = await this.hash(o.a); Store.s.appPinLen = o.a.length; Store.save(); m.close(); App.render();
        UI.toast(`${I('shield', 16)} App PIN set`, 'success');
        return false;
      } }] });
  },
  removePin() { UI.confirm('Remove app PIN?', 'YRB’s World will open without asking for a PIN.', 'Remove', () => { Store.s.appPin = ''; Store.s.appPinLen = 0; localStorage.removeItem('yrb_bio'); App.refresh(); }); },
  card() {
    const s = Store.s;
    return `<div class="glass card">
      <div class="card-h"><h2>${I('shield')}Lock & welcome</h2></div>
      <div class="li"><div class="li-b"><div class="li-t">App PIN</div><div class="li-s">${this.hasPin() ? `On · ${s.appPinLen || 4} digits · locks after 2 minutes away` : 'Off — anyone with your phone can open the app'}</div></div>
        ${this.hasPin() ? `<button class="btn sm" onclick="Lock.setPin()">Change</button><button class="btn sm ghost danger" onclick="Lock.removePin()">Remove</button>` : `<button class="btn sm gold" onclick="Lock.setPin()">Set PIN</button>`}</div>
      ${this.hasPin() && window.PublicKeyCredential ? `<div class="li"><div class="li-b"><div class="li-t">Face ID</div><div class="li-s">${this.bioOn() ? 'On for this device' : 'Unlock with your face instead of typing the PIN'}</div></div>${this.bioOn() ? `<button class="btn sm ghost" onclick="localStorage.removeItem('yrb_bio');App.render()">Turn off</button>` : `<button class="btn sm" onclick="Lock.bioSetup()">Turn on</button>`}</div>` : ''}
      <div class="li"><div class="li-b"><div class="li-t">Welcome sound</div><div class="li-s">Plays as Y · R · B land</div></div>
        <div class="seg btns">${[['voice', 'Voice'], ['chime', 'Chime'], ['off', 'Off']].map(([v, l]) => `<button class="${this.mode() === v ? 'on' : ''}" onclick="Store.s.welcomeSound='${v}';Store.save();App.render();${v === 'voice' ? 'Lock.testVoice()' : v === 'chime' ? 'Lock.playChime().catch(()=>{})' : ''}">${l}</button>`).join('')}</div></div>
      ${this.mode() === 'voice' ? `<div class="li" style="flex-wrap:wrap"><div class="li-b"><div class="li-t">Voice</div><div class="li-s">Says “Welcome, Y. R. B.”</div></div>
        <select class="input sm" style="width:auto;max-width:230px" onchange="Store.s.voiceName=this.value;Store.save();Lock.testVoice()">${this.voices().map(v => `<option value="${esc(v.name)}" ${this.voice()?.name === v.name ? 'selected' : ''}>${esc(v.name)}${/premium|enhanced|neural|natural/i.test(v.name) ? ' ★' : ''}</option>`).join('') || '<option>Loading voices…</option>'}</select>
        <button class="btn sm" onclick="Lock.testVoice()">${I('play', 13)}Test</button></div>
      <p class="hint" style="padding:0 4px 4px">For the most human voice on iPhone: Settings → Accessibility → Spoken Content → Voices → English → pick a <b>Premium</b> or <b>Enhanced</b> voice (Jamie, Serena or Daniel sound best) and download it. It then appears here with a ★ and is chosen automatically.</p>` : ''}
    </div>`;
  },

  init() {
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { if (App.cur === 'profile') App.render(); };
    this.show(true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.hiddenAt = Date.now();
      else if (this.hasPin() && this.hiddenAt && Date.now() - this.hiddenAt > this.AWAY_MS && !this.el()) this.show(false);
    });
  },
};
