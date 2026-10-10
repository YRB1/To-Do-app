'use strict';
/* ==========================================================================
   YRB’s World — core: helpers · store · icons · UI kit · charts · router
   ========================================================================== */

// ── Helpers ───────────────────────────────────────────────────────────────
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd();
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const sum = (arr, f = x => x) => arr.reduce((a, x) => a + (+f(x) || 0), 0);
const isNum = v => v !== null && v !== '' && v !== undefined && !isNaN(v);
const LOCALE = navigator.language || 'en-GB';
const toLocalInput = ms => { const d = new Date(ms); return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

function relDate(s) {
  if (!s) return '';
  const diff = daysBetween(today(), s);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const d = parseYmd(s);
  if (diff > 1 && diff < 7) return d.toLocaleDateString(LOCALE, { weekday: 'short' });
  const o = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return d.toLocaleDateString(LOCALE, o);
}
const fmtDay = (s, o = { weekday: 'long', day: 'numeric', month: 'long' }) => parseYmd(s).toLocaleDateString(LOCALE, o);
function fmtTime(hm) {
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
}
function fmtDT(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
}
function money(n, { sign = false, compact = false } = {}) {
  if (!isNum(n)) return '—';
  n = +n;
  const abs = Math.abs(n);
  const o = { style: 'currency', currency: Store.s.currency || 'GBP' };
  if (compact && abs >= 10000) { o.notation = 'compact'; o.maximumFractionDigits = 1; }
  else { const dp = abs >= 1000 || Number.isInteger(n) ? 0 : 2; o.minimumFractionDigits = dp; o.maximumFractionDigits = dp; }
  let s; try { s = new Intl.NumberFormat(LOCALE, o).format(abs); } catch { s = abs.toFixed(2); }
  return (n < 0 ? '−' : sign && n > 0 ? '+' : '') + s;
}
const num = (n, dp = 2) => !isNum(n) ? '—' : (+n).toLocaleString(LOCALE, { maximumFractionDigits: dp });
const pct = (n, dp = 0) => !isNum(n) ? '—' : (n * 100).toFixed(dp) + '%';
const rFmt = (r, sign = true) => !isNum(r) ? '—' : (r > 0 && sign ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(2) + 'R';
const pnlCls = n => n > 0 ? 'pos' : n < 0 ? 'neg' : '';
function greet() { const h = new Date().getHours(); return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function debounce(fn, ms = 400) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function downloadFile(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function pickFile(accept, cb, multiple = false) {
  const i = document.createElement('input');
  i.type = 'file'; i.accept = accept; i.multiple = multiple;
  i.onchange = () => { if (i.files.length) cb(multiple ? [...i.files] : i.files[0]); };
  i.click();
}
const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';

// ── Trading journal pick-lists (editable in Trading → Accounts & setup) ──
const TJ_DEFAULTS = {
  pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'XAUUSD', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURJPY', 'US30', 'NAS100', 'SPX500', 'BTCUSD', 'ETHUSD'],
  sessions: ['Asia', 'London', 'New York', 'London/NY overlap'],
  biases: ['Bullish', 'Bearish', 'Neutral'],
  types: ['Continuation', 'Reversal', 'Breakout', 'Range', 'Scalp', 'Swing'],
  timeframes: ['1m', '5m', '15m', '1H', '4H', 'Daily'],
  confluences: ['HTF trend', 'Liquidity sweep', 'Order block', 'Fair value gap', 'Break of structure', 'Key level', 'News catalyst'],
  mistakes: ['Early entry', 'Late entry', 'Moved stop', 'No stop', 'Oversized', 'FOMO', 'Revenge trade', 'Cut winner early', 'Ignored plan'],
  emotions: ['Calm', 'Focused', 'Confident', 'Patient', 'Impatient', 'FOMO', 'Fearful', 'Greedy', 'Revenge', 'Bored', 'Tired'],
  firms: ['FTMO', 'FundedNext', 'The5%ers', 'Topstep', 'Apex Trader Funding', 'E8 Markets', 'FundingPips', 'Alpha Capital'],
};
const TAG_FIXED = { Bullish: '#10b981', Bearish: '#f43f5e', Neutral: '#94a3b8', Long: '#10b981', Short: '#f43f5e', Win: '#10b981', Loss: '#f43f5e', 'Break-even': '#94a3b8', Live: '#3b82f6', 'Prop firm': '#f59e0b', Demo: '#94a3b8', Backtest: '#8b5cf6' };
const TAG_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
function tagColor(s) { if (TAG_FIXED[s]) return TAG_FIXED[s]; let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return TAG_COLORS[Math.abs(h) % TAG_COLORS.length]; }
const tag = (s, cls = '') => s ? `<span class="tg ${cls}" style="--tc:${tagColor(s)}">${esc(s)}</span>` : '';

// ── Icons (lucide-style strokes) ──────────────────────────────────────────
const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
  tasks: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  candles: '<path d="M8 4v3"/><rect x="5.5" y="7" width="5" height="8" rx="1"/><path d="M8 15v4"/><path d="M16 3v5"/><rect x="13.5" y="8" width="5" height="6" rx="1"/><path d="M16 14v6"/>',
  wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  chevL: '<polyline points="15 18 9 12 15 6"/>',
  chevR: '<polyline points="9 18 15 12 9 6"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  crown: '<path d="M2 18h20"/><path d="m3 15-1-9 6 4 4-7 4 7 6-4-1 9z"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  refresh: '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  rewind: '<polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  up: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  down: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  repeat: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  arrowR: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c.93 0 1.5-.75 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-4.97-4.48-9-10-9z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.29 1.29L3 12l5.8 1.9a2 2 0 0 1 1.29 1.29L12 21l1.9-5.8a2 2 0 0 1 1.29-1.29L21 12l-5.8-1.9a2 2 0 0 1-1.29-1.29Z"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
};
const I = (name, size = 18, sw = 2) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ── Store ─────────────────────────────────────────────────────────────────
const Store = {
  KEY: 'empire_v1',
  d: null,
  get s() { return this.d.settings; },
  defaults() {
    return {
      version: 1,
      settings: {
        name: '', emoji: '', photo: '', motto: 'Discipline today, freedom tomorrow.', email: '',
        theme: 'dark', accent: 'violet', glass: 'med', orbs: true,
        currency: 'GBP', weekStart: 1, defaultView: 'dashboard', taskView: 'list',
        gClientId: '', gCalendarId: 'primary',
        shortcutName: 'Add to Reminders',
        fxReplayUrl: 'https://app.fxreplay.com', defaultRisk: 100,
        monthlyExpenses: 2500, freedomNumber: 1000000,
        notif: false, sampleBanner: true,
        claudeKey: '', claudeModel: 'claude-opus-5-5',
        music: { playlists: [], current: '', open: false },
      },
      tasks: [], goals: [], businesses: [], trades: [], backtests: [], setups: [], accounts: [],
      tjLists: JSON.parse(JSON.stringify(TJ_DEFAULTS)),
      assets: [], incomes: [], nwHistory: [], habits: [], focus: [],
    };
  },
  load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch { raw = null; }
    this.d = raw ? this.normalize(raw) : seedData();
    const before = this.d.settings.yrbSeeded;
    ensureYrbBusinesses(this.d);
    if (!raw || !before) this.save();
  },
  normalize(o) {
    const d = this.defaults();
    const out = { ...d, ...o, settings: { ...d.settings, ...(o.settings || {}) } };
    for (const k of Object.keys(d)) if (Array.isArray(d[k]) && !Array.isArray(out[k])) out[k] = [];
    out.tasks = out.tasks.map(normTask);
    out.tjLists = { ...d.tjLists, ...(o.tjLists || {}) };
    out.settings.music = { ...d.settings.music, ...(out.settings.music || {}) };
    return out;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.d)); }
    catch { UI.toast(`${I('info', 16)} Storage is full — export a backup from Profile`, 'error'); }
  },
  replace(o) { this.d = this.normalize(o); this.save(); },
  biz(id) { return this.d.businesses.find(b => b.id === id); },
  goal(id) { return this.d.goals.find(g => g.id === id); },
};

