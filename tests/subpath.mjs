import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const bad = [];
p.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); }); p.on('pageerror', (e) => bad.push(e.message));
await p.goto(process.env.URL || 'http://localhost:4180/accounting-arcade/');
await p.waitForFunction(() => window.__AA && document.querySelector('#ui .play'), null, { timeout: 20000 });
console.log('SUBPATH OK; failed requests/errors:', bad.length ? bad : 'none', 'fonts:', await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + f.weight).join(',')));
await b.close();
