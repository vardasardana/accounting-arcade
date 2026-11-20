// Loads config + question files from ./data, validates rows (spec 12.5), skips and reports bad ones.
import Papa from 'papaparse';

export const TOPICS = {
  1: 'Concepts, principles and conventions',
  2: 'Accounting equation',
  3: 'Balance Sheet classification',
  4: 'Income Statement and COGS',
  5: 'Statement of Cash Flows',
  6: 'Ratio analysis',
};

export const FILES = {
  l1: 'level1_concepts.csv', l1w: 'level1_waves.csv', l1b: 'level1_baskets.csv',
  l2: 'level2_equation.csv', l3: 'level3_classify.csv', l4: 'level4_profit.csv',
  l5: 'level5_targets.csv', l6s: 'level6_shelf.csv', l6: 'level6_ratios.csv', l6g: 'level6_slingshot.json',
};

export const CHUTES = ['Non-current Asset', 'Current Asset', 'Liability', 'Current Liability', 'Non-current Liability', 'Equity', 'Notes only / Not recorded'];
const CF = ['Operating', 'Investing', 'Financing', 'None'];
const MAX_MOVING = 110;

async function fetchText(name) {
  const override = localStorage.getItem('aa_override_' + name);
  if (override) return { text: override, override: true };
  const res = await fetch('data/' + name, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return { text: await res.text(), override: false };
}

const truthy = (v) => /^(true|1|yes|y)$/i.test(String(v ?? '').trim());
const list = (v) => String(v ?? '').split('|').map((s) => s.trim()).filter(Boolean);
const num = (v) => { const n = Number(String(v ?? '').trim()); return Number.isFinite(n) ? n : NaN; };

function parseCsv(text) {
  const r = Papa.parse(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim() });
  return r.data;
}

// Turns sheet rows ({headers, rows:[[sheetRow, ...cells]]}) or CSV text into row objects that carry __row (the row number to report).
function rowsOf(src) {
  if (src && src.rows) return src.rows;
  return parseCsv((src && src.text) || '');
}
function tabToRows(tab) {
  const headers = (tab.headers || []).map((h) => String(h ?? '').trim());
  return (tab.rows || []).map((cells) => {
    const o = { __row: cells[0] };
    headers.forEach((h, i) => { if (h) o[h] = cells[i + 1] == null ? '' : String(cells[i + 1]); });
    return o;
  }).filter((o) => headers.some((h) => h && String(o[h]).trim() !== ''));
}

// ---------- Questions from the Google Sheet (same Apps Script web app as the leaderboard) ----------
export const TABS = {
  l1b: 'Q_L1_baskets', l1w: 'Q_L1_waves', l1: 'Q_L1_concepts', l2: 'Q_L2_equation', l3: 'Q_L3_classify',
  l4: 'Q_L4_profit', l5: 'Q_L5_targets', l6s: 'Q_L6_shelf', l6: 'Q_L6_ratios',
};
export const SLING_TABS = { ratios: 'Q_L6_sling_ratios', companies: 'Q_L6_sling_companies', headlines: 'Q_L6_sling_headlines' };
const SHEET_CACHE = 'aa_sheet_questions_v1:';

// Instructor links: ?i=<Apps Script deployment id> sends scores AND questions to that instructor's Sheet;
// ?section=<code> gives a section its own leaderboard. Kept for this browser tab so reloads keep them.
export function linkParams() {
  let q = new URLSearchParams(location.search);
  if (!q.get('i') && !q.get('section')) {
    try { const saved = sessionStorage.getItem('aa_link'); if (saved) { q = new URLSearchParams(saved); history.replaceState(null, '', location.pathname + '?' + saved + location.hash); } } catch {}
  }
  let raw = (q.get('i') || '').trim();
  const m = raw.match(/\/macros\/s\/([\w-]+)\/exec/); if (m) raw = m[1];
  const id = /^AKfy[\w-]{20,150}$/.test(raw) ? raw : '';
  const section = (q.get('section') || '').replace(/<[^>]*>/g, '').replace(/[^\w \-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  const keep = new URLSearchParams(); if (id) keep.set('i', id); if (section) keep.set('section', section);
  try { if (keep.toString()) sessionStorage.setItem('aa_link', keep.toString()); } catch {}
  return { id, section, badId: raw && !id ? raw.slice(0, 40) : '' };
}
export const execUrl = (id) => `https://script.google.com/macros/s/${id}/exec`;

async function fetchSheetTabs(url, ms) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'action=questions', { signal: ctl.signal, cache: 'no-store' });
    const j = await res.json();
    if (!j || !j.ok || !j.tabs || typeof j.tabs !== 'object') return { notReady: true };
    return { tabs: j.tabs };
  } finally { clearTimeout(t); }
}

