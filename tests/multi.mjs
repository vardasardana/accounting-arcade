// Multi-instructor links: ?i=<Apps Script id>&section=<code>. Two mock Sheets (A on 4290, B on 4291).
import { chromium } from 'playwright-core';
import { routeMocks, ID_A, ID_B } from './mockroute.mjs';
const BASE = process.env.BASE || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const errs = []; const res = {};
async function game(query, name) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  await routeMocks(p);
  await p.goto(BASE + query);
  await p.waitForFunction(() => window.__AA && document.querySelector('#ui .play, #ui .go'), null, { timeout: 30000 });
  return p;
}
const state = (p) => p.evaluate(() => { const S = window.__AA.S; return { lb: S.config.LEADERBOARD_URL.replace(/^.*\/s\/(.{0,12}).*$/, '$1…'), q: (S.config.QUESTIONS_URL || '').replace(/^.*\/s\/(.{0,12}).*$/, '$1…'), section: S.config.section || '', qsource: S.qsource.kind, extra: S.data.l5.filter((x) => /L5-(A99|B77)/.test(x.id)).map((x) => x.id), url: location.search, warn: S.report.filter((r) => r.file === 'Game link').length }; });
async function post(p, name) { // the real end-of-run path: Results scene submits via submitShared(); here we call the same fetch the game makes
  return p.evaluate(async (name) => { const S = window.__AA.S; const code = S.config.section || localStorage.getItem('aa_class_code') || S.config.class_code; const r = await fetch(S.config.LEADERBOARD_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ name, class_code: code, total: 50, stars: 3, accuracy: 0.9, run_id: name.replace(/\W/g, '') }) }); return (await r.json()).ok; }, name);
}
async function boardTab(p) {
  await p.click('#ui .lb');
  await p.waitForFunction(() => { const t = document.querySelector('#ui .body')?.textContent || 'Loading the class board'; return !/Loading the class board/.test(t); }, null, { timeout: 20000 });
  await p.waitForTimeout(400);
  return p.evaluate(() => ({ tab: document.querySelector('#ui .tab[data-t="class"]')?.textContent, rows: [...document.querySelectorAll('#ui .body tr')].slice(1).map((t) => t.textContent.replace(/\s+/g, ' ').trim()) }));
}
// A with a section
let p = await game(`?i=${ID_A}&section=Sec%20A`, 'A');
res.A = await state(p); res.A.posted = await post(p, 'Asha A'); res.A.board = await boardTab(p);
await p.screenshot({ path: 'shots/62_leaderboard_section_tab.png' });
await p.reload(); await p.waitForFunction(() => window.__AA && window.__AA.S.config, null, { timeout: 30000 }); res.A_afterReload = await state(p);
await p.context().close();
// B without a section
p = await game(`?i=${encodeURIComponent('https://script.google.com/macros/s/' + ID_B + '/exec')}`, 'B');
res.B = await state(p); res.B.posted = await post(p, 'Bina B'); res.B.board = await boardTab(p); await p.context().close();
// default link
p = await game('', 'default'); res.default = await state(p); res.default.classCode = await p.evaluate(() => window.__AA.S.config.class_code); res.default.tab = await p.evaluate(async () => { document.querySelector('#ui .lb').click(); await new Promise((r) => setTimeout(r, 1200)); return document.querySelector('#ui .tab[data-t="class"]')?.textContent; }); await p.context().close();
// bad id and a messy section
p = await game('?i=hello&section=<b>Sec%20B!!</b>', 'bad'); res.bad = await state(p); await p.context().close();
// what each mock stored
for (const [k, port] of [['mockA', 4290], ['mockB', 4291]]) res[k] = { SecA: (await (await fetch(`http://127.0.0.1:${port}/exec?class=Sec%20A`)).json()).rows.map((r) => r.name), ACCT: (await (await fetch(`http://127.0.0.1:${port}/exec?class=ACCT-TRIAL`)).json()).rows.map((r) => r.name) };
// link maker page
const ctx = await b.newContext({ viewport: { width: 900, height: 1000 } }); const lp = await ctx.newPage(); lp.on('pageerror', (e) => errs.push('make-link: ' + e.message));
await routeMocks(lp);
await lp.goto(BASE + 'make-link.html');
await lp.fill('#url', 'https://script.google.com/macros/s/' + ID_A + '/exec'); await lp.fill('#sec', 'Sec A');
await lp.click('#make'); await lp.click('#check'); await lp.waitForFunction(() => !/Checking/.test(document.querySelector('#msg').textContent), null, { timeout: 15000 });
res.maker = await lp.evaluate(() => ({ link: document.querySelector('#link').textContent, msg: document.querySelector('#msg').textContent, qr: (() => { const c = document.querySelector('#qr'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 50) dark++; return { w: c.width, dark }; })() }));
await lp.screenshot({ path: 'shots/61_make_link_page.png', fullPage: true });
const [dl] = await Promise.all([lp.waitForEvent('download'), lp.click('#dl')]); await dl.saveAs('/tmp/qr_test.png'); res.maker.download = dl.suggestedFilename();
await lp.fill('#url', 'not a url'); await lp.click('#make'); res.maker.badMsg = await lp.textContent('#msg');
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(14), JSON.stringify(v));
console.log('PAGE ERRORS', errs.length ? errs : 'none');
await b.close();
