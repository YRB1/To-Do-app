'use strict';
/* Profile — you, appearance (mode + colourways), integrations, preferences, data */

const COLORWAYS = [
  ['violet', 'Royal', 'Violet & gold', 'linear-gradient(135deg,#8b6cff,#4f6bff 60%,#f2c14e)'],
  ['emerald', 'Money', 'Emerald & teal', 'linear-gradient(135deg,#2dd4a0,#059669 60%,#0ea5e9)'],
  ['gold', 'Midas', 'Gold & amber', 'linear-gradient(135deg,#f6cf5f,#d48c0e 60%,#fb923c)'],
  ['ocean', 'Ocean', 'Sky & cobalt', 'linear-gradient(135deg,#38bdf8,#2563eb 60%,#818cf8)'],
  ['rose', 'Rosé', 'Pink & magenta', 'linear-gradient(135deg,#fb7185,#c026d3 60%,#f59e0b)'],
  ['onyx', 'Onyx', 'Graphite mono', 'linear-gradient(135deg,#a1a9bd,#4b5470 60%,#1f2937)'],
  ['crimson', 'Crimson', 'Blood red & black', 'linear-gradient(135deg,#fb5a74,#b0123c 60%,#1a0508)'],
  ['sunset', 'Sunset', 'Orange & pink', 'linear-gradient(135deg,#fb923c,#db2777 60%,#8b5cf6)'],
  ['mint', 'Mint', 'Teal & lime', 'linear-gradient(135deg,#5eead4,#0d9488 60%,#a3e635)'],
  ['forest', 'Forest', 'Green & bronze', 'linear-gradient(135deg,#4ade80,#15803d 60%,#ca8a04)'],
  ['platinum', 'Platinum', 'Silver & white', 'linear-gradient(135deg,#ffffff,#d1d5db 50%,#6b7280)'],
  ['neon', 'Neon', 'Cyan & purple', 'linear-gradient(135deg,#22d3ee,#a855f7 60%,#ec4899)'],
];
const CURRENCIES = [['GBP', '£ British pound'], ['USD', '$ US dollar'], ['EUR', '€ Euro'], ['AUD', 'A$ Australian dollar'], ['CAD', 'C$ Canadian dollar'], ['AED', 'AED UAE dirham'], ['CHF', 'CHF Swiss franc'], ['JPY', '¥ Japanese yen'], ['ZAR', 'R South African rand'], ['NGN', '₦ Nigerian naira'], ['INR', '₹ Indian rupee']];