function normTask(t) {
  return {
    id: String(t.id ?? uid()), text: t.text || '', notes: t.notes || '',
    done: !!t.done, doing: !!t.doing && !t.done, doneAt: t.doneAt || 0,
    priority: ['low', 'med', 'high'].includes(t.priority) ? t.priority : 'low',
    cat: t.cat || '', bizId: t.bizId || '', goalId: t.goalId || '',
    due: t.due || '', time: t.time || '', repeat: t.repeat || 'none',
    reminder: t.reminder || 0, reminderFired: !!t.reminderFired,
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    createdAt: t.createdAt || Date.now(), gcalId: t.gcalId || '', spawned: !!t.spawned, sample: !!t.sample,
  };
}

// First-run data: migrates the old app's tasks, plus clearly-marked sample data.
function seedData() {
  const d = Store.defaults();
  const S = true, t0 = today(), now = Date.now();
  const rnd = mulberry32(7);
  let old = null;
  try { old = JSON.parse(localStorage.getItem('tm_tasks') || 'null'); } catch { old = null; }

  const months = n => { const a = []; const x = new Date(); x.setDate(1); for (let i = n - 1; i >= 0; i--) { const y = new Date(x.getFullYear(), x.getMonth() - i, 1); a.push(monthKey(y)); } return a; };
  const m6 = months(6);

  d.businesses = yrbBusinesses();
  d.settings.yrbSeeded = true;

  d.goals = [
    { id: 'g_income', title: '£10k / month income', cat: 'Wealth', kind: 'number', unit: 'money', start: 0, target: 10000, current: 4850, deadline: addDays(t0, 180), why: 'Replace my salary and buy back my time.', bizId: '', milestones: [], log: [], createdAt: now - 90 * 864e5, sample: S },
    { id: 'g_funded', title: 'Get funded — £100k prop account', cat: 'Trading', kind: 'milestones', unit: 'number', start: 0, target: 0, current: 0, deadline: addDays(t0, 75), why: 'Trade size without risking my own capital.', bizId: '', milestones: [{ id: uid(), text: 'Backtest 100 trades of my A+ setup', done: true }, { id: uid(), text: '30 days journaling every trade', done: true }, { id: uid(), text: 'Pass phase 1', done: false }, { id: uid(), text: 'Pass phase 2', done: false }, { id: uid(), text: 'First payout', done: false }], log: [], createdAt: now - 40 * 864e5, sample: S },
    { id: 'g_store', title: 'Land the first 10 ClientSniper clients', cat: 'Business', kind: 'milestones', unit: 'number', start: 0, target: 0, current: 0, deadline: addDays(t0, 45), why: '', bizId: 'b_clientsniper', milestones: [{ id: uid(), text: 'Offer and pricing locked in', done: true }, { id: uid(), text: 'First paying client', done: false }, { id: uid(), text: '10 paying clients', done: false }], log: [], createdAt: now - 20 * 864e5, sample: S },
    { id: 'g_books', title: 'Read 24 books this year', cat: 'Learning', kind: 'number', unit: 'number', start: 0, target: 24, current: 15, deadline: `${new Date().getFullYear()}-12-31`, why: '', bizId: '', milestones: [], log: [], createdAt: now - 200 * 864e5, sample: S },
  ];

  const habitDays = p => { const o = {}; for (let i = 1; i < 30; i++) if (rnd() < p) o[addDays(t0, -i)] = 1; return o; };
  d.habits = [
    { id: 'h1', name: 'Pre-market prep', emoji: '📊', days: habitDays(.8), createdAt: now, sample: S },
    { id: 'h2', name: 'Gym', emoji: '🏋️', days: habitDays(.65), createdAt: now, sample: S },
    { id: 'h3', name: 'Journal every trade', emoji: '📓', days: habitDays(.85), createdAt: now, sample: S },
    { id: 'h4', name: 'Read 20 pages', emoji: '📚', days: habitDays(.6), createdAt: now, sample: S },
  ];

  d.setups = [
    { id: 's1', name: 'London Breakout', rules: 'Mark the Asian range\nWait for a candle close outside the range\nEnter on the retest\nStop beyond the opposite side · target 2R', notes: '', sample: S },
    { id: 's2', name: 'NY Reversal', rules: 'Liquidity sweep of London high/low\nMarket structure shift on 5m\nEnter on fair value gap · target 3R', notes: '', sample: S },
    { id: 's3', name: 'Trend Pullback', rules: 'HTF trend clear on 4H\nPullback into 50% of the leg\nConfirmation candle · target previous high', notes: '', sample: S },
  ];
  d.backtests = [
    { id: 'bt1', name: 'London Breakout — EURUSD H1 2024', setup: 'London Breakout', symbol: 'EURUSD', timeframe: '15m', from: '2024-01-01', to: '2024-06-30', url: '', balance: 10000, riskPct: 1, status: 'Active', notes: '', createdAt: now, sample: S },
  ];

  d.accounts = [
    { id: 'a_prop', name: 'FTMO 100k Challenge', type: 'prop', firm: 'FTMO', phase: 'Challenge', size: 100000, riskPct: 1, target: 10, maxDD: 10, dailyDD: 5, status: 'Active', start: addDays(t0, -45), notes: '', sample: S },
    { id: 'a_live', name: 'Personal live', type: 'live', firm: 'IC Markets', phase: '', size: 10000, riskPct: 1, target: 0, maxDD: 0, dailyDD: 0, status: 'Active', start: addDays(t0, -120), notes: '', sample: S },
    { id: 'a_bt', name: 'FX Replay backtests', type: 'backtest', firm: 'FX Replay', phase: '', size: 10000, riskPct: 1, target: 0, maxDD: 0, dailyDD: 0, status: 'Active', start: '2024-01-01', notes: '', sample: S },
  ];
  const base = { EURUSD: 1.085, GBPUSD: 1.27, XAUUSD: 2350, NAS100: 18500, USDJPY: 151.2 };
  const dp = { EURUSD: 5, GBPUSD: 5, XAUUSD: 2, NAS100: 1, USDJPY: 3 };
  const mk = (i, acct, dayStr, setup, btId) => {
    const sym = Object.keys(base)[Math.floor(rnd() * 5)];
    const side = rnd() < .55 ? 'long' : 'short';
    const roll = rnd();
    const r = roll < .5 ? +(1.2 + rnd() * 1.8).toFixed(2) : roll < .58 ? 0 : -1;
    const risk = acct === 'backtest' ? 100 : 100 + Math.round(rnd() * 3) * 50;
    const entry = base[sym] * (1 + (rnd() - .5) * .02);
    const dist = base[sym] * .0025;
    const dir = side === 'long' ? 1 : -1;
    const f = v => +v.toFixed(dp[sym]);
    const h = rnd() < .5 ? 8 + Math.floor(rnd() * 3) : 13 + Math.floor(rnd() * 3);
    const rules = r < 0 ? rnd() < .55 : rnd() < .85;
    return {
      id: 't' + i + acct, date: `${dayStr}T${pad(h)}:${pad(Math.floor(rnd() * 60))}`, exitDate: `${dayStr}T${pad(h + 1 + Math.floor(rnd() * 3))}:${pad(Math.floor(rnd() * 60))}`, symbol: sym, side, account: acct, accountId: { prop: 'a_prop', live: 'a_live', backtest: 'a_bt' }[acct], backtestId: btId || '',
      bias: side === 'long' ? (rnd() < .8 ? 'Bullish' : 'Neutral') : (rnd() < .8 ? 'Bearish' : 'Neutral'), tradeType: ['Continuation', 'Reversal', 'Breakout'][Math.floor(rnd() * 3)],
      confluences: ['HTF trend', 'Liquidity sweep', 'Fair value gap', 'Key level', 'Break of structure'].filter(() => rnd() < .4), mistakes: rules ? [] : [['Moved stop', 'FOMO', 'Early entry'][Math.floor(rnd() * 3)]],
      setup, session: h < 12 ? 'London' : 'New York', timeframe: ['5m', '15m', '1H'][Math.floor(rnd() * 3)],
      entry: f(entry), sl: f(entry - dir * dist), tp: f(entry + dir * dist * 2.5), exit: f(entry + dir * dist * r),
      size: +(.5 + rnd() * 2).toFixed(2), risk, pnl: Math.round(r * risk), fees: acct === 'backtest' ? 0 : 7, r: null,
      emotion: rules ? ['Calm', 'Confident', 'Calm', 'Focused'][Math.floor(rnd() * 4)] : ['FOMO', 'Impatient', 'Revenge'][Math.floor(rnd() * 3)],
      grade: rules ? (r > 0 ? 'A+' : 'A') : 'C', rules, tags: '', notes: '', lesson: '', chartUrl: '', replayUrl: '', images: [], sample: S,
    };
  };
  const setups = d.setups.map(s => s.name);
  for (let i = 0; i < 28; i++) {
    let day = addDays(t0, -Math.floor(rnd() * 45) - 1);
    const wd = parseYmd(day).getDay(); if (wd === 0) day = addDays(day, 1); if (wd === 6) day = addDays(day, -1);
    d.trades.push(mk(i, rnd() < .6 ? 'prop' : 'live', day, setups[Math.floor(rnd() * 3)]));
  }
  for (let i = 0; i < 36; i++) d.trades.push(mk(i, 'backtest', addDays('2024-01-02', i * 4), 'London Breakout', 'bt1'));

  d.assets = [
    { id: 'a1', name: 'Current account', kind: 'asset', cat: 'Cash', value: 6400, sample: S },
    { id: 'a2', name: 'Stocks & Shares ISA', kind: 'asset', cat: 'Investments', value: 14250, sample: S },
    { id: 'a3', name: 'Trading account', kind: 'asset', cat: 'Trading', value: 9800, sample: S },
    { id: 'a4', name: 'Crypto', kind: 'asset', cat: 'Crypto', value: 2300, sample: S },
    { id: 'a5', name: 'Credit card', kind: 'liability', cat: 'Credit card', value: 850, sample: S },
  ];
  d.incomes = [{ id: 'i1', name: 'Dividends', amount: 45, type: 'passive', sample: S }];
  const nwNow = 6400 + 14250 + 9800 + 2300 - 850;
  d.nwHistory = [-150, -120, -95, -60, -40, -20, 0].map((k, i, a) => ({ date: addDays(t0, -(a.length - 1 - i) * 30), value: Math.round(nwNow + k * 60 + (i ? rnd() * 300 : 0)), sample: S }));
  d.nwHistory[d.nwHistory.length - 1].value = nwNow;

  if (Array.isArray(old) && old.length) {
    d.tasks = old.map(normTask);
  } else {
    const T = (text, o = {}) => normTask({ id: uid() + Math.floor(rnd() * 1e4), text, createdAt: now, sample: S, ...o });
    d.tasks = [
      T('Review weekly P&L and journal lessons', { priority: 'high', due: t0, time: '18:00', repeat: 'weekly' }),
      T('Send proposal to new ClientSniper lead', { priority: 'high', bizId: 'b_clientsniper', due: t0, goalId: 'g_income' }),
      T('Record a YRB Voice Agents demo call', { priority: 'med', bizId: 'b_voice', due: addDays(t0, 1), subtasks: [{ id: uid(), text: 'Write the call script', done: true }, { id: uid(), text: 'Record and edit', done: false }] }),
      T('Backtest 20 more London Breakout trades', { priority: 'med', due: addDays(t0, 2), goalId: 'g_funded' }),
      T('Update net worth tracker', { priority: 'low', due: addDays(t0, 3), repeat: 'monthly' }),
      T('Follow up with YRB Nova leads', { priority: 'high', bizId: 'b_nova', due: addDays(t0, -1) }),
      T('Decide if YRB Supreme is worth continuing', { priority: 'low', bizId: 'b_supreme', doing: true }),
      T('Morning plan: top 3 priorities', { done: true, doneAt: now - 3600e3, due: t0, repeat: 'daily' }),
    ];
    const past = ['Follow up with 3 leads', 'Post on Instagram', 'Reconcile business account', 'Review backtest results', 'Client strategy call', 'Write product descriptions', 'Pay VAT', 'Plan content for next week', 'Mark up weekly levels', 'Update ad budgets', 'Gym + meal prep', 'Read trading psychology chapter', 'Send weekly report to client'];
    for (let i = 1; i < 14; i++) if (rnd() < .8) d.tasks.push(T(past[i - 1], { done: true, doneAt: now - i * 864e5, due: addDays(t0, -i), priority: rnd() < .3 ? 'high' : 'low' }));
  }
  return d;
}
// The user's own businesses — prefilled once (websites/logos are added in each business's Edit).
function yrbBusinesses() {
  const now = Date.now();
  const b = (id, name, emoji, color, status, url, logo, desc, notes = '') => ({ id, name, emoji, color, status, url, logo, desc, revenue: 0, target: 10000, costs: 0, notes, log: [], createdAt: now });
  return [
    b('b_clientsniper', 'ClientSniper', '🎯', '#c9a465', 'Building', 'https://clientsniperofficial.com', 'icons/biz/clientsniper.svg', 'Client acquisition platform: find local businesses that need better websites.'),
    b('b_nova', 'YRB Nova', '✨', '#8b5cf6', 'Building', 'https://yrbnova.com', 'icons/biz/yrb-nova.png', 'Custom websites for UK small businesses, from £350, live in 2–5 days.'),
    b('b_voice', 'YRB Voice Agents', '🎙️', '#0ea5e9', 'Building', 'https://ai-receptionist-backend-sage.vercel.app', '', 'AI voice agents and receptionists for businesses.', 'Code: https://github.com/YRB1/ai-receptionist-backend'),
    b('b_supreme', 'YRB Supreme', '👑', '#f59e0b', 'Testing', 'https://www.yrbsupreme.com', 'icons/biz/yrb-supreme.webp', 'Quality jewellery shipped across the UK.', 'Trial run — set a kill-or-commit date.'),
  ];
}
function ensureYrbBusinesses(d) {
  if (d.settings.yrbSeeded) return;
  for (const nb of yrbBusinesses()) if (!d.businesses.some(x => x.name.toLowerCase() === nb.name.toLowerCase())) d.businesses.push(nb);
  d.settings.yrbSeeded = true;
}
const hasSample = () => ['tasks', 'goals', 'businesses', 'trades', 'backtests', 'setups', 'accounts', 'assets', 'incomes', 'nwHistory', 'habits'].some(k => Store.d[k].some(x => x.sample));
function clearSample() {
  for (const k of ['tasks', 'goals', 'businesses', 'trades', 'backtests', 'setups', 'accounts', 'assets', 'incomes', 'nwHistory', 'habits']) Store.d[k] = Store.d[k].filter(x => !x.sample);
  Store.s.sampleBanner = false;
  App.refresh();
  UI.toast(`${I('check', 16)} Sample data cleared — it's all yours now`, 'success');
}

