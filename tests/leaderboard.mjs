// Opens the leaderboard from the menu and waits for the shared class board to load (needs LEADERBOARD_URL set).
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
if (process.env.OFFLINE) await p.route(/script\.google(usercontent)?\.com/, (r) => r.abort());
await p.goto(process.env.URL || 'http://localhost:4173/');
await p.waitForFunction(() => window.__AA && document.querySelector('#ui .play'), null, { timeout: 30000 });
await p.click('#ui .lb');
await p.waitForFunction(() => { const t = document.querySelector('#ui .body')?.textContent || 'Loading the class board'; return !/Loading the class board/.test(t); }, null, { timeout: 30000 });
await p.waitForTimeout(800);
await p.screenshot({ path: process.env.SHOT || 'shots/32_class_leaderboard.png' });
console.log('BOARD', await p.evaluate(() => [...document.querySelectorAll('#ui .body tr')].map((t) => t.textContent.replace(/\s+/g, ' ').trim()).join(' | ') || document.querySelector('#ui .body').textContent));
console.log('ERRORS', errs.length ? errs : 'none');
await b.close();
