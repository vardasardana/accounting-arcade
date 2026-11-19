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
      const alts = item.split('/').map((x) => x.trim()).filter(Boolean);
      if (alts.length > 1 && side !== 'Assets') { bad = `Alternatives ("${item}") are only allowed for asset jars`; break; }
      effects.push({ item: alts[0], alts, side, change });
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

  // ---------- Level 5: Cash Flow Shooting Gallery ----------
  const l5 = [];
  const L5_ANS = { A: CF.slice(0, 3), B: CF.slice(0, 3), C: ['Add back', 'Deduct'] };
  parseCsv(raw.l5.text).forEach((r, i) => {
    const row = i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FILES.l5, row, id, r, ['id', 'stage', 'text', 'correct', 'explanation'])) return;
    const stage = r.stage.trim().toUpperCase();
    if (!L5_ANS[stage]) { add(FILES.l5, row, id, `stage "${r.stage}" must be A, B or C`); return; }
    const correct = r.correct.trim();
    if (!L5_ANS[stage].includes(correct)) { add(FILES.l5, row, id, `correct "${correct}" must be one of: ${L5_ANS[stage].join(', ')} for stage ${stage}`); return; }
    if (!uniq(FILES.l5, row, id)) return;
    lenWarn(FILES.l5, row, id, r.text);
    l5.push({ id, level: 5, topic: TOPICS[5], stage, subtopic: (r.subtopic || '').trim(), text: r.text.trim(), correct, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });

  // ---------- Level 6: Ratio Supermarket + Headline Slingshot ----------
  const shelf = [];
  parseCsv(raw.l6s.text).forEach((r, i) => {
    const row = i + 2, id = (r.id || '').trim();
    if (!req(FILES.l6s, row, id, r, ['id', 'label', 'amount'])) return;
    const amount = num(r.amount);
    if (!Number.isFinite(amount)) { add(FILES.l6s, row, id, 'amount must be a number'); return; }
    if (shelf.some((x) => x.id === id)) { add(FILES.l6s, row, id, 'Duplicate shelf id'); return; }
    shelf.push({ id, label: r.label.trim(), amount, statement: (r.statement || '').trim() });
  });
  const shelfIds = new Set(shelf.map((x) => x.id));
  const l6 = [];
  parseCsv(raw.l6.text).forEach((r, i) => {
    const row = i + 2, id = (r.id || '').trim();
    if (!truthy(r.active ?? 'TRUE')) return;
    if (!req(FILES.l6, row, id, r, ['id', 'ratio', 'numerator', 'denominator', 'formula', 'distractors', 'explanation'])) return;
    const n = r.numerator.trim(), d = r.denominator.trim();
    if (!shelfIds.has(n) || !shelfIds.has(d)) { add(FILES.l6, row, id, 'numerator and denominator must be ids from ' + FILES.l6s); return; }
    if (n === d) { add(FILES.l6, row, id, 'numerator and denominator must differ'); return; }
    const pct = (r.unit || '').trim() === '%', dec = Number.isFinite(num(r.decimals)) ? num(r.decimals) : 2;
    const val = shelf.find((x) => x.id === n).amount / shelf.find((x) => x.id === d).amount * (pct ? 100 : 1);
    const answer = val.toFixed(dec);
    const dis = list(r.distractors).map((x) => num(x));
    if (dis.length !== 3 || dis.some((x) => !Number.isFinite(x))) { add(FILES.l6, row, id, 'distractors must be exactly three numbers separated by |'); return; }
    const opts = [answer, ...dis.map((x) => x.toFixed(dec))];
    if (new Set(opts).size !== 4) { add(FILES.l6, row, id, `Options are not all different (correct answer is ${answer})`); return; }
    if (!uniq(FILES.l6, row, id)) return;
    l6.push({ id, level: 6, topic: TOPICS[6], subtopic: (r.family || '').trim() || 'Ratios', ratio: r.ratio.trim(), numerator: n, denominator: d, formula: r.formula.trim(), unit: pct ? '%' : (r.unit || '').trim(), answer, options: opts, explanation: r.explanation.trim(), difficulty: num(r.difficulty) || 1 });
  });
  // Headline Slingshot (Level 6 stage B): rounds of two companies plus headlines that point to exactly one of them
  const l6g = { industry: '', ratios: [], rounds: [] };
  let sling = null;
  try { sling = raw.l6g.text ? JSON.parse(raw.l6g.text) : null; } catch (e) { add(FILES.l6g, '-', '', 'JSON could not be parsed: ' + e.message); }
  const CATS = ['Liquidity', 'Solvency', 'Profitability', 'Efficiency', 'Market value'];
  const BANNED = /liquidit|solven|profitab|efficien|market value|ratio|turnover|margin|coverage|P\/E|current assets|debt-equity|collection period/i;
  if (sling) {
    l6g.industry = String(sling.industry || '');
    l6g.ratios = (Array.isArray(sling.ratios) ? sling.ratios : []).filter((r) => r && r.key && r.label);
    const keys = new Set(l6g.ratios.map((r) => r.key));
    (Array.isArray(sling.rounds) ? sling.rounds : []).forEach((rd, ri) => {
      const where = 'round ' + (ri + 1);
      const cos = Array.isArray(rd.companies) ? rd.companies : [];
      if (cos.length !== 2 || cos.some((c) => !c.name || !c.ratios)) { add(FILES.l6g, where, rd.id, 'A round needs exactly two companies, each with a name and ratios'); return; }
      const missing = [...keys].filter((k) => cos.some((c) => !Number.isFinite(Number(c.ratios[k]))));
      if (missing.length) { add(FILES.l6g, where, rd.id, 'Missing or non-numeric ratio values: ' + missing.join(', ')); return; }
      const heads = [];
      (Array.isArray(rd.headlines) ? rd.headlines : []).forEach((h, hi) => {
        const row = `${where}, headline ${hi + 1}`;
        if (h.active === false) return;
        if (!h.id || !h.text || !h.answer || !h.explanation) { add(FILES.l6g, row, h.id, 'Missing id, text, answer or explanation'); return; }
        const ai = cos.findIndex((c) => c.name === h.answer);
        if (ai < 0) { add(FILES.l6g, row, h.id, `answer "${h.answer}" is not one of this round's companies`); return; }
        if (!CATS.includes(h.category)) { add(FILES.l6g, row, h.id, 'category must be one of: ' + CATS.join(', ')); return; }
        if (!keys.has(h.ratio)) { add(FILES.l6g, row, h.id, `ratio "${h.ratio}" is not in the ratio list`); return; }
        if (BANNED.test(h.text)) { add(FILES.l6g, row, h.id, 'The headline names a category or ratio; reword it without the giveaway'); return; }
        const v = cos.map((c) => Number(c.ratios[h.ratio]));
        const lo = Math.min(...v), hi2 = Math.max(...v);
        if (!(lo > 0 && hi2 / lo >= 1.5)) { add(FILES.l6g, row, h.id, 'The two companies are too close on this ratio (need at least 1.5 times apart) to be unambiguous'); return; }
        if (!uniq(FILES.l6g, row, h.id)) return;
        heads.push({ id: h.id, level: 6, topic: TOPICS[6], subtopic: h.category, source: String(h.source || 'News'), text: h.text, answer: ai, category: h.category, ratio: h.ratio, explanation: h.explanation, prompt: h.text });
      });
      if (heads.length) l6g.rounds.push({ id: rd.id || where, companies: cos.map((c) => ({ name: c.name, ceo: c.ceo || '', colour: c.colour || '#0072B2', ratios: c.ratios })), headlines: heads });
    });
  } else add(FILES.l6g, '-', '', 'No Headline Slingshot data');

  return { config, report, overrides: Object.entries(raw).filter(([, v]) => v.override).map(([k]) => FILES[k]),
    data: { baskets, waves1, l1, l2, l3, l4, l5, shelf, l6, l6g } };
}