// ── Theme / appearance ────────────────────────────────────────────────────
const Theme = {
  mq: matchMedia('(prefers-color-scheme: dark)'),
  resolved() { const t = Store.s.theme; return t === 'system' ? (this.mq.matches ? 'dark' : 'light') : t === 'black' ? 'dark' : t; },
  apply() {
    const r = this.resolved(), h = document.documentElement;
    h.dataset.theme = r;
    h.dataset.accent = Store.s.accent || 'violet';
    h.dataset.glass = Store.s.glass || 'med';
    const black = Store.s.theme === 'black';
    if (black) h.dataset.black = '1'; else delete h.dataset.black;
    $('.bg') && ($('.bg').style.display = '');
    $$('.orb').forEach(o => o.style.display = Store.s.orbs ? '' : 'none');
    const meta = $('meta[name=theme-color]'); if (meta) meta.content = black ? '#000000' : r === 'dark' ? '#03040b' : '#eef1f8';
    try { localStorage.setItem('empire_theme', r); localStorage.setItem('empire_accent', h.dataset.accent); localStorage.setItem('empire_black', black ? '1' : ''); } catch {}
    const b = $('#themeBtn'); if (b) b.innerHTML = I(r === 'dark' ? 'sun' : 'moon');
  },
  set(k, v) { Store.s[k] = v; Store.save(); this.apply(); App.render(); },
  toggle() {
    if (this.resolved() === 'dark') { Store.s.lastDark = Store.s.theme === 'black' ? 'black' : 'dark'; this.set('theme', 'light'); }
    else this.set('theme', Store.s.lastDark || 'dark');
  },
};

