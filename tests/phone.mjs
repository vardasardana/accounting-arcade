// Phone-landscape check (iPhone 12/13/14 size 844x390) and portrait rotate prompt.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:4173/');
await p.waitForFunction(() => window.__AA && document.querySelector('#ui .play'), null, { timeout: 30000 });
await p.waitForTimeout(2500);
await p.screenshot({ path: 'shots/50_phone_landscape_title.png', scale: 'css' });
await p.evaluate(() => { const S = window.__AA.S; S.player = { name: 'Varda', role: 'CFO', avatar: 3 }; });
await p.evaluate(async () => { const { S } = window.__AA; });
// start a practice run of level 4 via the scene manager
await p.evaluate(() => { const g = window.__AA.game; const S = window.__AA.S; S.run = { mode: 'practice', wallet: 0, total: 0, levels: {}, log: [], inventory: { peek: 1, slow: 0, shield: 0, double: 0, heart: 0 }, bestStreak: 0, start: Date.now(), end: null, speed: 'standard' }; g.scene.getScenes(true)[0].scene.start('L4'); });
await p.waitForTimeout(1200);
await p.tap('#ui .intro .start'); await p.waitForTimeout(600);
const ban = await p.$('#ui .banner.pe'); if (ban) await ban.tap();
await p.waitForTimeout(2500);
await p.screenshot({ path: 'shots/51_phone_landscape_level4.png', scale: 'css' });
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
await p.screenshot({ path: 'shots/52_phone_portrait_rotate_prompt.png' });
console.log('PAGE ERRORS', errs.length ? errs : 'none');
await b.close();
