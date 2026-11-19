/**
 * The Accounting Arcade: class leaderboard on a free Google Sheet.
 * Paste this whole file into Extensions > Apps Script of your Google Sheet,
 * then Deploy > New deployment > Web app (Execute as: Me; Who has access: Anyone).
 *
 * doPost: the game sends one finished run (as text/plain JSON, which avoids a CORS pre-flight).
 * doGet : the game asks for the top scores of one class code (?class=ACCT-TRIAL&limit=20).
 * Only a first name/nickname, scores, stars and accuracy are stored.
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
