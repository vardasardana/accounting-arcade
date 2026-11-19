// Global game state, settings, scoring helpers and local persistence.
export const LEVELS = [
  { n: 1, key: 'L1', name: 'Concept Catch', topic: 'Concepts, principles and conventions', goal: 'Catch each case file in the basket of the concept it shows.', place: 'The archive room' },
  { n: 2, key: 'L2', name: 'Balance the Scale', topic: 'Accounting equation', goal: 'Put the right weights on the right jars so Assets = Liabilities + Equity.', place: 'The roastery counter' },
  { n: 3, key: 'L3', name: 'Asset Sorter Conveyor', topic: 'Balance Sheet classification', goal: 'Push every crate into the right Balance Sheet chute.', place: 'The factory floor' },
  { n: 4, key: 'L4', name: 'Profit Highway', topic: 'Income Statement and COGS', goal: 'Steer into the right lane and build the Income Statement.', place: 'The highway' },
  { n: 5, key: 'L5', name: 'Cash Flow Shooting Gallery', topic: 'Statement of Cash Flows', goal: 'Shoot each cash-flow target with the right gun: Operating, Investing or Financing, then Add back or Deduct.', place: 'The fairground' },
  { n: 6, key: 'L6', name: 'Ratio Supermarket', topic: 'Ratio analysis', goal: 'Shop for the numerator and denominator, compute the ratio, then fire news headlines at the right company.', place: 'The supermarket' },
];

export const POWERUPS = [
  { key: 'peek', name: 'Formula Peek', icon: 'pu_peek', hotkey: 'Shift+1', desc: 'Shows a hint for the current item.' },
  { key: 'slow', name: 'Slow Motion', icon: 'pu_slow', hotkey: 'Shift+2', desc: 'Everything moves at half speed for 10 seconds.' },
  { key: 'shield', name: 'Shield', icon: 'pu_shield', hotkey: 'Shift+3', desc: 'Your next wrong answer costs no heart and keeps your streak.' },
  { key: 'double', name: 'Double Points', icon: 'pu_double', hotkey: 'Shift+4', desc: 'Doubles coins for your next 5 correct answers.' },
  { key: 'heart', name: 'Extra Heart', icon: 'pu_heart', hotkey: 'Auto', desc: 'Start the next level with one extra heart (maximum 4).' },
];

const SETTINGS_KEY = 'aa_settings_v1';
const defaults = { music: 0.5, sfx: 0.8, muted: false, speed: 'standard', largeText: false, reducedMotion: false, highContrast: false, patterns: false };

export const S = {
  config: null, data: null, report: [], overrides: [],
  settings: { ...defaults },
  player: null,
  run: null,
  preview: false,
};

export function loadSettings() {
  try { Object.assign(S.settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* ignore */ }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches && localStorage.getItem(SETTINGS_KEY) === null) S.settings.reducedMotion = true;
}
export function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(S.settings)); applyBodyClasses(); }
export function applyBodyClasses() {
  document.body.classList.toggle('large-text', !!S.settings.largeText);
  document.body.classList.toggle('high-contrast', !!S.settings.highContrast);
  document.body.classList.toggle('reduced-motion', !!S.settings.reducedMotion);
}
export function classCode() { return localStorage.getItem('aa_class_code') || S.config?.class_code || ''; }
export function speedLocked() { return localStorage.getItem('aa_speed_lock') ? true : !!S.config?.speed_locked; }
export function effectiveSpeed() {
  const lock = localStorage.getItem('aa_speed_lock');
  return lock || (S.config?.speed_locked ? S.config.default_speed : S.settings.speed) || 'standard';
}
export function speedFactor() { return (S.config?.speeds || { relaxed: 0.7, standard: 1, fast: 1.2 })[effectiveSpeed()] || 1; }
export const fs = (px) => Math.round(px * (S.settings.largeText ? 1.2 : 1));

export function newRun(mode = 'class') {
  const inv = { peek: 0, slow: 0, shield: 0, double: 0, heart: 0 };
  const free = S.config?.free_starting_power_up; if (free && inv[free] !== undefined) inv[free] = 1;
  S.run = { mode, wallet: 0, total: 0, levels: {}, log: [], inventory: inv, bestStreak: 0, start: Date.now(), end: null, speed: effectiveSpeed(), practiceLevel: null };
  return S.run;
}

export function streakMult(streak) {
  const steps = S.config?.scoring?.streak_steps || [[0, 1], [3, 1.5], [6, 2], [10, 3]];
  let m = 1; for (const [min, mult] of steps) if (streak >= min) m = mult; return m;
}

export function starsFor(failed, acc) { if (failed) return 0; if (acc >= 0.9) return 3; if (acc >= 0.75) return 2; return 1; }

// ---------- local persistence ----------
export function unlockLevel(n) {
  const u = new Set(JSON.parse(localStorage.getItem('aa_unlocked') || '[1]'));
  u.add(n); localStorage.setItem('aa_unlocked', JSON.stringify([...u]));
}
export function unlockedLevels() { return new Set(JSON.parse(localStorage.getItem('aa_unlocked') || '[1]')); }

export function saveRunRecord(rec) {
  const all = JSON.parse(localStorage.getItem('aa_runs') || '[]');
  all.push(rec); while (all.length > 300) all.shift();
  localStorage.setItem('aa_runs', JSON.stringify(all));
}
export function allRuns() { return JSON.parse(localStorage.getItem('aa_runs') || '[]'); }
export function clearRuns() { localStorage.removeItem('aa_runs'); }

export function summarise(run) {
  const counted = run.log.filter((l) => l.counted !== false);
  const correct = counted.filter((l) => l.ok).length;
  const byTopic = {}, bySub = {};
  for (const l of counted) {
    (byTopic[l.topic] ||= { c: 0, n: 0 }); byTopic[l.topic].n++; if (l.ok) byTopic[l.topic].c++;
    const k = l.topic + '|' + l.subtopic; (bySub[k] ||= { c: 0, n: 0, topic: l.topic, sub: l.subtopic }); bySub[k].n++; if (l.ok) bySub[k].c++;
  }
  const stars = Object.values(run.levels).reduce((a, l) => a + (l.stars || 0), 0);
  const revise = Object.values(bySub).filter((s) => s.c < s.n).sort((a, b) => a.c / a.n - b.c / b.n || b.n - a.n).slice(0, 3);
  return { correct, attempted: counted.length, acc: counted.length ? correct / counted.length : 0, byTopic, bySub, stars, revise,
    time: Math.round(((run.end || Date.now()) - run.start) / 1000) };
}

export function fmtMoney(n) { const s = Math.abs(n).toLocaleString('en-US'); return (n < 0 ? '−$' : '$') + s; }
export function fmtSigned(n) { return (n < 0 ? '−$' : '+$') + Math.abs(n).toLocaleString('en-US'); }
export function fmtTime(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; }

const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'piss', 'slut', 'whore', 'bastard', 'asshole', 'nigg', 'fag', 'rape', 'porn', 'sex', 'chutiya', 'bhenchod', 'madarchod', 'gaand', 'randi', 'harami', 'kutta'];
export function nameProblem(name) {
  const n = (name || '').trim();
  if (n.length < 2 || n.length > 16) return 'Use 2 to 16 characters.';
  if (!/^[A-Za-z0-9 ]+$/.test(n)) return 'Use letters, numbers and spaces only.';
  const flat = n.toLowerCase().replace(/[^a-z]/g, '');
  if (BAD.some((b) => flat.includes(b))) return 'Please choose a different name.';
  return '';
}
