// Loads a deliberately broken CSV through the localStorage override and checks the validation report.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const good = fs.readFileSync('public/data/level3_classify.csv', 'utf8').trim().split('\n');
const head = good[0];
const broken = [head, good[1], good[2],
  // row with an unknown chute and a missing item
  good[3].replace(/Current Asset|Non-current Asset|Current Liability|Non-current Liability|Equity/, 'Banana'),
  head.split(',').map(() => '').join(','),
  'garbage,"unterminated,quote'].join('\n');
await p.goto('http://localhost:4173/');
await p.evaluate((t) => localStorage.setItem('aa_override_level3_classify.csv', t), broken);
await p.reload();
await p.waitForTimeout(4000);
const txt = await p.evaluate(() => document.querySelector('#ui')?.innerText || '');
await p.screenshot({ path: 'shots/40_validation_report.png' });
const scene = await p.evaluate(() => window.__AA?.game.scene.getScenes(true).map((s) => s.scene.key));
console.log('SCENE', scene); console.log(txt.slice(0, 1500));
await p.click('#ui .go'); await p.waitForTimeout(1500);
console.log('AFTER', await p.evaluate(() => window.__AA.game.scene.getScenes(true).map((s) => s.scene.key)), 'L3 rows kept:', await p.evaluate(() => window.__AA.S.data.l3.length));
await p.evaluate(() => localStorage.removeItem('aa_override_level3_classify.csv'));
console.log('PAGE ERRORS', errs.length ? errs : 'none');
await b.close();
