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
  l5: 'level5_cashflow.csv', l6: 'level6_ratios.csv', l6x: 'level6_extracts.json',
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

export async function loadAll() {
  const report = [];
  const add = (file, row, id, reason, severity = 'error') => report.push({ file, row, id: id || '', reason, severity });
  const config = await (await fetch('data/config.json', { cache: 'no-cache' })).json();
  const raw = {};
  for (const [k, f] of Object.entries(FILES)) {
    try { raw[k] = await fetchText(f); } catch (e) { add(f, '-', '', 'File could not be loaded: ' + e.message); raw[k] = { text: '' }; }
  }
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
  parseCsv(raw.l1b.text).forEach((r, i) => {
    if (!r.name) { add(FILES.l1b, i + 2, '', 'Missing basket name'); return; }
    baskets.push({ name: r.name.trim(), short: (r.short || r.name).trim(), idea: (r.idea || '').trim(), icon: (r.icon || '').trim() });
  });
  const basketNames = new Set(baskets.map((b) => b.name));
  const waves1 = [];
  parseCsv(raw.l1w.text).forEach((r, i) => {
    const row = i + 2;
    const w = { wave: num(r.wave), name: (r.name || '').trim(), baskets: list(r.baskets), cards: num(r.cards), fall: num(r.fall_time_s), maxOn: num(r.max_on_screen) || 1 };
    if (!Number.isFinite(w.wave) || !Number.isFinite(w.cards) || !Number.isFinite(w.fall)) { add(FILES.l1w, row, 'wave ' + r.wave, 'wave, cards and fall_time_s must be numbers'); return; }
    if (!(w.baskets.length === 1 && w.baskets[0] === 'RANDOM')) {
      const bad = w.baskets.filter((b) => !basketNames.has(b));
      if (bad.length) { add(FILES.l1w, row, 'wave ' + w.wave, 'Unknown basket: ' + bad.join(', ')); return; }
      if (w.baskets.length < 3 || w.baskets.length > 4) { add(FILES.l1w, row, 'wave ' + w.wave, 'A wave needs 3 or 4 baskets'); return; }
      if (w.baskets.includes('Accrual (Revenue Recognition) Concept') && w.baskets.includes('Matching Concept')) { add(FILES.l1w, row, 'wave ' + w.wave, 'Accrual and Matching may never be on the cart together'); return; }
    }
    waves1.push(w);
  });
  const l1 = [];
  parseCsv(raw.l1.text).forEach((r, i) => {
    const row = i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FILES.l1, row, id, r, ['id', 'wave', 'prompt', 'correct', 'explanation'])) return;
    if (!basketNames.has(r.correct.trim())) { add(FILES.l1, row, id, `Correct answer "${r.correct}" is not a basket name`); return; }
    const conflicts = list(r.conflicts_with);
    const badC = conflicts.filter((c) => !basketNames.has(c));
    if (badC.length) { add(FILES.l1, row, id, 'Unknown concept in conflicts_with: ' + badC.join(', ')); return; }
    const wave = num(r.wave);
    const wdef = waves1.find((w) => w.wave === wave);
    if (wdef && wdef.baskets[0] !== 'RANDOM') {
      if (!wdef.baskets.includes(r.correct.trim())) { add(FILES.l1, row, id, `Correct basket is not in wave ${wave}'s basket set`); return; }
      const clash = conflicts.filter((c) => wdef.baskets.includes(c));
      if (clash.length) { add(FILES.l1, row, id, `Conflicting concept on the same cart in wave ${wave}: ${clash.join(', ')}`); return; }
    }
    if (!uniq(FILES.l1, row, id)) return;
    lenWarn(FILES.l1, row, id, r.prompt);
    l1.push({ id, level: 1, topic: TOPICS[1], wave, subtopic: (r.subtopic || '').trim(), prompt: r.prompt.trim(), correct: r.correct.trim(), conflicts, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 2 ----------
  const l2 = [];
  parseCsv(raw.l2.text).forEach((r, i) => {
    const row = i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FILES.l2, row, id, r, ['id', 'wave', 'prompt', 'effects', 'explanation'])) return;
    const effects = []; let bad = '';
    for (const e of list(r.effects)) {
      const p = e.split(':'); if (p.length !== 3) { bad = `Effect "${e}" must be item:side:change`; break; }
      const [item, side, ch] = p.map((s) => s.trim()); const change = num(ch);
      if (!['Assets', 'Liabilities', 'Equity'].includes(side)) { bad = `Side "${side}" must be Assets, Liabilities or Equity`; break; }
      if (!Number.isFinite(change) || change === 0) { bad = `Change "${ch}" is not a number`; break; }
      effects.push({ item, side, change });
    }
    if (bad) { add(FILES.l2, row, id, bad); return; }
    if (effects.length < 2) { add(FILES.l2, row, id, 'At least two effects are needed'); return; }
    const sum = (s) => effects.filter((e) => e.side === s).reduce((a, e) => a + e.change, 0);
    if (sum('Assets') !== sum('Liabilities') + sum('Equity')) { add(FILES.l2, row, id, 'Effects do not balance (Assets ≠ Liabilities + Equity)'); return; }
    const decoys = [];
    for (const d of list(r.decoys)) { const p = d.split(':'); const ch = num(p[p.length - 1]); if (Number.isFinite(ch) && ch !== 0) decoys.push({ item: p.slice(0, -1).join(':').trim(), change: ch }); }
    if (!uniq(FILES.l2, row, id)) return;
    l2.push({ id, level: 2, topic: TOPICS[2], wave: num(r.wave), subtopic: (r.subtopic || '').trim(), prompt: r.prompt.trim(), effects, decoys, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 3 ----------
  const l3 = [];
  parseCsv(raw.l3.text).forEach((r, i) => {
    const row = i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FILES.l3, row, id, r, ['id', 'wave', 'item', 'correct_5chute', 'explanation'])) return;
    const wave = num(r.wave);
    const c4 = (r.correct_4chute || '').trim(), c5 = r.correct_5chute.trim();
    if (!CHUTES.includes(c5) || (c4 && !CHUTES.includes(c4))) { add(FILES.l3, row, id, 'Answer does not match a chute name exactly'); return; }
    if (wave <= 2 && !c4) { add(FILES.l3, row, id, 'Waves 1–2 use four chutes, so correct_4chute is required'); return; }
    if (wave < 5 && c5 === 'Notes only / Not recorded') { add(FILES.l3, row, id, 'The trapdoor only opens in Wave 5'); return; }
    if (!uniq(FILES.l3, row, id)) return;
    lenWarn(FILES.l3, row, id, (r.item || '') + ' ' + (r.context || ''));
    l3.push({ id, level: 3, topic: TOPICS[3], wave, subtopic: (r.subtopic || '').trim(), item: r.item.trim(), context: (r.context || '').trim(), icon: (r.icon || '').trim(), c4, c5, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 4 ----------
  const l4 = [];
  parseCsv(raw.l4.text).forEach((r, i) => {
    const row = i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FILES.l4, row, id, r, ['id', 'stage', 'prompt', 'options', 'correct_index', 'explanation'])) return;
    const options = list(r.options); const ci = num(r.correct_index);
    if (options.length < 2 || options.length > 3) { add(FILES.l4, row, id, 'Forks need 2 or 3 options'); return; }
    if (new Set(options).size !== options.length) { add(FILES.l4, row, id, 'Options are duplicated'); return; }
    if (!Number.isInteger(ci) || ci < 0 || ci >= options.length) { add(FILES.l4, row, id, 'correct_index is outside the option list'); return; }
    const labels = list(r.receipt_label), amounts = list(r.receipt_amount).map(num);
    if (labels.length !== amounts.length || amounts.some((a) => !Number.isFinite(a))) { add(FILES.l4, row, id, 'receipt_label and receipt_amount must pair up'); return; }
    if (!uniq(FILES.l4, row, id)) return;
    lenWarn(FILES.l4, row, id, r.prompt);
    l4.push({ id, level: 4, topic: TOPICS[4], stage: num(r.stage), checkpoint: (r.checkpoint || '').trim(), subtopic: (r.subtopic || r.checkpoint || '').trim(), prompt: r.prompt.trim(), options, correct: ci, receipt: labels.map((l, k) => ({ label: l, amount: amounts[k] })), hint: (r.formula_hint || '').trim(), explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 5 ----------
  const l5 = [];
  parseCsv(raw.l5.text).forEach((r, i) => {
    const row = i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FILES.l5, row, id, r, ['id', 'stages', 'text', 'correct', 'explanation'])) return;
    const correct = r.correct.trim(); const trap = truthy(r.is_trap);
    if (!CF.includes(correct)) { add(FILES.l5, row, id, 'correct must be Operating, Investing, Financing or None'); return; }
    if (trap !== (correct === 'None')) { add(FILES.l5, row, id, 'Trap cards must have correct = None (and only traps)'); return; }
    const stages = list(r.stages);
    if (stages.some((s) => !['A1', 'A2', 'A3', 'B', 'C', 'D'].includes(s))) { add(FILES.l5, row, id, 'Unknown stage (use A1, A2, A3, B, C, D)'); return; }
    if (trap && stages.some((s) => s !== 'C')) { add(FILES.l5, row, id, 'Trap cards may only appear in Stage C'); return; }
    if (!uniq(FILES.l5, row, id)) return;
    lenWarn(FILES.l5, row, id, r.text);
    l5.push({ id, level: 5, topic: TOPICS[5], stages, subtopic: (r.subtopic || '').trim(), text: r.text.trim(), correct, trap, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 6 ----------
  const l6 = [];
  parseCsv(raw.l6.text).forEach((r, i) => {
    const row = i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FILES.l6, row, id, r, ['id', 'round', 'ratio', 'industry', 'companies', 'values', 'weaker_index', 'explanation'])) return;
    const companies = list(r.companies), values = list(r.values), wi = num(r.weaker_index);
    if (companies.length !== values.length || companies.length < 2 || companies.length > 3) { add(FILES.l6, row, id, 'Need 2 or 3 companies with one value each'); return; }
    if (!Number.isInteger(wi) || wi < 0 || wi >= companies.length) { add(FILES.l6, row, id, 'weaker_index is not valid'); return; }
    if (list(r.industry).length !== 1) { add(FILES.l6, row, id, 'All cards in a set must share one industry'); return; }
    if (!uniq(FILES.l6, row, id)) return;
    l6.push({ id, level: 6, topic: TOPICS[6], type: 'compare', round: num(r.round), subtopic: (r.subtopic || '').trim(), ratio: r.ratio.trim(), formula: (r.formula || '').trim(), industry: r.industry.trim(), cards: companies.map((c, k) => ({ company: c, value: values[k] })), weaker: wi, better: (r.better || '').trim(), explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });
  const l6x = [];
  let extracts = [];
  try { extracts = raw.l6x.text ? JSON.parse(raw.l6x.text) : []; } catch (e) { add(FILES.l6x, '-', '', 'JSON could not be parsed: ' + e.message); }
  (Array.isArray(extracts) ? extracts : []).forEach((x, i) => {
    const row = 'item ' + (i + 1), id = x.id;
    if (x.active === false) return;
    if (!id || !x.ratio || !Array.isArray(x.lines)) { add(FILES.l6x, row, id, 'Missing id, ratio or lines'); return; }
    const needed = x.lines.filter((l) => l.needed).length, decoys = x.lines.length - needed;
    if (needed < 2 || decoys < 2) { add(FILES.l6x, row, id, 'Needs at least two needed lines and two decoys'); return; }
    if (x.verdict && !['Strength', 'Red Flag'].includes(x.verdict)) { add(FILES.l6x, row, id, 'verdict must be Strength, Red Flag or blank'); return; }
    if (!uniq(FILES.l6x, row, id)) return;
    l6x.push({ ...x, topic: TOPICS[6], subtopic: x.subtopic || 'Pick the right figures', difficulty: x.difficulty || 2 });
  });

  return { config, report, overrides: Object.entries(raw).filter(([, v]) => v.override).map(([k]) => FILES[k]),
    data: { baskets, waves1, l1, l2, l3, l4, l5, l6, l6x } };
}