// Rebuilds the Headline Slingshot object from three sheet tabs.
function slingFromTabs(tabs, add) {
  const R = tabToRows(tabs[SLING_TABS.ratios]), C = tabToRows(tabs[SLING_TABS.companies]), H = tabToRows(tabs[SLING_TABS.headlines]);
  if (!R.length || !C.length || !H.length) return null;
  const ratios = R.filter((r) => r.key && r.label).map((r) => ({ key: r.key.trim(), label: r.label.trim(), unit: (r.unit || '').trim() }));
  const rounds = []; let industry = '';
  C.forEach((c) => {
    const rid = (c.round_id || '').trim(); if (!rid) { add('Sheet tab ' + SLING_TABS.companies, c.__row, '', 'Missing round_id'); return; }
    if (!industry && c.industry) industry = c.industry.trim();
    let rd = rounds.find((x) => x.id === rid);
    if (!rd) { rd = { id: rid, __row: c.__row, companies: [], headlines: [] }; rounds.push(rd); }
    const vals = {}; ratios.forEach((r) => { vals[r.key] = String(c[r.key] ?? '').trim() === '' ? NaN : Number(c[r.key]); });
    rd.companies.push({ name: (c.name || '').trim(), ceo: (c.ceo || '').trim(), colour: (c.colour || '').trim() || undefined, ratios: vals });
  });
  H.forEach((h) => {
    const rd = rounds.find((x) => x.id === (h.round_id || '').trim());
    if (!rd) { add('Sheet tab ' + SLING_TABS.headlines, h.__row, h.id, `round_id "${h.round_id}" is not in ${SLING_TABS.companies}`); return; }
    rd.headlines.push({ __row: h.__row, id: (h.id || '').trim(), source: (h.source || '').trim(), text: (h.text || '').trim(), answer: (h.answer || '').trim(), category: (h.category || '').trim(), ratio: (h.ratio || '').trim(), explanation: (h.explanation || '').trim(), active: truthy(h.active ?? 'TRUE') || String(h.active ?? '').trim() === '' });
  });
  return { industry: industry || 'Pharmaceuticals', ratios, rounds };
}

