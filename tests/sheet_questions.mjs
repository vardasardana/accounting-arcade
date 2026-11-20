// Questions from the Google Sheet, tested against tests/mock_sheet.py (port 4290). Checks:
// sheet load + bad row skipped/reported + missing tab falls back + extra row joins the pool; cached copy when the Sheet is down;
// built-in files when blocked with no cache; old script (no tabs); slow Sheet (5 s timeout).
import { chromium } from 'playwright-core';
import fs from 'fs';
const MOCK = 'http://127.0.0.1:4290/exec';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const errs = [];
async function open(ctx, { block = false } = {}) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/data/config.json', async (r) => { const res = await r.fetch(); const j = await res.json(); j.QUESTIONS_URL = MOCK; j.LEADERBOARD_URL = MOCK; await r.fulfill({ response: res, json: j }); });
  if (block) await p.route('http://127.0.0.1:4290/**', (r) => r.abort());
  const t0 = Date.now();
  await p.goto('http://localhost:4173/');
  await p.waitForFunction(() => window.__AA && document.querySelector('#ui .play, #ui .go'), null, { timeout: 30000 });
  const info = await p.evaluate(() => { const S = window.__AA.S; return { kind: S.qsource.kind, note: S.qsource.note, tabs: S.qsource.tabs, scene: window.__AA.game.scene.getScenes(true)[0].scene.key, l2: S.data.l2.length, l5: S.data.l5.length, hasA99: S.data.l5.some((x) => x.id === 'L5-A99'), shelf: S.data.shelf.length, sling: S.data.l6g.rounds.map((r) => r.headlines.length), report: S.report.map((r) => `${r.severity}: ${r.file} row ${r.row} ${r.id} ${r.reason}`) }; });
  info.ms = Date.now() - t0;
  return { p, info };
}
const mode = (m) => fs.writeFileSync('/tmp/mock_mode', m);
const out = {};
mode('ok');
const ctx1 = await b.newContext({ viewport: { width: 1280, height: 720 } });
let { p, info } = await open(ctx1); out.sheet = info;
// instructor console screenshot with the report
await p.evaluate(() => { const g = window.__AA.game; g.scene.getScenes(true)[0].scene.start('Teacher'); }).catch(() => {});
await p.waitForTimeout(800);
if (await p.$('#ui #pin')) { await p.fill('#ui #pin', '2468'); await p.keyboard.press('Enter'); await p.waitForTimeout(800); }
await p.screenshot({ path: 'shots/60_instructor_sheet_report.png' });
await p.close();
({ p, info } = await open(ctx1, { block: true })); out.cachedWhenDown = info; await p.close();
const ctx2 = await b.newContext(); ({ p, info } = await open(ctx2, { block: true })); out.blockedNoCache = info; await p.close();
mode('old'); const ctx3 = await b.newContext(); ({ p, info } = await open(ctx3)); out.oldScript = info; await p.close();
mode('allbad'); const ctx5 = await b.newContext(); ({ p, info } = await open(ctx5)); info.l3 = await p.evaluate(() => window.__AA.S.data.l3.length); info.report = info.report.slice(0, 3).concat(['… ' + info.report.length + ' lines in total']); out.allL3Bad = info; await p.close();
mode('slow'); const ctx4 = await b.newContext(); ({ p, info } = await open(ctx4)); out.slowSheet = info; await p.close();
mode('ok');
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(15), JSON.stringify({ kind: v.kind, scene: v.scene, ms: v.ms, l2: v.l2, l5: v.l5, hasA99: v.hasA99, shelf: v.shelf, sling: v.sling, tabs: v.tabs?.length }), '\n   note:', v.note, '\n   report:', v.report.join('\n           '));
console.log('PAGE ERRORS', errs.length ? errs : 'none');
await b.close();
