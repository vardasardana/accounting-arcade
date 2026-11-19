// Automated full play-through: every level and stage, screenshots, console-error check.
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', e.message, e.stack)); p.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
p.on('dialog', (d) => d.accept());
await p.goto(URL);
await p.waitForFunction(() => window.__AA && document.querySelector('#ui .play'), null, { timeout: 30000 });
await p.waitForTimeout(800);
await p.screenshot({ path: 'shots/01_title.png' });
await p.click('#ui .play');
await p.waitForSelector('#ui #nm');
await p.fill('#ui #nm', 'Varda');
await p.click('#ui .av[data-a="3"]');
await p.waitForTimeout(400);
await p.screenshot({ path: 'shots/02_avatar_pick.png' });
await p.click('#ui .go');
await p.waitForSelector('#ui .how-card');
await p.waitForTimeout(400);
await p.screenshot({ path: 'shots/03_how_to_play.png' });
await p.click('#ui .skip');

const act = () => {
  const W = (window.__bot ||= { wrong: {}, acted: {} });
  const g = window.__AA.game;
  const act = g.scene.getScenes(true); if (!act.length) return 'none';
  const sc = act[act.length - 1]; const key = sc.scene.key;
  const q = (s) => document.querySelector('#ui ' + s);
  const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
  if (click('.intro .start')) return key + ':intro';
  if (q('.explain .go')) { if (!W.acted.explainShot) { W.acted.explainShot = 1; return 'EXPLAINSHOT'; } click('.explain .go'); return key + ':explain'; }
  const ban = q('.banner.pe'); if (ban) { ban.click(); return key + ':banner'; }
  if (key === 'LevelEnd') { if (!W.acted.endShot) { W.acted.endShot = 1; return 'ENDSHOT'; } click('.next'); return 'LevelEnd'; }
  if (key === 'Shop') { if (!W.acted['shop' + S()]) { W.acted['shop' + S()] = 1; const j = q('.shopjar[data-k="peek"]'); j && j.click(); } return 'Shop:ready'; }
  if (key === 'Results') return 'Results';
  if (!/^L\d$/.test(key) || sc.frozen) return key + ':wait';
  function S() { return window.__AA.S.run ? Object.keys(window.__AA.S.run.levels).length : 0; }
  const wrongNow = !W.wrong[key]; // first item of each level answered wrongly on purpose
  if (key === 'L1') {
    const c = sc.card; if (!c) return 'L1:idle';
    if (!W.acted[c.item.id + 'seen']) { W.acted[c.item.id + 'seen'] = 1; return 'L1:ready'; }
    const b = wrongNow ? sc.baskets.find((x) => x.name !== c.item.correct) : sc.baskets.find((x) => x.name === c.item.correct);
    if (!b) return 'L1:ERROR no basket for ' + c.item.correct;
    W.wrong[key] = 1; sc.cartX = c.x - b.off; sc.cartTarget = null; sc.judge(c); return 'L1:answered ' + c.item.id;
  }
  if (key === 'L2') {
    const it = sc.cur; if (!it || sc.judging || !sc.weights.length) return 'L2:idle';
    if (!W.acted[it.id + 'seen']) { W.acted[it.id + 'seen'] = 1; return 'L2:ready'; }
    if (wrongNow) { W.wrong[key] = 1; sc.place(sc.weights[0], sc.jars[0]); sc.weigh(); return 'L2:wrong'; }
    for (const e of it.effects) {
      const w = sc.weights.find((x) => !x.jar && x.change === e.change); const j = sc.jars.find((x) => x.name === e.item);
      if (!w || !j) return 'L2:ERROR missing weight/jar ' + e.item + ' ' + e.change;
      sc.place(w, j);
    }
    sc.weigh(); return 'L2:answered ' + it.id;
  }
  if (key === 'L3') {
    const c = sc.crate; if (!c || c.judging) return 'L3:idle';
    if (!W.acted[c.item.id + 'seen']) { W.acted[c.item.id + 'seen'] = 1; return 'L3:ready'; }
    if (!sc.chutes.includes(sc.answer)) return 'L3:ERROR answer not a chute ' + sc.answer;
    const ch = wrongNow ? sc.chutes.find((n) => n !== sc.answer) : sc.answer; W.wrong[key] = 1;
    sc.choose(ch); return 'L3:answered ' + c.item.id;
  }
  if (key === 'L4') {
    const it = sc.cur; if (!it || sc.judging || sc.locked) return 'L4:idle';
    if (!W.acted[it.id + 'seen']) { W.acted[it.id + 'seen'] = 1; return 'L4:ready'; }
    const lane = wrongNow ? [0, 1, 2].find((l) => l < sc.lanes && l !== sc.correctLane) : sc.correctLane; W.wrong[key] = 1;
    sc.steer(lane); sc.lock(); return 'L4:answered ' + it.id;
  }
  if (key === 'L5') {
    const c = sc.card; if (!c) return 'L5:idle';
    if (!W.acted[c.item.id + 'seen']) { W.acted[c.item.id + 'seen'] = 1; return 'L5:ready'; }
    const it = c.item, stA = sc.stage.startsWith('A');
    const target = stA ? { A1: 'Financing', A2: 'Investing', A3: 'Operating' }[sc.stage] : null;
    W.wrong[key] = 1;
    if (wrongNow) { sc.judge(c, ['Operating', 'Investing', 'Financing'].find((x) => x !== it.correct)); return 'L5:wrong'; }
    if (it.trap) { sc.swat(c); return 'L5:swat ' + it.id; }
    if (stA && it.correct !== target) { sc.judge(c, null); return 'L5:letfall ' + it.id; }
    sc.judge(c, it.correct); return 'L5:answered ' + it.id + ' ' + sc.stage;
  }
  if (key === 'L6') {
    if (sc.mode === 'compare') {
      const it = sc.cur; if (!it || sc.judging || !sc.cards.length) return 'L6:idle';
      if (!W.acted[it.id + 'seen']) { W.acted[it.id + 'seen'] = 1; return 'L6:ready'; }
      const s = wrongNow ? (sc.weakSlot + 1) % sc.cards.length : sc.weakSlot; W.wrong[key] = 1;
      sc.fireAt(s); return 'L6:answered ' + it.id;
    }
    if (sc.mode === 'extract') {
      if (sc.phase === 'pick') { if (!W.acted[sc.cur.id + 'pick']) { W.acted[sc.cur.id + 'pick'] = 1; sc.lines.forEach((l, i) => { if (!!l.d.needed !== l.sel) sc.toggleLine(i); }); return 'L6:picked'; } sc.compute(); return 'L6:computed ' + sc.cur.id; }
      if (sc.phase === 'judge') { sc.verdict(sc.cur.verdict); return 'L6:verdict ' + sc.cur.verdict; }
    }
    return 'L6:idle';
  }
  return key;
};

