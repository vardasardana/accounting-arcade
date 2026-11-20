/**
 * The Accounting Arcade: class leaderboard on a free Google Sheet.
 * Paste this whole file into Extensions > Apps Script of your Google Sheet,
 * then Deploy > New deployment > Web app (Execute as: Me; Who has access: Anyone).
 *
 * doPost: the game sends one finished run (as text/plain JSON, which avoids a CORS pre-flight).
 * doGet : the game asks for the top scores of one class code (?class=ACCT-TRIAL&limit=20),
 *         or for all question tabs (?action=questions).
 * Only a first name/nickname, scores, stars and accuracy are stored.
 *
 * QUESTIONS: run setupQuestionTabs() once from the Apps Script editor. It copies the game's current
 * questions from the live site into tabs whose names start with Q_ and adds a README tab.
 * After that, edit the rows in the Sheet; the game reads them every time it starts.
 */
var SHEET_NAME = 'Scores';
var HEADERS = ['timestamp', 'class_code', 'name', 'role', 'avatar', 'total', 'stars', 'accuracy', 'best_streak', 'time_s', 'speed', 'topic_accuracy', 'run_id'];
var MAX_ROWS_RETURNED = 50;

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) { sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  return sh;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(s, max) { return String(s == null ? '' : s).replace(/[^\w\s\-]/g, '').trim().slice(0, max); }
function num_(n, lo, hi) { n = Number(n); if (!isFinite(n)) return 0; return Math.max(lo, Math.min(hi, n)); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = JSON.parse(e.postData.contents || '{}');
    var name = clean_(d.name, 16), code = clean_(d.class_code, 30);
    if (name.length < 2 || !code) return json_({ ok: false, error: 'name and class_code are required' });
    var topics = {};
    Object.keys(d.topics || {}).slice(0, 10).forEach(function (k) { topics[clean_(k, 60)] = num_(d.topics[k], 0, 1); });
    sheet_().appendRow([
      new Date(), code, name, clean_(d.role, 12), num_(d.avatar, 0, 7),
      num_(d.total, 0, 100000), num_(d.stars, 0, 18), num_(d.accuracy, 0, 1),
      num_(d.best_streak, 0, 500), num_(d.time_s, 0, 36000), clean_(d.speed, 10),
      JSON.stringify(topics), clean_(d.run_id, 20)
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet(e) {
  if ((e.parameter || {}).action === 'questions') return questions_();
  var code = clean_((e.parameter || {}).class, 30);
  var limit = num_((e.parameter || {}).limit || 20, 1, MAX_ROWS_RETURNED);
  var values = sheet_().getDataRange().getValues();
  var head = values.shift() || HEADERS;
  var rows = values.map(function (r) {
    var o = {}; head.forEach(function (h, i) { o[h] = r[i]; });
    o.timestamp = o.timestamp instanceof Date ? o.timestamp.toISOString() : String(o.timestamp);
    try { o.topics = JSON.parse(o.topic_accuracy || '{}'); } catch (x) { o.topics = {}; }
    delete o.topic_accuracy;
    return o;
  }).filter(function (o) { return !code || String(o.class_code) === code; });
  rows.sort(function (a, b) { return b.total - a.total || b.accuracy - a.accuracy || a.time_s - b.time_s; });
  return json_({ ok: true, class_code: code, rows: rows.slice(0, limit) });
}

// ======================= Questions (editable in this Sheet) =======================
var GAME_DATA_URL = 'https://vardasardana.github.io/accounting-arcade/data/';
var QUESTION_TABS = [
  ['Q_L1_baskets', 'level1_baskets.csv'], ['Q_L1_waves', 'level1_waves.csv'], ['Q_L1_concepts', 'level1_concepts.csv'],
  ['Q_L2_equation', 'level2_equation.csv'], ['Q_L3_classify', 'level3_classify.csv'], ['Q_L4_profit', 'level4_profit.csv'],
  ['Q_L5_targets', 'level5_targets.csv'], ['Q_L6_shelf', 'level6_shelf.csv'], ['Q_L6_ratios', 'level6_ratios.csv']
];

// The game calls ?action=questions. Every tab whose name starts with Q_ is returned as
// { headers: [...], rows: [[sheetRowNumber, cell1, cell2, ...], ...] } using the text shown in each cell.
function questions_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), tabs = {};
  ss.getSheets().forEach(function (sh) {
    var name = sh.getName();
    if (name.indexOf('Q_') !== 0 || sh.getLastRow() < 1 || sh.getLastColumn() < 1) return;
    var v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
    var headers = v[0], rows = [];
    for (var i = 1; i < v.length; i++) {
      if (v[i].join('').trim() === '') continue;
      rows.push([i + 1].concat(v[i]));
    }
    tabs[name] = { headers: headers, rows: rows };
  });
  return json_({ ok: true, tabs: tabs });
}

// Run ONCE from the editor (choose setupQuestionTabs in the toolbar, then Run).
// Creates the question tabs with the game's current questions. A tab that already has rows is left alone.
function setupQuestionTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), made = [], kept = [];
  QUESTION_TABS.forEach(function (t) {
    var text = UrlFetchApp.fetch(GAME_DATA_URL + t[1]).getContentText('UTF-8').replace(/^\uFEFF/, '');
    var values = Utilities.parseCsv(text);
    (writeTab_(ss, t[0], values) ? made : kept).push(t[0]);
  });
  var s = JSON.parse(UrlFetchApp.fetch(GAME_DATA_URL + 'level6_slingshot.json').getContentText('UTF-8'));
  var keys = s.ratios.map(function (r) { return r.key; });
  var ratios = [['key', 'label', 'unit']].concat(s.ratios.map(function (r) { return [r.key, r.label, r.unit || '']; }));
  var cos = [['round_id', 'name', 'ceo', 'colour', 'industry'].concat(keys)], heads = [['id', 'round_id', 'source', 'text', 'answer', 'category', 'ratio', 'explanation', 'active']];
  s.rounds.forEach(function (rd) {
    rd.companies.forEach(function (c) { cos.push([rd.id, c.name, c.ceo || '', c.colour || '', s.industry || ''].concat(keys.map(function (k) { return String(c.ratios[k]); }))); });
    rd.headlines.forEach(function (h) { heads.push([h.id, rd.id, h.source || '', h.text, h.answer, h.category, h.ratio, h.explanation, h.active === false ? 'FALSE' : 'TRUE']); });
  });
  [['Q_L6_sling_ratios', ratios], ['Q_L6_sling_companies', cos], ['Q_L6_sling_headlines', heads]].forEach(function (t) {
    (writeTab_(ss, t[0], t[1]) ? made : kept).push(t[0]);
  });
  writeReadme_(ss);
  var msg = 'Question tabs created: ' + (made.join(', ') || 'none') + (kept.length ? '. Left unchanged (already had rows): ' + kept.join(', ') : '');
  Logger.log(msg);
  try { ss.toast(msg, 'Accounting Arcade', 10); } catch (x) {}
  return msg;
}

