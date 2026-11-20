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
await p.addInitScript(([perf, buy]) => { window.__PERFECT = perf; window.__BUY = buy; }, [!!process.env.PERFECT, process.env.BUY || 'greedy']);
await p.goto(URL);
await p.waitForFunction(() => window.__AA && document.querySelector('#ui .play'), null, { timeout: 30000 });
await p.waitForTimeout(800);
await p.screenshot({ path: 'shots/01_title.png' });
await p.click('#ui .play');
await p.waitForSelector('#ui #nm');
await p.fill('#ui #nm', process.env.NAME || 'Varda');
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
  if (key === 'Shop') {
    if (!W.acted['shop' + S()]) {
      W.acted['shop' + S()] = 1;
      const AA = window.__AA, pr = AA.S.config.shop, keys = ['peek', 'slow', 'shield', 'double', 'heart'];
      const cap = (k) => pr.max_per_visit?.[k] ?? pr.max_each ?? 1;
      const full = keys.reduce((a, k) => a + pr[k] * cap(k), 0);
      const before = AA.S.run.wallet, bought = [];
      if (window.__BUY !== 'none') {
        // greedy: try to buy everything allowed, cheapest first, by clicking the jars
        for (const k of keys.slice().sort((x, y) => pr[x] - pr[y])) for (let n = 0; n < cap(k) + 1; n++) { const w0 = AA.S.run.wallet; q('.shopjar[data-k="' + k + '"]').click(); if (AA.S.run.wallet < w0) bought.push(k); }
      }
      (W.shops ||= []).push({ before_level: S() + 1, wallet: before, total_earned: AA.S.run.total, cost_of_everything: full, bought, left: AA.S.run.wallet });
    }
    return 'Shop:ready';
  }
  if (key === 'Results') return 'Results';
  if (!/^L\d$/.test(key) || sc.frozen) return key + ':wait';
  function S() { return window.__AA.S.run ? Object.keys(window.__AA.S.run.levels).length : 0; }
  const wrongNow = !window.__PERFECT && !W.wrong[key]; // first item of each level answered wrongly on purpose
  if (key === 'L1') {
    const c = sc.card; if (!c) return 'L1:idle';
    if (!W.acted[c.item.id + 'seen']) {
      W.acted[c.item.id + 'seen'] = 1;
      W.l1n = (W.l1n || 0) + 1;
      if (W.l1n === 1) return 'SHOT:11_level1_play';
      if (W.l1n === 3) return 'SHOT:11b_level1_basket_change';
      (W.l1sets ||= []).push(sc.baskets.map((x) => x.name).join(' | ') + '  <=  ' + c.item.correct);
      return 'L1:ready';
    }
    const b = wrongNow ? sc.baskets.find((x) => x.name !== c.item.correct) : sc.baskets.find((x) => x.name === c.item.correct);
    if (!b) return 'L1:ERROR no basket for ' + c.item.correct;
    W.wrong[key] = 1; sc.cartX = c.x - b.off; sc.cartTarget = null; sc.judge(c); return 'L1:answered ' + c.item.id;
  }
  if (key === 'L2') {
    const it = sc.cur; if (!it || sc.judging || !sc.weights.length) return 'L2:idle';
    if (!W.acted[it.id + 'seen']) { W.acted[it.id + 'seen'] = 1; return 'L2:ready'; }
    if (!W.acted.pause) { W.acted.pause = 1; return 'PAUSESHOT'; }
    if (wrongNow) { W.wrong[key] = 1; sc.place(sc.weights[0], sc.jars[0]); sc.weigh(); return 'L2:wrong'; }
    for (const e of it.effects) {
      const w = sc.weights.find((x) => !x.jar && x.change === e.change); const jn = e.alts && e.alts.length > 1 && Math.random() < 0.5 ? e.alts[1] : e.item; const j = sc.jars.find((x) => x.name === jn); if (jn !== e.item) W.bankUsed = (W.bankUsed || 0) + 1;
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
    const c = sc.target; if (!c || c.phase === 'rise') return 'L5:idle';
    if (!W.acted[c.item.id + 'seen']) {
      W.acted[c.item.id + 'seen'] = 1;
      if (!W.acted['L5shot' + sc.stage]) { W.acted['L5shot' + sc.stage] = 1; return 'SHOT:15' + { A: 'a', B: 'b', C: 'c' }[sc.stage] + '_level5_stage' + sc.stage; }
      return 'L5:ready';
    }
    const gi = sc.guns.findIndex((g) => g.key === c.item.correct);
    if (gi < 0) return 'L5:ERROR no gun for ' + c.item.correct;
    W.wrong[key] = 1;
    sc.pickGun(wrongNow ? (gi + 1) % sc.guns.length : gi); sc.shoot(c);
    return 'L5:answered ' + c.item.id + ' ' + sc.stage;
  }
  if (key === 'L6') {
    if (click('.vnote button')) return 'L6:note';
    if (sc.mode === 'shop' && sc.phase === 'pick') {
      const r = sc.cur;
      if (!W.acted[r.id + 'seen']) { W.acted[r.id + 'seen'] = 1; return 'L6:ready'; }
      if (wrongNow) { W.wrong[key] = 1; sc.put(window.__AA.S.data.shelf.find((x) => x.id !== r.numerator && x.id !== r.denominator).id, 'top'); return 'L6:wrongpick'; }
      if (!sc.slots.top) { sc.put(r.numerator, 'top'); return 'L6:top'; }
      if (!sc.slots.bottom) { sc.put(r.denominator, 'bottom'); return 'L6:bottom'; }
      if (!W.acted.l6trolley) { W.acted.l6trolley = 1; return 'SHOT:16a_level6_supermarket'; }
      sc.checkout(); return 'L6:checkout ' + r.id;
    }
    if (sc.mode === 'shop' && sc.phase === 'checkout') {
      if (!W.acted.l6till) { W.acted.l6till = 1; return 'SHOT:16b_level6_checkout'; }
      const i = sc.opts.indexOf(sc.cur.answer); if (i < 0) return 'L6:ERROR answer not in options';
      sc.pay(i); return 'L6:paid ' + sc.cur.id;
    }
    if (sc.mode === 'sling' && sc.phase === 'aim') {
      const h = sc.cur;
      if (!W.acted[h.id + 'seen']) { W.acted[h.id + 'seen'] = 1; return 'L6:ready'; }
      if (sc.aimAt !== h.answer) { sc.aim(h.answer); if (!W.acted.l6sling) { W.acted.l6sling = 1; return 'SHOT:16c_level6_slingshot'; } return 'L6:aimed'; }
      sc.launch(); (W.slingShots ||= []).push(h.id); if (!W.acted.l6fly) { W.acted.l6fly = 1; return 'SHOTFLY:16d_level6_slingshot_flight'; } return 'L6:launched ' + h.id;
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
  if (r === 'PAUSESHOT') { await p.click('#ui .pausebtn'); await p.waitForTimeout(600); if (!process.env.NOSHOTS) await p.screenshot({ path: 'shots/17_pause_blur.png' }); await p.click('#ui .resume'); await p.waitForTimeout(300); continue; }
  if (r.startsWith('SHOTFLY:')) { await p.waitForTimeout(450); if (!process.env.NOSHOTS) await p.screenshot({ path: `shots/${r.slice(8)}.png` }); continue; }
  if (r.startsWith('SHOT:')) { await p.waitForTimeout(/level1/.test(r) ? 500 : 900); if (!process.env.NOSHOTS) await p.screenshot({ path: `shots/${r.slice(5)}.png` }); continue; }
  if (/^L[234]:ready/.test(r) && !shot[k]) {
    shot[k] = 1; await p.waitForTimeout(1800);
    if (!process.env.NOSHOTS) await p.screenshot({ path: `shots/1${k[1]}_level${k[1]}_play.png` });
    continue;
  }
  if (r === 'EXPLAINSHOT') { await p.waitForTimeout(700); if (!process.env.NOSHOTS) await p.screenshot({ path: 'shots/18_explanation_popup.png' }); continue; }
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
console.log('SHOPS', JSON.stringify(await p.evaluate(() => window.__bot.shops), null, 1));
console.log('L2 answers given via the Bank jar instead of Cash:', await p.evaluate(() => window.__bot.bankUsed || 0), ' | L6 headlines fired:', await p.evaluate(() => (window.__bot.slingShots || []).join(',')));
console.log('L1 SETS', JSON.stringify(await p.evaluate(() => window.__bot.l1sets), null, 1));
console.log('ERRORS', errs.length ? errs.join('\n') : 'none');
// leaderboard after the run
const shared = await p.evaluate(async () => { for (let i = 0; i < 60; i++) { const s = document.querySelector('.shared-status')?.textContent || ''; if (!/Saving/.test(s)) return s; await new Promise((r) => setTimeout(r, 500)); } return 'timeout'; });
console.log('SHARED STATUS', shared);
await p.click('#ui .lb'); await p.waitForSelector('#ui .body .tbl, #ui .body .err, #ui .body .muted:not(:empty)', { timeout: 30000 }); await p.waitForFunction(() => !/Loading the class board/.test(document.querySelector('#ui .body')?.textContent || 'Loading the class board'), null, { timeout: 30000 }); await p.waitForTimeout(800);
console.log('BOARD', await p.evaluate(() => [...document.querySelectorAll('#ui .body tr')].slice(0, 8).map((t) => t.textContent.replace(/\s+/g, ' ').trim()).join(' | '))); await p.screenshot({ path: 'shots/31_leaderboard.png' });
await b.close();