const Profile = {
  avatar(cls = '') {
    const s = Store.s;
    const initials = (s.name || '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s.photo || '')) return `<div class="avatar photo ${cls}"><img src="${s.photo}" alt="Profile photo"></div>`;
    return `<div class="avatar ${cls}">${esc(s.emoji || initials || '👑')}</div>`;
  },
  set(k, v) { Store.s[k] = v; Store.save(); },
  setRender(k, v) { Store.s[k] = v; Store.save(); App.render(); },

  title: 'Profile',
  sub() { return 'Your details, appearance, integrations and data'; },
  render(p) {
    const tab = p[0] || 'you';
    const tabs = [['you', 'You', 'user'], ['appearance', 'Appearance', 'palette'], ['integrations', 'Integrations', 'link'], ['preferences', 'Preferences', 'settings'], ['data', 'Data & install', 'database']];
    return `<div class="subnav glass">${tabs.map(([id, l, ic]) => `<a href="#/profile${id === 'you' ? '' : '/' + id}" class="${tab === id ? 'active' : ''}">${I(ic, 16)}${l}</a>`).join('')}</div>` +
      ({ you: () => this.you(), appearance: () => this.appearance(), integrations: () => this.integrations(), preferences: () => this.preferences(), data: () => this.data() }[tab] || (() => this.you()))();
  },

  you() {
    const s = Store.s, d = Store.d;
    const doneAll = d.tasks.filter(t => t.done).length, ach = d.goals.filter(g => Goals.progress(g) >= 1).length;
    const focusH = Math.round(sum(d.focus, f => f.min) / 60);
    const ems = ['👑', '🦁', '🦅', '🐺', '🚀', '💎', '🔥', '⚡', '🧠', '🏆', '💼', '📈'];
    return `
      <div class="glass card">
        <div class="profile-hero"><div class="avatar-edit">${this.avatar('xl')}<button class="cam" onclick="Profile.uploadPhoto()" title="Change photo" aria-label="Change profile photo">${I('camera', 16)}</button></div>
          <div class="grow"><h2>${esc(s.name || 'Set your name')}</h2><p class="muted">${esc(s.motto || '')}</p>
            <div class="row wrap mt-s">${chip(`Net worth ${money(Wealth.netWorth(), { compact: true })}`, 'gold', 'crown')}${chip(`${doneAll} tasks done`, 'green', 'check')}${chip(`${ach} goals achieved`, 'accent', 'target')}${chip(`${focusH}h deep work`, 'blue', 'clock')}</div></div>
        </div>
      </div>
      <div class="dash mt">
        <div class="glass card s7">
          <div class="card-h"><h2>${I('user')}About you</h2><span class="sub" id="pSaved"></span></div>
          <form class="form" id="youForm" onsubmit="return false">
            ${F({ name: 'name', label: 'Name', value: s.name, placeholder: 'What should YRB’s World call you?' })}
            ${F({ name: 'email', label: 'Email (optional)', type: 'email', value: s.email, placeholder: 'For your own reference only' })}
            ${F({ name: 'motto', label: 'Personal motto', value: s.motto, full: true, placeholder: 'Your personal mantra', hint: 'Shown on your profile. Your dashboard gets a new quote every day.' })}
          </form>
          <div class="field mt"><span>Profile picture</span><div class="row wrap"><button class="btn" onclick="Profile.uploadPhoto()">${I('camera', 16)}${s.photo ? 'Change photo' : 'Upload photo'}</button>${s.photo ? `<button class="btn ghost danger" onclick="Store.s.photo='';App.refresh()">Remove photo</button>` : ''}</div></div>
          <div class="field mt"><span>Or use an emoji</span><div class="emoji-pick" id="avPick"><button type="button" class="${!s.emoji ? 'on' : ''}" data-e="" style="font-size:12px;font-weight:800">AB</button>${ems.map(e => `<button type="button" class="${s.emoji === e ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div></div>
        </div>
        <div class="glass card s5">
          <div class="card-h"><h2>${I('target')}Your numbers</h2></div>
          <form class="form" id="numForm" onsubmit="return false">
            ${F({ name: 'freedomNumber', label: 'Freedom number', type: 'number', value: s.freedomNumber, full: true, hint: 'Net worth that makes work optional.' })}
            ${F({ name: 'monthlyExpenses', label: 'Monthly expenses', type: 'number', value: s.monthlyExpenses })}
            ${F({ name: 'currency', label: 'Currency', type: 'select', value: s.currency, options: CURRENCIES })}
          </form>
          <div class="mt">${bar(s.freedomNumber ? Wealth.netWorth() / s.freedomNumber : 0, 'gold thick')}<p class="faint mt-s" style="font-size:12.5px">${pct(s.freedomNumber ? Wealth.netWorth() / s.freedomNumber : 0, 1)} of the way to ${money(s.freedomNumber, { compact: true })}</p></div>
        </div>
      </div>`;
  },

  appearance() {
    const s = Store.s;
    const modes = [['light', 'Light', 'sun', 'linear-gradient(160deg,#f6f7ff,#e3e6f7 50%,#f6efd9)', ''], ['dark', 'Dark', 'moon', 'linear-gradient(160deg,#03040b,#120e33 55%,#03140f)', 'dark'], ['black', 'Black', 'moon', '#000', 'dark'], ['system', 'Automatic', 'monitor', 'linear-gradient(90deg,#eef1fb 0 50%,#03040b 50% 100%)', 'dark']];
    return `<div class="dash">
      <div class="glass card s12">
        <div class="card-h"><h2>${I('sun')}Mode</h2><span class="sub">Light and Dark use a gradient · Black is pure OLED black</span></div>
        <div class="mode-cards">${modes.map(([v, l, ic, bg, cls]) => `<button class="mode ${s.theme === v ? 'on' : ''}" onclick="Theme.set('theme','${v}')"><div class="pv ${cls}" style="background:${bg}"><i></i><i></i><i></i></div><b>${I(ic, 15)}${l}</b></button>`).join('')}</div>
      </div>
      <div class="glass card s12">
        <div class="card-h"><h2>${I('palette')}Colourway</h2><span class="sub">Accent colours, buttons and background glow</span></div>
        <div class="swatches">${COLORWAYS.map(([v, l, sub, g]) => `<button class="swatch ${s.accent === v ? 'on' : ''}" onclick="Theme.set('accent','${v}')"><div class="sw-c" style="background:${g}"></div><b>${l}</b><small>${sub}</small></button>`).join('')}</div>
      </div>
      <div class="glass card s6">
        <div class="card-h"><h2>${I('layers')}Glass</h2></div>
        <div class="field"><span>Blur strength</span>
          <div class="seg">${[['low', 'Subtle'], ['med', 'Balanced'], ['high', 'Frosted']].map(([v, l]) => `<label><input type="radio" name="glass" ${s.glass === v ? 'checked' : ''} onchange="Theme.set('glass','${v}')"><span>${l}</span></label>`).join('')}</div>
          <small>“Subtle” is lighter on older iPhones.</small></div>
        <label class="switch-row mt"><input type="checkbox" ${s.orbs ? 'checked' : ''} onchange="Theme.set('orbs',this.checked)"><span class="sw"></span><span class="lbl">Floating background glow</span></label>
      </div>
      <div class="glass card s6">
        <div class="card-h"><h2>${I('sparkles')}Preview</h2></div>
        <div class="row wrap"><button class="btn primary">${I('plus', 16)}Primary</button><button class="btn gold">${I('crown', 16)}Gold</button><button class="btn">Default</button></div>
        <div class="row wrap mt">${chip('Profit', 'green', 'up')}${chip('Loss', 'red', 'down')}${chip('Accent', 'accent', 'zap')}${chip('Gold', 'gold', 'crown')}</div>
        <div class="mt">${bar(.68)}</div>
      </div>
    </div>`;
  },

  integrations() {
    const s = Store.s, origin = location.origin && location.origin !== 'null' ? location.origin : 'https://yrb1.github.io';
    const gState = GCal.connected() ? ['on', 'Connected'] : GCal.configured() ? ['warn', 'Client ID saved — not connected'] : ['', 'Not set up'];
    const nState = Notify.state();
    return `<div class="dash">
      <div class="glass card s12">
        <div class="int-card"><div class="int-ic" style="background:linear-gradient(135deg,#4285f4,#34a853)">${I('calendar', 22)}</div>
          <div class="grow"><div class="row between wrap"><h2 style="font-size:16px;font-weight:800">Google Calendar</h2><span class="status ${gState[0]}">${gState[1]}</span></div>
            <p class="muted" style="font-size:13.5px;margin-top:4px">Two-way: see your Google events in YRB’s World’s calendar and dashboard, and push tasks into Google with one tap. Because Google Calendar syncs to the iPhone Calendar app, tasks you push show up there too.</p>
            <form class="form mt" id="gForm" onsubmit="return false">
              ${F({ name: 'gClientId', label: 'OAuth Client ID', value: s.gClientId, full: true, placeholder: 'xxxxxxxx.apps.googleusercontent.com' })}
              ${F({ name: 'gCalendarId', label: 'Calendar ID', value: s.gCalendarId, placeholder: 'primary', hint: '“primary” = your main calendar' })}
            </form>
            <div class="row wrap mt">
              <button class="btn primary" onclick="Profile.connectG()">${I('link', 16)}${GCal.connected() ? 'Reconnect' : 'Save & connect'}</button>
              ${GCal.connected() ? `<button class="btn" onclick="GCal.pushUpcoming()">${I('upload', 16)}Push upcoming tasks</button><button class="btn ghost danger" onclick="GCal.disconnect()">Disconnect</button>` : ''}
            </div>
            <details class="guide"><summary>${I('info', 16)}One-time setup (about 5 minutes)</summary><ol>
              <li>Go to <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud Console</a> and create a project called <code>YRB’s World</code>.</li>
              <li>Open <b>APIs &amp; Services → Library</b>, search <b>Google Calendar API</b> and click <b>Enable</b>.</li>
              <li><b>OAuth consent screen</b> (Google Auth Platform): choose <b>External</b>, fill in the app name and your email, and add yourself under <b>Test users</b>.</li>
              <li><b>Credentials → Create credentials → OAuth client ID</b> → type <b>Web application</b>.</li>
              <li>Under <b>Authorised JavaScript origins</b> add <code>${esc(origin)}</code>${origin.includes('github.io') ? '' : ' and <code>https://yrb1.github.io</code>'}.</li>
              <li>Copy the <b>Client ID</b>, paste it above and tap <b>Save &amp; connect</b>. Approve access in the Google pop-up.</li>
              <li>Google keeps you signed in for about an hour at a time — tap <b>Refresh</b> on the Calendar page to reconnect.</li>
            </ol></details>
            <p class="hint">No setup? The <b>Send to → Google Calendar</b> button on any task still works — it opens Google’s “add event” page pre-filled.</p>
          </div></div>
      </div>

      <div class="glass card s12">
        <div class="int-card"><div class="int-ic" style="background:linear-gradient(135deg,#ff9f0a,#ff375f)">${I('phone', 22)}</div>
          <div class="grow"><div class="row between wrap"><h2 style="font-size:16px;font-weight:800">iPhone Reminders</h2><span class="status ${Reminders.isApple() ? 'on' : ''}">${Reminders.isApple() ? 'Apple device detected' : 'Use on your iPhone'}</span></div>
            <p class="muted" style="font-size:13.5px;margin-top:4px">Apple doesn’t let websites write to Reminders directly, so YRB’s World hands tasks to a tiny Apple Shortcut that adds them for you — with due date and alert. Tap <b>Send to → iPhone Reminders</b> on any task, or send all upcoming tasks from the Calendar page.</p>
            <form class="form mt" id="rForm" onsubmit="return false">${F({ name: 'shortcutName', label: 'Shortcut name', value: s.shortcutName, full: true, hint: 'Must match the name of the shortcut exactly.' })}</form>
            <div class="row wrap mt"><button class="btn primary" onclick="Profile.saveR();Reminders.test()">${I('play', 16)}Test it</button></div>
            <details class="guide"><summary>${I('info', 16)}Build the shortcut (once, about 2 minutes)</summary><ol>
              <li>Open the <b>Shortcuts</b> app → tap <b>+</b> → rename it <code>${esc(s.shortcutName || 'Add to Reminders')}</code>.</li>
              <li>Add <b>Split Text</b>: split <b>Shortcut Input</b> by <b>New Lines</b>. (If asked, set the shortcut to receive <b>Text</b>.)</li>
              <li>Add <b>Repeat with Each</b> item in <b>Split Text</b>.</li>
              <li>Inside the repeat, add <b>Split Text</b>: split <b>Repeat Item</b> by <b>Custom</b> → type <code>|</code>.</li>
              <li>Add <b>Get Item from List</b> → <b>First Item</b> of that Split Text. This is the title.</li>
              <li>Add <b>Get Item from List</b> → <b>Last Item</b> of the same Split Text, then <b>Get Dates from Input</b> on it.</li>
              <li>Add <b>If</b> <b>Dates</b> <b>has any value</b>:
                <ul style="padding:6px 0 0 18px"><li><b>Add New Reminder</b> → title = <b>First Item</b>, list = your list, tap <b>Show More</b> → <b>Remind Me</b> → <b>At Time</b> = <b>Dates</b>.</li>
                <li><b>Otherwise</b> → <b>Add New Reminder</b> with title = <b>First Item</b>.</li></ul></li>
              <li>Done. Back in YRB’s World, tap <b>Test it</b> — you’ll bounce to Shortcuts and a test reminder appears.</li>
            </ol></details>
            <p class="hint">Prefer Apple Calendar? Use <b>Send to → Apple / .ics</b> — it opens straight in Calendar with an alert.</p>
          </div></div>
      </div>

      <div class="glass card s12">
        <div class="int-card"><div class="int-ic" style="background:linear-gradient(135deg,#d97757,#b8532f)">${I('sparkles', 22)}</div>
          <div class="grow"><div class="row between wrap"><h2 style="font-size:16px;font-weight:800">Claude coach</h2><span class="status ${s.claudeKey ? 'on' : ''}">${s.claudeKey ? 'Key saved' : 'Not connected'}</span></div>
            <p class="muted" style="font-size:13.5px;margin-top:4px">Personal coaching from Claude based on everything in the app: goals, businesses, tasks, trading stats, accounts, money and habits. It suggests what to do next, and you can add any suggestion as a task in one tap. Built-in suggestions work without this.</p>
            <form class="form mt" id="aiForm" onsubmit="return false">
              ${F({ name: 'claudeKey', label: 'Claude API key', type: 'password', value: s.claudeKey, full: true, placeholder: 'sk-ant-…', attrs: ' autocomplete="off" spellcheck="false"' })}
              ${F({ name: 'claudeModel', label: 'Model', type: 'select', value: s.claudeModel, full: true, options: [['claude-opus-5-5', 'Claude Opus 5.5 — best coaching (recommended)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 — faster, cheaper'], ['claude-haiku-5-5', 'Claude Haiku 5.5 — fastest, cheapest']] })}
            </form>
            <div class="row wrap mt"><button class="btn primary" onclick="Profile.saveAI(true)">${I('sparkles', 16)}Save & ask Claude</button>${s.claudeKey ? `<button class="btn ghost danger" onclick="Store.s.claudeKey='';Store.save();App.render()">Remove key</button>` : ''}</div>
            <details class="guide"><summary>${I('info', 16)}How to get a key, and what it costs</summary><ol>
              <li>Go to <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com</a>, sign in, add billing credit, and create an API key.</li>
              <li>Paste it above. It is stored only on this device and sent only to Anthropic’s API.</li>
              <li>Each coaching review sends a summary of your data (no notes or screenshots). With Opus 5.5 a review typically costs a few cents.</li>
              <li>Keep your key private. Anyone with access to this device and app could use it, so set a spending limit in the Claude Console.</li>
            </ol></details>
          </div></div>
      </div>

      <div class="glass card s6">
        <div class="int-card"><div class="int-ic" style="background:linear-gradient(135deg,#22c55e,#0ea5e9)">${I('rewind', 22)}</div>
          <div class="grow"><h2 style="font-size:16px;font-weight:800">FX Replay</h2>
            <p class="muted" style="font-size:13.5px;margin-top:4px">Launch backtests from the Trading → Backtesting tab, link each session and import its CSV export.</p>
            <form class="form mt" id="fxForm" onsubmit="return false">${F({ name: 'fxReplayUrl', label: 'FX Replay URL', type: 'url', value: s.fxReplayUrl, full: true })}</form>
            <div class="row wrap mt"><a class="btn" href="${esc(safeUrl(s.fxReplayUrl) || 'https://app.fxreplay.com')}" target="_blank" rel="noopener">${I('external', 16)}Open FX Replay</a><a class="btn ghost" href="#/trading/backtest">Backtesting ${I('arrowR', 14)}</a></div>
          </div></div>
      </div>
      <div class="glass card s6">
        <div class="int-card"><div class="int-ic" style="background:var(--a-grad)">${I('bell', 22)}</div>
          <div class="grow"><div class="row between wrap"><h2 style="font-size:16px;font-weight:800">Notifications</h2><span class="status ${nState === 'granted' ? 'on' : nState === 'denied' ? 'warn' : ''}">${{ granted: 'On', denied: 'Blocked', default: 'Off', unsupported: 'Not available here' }[nState]}</span></div>
            <p class="muted" style="font-size:13.5px;margin-top:4px">Task reminders and focus-timer alerts. On iPhone, notifications work once YRB’s World is added to your Home Screen (iOS 16.4+), and fire while the app is open or recently used.</p>
            <div class="row wrap mt">${nState === 'granted' ? `<button class="btn" onclick="Notify.show('Test notification','YRB’s World notifications are working.')">${I('bell', 16)}Send test</button>` : `<button class="btn primary" onclick="Notify.request()">${I('bell', 16)}Enable notifications</button>`}</div>
          </div></div>
      </div>
    </div>`;
  },
  saveG() {
    const o = readForm($('#gForm'));
    const changed = o.gClientId !== Store.s.gClientId;
    Store.s.gClientId = o.gClientId; Store.s.gCalendarId = o.gCalendarId || 'primary'; Store.save();
    if (changed) { GCal.token = null; GCal.cache = {}; localStorage.removeItem('empire_gtok'); }
    if (!o.gClientId) { UI.toast('Paste your Client ID first', 'warn'); return false; }
    return true;
  },
  connectG() { if (this.saveG()) GCal.connect().then(ok => { if (ok) App.render(); }); },
  saveAI(ask) {
    const o = readForm($('#aiForm'));
    Store.s.claudeKey = o.claudeKey; Store.s.claudeModel = o.claudeModel || 'claude-opus-5-5'; Store.save();
    if (!o.claudeKey) { UI.toast('Paste your API key first', 'warn'); return; }
    if (ask) { App.go('coach'); Coach.ask(); } else UI.toast(`${I('check', 16)} Saved`, 'success');
  },
  saveR() { const o = readForm($('#rForm')); Store.s.shortcutName = o.shortcutName || 'Add to Reminders'; Store.save(); },

  preferences() {
    const s = Store.s;
    return `<div class="glass card"><form class="form" id="prefForm" onsubmit="return false">
      <div class="form-sec">General</div>
      ${F({ name: 'defaultView', label: 'Open the app on', type: 'select', value: s.defaultView, options: [['dashboard', 'Dashboard'], ['tasks', 'Tasks'], ['calendar', 'Calendar'], ['trading', 'Trading journal'], ['goals', 'Goals']] })}
      ${F({ name: 'weekStart', label: 'Week starts on', type: 'select', value: s.weekStart, options: [[1, 'Monday'], [0, 'Sunday'], [6, 'Saturday']] })}
      ${F({ name: 'taskView', label: 'Default task layout', type: 'select', value: s.taskView, options: [['list', 'List'], ['board', 'Board']] })}
      ${F({ name: 'currency', label: 'Currency', type: 'select', value: s.currency, options: CURRENCIES })}
      <div class="form-sec">Trading</div>
      ${F({ name: 'defaultRisk', label: `Default risk per trade (${s.currency})`, type: 'number', value: s.defaultRisk, hint: 'Pre-fills new trades so R multiples calculate automatically.' })}
      ${F({ name: 'fxReplayUrl', label: 'FX Replay URL', type: 'url', value: s.fxReplayUrl })}
      <div class="form-sec">Money</div>
      ${F({ name: 'freedomNumber', label: 'Freedom number', type: 'number', value: s.freedomNumber })}
      ${F({ name: 'monthlyExpenses', label: 'Monthly expenses', type: 'number', value: s.monthlyExpenses })}
      <div class="form-sec">Dashboard</div>
      ${F({ name: 'sampleBanner', label: 'Show sample-data banner', type: 'switch', value: s.sampleBanner })}
    </form><p class="hint" id="prefSaved" style="margin-top:14px">Changes save automatically.</p></div>`;
  },

  data() {
    const used = (() => { try { return new Blob([localStorage.getItem(Store.KEY) || '']).size; } catch { return 0; } })();
    const d = Store.d;
    return `<div class="dash">
      <div class="glass card s6">
        <div class="card-h"><h2>${I('database')}Your data</h2></div>
        <p class="muted" style="font-size:13.5px">Everything is stored privately on this device — nothing is sent to a server. Each device (phone, laptop) keeps its own copy, so use a backup to move data between them (AirDrop or iCloud Drive works well).</p>
        <div class="stat-row mt"><div><small>Tasks</small><b>${d.tasks.length}</b></div><div><small>Trades</small><b>${d.trades.length}</b></div><div><small>Storage</small><b>${(used / 1024).toFixed(0)} KB</b></div></div>
        <p class="faint mt-s" style="font-size:12.5px">Last backup: ${Backup.lastLabel()}</p>
        <div class="row wrap mt"><button class="btn primary" onclick="Backup.export()">${I('download', 16)}Download backup</button><button class="btn" onclick="Backup.import()">${I('upload', 16)}Restore backup</button></div>
        <div class="row wrap mt-s"><button class="btn sm" onclick="Trading.exportCSV()">${I('download', 14)}Trades CSV</button><button class="btn sm" onclick="ICS.download(Store.d.tasks.filter(t=>!t.done&&t.due))">${I('calendar', 14)}Tasks .ics</button></div>
      </div>
      <div class="glass card s6">
        <div class="card-h"><h2>${I('phone')}Install on iPhone</h2></div>
        <ol style="padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px" class="muted">
          <li>Open <b>${esc(location.origin && location.origin !== 'null' ? location.host + location.pathname : 'yrb1.github.io/To-Do-app')}</b> in <b>Safari</b>.</li>
          <li>Tap the <b>Share</b> button (square with arrow).</li>
          <li>Choose <b>Add to Home Screen</b> → <b>Add</b>.</li>
          <li>Open YRB’s World from your Home Screen — it runs full-screen, works offline and can send notifications.</li>
        </ol>
        <p class="hint">Note: the Home Screen app keeps its own storage, separate from Safari. Set it up there.</p>
      </div>
      <div class="glass card s12">
        <div class="card-h"><h2>${I('trash')}Reset</h2></div>
        <div class="row wrap">
          ${hasSample() ? `<button class="btn" onclick="UI.confirm('Clear sample data?','Sample tasks, goals, businesses, trades, habits and assets are removed. Your own data stays.','Clear',clearSample,false)">${I('sparkles', 16)}Clear sample data</button>` : ''}
          <button class="btn" onclick="Tasks.clearDone()">${I('check', 16)}Clear completed tasks</button>
          <button class="btn danger" onclick="Profile.resetAll()">${I('trash', 16)}Erase everything</button>
        </div>
      </div>
    </div>`;
  },
  uploadPhoto() {
    pickFile('image/*', f => {
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => {
        const S = 320, side = Math.min(img.naturalWidth, img.naturalHeight);
        const c = document.createElement('canvas'); c.width = c.height = S;
        c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, S, S);
        URL.revokeObjectURL(url);
        Store.s.photo = c.toDataURL('image/jpeg', .86);
        App.refresh(); UI.toast(`${I('check', 16)} Profile picture updated`, 'success');
      };
      img.onerror = () => { URL.revokeObjectURL(url); UI.toast('Couldn’t read that image — try a JPG or PNG', 'error'); };
      img.src = url;
    });
  },
  resetAll() {
    UI.confirm('Erase everything?', 'All tasks, goals, businesses, trades, habits, assets and settings on this device are permanently deleted. Download a backup first if you might want them.', 'Erase everything', () => {
      const keepTheme = { theme: Store.s.theme, accent: Store.s.accent };
      Store.d = Store.defaults(); Object.assign(Store.d.settings, keepTheme, { sampleBanner: false });
      localStorage.removeItem('tm_tasks');
      Store.save(); App.go('dashboard'); UI.toast('Everything erased — fresh start');
    });
  },

  after(el, p) {
    const tab = p[0] || 'you';
    const flash = id => { const s = $(id); if (s) { s.textContent = 'Saved'; clearTimeout(this._ft); this._ft = setTimeout(() => { if ($(id)) $(id).textContent = id === '#prefSaved' ? 'Changes save automatically.' : ''; }, 1500); } };
    if (tab === 'you') {
      const yf = $('#youForm', el), nf = $('#numForm', el);
      yf.oninput = debounce(() => { Object.assign(Store.s, readForm(yf)); Store.save(); flash('#pSaved'); App.renderNav(); $('.profile-hero h2') && ($('.profile-hero h2').textContent = Store.s.name || 'Set your name'); }, 350);
      nf.onchange = () => { const o = readForm(nf); Store.s.freedomNumber = o.freedomNumber || 0; Store.s.monthlyExpenses = o.monthlyExpenses || 0; Store.s.currency = o.currency; App.refresh(); };
      $('#avPick', el).onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; Store.s.emoji = b.dataset.e; Store.s.photo = ''; App.refresh(); };
    }
    if (tab === 'preferences') {
      const f = $('#prefForm', el);
      f.onchange = () => { const o = readForm(f); o.weekStart = +o.weekStart; Object.assign(Store.s, o); Tasks.mode = null; Store.save(); App.renderNav(); flash('#prefSaved'); };
    }
    if (tab === 'integrations') {
      const fx = $('#fxForm', el); fx.onchange = () => { Store.s.fxReplayUrl = readForm(fx).fxReplayUrl; Store.save(); };
      const r = $('#rForm', el); r.onchange = () => this.saveR();
      const ai = $('#aiForm', el); ai.onchange = () => { const o = readForm(ai); Store.s.claudeKey = o.claudeKey; Store.s.claudeModel = o.claudeModel; Store.save(); };
      const g = $('#gForm', el); g.oninput = debounce(() => { if (readForm(g).gClientId) GCal.loadScript().catch(() => {}); }, 600);
    }
  },
};
App.register('profile', Profile);
