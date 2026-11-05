'use strict';
/* Welcome screen + app PIN lock + chime.
   Opens with "Welcome, Yrb", asks for the PIN if one is set (or Face ID), then plays the chime.
   Locks again after 2 minutes away. */

const Lock = {
  locked: false, entry: '', hiddenAt: 0, AWAY_MS: 2 * 60e3,

  async hash(pin) {
    const data = new TextEncoder().encode('yrbs-world:' + pin);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  },
  hasPin() { return !!Store.s.appPin; },
  name() { return esc((Store.s.name || 'Yrb').split(' ')[0]); },

  // ── Sound: little two-note chime, or a spoken "Welcome, Yrb" ──────
  // iPhone rules: sound needs a tap first, and Web Audio is muted by the silent switch.
  // So the chime is rendered into a real audio file and played through an <audio> element
  // (media playback), with the audio session set to "playback".
  _url: '', _a: null, _played: false, _primed: false,
  wav() {
    if (this._url) return this._url;
    const sr = 44100, len = Math.floor(sr * 2.3), pcm = new Float32Array(len);
    [[783.99, 0.25], [1174.66, 0.57], [1567.98, 0.89]].forEach(([f, start]) => { // G5 · D6 · G6 — one per letter
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
  audio() {
    if (!this._a) { this._a = new Audio(this.wav()); this._a.preload = 'auto'; this._a.setAttribute('playsinline', ''); }
    return this._a;
  },
  session() { try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {} },
  // Call inside a tap: unlocks sound for later (PIN pad, Face ID)
  prime() {
    if (this._primed) return; this._primed = true; this.session();
    const a = this.audio(); a.muted = true;
    a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; this._primed = false; });
    if (Store.s.welcomeSound === 'voice' && 'speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  },
  // Returns a promise: resolves if sound played, rejects if the phone blocked it
  chime() {
    const mode = Store.s.welcomeSound || 'chime';
    if (mode === 'off') return Promise.resolve();
    if (mode === 'voice' && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(`Welcome, ${(Store.s.name || 'Yrb').split(' ')[0]}`);
      u.lang = 'en-GB'; u.rate = 0.95;
      const v = speechSynthesis.getVoices().find(x => /en-GB/i.test(x.lang)); if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u); return Promise.resolve();
    }
    this.session();
    const a = this.audio(); a.muted = false; a.volume = 1; a.currentTime = 0;
    return a.play().then(() => { this._played = true; });
  },

  // ── Screen ────────────────────────────────────────────────────────
  el() { return $('#lockScreen'); },
  show(firstOpen) {
    let el = this.el();
    if (!el) { el = document.createElement('div'); el.id = 'lockScreen'; document.body.appendChild(el); }
    this.entry = ''; this.locked = this.hasPin();
    document.body.classList.toggle('is-locked', this.locked);
    const h = new Date().getHours(), part = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    el.className = 'lock-screen' + (firstOpen ? ' first' : '');
    el.innerHTML = `<div class="ls-inner">
      <div class="ls-dust" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 53) % 100}%;--d:${(i * 0.37) % 3.2}s;--s:${3 + (i % 5)}px;--t:${5 + (i % 4)}s"></i>`).join('')}</div>
      <div class="ls-yrb" aria-label="YRB">
        ${['Y', 'R', 'B'].map((l, i) => `<span class="ls-l" style="--i:${i}"><b>${l}</b><em class="ls-rung"></em></span>`).join('')}
        <span class="ls-sweep" aria-hidden="true"></span>
      </div>
      <h1 class="ls-title">Welcome, ${this.name()}</h1>
      <p class="ls-sub">${part} · ${fmtDay(today(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      ${this.locked ? `
        <div class="ls-dots" id="lsDots">${'<i></i>'.repeat(Store.s.appPinLen || 4)}</div>
        <p class="ls-msg" id="lsMsg">Enter your PIN</p>
        <div class="ls-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button onclick="Lock.key('${n}')">${n}</button>`).join('')}
          ${this.bioOn() ? `<button class="ls-alt" onclick="Lock.bio()" aria-label="Use Face ID">${I('user', 22)}</button>` : '<span></span>'}
          <button onclick="Lock.key('0')">0</button>
          <button class="ls-alt" onclick="Lock.back()" aria-label="Delete">${I('chevL', 22)}</button></div>`
        : `<button class="ls-enter" id="lsEnter" onclick="Lock.tapEnter()" hidden>${I('play', 15)}Tap to enter</button>`}
    </div>`;
    requestAnimationFrame(() => el.classList.add('on'));
    el.onclick = e => { const b = $('#lsEnter'); if (b && !b.hidden && !e.target.closest('.ls-enter')) this.tapEnter(); };
    if (!this.locked) {
      if (!firstOpen || (Store.s.welcomeSound || 'chime') === 'off') { setTimeout(() => this.open(true), firstOpen ? 3000 : 1200); return; }
      // The chime's three notes line up with Y · R · B landing
      this.chime().then(() => setTimeout(() => this.open(true), 2900))
        .catch(() => setTimeout(() => { const b = $('#lsEnter'); if (b) b.hidden = false; }, 1500)); // phone blocked sound until a tap
    }
    else if (this.bioOn() && firstOpen) setTimeout(() => this.bio(true), 450);
  },
  prime() { // iPhone only allows sound that starts from a tap, so warm it up on the first key press
    try { const C = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); } catch {}
    if ((Store.s.welcomeSound === 'voice') && 'speechSynthesis' in window && !this._sp) { this._sp = 1; speechSynthesis.speak(new SpeechSynthesisUtterance('')); }
  },
  key(n) {
    this.prime();
    const len = Store.s.appPinLen || 4;
    if (this.entry.length >= len) return;
    this.entry += n; this.dots();
    if (this.entry.length === len) setTimeout(() => this.check(), 120);
  },
  back() { this.entry = this.entry.slice(0, -1); this.dots(); },
  dots() { $$('#lsDots i').forEach((d, i) => d.classList.toggle('on', i < this.entry.length)); },
  async check() {
    if (await this.hash(this.entry) === Store.s.appPin) return this.open();
    const d = $('#lsDots'); d?.classList.add('shake'); $('#lsMsg').textContent = 'Wrong PIN — try again';
    if (navigator.vibrate) navigator.vibrate(120);
    setTimeout(() => { d?.classList.remove('shake'); this.entry = ''; this.dots(); }, 450);
  },
  tapEnter() { this.prime(); this.chime().catch(() => {}); setTimeout(() => this.open(true), 350); },
  open(auto) {
    const el = this.el(); if (!el) return;
    this.locked = false; document.body.classList.remove('is-locked');
    if (!auto) this.chime().catch(() => {});
    el.classList.add('out');
    setTimeout(() => el.remove(), 450);
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
      this.open();
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
      <div class="li"><div class="li-b"><div class="li-t">Welcome sound</div><div class="li-s">Plays when the app opens</div></div>
        <div class="seg btns">${[['chime', 'Chime'], ['voice', '“Welcome, Yrb”'], ['off', 'Off']].map(([v, l]) => `<button class="${(s.welcomeSound || 'chime') === v ? 'on' : ''}" onclick="Store.s.welcomeSound='${v}';Store.save();App.render();Lock.chime().catch(()=>{})">${l}</button>`).join('')}</div></div>
    </div>`;
  },

  init() {
    this.show(true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.hiddenAt = Date.now();
      else if (this.hasPin() && this.hiddenAt && Date.now() - this.hiddenAt > this.AWAY_MS && !this.el()) this.show(false);
    });
  },
};
