// Level 6 Stage B (Headline Slingshot): fire every headline with keyboard aim (1/2 + Space) at the right CEO,
// then check one drag-and-release shot. Expects a perfect stage with no hearts lost.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:4173/');
await p.waitForFunction(() => window.__AA && document.querySelector('#ui .play'), null, { timeout: 30000 });
await p.evaluate(() => { const { S, game } = window.__AA; S.player = { name: 'Varda', role: 'CFO', avatar: 2 }; S.run = { mode: 'practice', wallet: 0, total: 0, levels: {}, log: [], inventory: { peek: 0, slow: 0, shield: 0, double: 0, heart: 0 }, bestStreak: 0, start: Date.now(), end: null, speed: 'standard' }; game.scene.getScenes(true)[0].scene.start('L6'); });
await p.waitForTimeout(1200); await p.click('#ui .intro .start'); await p.waitForTimeout(600); await p.click('#ui .banner.pe'); await p.waitForTimeout(600);
await p.evaluate(() => { const sc = window.__AA.game.scene.getScene('L6'); sc.layer.innerHTML = ''; sc.ri = sc.ratios.length; sc.phase = 'done'; sc.startVerdicts(); });
await p.evaluate(() => { const sc = window.__AA.game.scene.getScene('L6'); window.__ev = []; for (const m of ['shotResult', 'nextHeadline', 'launch', 'markCorrect', 'markWrong']) { const o = sc[m].bind(sc); sc[m] = (...a) => { window.__ev.push(Math.round(performance.now()) + ' ' + m + ' ' + (sc.cur && sc.cur.id) + ' ' + (m === 'shotResult' ? a[0] : '')); return o(...a); }; } });
const fired = []; let drag = false;
for (let k = 0; k < 400 && fired.length < 8; k++) {
  await p.waitForTimeout(150);
  const s = await p.evaluate(() => { const sc = window.__AA.game.scene.getScene('L6'); return { mode: sc.mode, phase: sc.phase, id: sc.cur?.id, ans: sc.cur?.answer, frozen: !!sc.frozen, ended: !sc.scene.isActive() }; });
  if (s.ended) break;
  const ex = await p.$('#ui .explain .go'); if (ex) { await ex.click().catch(() => {}); continue; }
  const ban = await p.$('#ui .banner.pe'); if (ban) { await ban.click().catch(() => {}); continue; }
  if (s.mode !== 'sling' || s.phase !== 'aim' || s.frozen || fired.includes(s.id)) continue;
  fired.push(s.id);
  if (!drag && s.ans === 0) { // one real drag shot: pull back and down-left, release
    drag = true; const r = await p.evaluate(() => window.__AA.game.canvas.getBoundingClientRect());
    const sx = r.left + 230 * r.width / 1280, sy = r.top + 478 * r.height / 720;
    await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(sx - 120, sy + 74, { steps: 8 }); await p.waitForTimeout(200);
    await p.screenshot({ path: 'shots/16e_level6_drag_aim.png' }); await p.mouse.up(); await p.waitForTimeout(60);
    fired[fired.length - 1] += '(drag)'; continue;
  }
  await p.keyboard.press(String(s.ans + 1)); await p.waitForTimeout(150); await p.keyboard.press('Space');
}
await p.waitForTimeout(2500);
const st = await p.evaluate(() => { const sc = window.__AA.game.scene.getScene('L6'); return { correct: sc.st.correct, wrong: sc.st.wrong, hearts: window.__AA.S.run.levels?.[6] }; });
console.log((await p.evaluate(() => window.__ev)).join('\n')); console.log('FIRED', fired.join(' '), '\nSTATS', JSON.stringify(st), '\nERRORS', errs.length ? errs : 'none');
await b.close();