const t0 = Date.now(); const shot = {}; const seenScenes = new Set(); const log = [];
let shopShots = 0, last = '';
while (Date.now() - t0 < 25 * 60 * 1000) {
  const r = await p.evaluate(act).catch((e) => 'evalerr ' + e.message);
  if (r !== last) { const line = ((Date.now() - t0) / 1000).toFixed(1) + "s " + r; log.push(line); last = r; if (process.env.V) console.log(line); }
  if (r.includes('ERROR')) { console.log('BOT ERROR', r); break; }
  const k = r.split(':')[0]; seenScenes.add(k);
  if (/^L\d:ready/.test(r) && !shot[k]) {
    shot[k] = 1; await p.waitForTimeout(k === 'L1' || k === 'L5' ? 4200 : 1800);
    await p.screenshot({ path: `shots/1${k[1]}_level${k[1]}_play.png` });
    const n = await p.evaluate(() => { const s = window.__AA.game.scene.getScenes(true).pop(); return s.scene.key; });
    continue;
  }
  if (r === 'EXPLAINSHOT') { await p.waitForTimeout(700); await p.screenshot({ path: 'shots/18_explanation_popup.png' }); continue; }
  if (r === 'ENDSHOT') { await p.waitForTimeout(2500); await p.screenshot({ path: 'shots/19_level_end.png' }); continue; }
  if (r === 'Shop:ready') {
    await p.waitForTimeout(600);
    if (!shopShots++) await p.screenshot({ path: 'shots/20_shop.png' });
    await p.click('#ui .go'); await p.waitForTimeout(500); continue;
  }
  if (r === 'LevelEnd' && !shot.end) { shot.end = 1; }
  if (r === 'Results') { await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/30_results.png' }); break; }
  await p.waitForTimeout(r.endsWith('ready') ? 900 : 300);
}
const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
const sum = await p.evaluate(() => { const r = window.__AA.S.run; return { total: r.total, wallet: r.wallet, levels: Object.fromEntries(Object.entries(r.levels).map(([k, v]) => [k, { stars: v.stars, acc: +v.acc.toFixed(2), att: v.attempted, failed: v.failed }])), logN: r.log.length, inv: r.inventory }; });
console.log(log.filter((l) => !/idle|wait|banner|explain/.test(l)).join('\n'));
console.log('ELAPSED_S', elapsed); console.log(JSON.stringify(sum, null, 1));
console.log('ERRORS', errs.length ? errs.join('\n') : 'none');
// leaderboard after the run
await p.click('#ui .lb'); await p.waitForTimeout(1200); await p.screenshot({ path: 'shots/31_leaderboard.png' });
await b.close();