// ── UI kit ────────────────────────────────────────────────────────────────
const UI = {
  stack: [],
  toast(msg, type = '') {
    const host = $('#toasts'); if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = msg;
    host.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, type === 'error' || type === 'warn' ? 4200 : 2600);
  },
  modal({ title, body, footer = [], wide = false, small = false, onOpen, onClose }) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${small ? 'small' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title.replace(/<[^>]+>/g, ''))}">
      <div class="grabber"></div>
      <div class="modal-h"><h3>${title}</h3><button class="btn ghost icon sm" data-close aria-label="Close">${I('x')}</button></div>
      <div class="modal-b">${body}</div>
      ${footer.filter(Boolean).length ? '<div class="modal-f"></div>' : ''}
    </div>`;
    const m = { el: wrap, body: wrap.querySelector('.modal-b'), close: () => UI.close(m), onClose };
    const f = wrap.querySelector('.modal-f');
    footer.filter(Boolean).forEach(b => {
      if (b === 'spacer') { f.insertAdjacentHTML('beforeend', '<div class="spacer"></div>'); return; }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ' + (b.cls || '');
      btn.innerHTML = (b.icon ? I(b.icon, 16) : '') + `<span>${b.label}</span>`;
      btn.onclick = async () => { const r = b.onClick ? await b.onClick(m) : undefined; if (r !== false) m.close(); };
      f.appendChild(btn);
    });
    let downOnWrap = false;
    wrap.addEventListener('pointerdown', e => { downOnWrap = e.target === wrap; });
    wrap.addEventListener('click', e => { if (e.target === wrap && downOnWrap) m.close(); });
    wrap.querySelector('[data-close]').onclick = () => m.close();
    document.body.appendChild(wrap);
    document.body.classList.add('modal-open');
    UI.stack.push(m);
    onOpen && onOpen(m);
    return m;
  },
  close(m) {
    m = m || UI.stack[UI.stack.length - 1];
    if (!m || !UI.stack.includes(m)) return;
    UI.stack = UI.stack.filter(x => x !== m);
    m.el.classList.add('closing');
    setTimeout(() => m.el.remove(), 170);
    if (!UI.stack.length) document.body.classList.remove('modal-open');
    m.onClose && m.onClose();
  },
  confirm(title, text, label, fn, danger = true) {
    return UI.modal({
      title, small: true, body: `<p class="muted">${text}</p>`,
      footer: ['spacer', { label: 'Cancel', cls: 'ghost' }, { label, cls: danger ? 'danger-solid' : 'primary', onClick: () => { fn(); } }],
    });
  },
};

// Form builder — every field renders from a small spec.
function F(f) {
  const v = f.value ?? '';
  const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
  const extra = (f.step ? ` step="${f.step}"` : '') + (f.list ? ` list="${f.list}"` : '') + (f.required ? ' required' : '') + (f.inputmode ? ` inputmode="${f.inputmode}"` : '') + (f.attrs || '');
  let ctl;
  switch (f.type) {
    case 'select':
      ctl = `<select name="${f.name}"${extra}>${f.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
      break;
    case 'textarea':
      ctl = `<textarea name="${f.name}" rows="${f.rows || 3}"${ph}${extra}>${esc(v)}</textarea>`;
      break;
    case 'seg':
      ctl = `<div class="seg">${f.options.map(([val, lab]) => `<label><input type="radio" name="${f.name}" value="${esc(val)}"${String(val) === String(v) ? ' checked' : ''}><span>${lab}</span></label>`).join('')}</div>`;
      break;
    case 'switch':
      return `<label class="switch-row field${f.full ? ' full' : ''}"><input type="checkbox" name="${f.name}"${v ? ' checked' : ''}><span class="sw"></span><span class="lbl">${esc(f.label)}</span></label>`;
    case 'number':
      ctl = `<input type="number" name="${f.name}" value="${esc(v)}"${ph} step="${f.step || 'any'}" inputmode="${f.inputmode || 'decimal'}"${f.attrs || ''}>`;
      break;
    default:
      ctl = `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}"${ph}${extra}${f.type === 'text' || !f.type ? ' autocomplete="off"' : ''}>`;
  }
  return `<div class="field${f.full ? ' full' : ''}"><span>${esc(f.label)}</span>${ctl}${f.hint ? `<small>${f.hint}</small>` : ''}</div>`;
}
function readForm(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; else if (!(el.name in o)) o[el.name] = ''; continue; }
    if (el.type === 'checkbox') { o[el.name] = el.checked; continue; }
    if (el.type === 'number') { o[el.name] = el.value === '' ? null : parseFloat(el.value); continue; }
    o[el.name] = typeof el.value === 'string' ? el.value.trim() : el.value;
  }
  return o;
}
const datalist = (id, items) => `<datalist id="${id}">${[...new Set(items.filter(Boolean))].map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;

function ring(p, size = 64, stroke = 7, cls = '', label = null) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = clamp(+p || 0, 0, 1);
  const svg = `<svg class="ring ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-fg" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - v)).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  return label === null ? svg : `<div class="ring-wrap">${svg}<b>${label}</b></div>`;
}
const bar = (p, cls = '') => `<div class="bar ${cls}"><i style="width:${(clamp(+p || 0, 0, 1) * 100).toFixed(1)}%"></i></div>`;
const chip = (text, cls = '', icon = '') => `<span class="chip ${cls}">${icon ? I(icon, 12) : ''}${text}</span>`;
const empty = (icon, title, text = '', action = '') => `<div class="empty"><div class="e-ic">${I(icon, 26)}</div><b>${title}</b>${text ? `<p>${text}</p>` : ''}${action}</div>`;
function kpi(label, value, { icon = 'zap', tone = '', sub = '', cls = '' } = {}) {
  return `<div class="kpi glass ${cls}"><div class="k-top"><div class="k-ic ${tone}">${I(icon, 17)}</div><div class="label">${label}</div></div><div class="value">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}

// ── Charts (dependency-free SVG/HTML) ─────────────────────────────────────
const Chart = {
  area(vals, { h = 200, cls = '', zero = false, labels = [], fmt = v => v } = {}) {
    if (vals.length < 2) return `<div class="chart-empty" style="height:${h}px">Not enough data yet</div>`;
    const W = 600, H = h, p = 8;
    let min = Math.min(...vals), max = Math.max(...vals);
    if (zero) { min = Math.min(min, 0); max = Math.max(max, 0); }
    if (min === max) { min -= 1; max += 1; }
    const x = i => (i / (vals.length - 1)) * W;
    const y = v => p + (1 - (v - min) / (max - min)) * (H - p * 2);
    const line = 'M' + vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' L');
    const id = 'ga' + uid();
    const z = zero && min < 0 ? `<line x1="0" x2="${W}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" class="zero" vector-effect="non-scaling-stroke"/>` : '';
    return `<div class="chart ${cls}" style="height:${h}px"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="stop-a"/><stop offset="1" class="stop-b"/></linearGradient></defs>
      <path d="${line} L${W},${H} L0,${H} Z" fill="url(#${id})"/>${z}
      <path d="${line}" class="line" vector-effect="non-scaling-stroke"/></svg>
      <div class="chart-y"><span>${fmt(max)}</span><span>${fmt(min)}</span></div></div>
      ${labels.length ? `<div class="chart-x"><span>${esc(labels[0])}</span><span>${esc(labels[labels.length - 1])}</span></div>` : ''}`;
  },
  bars(items, { h = 140, signed = false, fmt = v => v } = {}) {
    const max = Math.max(1e-9, ...items.map(i => Math.abs(i.value)));
    return `<div class="vbars ${signed ? 'signed' : ''}" style="height:${h}px">${items.map(i => {
      const p = Math.abs(i.value) / max * (signed ? 50 : 100);
      return `<div class="vb" title="${esc(i.label)}: ${esc(fmt(i.value))}"><div class="vb-col"><i class="${i.value < 0 ? 'neg' : 'pos'}" style="height:${p.toFixed(1)}%"></i></div><span>${esc(i.short ?? i.label)}</span></div>`;
    }).join('')}</div>`;
  },
  hbars(items, { fmt = v => v, signed = true, sub } = {}) {
    if (!items.length) return `<div class="chart-empty" style="min-height:90px">No data yet</div>`;
    const max = Math.max(1e-9, ...items.map(i => Math.abs(i.value)));
    return `<div class="hbars">${items.map(i => `<div class="hb"><div class="hb-l" title="${esc(i.label)}">${esc(i.label)}${i.sub ? `<small>${esc(i.sub)}</small>` : ''}</div><div class="hb-t"><i class="${signed ? (i.value < 0 ? 'neg' : '') : 'acc'}" style="width:${(Math.abs(i.value) / max * 100).toFixed(1)}%"></i></div><div class="hb-v ${signed ? pnlCls(i.value) : ''}">${fmt(i.value)}</div></div>`).join('')}</div>`;
  },
};

// ── Router / shell ────────────────────────────────────────────────────────
const NAV = [
  { sec: 'Command' },
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'music', label: 'Music', icon: 'music' },
  { sec: 'Growth' },
  { id: 'goals', label: 'Goals', icon: 'target' },
  { id: 'business', label: 'Businesses', icon: 'briefcase' },
  { id: 'habits', label: 'Habits', icon: 'flame' },
  { id: 'coach', label: 'Coach', icon: 'sparkles' },
  { sec: 'Money' },
  { id: 'trading', label: 'Trading Journal', icon: 'candles' },
  { id: 'wealth', label: 'Wealth', icon: 'wallet' },
];
const TABS = [['dashboard', 'Home', 'home'], ['tasks', 'Tasks', 'tasks'], ['calendar', 'Calendar', 'calendar'], ['trading', 'Trading', 'candles'], ['more', 'More', 'grid']];

const App = {
  views: {}, cur: 'dashboard', params: [],
  register(name, view) { this.views[name] = view; },
  go(path) { if (location.hash === '#/' + path) this.route(); else location.hash = '#/' + path; },
  route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const name = this.views[parts[0]] ? parts[0] : (this.views[Store.s.defaultView] ? Store.s.defaultView : 'dashboard');
    const changed = name !== this.cur || parts.slice(1).join('/') !== this.params.join('/');
    this.cur = name; this.params = parts.slice(1);
    UI.stack.slice().forEach(m => UI.close(m));
    this.render();
    if (changed) window.scrollTo({ top: 0 });
  },
  render() {
    const v = this.views[this.cur];
    const el = $('#view');
    el.innerHTML = v.render(this.params);
    $('#pageTitle').innerHTML = typeof v.title === 'function' ? v.title(this.params) : v.title;
    $('#pageSub').innerHTML = v.sub ? v.sub(this.params) : '';
    $('#viewActions').innerHTML = v.actions ? v.actions(this.params) : '';
    document.title = ($('#pageTitle').textContent || 'YRB’s World') + ' · YRB’s World';
    this.renderNav();
    v.after && v.after(el, this.params);
  },
  refresh() { Store.save(); this.render(); },
  renderNav() {
    const d = Store.d, t0 = today();
    const overdue = d.tasks.filter(t => !t.done && t.due && t.due < t0).length;
    const dueToday = d.tasks.filter(t => !t.done && t.due === t0).length;
    const counts = { tasks: overdue ? [overdue, 'hot'] : dueToday ? [dueToday, ''] : null };
    const nw = Wealth.netWorth();
    const name = Store.s.name || 'Your Profile';
    $('#sidebar').innerHTML = `
      <a class="brand" href="#/dashboard" style="text-decoration:none"><div class="logo">${I('crown', 21)}</div><div><b>YRB’s World</b><small>COMMAND CENTRE</small></div></a>
      <nav class="nav">${NAV.map(n => n.sec ? `<div class="nav-section">${n.sec}</div>` :
        `<a href="#/${n.id}" class="${this.cur === n.id ? 'active' : ''}">${I(n.icon)}<span>${n.label}</span>${counts[n.id] ? `<span class="count ${counts[n.id][1]}">${counts[n.id][0]}</span>` : ''}</a>`).join('')}</nav>
      <div class="sidebar-foot">
        <a class="me side-link ${this.cur === 'profile' ? 'active' : ''}" href="#/profile">${Profile.avatar()}<div class="grow"><b class="ellipsis">${esc(name)}</b><small>Net worth ${money(nw, { compact: true })}</small></div>${I('settings', 16)}</a>
      </div>`;
    const moreIds = ['goals', 'business', 'habits', 'wealth', 'profile', 'music', 'coach'];
    $('#tabbar').innerHTML = TABS.map(([id, label, icon]) => {
      const active = id === 'more' ? moreIds.includes(this.cur) : this.cur === id;
      return id === 'more'
        ? `<a href="javascript:void 0" onclick="App.more()" class="${active ? 'active' : ''}">${I(icon, 22)}<span>${label}</span></a>`
        : `<a href="#/${id}" class="${active ? 'active' : ''}">${I(icon, 22)}<span>${label}</span></a>`;
    }).join('');
    Theme.apply();
  },
  more() {
    const tiles = [['goals', 'Goals', 'target'], ['business', 'Businesses', 'briefcase'], ['habits', 'Habits', 'flame'], ['wealth', 'Wealth', 'wallet'], ['music', 'Music', 'music'], ['coach', 'Coach', 'sparkles'], ['profile', 'Profile', 'user']];
    UI.modal({
      title: 'More', body: `<div class="tiles">${tiles.map(([id, l, ic]) => `<a class="tile" href="#/${id}">${I(ic, 24)}${l}</a>`).join('')}</div>
        <div class="row mt"><button class="btn block" onclick="Theme.toggle()">${I(Theme.resolved() === 'dark' ? 'sun' : 'moon', 16)}Switch to ${Theme.resolved() === 'dark' ? 'light' : 'dark'} mode</button></div>`,
    });
  },
};

const QuickAdd = {
  open() {
    const items = [
      ['Task', 'tasks', 'Tasks.edit()'], ['Trade', 'candles', 'Trading.edit()'], ['Goal', 'target', 'Goals.edit()'],
      ['Business', 'briefcase', 'Business.edit()'], ['Habit', 'flame', 'Habits.edit()'], ['Asset', 'wallet', 'Wealth.editAsset()'],
    ];
    UI.modal({
      title: 'Quick add', small: true,
      body: `<div class="tiles">${items.map(([l, ic, fn]) => `<button class="tile" onclick="UI.close();${fn}">${I(ic, 24)}${l}</button>`).join('')}</div>
      <p class="hint" style="text-align:center;margin-top:14px">Tip: press <code>N</code> anywhere for a new task</p>`,
    });
  },
};