export async function loadAll() {
  const config = await (await fetch('data/config.json', { cache: 'no-cache' })).json();
  const early = [];
  const lp = linkParams();
  config.defaultSheet = !lp.id;
  if (lp.id) { config.LEADERBOARD_URL = execUrl(lp.id); config.QUESTIONS_URL = execUrl(lp.id); }
  if (lp.section) { config.class_code = lp.section; config.section = lp.section; }
  if (lp.badId) early.push({ file: 'Game link', row: '-', id: '', reason: `The i= part of the link ("${lp.badId}") is not a valid Apps Script id, so the default Sheet is used`, severity: 'warning' });
  const bundled = {};
  for (const [k, f] of Object.entries(FILES)) {
    try { bundled[k] = await fetchText(f); } catch (e) { early.push({ file: f, row: '-', id: '', reason: 'File could not be loaded: ' + e.message, severity: 'error' }); bundled[k] = { text: '' }; }
  }
  // Questions from the Google Sheet: live (timeout in QUESTIONS_TIMEOUT_S; Apps Script often takes 6-12 s), else the last good copy on this device, else the built-in files.
  let tabs = null, source = { kind: 'files', note: 'Built-in question files' };
  const url = config.QUESTIONS_URL || config.LEADERBOARD_URL;
  if (config.QUESTIONS_FROM_SHEET && url) {
    try {
      const r = await fetchSheetTabs(url, (config.QUESTIONS_TIMEOUT_S || 15) * 1000);
      if (r.tabs) { tabs = r.tabs; source = { kind: 'sheet', note: 'Google Sheet (loaded just now)' }; try { localStorage.setItem(SHEET_CACHE + url, JSON.stringify({ at: Date.now(), tabs })); } catch {} }
      else source.note = 'Built-in question files (the Google Sheet script has no question tabs yet: run setupQuestionTabs and deploy a new version)';
    } catch (e) {
      try { const c = JSON.parse(localStorage.getItem(SHEET_CACHE + url) || 'null'); if (c && c.tabs) { tabs = c.tabs; source = { kind: 'cache', note: 'Google Sheet copy saved on this device at ' + new Date(c.at).toLocaleString('en-IN') + ' (the Sheet could not be reached just now)' }; } } catch {}
      if (!tabs) source.note = 'Built-in question files (the Google Sheet could not be reached)';
    }
  }
  const raw = { ...bundled }, FN = { ...FILES }, fromSheet = new Set(), sheetNotes = [];
  if (tabs) {
    for (const [k, tab] of Object.entries(TABS)) {
      if (bundled[k].override) continue; // an instructor-uploaded file on this device wins
      const rows = tabs[tab] ? tabToRows(tabs[tab]) : [];
      if (rows.length) { raw[k] = { rows }; FN[k] = 'Sheet tab ' + tab; fromSheet.add(k); }
      else sheetNotes.push({ file: 'Sheet tab ' + tab, row: '-', id: '', reason: `Tab ${tabs[tab] ? 'is empty' : 'is missing'}, so the built-in ${FILES[k]} is used`, severity: 'warning' });
    }
    if (!bundled.l6g.override) {
      const tmp = [];
      const obj = slingFromTabs(tabs, (file, row, id, reason) => tmp.push({ file, row, id: id || '', reason, severity: 'error' }));
      if (obj) { raw.l6g = { obj }; FN.l6g = 'Sheet tabs Q_L6_sling_*'; fromSheet.add('l6g'); sheetNotes.push(...tmp); }
      else sheetNotes.push({ file: 'Sheet tabs Q_L6_sling_*', row: '-', id: '', reason: 'One of the three slingshot tabs is missing or empty, so the built-in ' + FILES.l6g + ' is used', severity: 'warning' });
    }
  }
  let res = validateAll(raw, FN);
  // A level must never end up empty: if every row of a sheet tab was rejected, use the built-in file for that tab.
  const OUT = { l1b: 'baskets', l1w: 'waves1', l1: 'l1', l2: 'l2', l3: 'l3', l4: 'l4', l5: 'l5', l6s: 'shelf', l6: 'l6' };
  const empty = [...fromSheet].filter((k) => (k === 'l6g' ? !res.data.l6g.rounds.length : !res.data[OUT[k]].length));
  if (empty.length) {
    empty.forEach((k) => { raw[k] = bundled[k]; FN[k] = FILES[k]; fromSheet.delete(k); sheetNotes.push({ file: k === 'l6g' ? 'Sheet tabs Q_L6_sling_*' : 'Sheet tab ' + TABS[k], row: '-', id: '', reason: 'No usable rows, so the built-in ' + FILES[k] + ' is used for now', severity: 'error' }); });
    const rejected = res.report.filter((r) => empty.some((k) => r.file === (k === 'l6g' ? 'Sheet tabs Q_L6_sling_*' : 'Sheet tab ' + TABS[k])));
    res = validateAll(raw, FN); res.report = [...rejected, ...res.report];
  }
  source.tabs = [...fromSheet].map((k) => (k === 'l6g' ? 'Q_L6_sling_*' : TABS[k]));
  return { config, report: [...early, ...sheetNotes, ...res.report], overrides: Object.entries(bundled).filter(([, v]) => v.override).map(([k]) => FILES[k]), source, data: res.data };
}