function writeTab_(ss, name, values) {
  var sh = ss.getSheetByName(name);
  if (sh && sh.getLastRow() > 1) return false;
  if (!sh) sh = ss.insertSheet(name);
  var w = values.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
  values = values.filter(function (r) { return r.join('').trim() !== ''; }).map(function (r) { while (r.length < w) r.push(''); return r; });
  sh.clear();
  sh.getRange(1, 1, Math.max(sh.getMaxRows(), values.length + 200), w).setNumberFormat('@'); // keep everything as plain text (1.00 stays 1.00)
  sh.getRange(1, 1, values.length, w).setValues(values).setWrap(true).setVerticalAlignment('top');
  sh.getRange(1, 1, 1, w).setFontWeight('bold').setBackground('#FFE9A8');
  sh.setFrozenRows(1);
  for (var c = 1; c <= w; c++) sh.setColumnWidth(c, Math.min(380, Math.max(90, 9 * String(values[0][c - 1]).length + 40)));
  return true;
}

function writeReadme_(ss) {
  var sh = ss.getSheetByName('README') || ss.insertSheet('README', 0);
  sh.clear();
  var rows = [
    ['Tab', 'What it holds and how to fill it'],
    ['All Q_ tabs', 'One row = one question (or one item). Do not rename tabs or the header row. Every id must be unique across all tabs. Set active to FALSE to hide a row without deleting it. Amounts are in $ million, except Level 2, which uses full dollars (e.g. 1000000). Use the company name already used in that level. The game reads the Sheet each time it starts; a row with a mistake is skipped and listed in the instructor console (Menu > Instructor, PIN) under Validation report. If a whole tab is empty or deleted, the game uses its built-in questions for that tab.'],
    ['Q_L1_baskets', 'The concept baskets. name = full concept name (answers must match it exactly); short = label on the basket; idea = one-line hint; icon = picture name (keep existing).'],
    ['Q_L1_waves', 'Rounds of Level 1. baskets = RANDOM (recommended); cards = cards per round; fall_time_s = seconds a card takes to fall.'],
    ['Q_L1_concepts', 'Level 1 case files. wave = 1 or 2; prompt = the situation; correct = a basket name from Q_L1_baskets exactly; conflicts_with = concepts that could also fit, separated by | (they never appear together); explanation = shown after the answer.'],
    ['Q_L2_equation', 'Level 2 transactions. wave = 1 to 5; effects = item:side:change separated by |, side is Assets, Liabilities or Equity, change is + or - in dollars, e.g. Cash/Bank:Assets:5000|Bank Loan:Liabilities:5000. Write Cash/Bank when either jar is correct (assets only). Assets must equal Liabilities + Equity. decoys = item:change|item:change (wrong weights). Use existing jar names: Cash, Bank, Machinery, Inventory, Trade Receivables, Bank Loan, Trade Payables, Equity (Shareholders\' funds).'],
    ['Q_L3_classify', 'Level 3 crates. wave = 1 to 5; correct_4chute (needed in waves 1-2) and correct_5chute must be exactly one of: Non-current Asset, Current Asset, Liability, Current Liability, Non-current Liability, Equity, Notes only / Not recorded (the last only in wave 5). Waves 1-2 use Liability; waves 3-5 use Current/Non-current Liability.'],
    ['Q_L4_profit', 'Level 4 road trip. stage = 1 to 4; options = 2 or 3 choices separated by |; correct_index = position of the right option counting from 0 (first option = 0). Rows with receipt_label/receipt_amount build the Profit and Loss receipt and always play, in order; rows without them are side questions drawn at random. receipt_label and receipt_amount must have the same number of parts (separated by |).'],
    ['Q_L5_targets', 'Level 5 targets. stage = A (simple), B (trickier) or C (indirect-method adjustments). correct = Operating, Investing or Financing for A and B; Add back or Deduct for C.'],
    ['Q_L6_shelf', 'Level 6 supermarket products: id (short code), label, amount ($ million), statement. Ratios refer to these ids.'],
    ['Q_L6_ratios', 'Level 6 ratios. numerator and denominator = shelf ids; the right answer is calculated by the game; unit = times or %; decimals = places shown; distractors = exactly three wrong numbers separated by |, all different from the answer.'],
    ['Q_L6_sling_ratios', 'The ratios printed on the Headline Slingshot cards: key (short code), label, unit (times, %, days or blank).'],
    ['Q_L6_sling_companies', 'Two rows per round (same round_id): name, ceo, colour (#hex), industry, then one column per ratio key with a number.'],
    ['Q_L6_sling_headlines', 'Headlines. round_id = a round from Q_L6_sling_companies; answer = the exact company name; category = Liquidity, Solvency, Profitability, Efficiency or Market value; ratio = a key from Q_L6_sling_ratios. The text must not name the category or ratio (words like ratio, margin, turnover, liquidity are rejected), and the two companies must differ by at least 1.5 times on that ratio, so there is only one right answer.'],
    ['How many per run', 'Each run draws questions at random from the active rows, so adding rows adds variety without making a level longer. Per-run counts are in the game settings (config.json): Level 2 per wave 3,3,2,2,2; Level 3 per wave 4,3,3,3,4; Level 4 three side questions; Level 5 eight targets per stage; Level 6 six ratios, two slingshot rounds of up to four headlines; Level 1 five cards per round.'],
    ['Scores tab', 'Leaderboard scores written by the game. You can delete test rows there.']
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows).setWrap(true).setVerticalAlignment('top');
  sh.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#FFE9A8');
  sh.getRange(2, 1, rows.length - 1, 1).setFontWeight('bold');
  sh.setColumnWidth(1, 190); sh.setColumnWidth(2, 820); sh.setFrozenRows(1);
}