export function validateAll(raw, FN) {
  const report = [];
  const add = (file, row, id, reason, severity = 'error') => report.push({ file, row, id: id || '', reason, severity });
  const ids = new Set();
  const uniq = (file, row, id) => {
    if (!id) { add(file, row, id, 'Missing id'); return false; }
    if (ids.has(id)) { add(file, row, id, 'Duplicate id'); return false; }
    ids.add(id); return true;
  };
  const req = (file, row, id, obj, fields) => {
    for (const f of fields) if (obj[f] === undefined || String(obj[f]).trim() === '') { add(file, row, id, `Missing required field "${f}"`); return false; }
    return true;
  };
  const lenWarn = (file, row, id, text) => { if (text && text.length > MAX_MOVING) add(file, row, id, `Text is ${text.length} characters (over ${MAX_MOVING}) for a moving card`, 'warning'); };

  // ---------- Level 1 ----------
  const baskets = [];
  rowsOf(raw.l1b).forEach((r, i) => {
    if (!r.name) { add(FN.l1b, r.__row || i + 2, '', 'Missing basket name'); return; }
    baskets.push({ name: r.name.trim(), short: (r.short || r.name).trim(), idea: (r.idea || '').trim(), icon: (r.icon || '').trim() });
  });
  const basketNames = new Set(baskets.map((b) => b.name));
  const waves1 = [];
  rowsOf(raw.l1w).forEach((r, i) => {
    const row = r.__row || i + 2;
    const w = { wave: num(r.wave), name: (r.name || '').trim(), baskets: list(r.baskets), cards: num(r.cards), fall: num(r.fall_time_s), maxOn: num(r.max_on_screen) || 1 };
    if (!Number.isFinite(w.wave) || !Number.isFinite(w.cards) || !Number.isFinite(w.fall)) { add(FN.l1w, row, 'wave ' + r.wave, 'wave, cards and fall_time_s must be numbers'); return; }
    if (!(w.baskets.length === 1 && w.baskets[0] === 'RANDOM')) {
      const bad = w.baskets.filter((b) => !basketNames.has(b));
      if (bad.length) { add(FN.l1w, row, 'wave ' + w.wave, 'Unknown basket: ' + bad.join(', ')); return; }
      if (w.baskets.length < 3 || w.baskets.length > 4) { add(FN.l1w, row, 'wave ' + w.wave, 'A wave needs 3 or 4 baskets'); return; }
      if (w.baskets.includes('Accrual (Revenue Recognition) Concept') && w.baskets.includes('Matching Concept')) { add(FN.l1w, row, 'wave ' + w.wave, 'Accrual and Matching may never be on the cart together'); return; }
    }
    waves1.push(w);
  });
  const l1 = [];
  rowsOf(raw.l1).forEach((r, i) => {
    const row = r.__row || i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FN.l1, row, id, r, ['id', 'wave', 'prompt', 'correct', 'explanation'])) return;
    if (!basketNames.has(r.correct.trim())) { add(FN.l1, row, id, `Correct answer "${r.correct}" is not a basket name`); return; }
    const conflicts = list(r.conflicts_with);
    const badC = conflicts.filter((c) => !basketNames.has(c));
    if (badC.length) { add(FN.l1, row, id, 'Unknown concept in conflicts_with: ' + badC.join(', ')); return; }
    const wave = num(r.wave);
    const wdef = waves1.find((w) => w.wave === wave);
    if (wdef && wdef.baskets[0] !== 'RANDOM') {
      if (!wdef.baskets.includes(r.correct.trim())) { add(FN.l1, row, id, `Correct basket is not in wave ${wave}'s basket set`); return; }
      const clash = conflicts.filter((c) => wdef.baskets.includes(c));
      if (clash.length) { add(FN.l1, row, id, `Conflicting concept on the same cart in wave ${wave}: ${clash.join(', ')}`); return; }
    }
    if (!uniq(FN.l1, row, id)) return;
    lenWarn(FN.l1, row, id, r.prompt);
    l1.push({ id, level: 1, topic: TOPICS[1], wave, subtopic: (r.subtopic || '').trim(), prompt: r.prompt.trim(), correct: r.correct.trim(), conflicts, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 2 ----------
  const l2 = [];
  rowsOf(raw.l2).forEach((r, i) => {
    const row = r.__row || i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FN.l2, row, id, r, ['id', 'wave', 'prompt', 'effects', 'explanation'])) return;
    const effects = []; let bad = '';
    for (const e of list(r.effects)) {
      const p = e.split(':'); if (p.length !== 3) { bad = `Effect "${e}" must be item:side:change`; break; }
      const [item, side, ch] = p.map((s) => s.trim()); const change = num(ch);
      if (!['Assets', 'Liabilities', 'Equity'].includes(side)) { bad = `Side "${side}" must be Assets, Liabilities or Equity`; break; }
      if (!Number.isFinite(change) || change === 0) { bad = `Change "${ch}" is not a number`; break; }
      const alts = item.split('/').map((x) => x.trim()).filter(Boolean);
      if (alts.length > 1 && side !== 'Assets') { bad = `Alternatives ("${item}") are only allowed for asset jars`; break; }
      effects.push({ item: alts[0], alts, side, change });
    }
    if (bad) { add(FN.l2, row, id, bad); return; }
    if (effects.length < 2) { add(FN.l2, row, id, 'At least two effects are needed'); return; }
    const sum = (s) => effects.filter((e) => e.side === s).reduce((a, e) => a + e.change, 0);
    if (sum('Assets') !== sum('Liabilities') + sum('Equity')) { add(FN.l2, row, id, 'Effects do not balance (Assets ≠ Liabilities + Equity)'); return; }
    const decoys = [];
    for (const d of list(r.decoys)) { const p = d.split(':'); const ch = num(p[p.length - 1]); if (Number.isFinite(ch) && ch !== 0) decoys.push({ item: p.slice(0, -1).join(':').trim(), change: ch }); }
    if (!uniq(FN.l2, row, id)) return;
    l2.push({ id, level: 2, topic: TOPICS[2], wave: num(r.wave), subtopic: (r.subtopic || '').trim(), prompt: r.prompt.trim(), effects, decoys, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 3 ----------
  const l3 = [];
  rowsOf(raw.l3).forEach((r, i) => {
    const row = r.__row || i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FN.l3, row, id, r, ['id', 'wave', 'item', 'correct_5chute', 'explanation'])) return;
    const wave = num(r.wave);
    const c4 = (r.correct_4chute || '').trim(), c5 = r.correct_5chute.trim();
    if (!CHUTES.includes(c5) || (c4 && !CHUTES.includes(c4))) { add(FN.l3, row, id, 'Answer does not match a chute name exactly'); return; }
    if (wave <= 2 && !c4) { add(FN.l3, row, id, 'Waves 1–2 use four chutes, so correct_4chute is required'); return; }
    if (wave < 5 && c5 === 'Notes only / Not recorded') { add(FN.l3, row, id, 'The trapdoor only opens in Wave 5'); return; }
    if (!uniq(FN.l3, row, id)) return;
    lenWarn(FN.l3, row, id, (r.item || '') + ' ' + (r.context || ''));
    l3.push({ id, level: 3, topic: TOPICS[3], wave, subtopic: (r.subtopic || '').trim(), item: r.item.trim(), context: (r.context || '').trim(), icon: (r.icon || '').trim(), c4, c5, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 4 ----------
  const l4 = [];
  rowsOf(raw.l4).forEach((r, i) => {
    const row = r.__row || i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FN.l4, row, id, r, ['id', 'stage', 'prompt', 'options', 'correct_index', 'explanation'])) return;
    const options = list(r.options); const ci = num(r.correct_index);
    if (options.length < 2 || options.length > 3) { add(FN.l4, row, id, 'Forks need 2 or 3 options'); return; }
    if (new Set(options).size !== options.length) { add(FN.l4, row, id, 'Options are duplicated'); return; }
    if (!Number.isInteger(ci) || ci < 0 || ci >= options.length) { add(FN.l4, row, id, 'correct_index is outside the option list'); return; }
    const labels = list(r.receipt_label), amounts = list(r.receipt_amount).map(num);
    if (labels.length !== amounts.length || amounts.some((a) => !Number.isFinite(a))) { add(FN.l4, row, id, 'receipt_label and receipt_amount must pair up'); return; }
    if (!uniq(FN.l4, row, id)) return;
    lenWarn(FN.l4, row, id, r.prompt);
    l4.push({ id, level: 4, topic: TOPICS[4], stage: num(r.stage), checkpoint: (r.checkpoint || '').trim(), subtopic: (r.subtopic || r.checkpoint || '').trim(), prompt: r.prompt.trim(), options, correct: ci, receipt: labels.map((l, k) => ({ label: l, amount: amounts[k] })), hint: (r.formula_hint || '').trim(), explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 5: Cash Flow Shooting Gallery ----------
  const l5 = [];
  const L5_ANS = { A: CF.slice(0, 3), B: CF.slice(0, 3), C: ['Add back', 'Deduct'] };
  rowsOf(raw.l5).forEach((r, i) => {
    const row = r.__row || i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FN.l5, row, id, r, ['id', 'stage', 'text', 'correct', 'explanation'])) return;
    const stage = r.stage.trim().toUpperCase();
    if (!L5_ANS[stage]) { add(FN.l5, row, id, `stage "${r.stage}" must be A, B or C`); return; }
    const correct = r.correct.trim();
    if (!L5_ANS[stage].includes(correct)) { add(FN.l5, row, id, `correct "${correct}" must be one of: ${L5_ANS[stage].join(', ')} for stage ${stage}`); return; }
    if (!uniq(FN.l5, row, id)) return;
    lenWarn(FN.l5, row, id, r.text);
    l5.push({ id, level: 5, topic: TOPICS[5], stage, subtopic: (r.subtopic || '').trim(), text: r.text.trim(), correct, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 6: Ratio Supermarket + Headline Slingshot ----------
  const shelf = [];
  rowsOf(raw.l6s).forEach((r, i) => {
    const row = r.__row || i + 2, id = (r.id || '').trim();
    if (!req(FN.l6s, row, id, r, ['id', 'label', 'amount'])) return;
    const amount = num(r.amount);
    if (!Number.isFinite(amount)) { add(FN.l6s, row, id, 'amount must be a number'); return; }
    if (shelf.some((x) => x.id === id)) { add(FN.l6s, row, id, 'Duplicate shelf id'); return; }
    shelf.push({ id, label: r.label.trim(), amount, statement: (r.statement || '').trim() });
  });
  const shelfIds = new Set(shelf.map((x) => x.id));
  const l6 = [];
  rowsOf(raw.l6).forEach((r, i) => {
    const row = r.__row || i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FN.l6, row, id, r, ['id', 'ratio', 'numerator', 'denominator', 'formula', 'distractors', 'explanation'])) return;
    const n = r.numerator.trim(), d = r.denominator.trim();
    if (!shelfIds.has(n) || !shelfIds.has(d)) { add(FN.l6, row, id, 'numerator and denominator must be ids from ' + FN.l6s); return; }
    if (n === d) { add(FN.l6, row, id, 'numerator and denominator must differ'); return; }
    const pct = (r.unit || '').trim() === '%', dec = Number.isFinite(num(r.decimals)) ? num(r.decimals) : 2;
    const val = shelf.find((x) => x.id === n).amount / shelf.find((x) => x.id === d).amount * (pct ? 100 : 1);
    const answer = val.toFixed(dec);
    const dis = list(r.distractors).map((x) => num(x));
    if (dis.length !== 3 || dis.some((x) => !Number.isFinite(x))) { add(FN.l6, row, id, 'distractors must be exactly three numbers separated by |'); return; }
    const opts = [answer, ...dis.map((x) => x.toFixed(dec))];
    if (new Set(opts).size !== 4) { add(FN.l6, row, id, `Options are not all different (correct answer is ${answer})`); return; }
    if (!uniq(FN.l6, row, id)) return;
    l6.push({ id, level: 6, topic: TOPICS[6], subtopic: (r.family || '').trim() || 'Ratios', ratio: r.ratio.trim(), numerator: n, denominator: d, formula: r.formula.trim(), unit: pct ? '%' : (r.unit || '').trim(), answer, options: opts, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });
  // Headline Slingshot (Level 6 stage B): rounds of two companies plus headlines that point to exactly one of them
  const l6g = { industry: '', ratios: [], rounds: [] };
  let sling = null;
  try { sling = raw.l6g.obj || (raw.l6g.text ? JSON.parse(raw.l6g.text) : null); } catch (e) { add(FN.l6g, '-', '', 'JSON could not be parsed: ' + e.message); }
  const CATS = ['Liquidity', 'Solvency', 'Profitability', 'Efficiency', 'Market value'];
  const BANNED = /liquidit|solven|profitab|efficien|market value|ratio|turnover|margin|coverage|P\/E|current assets|debt-equity|collection period/i;
  if (sling) {
    l6g.industry = String(sling.industry || '');
    l6g.ratios = (Array.isArray(sling.ratios) ? sling.ratios : []).filter((r) => r && r.key && r.label);
    const keys = new Set(l6g.ratios.map((r) => r.key));
    (Array.isArray(sling.rounds) ? sling.rounds : []).forEach((rd, ri) => {
      const where = rd.__row ? 'round ' + (rd.id || ri + 1) : 'round ' + (ri + 1);
      const cos = Array.isArray(rd.companies) ? rd.companies : [];
      if (cos.length !== 2 || cos.some((c) => !c.name || !c.ratios)) { add(FN.l6g, where, rd.id, 'A round needs exactly two companies, each with a name and ratios'); return; }
      const missing = [...keys].filter((k) => cos.some((c) => !Number.isFinite(Number(c.ratios[k]))));
      if (missing.length) { add(FN.l6g, where, rd.id, 'Missing or non-numeric ratio values: ' + missing.join(', ')); return; }
      const heads = [];
      (Array.isArray(rd.headlines) ? rd.headlines : []).forEach((h, hi) => {
        const row = h.__row || `${where}, headline ${hi + 1}`;
        if (h.active === false) return;
        if (!h.id || !h.text || !h.answer || !h.explanation) { add(FN.l6g, row, h.id, 'Missing id, text, answer or explanation'); return; }
        const ai = cos.findIndex((c) => c.name === h.answer);
        if (ai < 0) { add(FN.l6g, row, h.id, `answer "${h.answer}" is not one of this round's companies`); return; }
        if (!CATS.includes(h.category)) { add(FN.l6g, row, h.id, 'category must be one of: ' + CATS.join(', ')); return; }
        if (!keys.has(h.ratio)) { add(FN.l6g, row, h.id, `ratio "${h.ratio}" is not in the ratio list`); return; }
        if (BANNED.test(h.text)) { add(FN.l6g, row, h.id, 'The headline names a category or ratio; reword it without the giveaway'); return; }
        const v = cos.map((c) => Number(c.ratios[h.ratio]));
        const lo = Math.min(...v), hi2 = Math.max(...v);
        if (!(lo > 0 && hi2 / lo >= 1.5)) { add(FN.l6g, row, h.id, 'The two companies are too close on this ratio (need at least 1.5 times apart) to be unambiguous'); return; }
        if (!uniq(FN.l6g, row, h.id)) return;
        heads.push({ id: h.id, level: 6, topic: TOPICS[6], subtopic: h.category, source: String(h.source || 'News'), text: h.text, answer: ai, category: h.category, ratio: h.ratio, explanation: h.explanation, prompt: h.text });
      });
      if (heads.length) l6g.rounds.push({ id: rd.id || where, companies: cos.map((c) => ({ name: c.name, ceo: c.ceo || '', colour: c.colour || '#0072B2', ratios: c.ratios })), headlines: heads });
    });
  } else add(FN.l6g, '-', '', 'No Headline Slingshot data');

  return { report, data: { baskets, waves1, l1, l2, l3, l4, l5, shelf, l6, l6g } };
}
