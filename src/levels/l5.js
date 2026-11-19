import { LevelBase } from './base.js';
import { S, fs } from '../core/state.js';
import { UI, esc, $ } from '../core/ui.js';
import { sfx, musicTempo } from '../core/audio.js';
import { bg, shuffle } from '../scenes/common.js';
import { coinBurst, stampText, confetti, puff } from './fx.js';

const COLS = [190, 415, 640, 865, 1090];
const TOP_Y = 178, CATCH_Y = 520, CART_Y = 655;
const BASK = ['Operating', 'Investing', 'Financing'], OFF = [-215, 0, 215];
const DEF = { Operating: 'Operating: the company’s main trading activities.', Investing: 'Investing: buying or selling long-term assets and investments.', Financing: 'Financing: changes in share capital and borrowings.' };
const STAGE_INFO = {
  A1: { title: 'Stage A1: catch only FINANCING', sub: 'Only the Financing basket is open. Let every other card fall (move the cart away).', open: ['Financing'] },
  A2: { title: 'Stage A2: catch only INVESTING', sub: 'Only the Investing basket is open. Let the rest fall.', open: ['Investing'] },
  A3: { title: 'Stage A3: catch only OPERATING', sub: 'Only the Operating basket is open. Let the rest fall.', open: ['Operating'] },
  B: { title: 'Stage B: all three baskets', sub: 'Catch every card in the right basket.', open: BASK },
  C: { title: 'Stage C: watch for paper rain!', sub: 'Some cards are <b>non-cash</b> items. Did cash move? If not, let it fall or swat it (<span class="kbd">Space</span> or tap it).', open: BASK },
  D: { title: 'Stage D: indirect method', sub: 'Working-capital changes (receivables, inventory, payables) reflect cash from trading, so they go in <b>Operating</b>. Short-term loans go to <b>Financing</b>; short-term investments that are not cash equivalents go to <b>Investing</b>.', open: BASK },
};

export class Level5 extends LevelBase {
  constructor() { super('L5', 5); }
  introLines() {
    return [
      'A storm over <b>Lumen Textiles Inc.</b> is raining transactions. Catch each cash flow in the right basket on your dock cart.',
      'Move the cart with <span class="kbd">←</span><span class="kbd">→</span>, the mouse or a finger. <span class="kbd">1</span> Operating, <span class="kbd">2</span> Investing, <span class="kbd">3</span> Financing snap that basket under the card.',
      'To let a card fall, move the cart out of the way.',
      'From Stage C, non-cash cards appear: let them fall or swat them with <span class="kbd">Space</span> (or tap the card).',
    ];
  }
  introRule() { return '<b>This game’s rule, as Ind AS 7 requires for non-financial companies:</b> interest and dividends <b>paid</b> = Financing; interest and dividends <b>received</b> = Investing.'; }
  buildWorld() {
    bg(this, 'bg_harbour');
    this.rain = this.add.graphics().setDepth(1); this.drops = Array.from({ length: S.settings.reducedMotion ? 0 : 50 }, () => ({ x: Math.random() * 1280, y: Math.random() * 720 }));
    this.cloud = this.add.image(640, 0, 'storm').setOrigin(0.5, 0).setDepth(2);
    this.flash = this.add.rectangle(640, 360, 1280, 720, 0xffffff, 0).setDepth(3);
    this.cart = this.add.container(640, CART_Y).setDepth(20);
    this.cart.add(this.add.image(0, 22, 'dock'));
    this.cart.add(this.add.image(-360, -10, 'avatar_' + (S.player?.avatar ?? 0)).setScale(0.75));
    this.baskets = BASK.map((name, i) => {
      const c = this.add.container(OFF[i], -60);
      c.add(this.add.image(0, 0, 'cfb_' + name + (S.settings.patterns ? '_h' : '')));
      const plate = this.add.rectangle(0, 14, 178, 50, 0xFFF6E5).setStrokeStyle(3, 0x1F3A5F); c.add(plate);
      c.add(this.add.text(0, 14, name + '\nActivities', { fontFamily: 'Fredoka', fontStyle: '600', fontSize: fs(18) + 'px', color: '#1F3A5F', align: 'center', lineSpacing: -4 }).setOrigin(0.5));
      c.add(this.add.circle(-86, -26, 15, 0x1F3A5F).setStrokeStyle(2, 0xffffff)); c.add(this.add.text(-86, -26, String(i + 1), { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '18px', color: '#fff' }).setOrigin(0.5));
      const tarp = this.add.image(0, 0, 'tarp').setVisible(false); c.add(tarp);
      const closed = this.add.text(0, 6, 'CLOSED', { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '22px', color: '#fff', backgroundColor: '#1F3A5F', padding: { x: 6, y: 2 } }).setOrigin(0.5).setVisible(false); c.add(closed);
      const def = this.add.text(0, -80, DEF[name], { fontFamily: 'Atkinson Hyperlegible', fontSize: fs(15) + 'px', color: '#1F3A5F', backgroundColor: '#F0E442', align: 'center', wordWrap: { width: 200 }, padding: { x: 4, y: 2 } }).setOrigin(0.5, 1).setVisible(false); c.add(def);
      plate.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.snap(i));
      this.cart.add(c);
      return { name, c, tarp, closed, def, open: true };
    });
    this.cartX = 640; this.cartTarget = null;
    this.input.on('pointermove', (p) => { if (!this.frozen && p.y > 420 && (p.isDown || p.pointerType === 'mouse')) this.cartTarget = p.x; });
    this.board = UI.add(`<div class="box pe" style="position:absolute;left:640px;top:68px;transform:translateX(-50%);white-space:nowrap;background:rgba(255,246,229,.95);border:3px solid var(--navy);border-radius:999px;padding:3px 16px;font-size:16px;display:flex;gap:14px">
       <b style="font-family:var(--hd);color:var(--navy)">Cash flow board</b><span>CFO <b class="b0">0</b></span><span>CFI <b class="b1">0</b></span><span>CFF <b class="b2">0</b></span><span style="color:#555">Traps dodged <b class="b3">0</b></span></div>`, '');
    this.counts = [0, 0, 0, 0];
    this.deal();
    this.tips = { 'Non-cash items': 'Remember: depreciation is non-cash, so it is never caught in Cash Flow Rush.', 'Interest and dividends': 'Remember: paid = Financing, received = Investing (this game’s Ind AS 7 rule).', 'Working capital': 'Remember: working-capital changes belong in Operating.' };
    this.endLine = 'Profit is an opinion, cash is a fact!';
  }
  deal() {
    const cfg = S.config.levels['5']; const used = new Set(); const all = S.data.l5;
    const take = (arr, n) => { const out = []; for (const c of shuffle(arr)) { if (out.length >= n) break; if (used.has(c.id)) continue; used.add(c.id); out.push(c); } return out; };
    let order = ['A1', 'A2', 'A3', 'B', 'C', 'D']; if (cfg.stage_d_enabled === false) order = order.filter((s) => s !== 'D');
    this.stages = [];
    for (const s of order) {
      const n = cfg.cards?.[s] ?? 3; let cards = [];
      if (s.startsWith('A')) {
        const target = STAGE_INFO[s].open[0];
        cards = take(all.filter((c) => c.stages.includes(s) && c.correct === target), Math.max(1, n - 1));
        cards.push(...take(all.filter((c) => c.correct !== target && !c.trap && c.stages.some((x) => x.startsWith('A'))), n - cards.length));
      } else if (s === 'C') {
        const nt = Math.max(1, Math.round(n * 0.4));
        cards = take(all.filter((c) => c.stages.includes('C') && c.trap), nt);
        cards.push(...take(all.filter((c) => c.stages.includes('C') && !c.trap), n - cards.length));
      } else cards = take(all.filter((c) => c.stages.includes(s)), n);
      if (cards.length) this.stages.push({ s, cards: shuffle(cards) });
    }
    this.total = this.stages.reduce((a, s) => a + s.cards.length, 0); this.done = 0;
  }
  begin() { this.si = -1; this.nextStage(); }
  nextStage() {
    this.si++;
    const st = this.stages[this.si];
    if (!st) { this.finishLevel(false); return; }
    this.stage = st.s; this.queue = st.cards; this.qi = 0;
    const info = STAGE_INFO[st.s];
    this.baskets.forEach((b) => { b.open = info.open.includes(b.name); b.tarp.setVisible(!b.open); b.closed.setVisible(!b.open); });
    this.setStageDots(this.si + 1, this.stages.length, 'Stage');
    this.setTheme(info.title.replace(/^Stage \w+: (\w)/, (m, c) => c.toUpperCase()));
    if (st.s === 'C') { musicTempo(1.08); if (this.hearts < 3) { this.hearts++; this.refreshHud(); this.floatText(1200, 120, '+1 heart'); } }
    sfx('thunder'); if (!S.settings.reducedMotion) this.tweens.add({ targets: this.flash, alpha: 0.35, yoyo: true, duration: 160 });
    this.banner(info.title, info.sub, st.s === 'D' ? 6 : 3.4, () => this.spawn());
  }
  spawn() {
    if (this.qi >= this.queue.length) { this.wait(0.6, () => this.nextStage()); return; }
    const it = this.queue[this.qi++];
    const col = COLS[Math.floor(Math.random() * COLS.length)];
    const c = this.add.container(col, TOP_Y).setDepth(30);
    c.add(this.add.image(0, 0, 'cf_card'));
    c.add(this.add.text(0, 2, it.text, { fontFamily: 'Atkinson Hyperlegible', fontStyle: '700', fontSize: fs(21) + 'px', color: '#222', align: 'center', wordWrap: { width: 268 } }).setOrigin(0.5));
    c.setSize(300, 96); c.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.swat(c));
    const ft = S.config.levels['5'].fall_time_s; c.fall = this.T(ft[this.stage] || 9.5);
    c.item = it; c.t = 0; c.born = this.time.now; c.pause = this.T(1.6);
    this.card = c; this.peekItem = null; this.baskets.forEach((b) => b.def.setVisible(false));
    const isTarget = this.stage.startsWith('A') ? it.correct === STAGE_INFO[this.stage].open[0] : !it.trap;
    this.setPreviewKey(it.trap ? 'Trap: let it fall or swat' : isTarget ? it.correct : 'Let it fall');
    sfx('rustle');
  }
  snap(i) { if (this.frozen) return; const x = this.card ? this.card.x : this.cartX; this.cartTarget = x - OFF[i]; sfx('click'); }
  currentItem() { return this.card?.item; }
  applyPeek(it) {
    this.baskets.forEach((b) => b.def.setVisible(b.open));
    if (this.card && this.stage >= 'C') this.card.add(this.add.text(130, -44, '?', { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '26px', color: '#fff', backgroundColor: '#0072B2', padding: { x: 6, y: 0 } }).setOrigin(0.5));
    if (this.stage === 'C' || this.stage === 'D') this.setTheme('💡 Did cash move? If not, it is not a cash flow.');
    return true;
  }
  onKey(e) {
    if (/^[1-3]$/.test(e.key)) this.snap(Number(e.key) - 1);
    if (e.key === ' ' && this.card) this.swat(this.card);
  }
  swat(c) {
    if (this.frozen || c !== this.card || (this.stage !== 'C' && this.stage !== 'D')) return;
    sfx('swish');
    const umb = this.add.image(c.x - 120, c.y + 30, 'umbrella').setScale(0.7).setDepth(35);
    this.tweens.add({ targets: umb, angle: -70, duration: 160, yoyo: true, onComplete: () => umb.destroy() });
    this.judge(c, 'swat');
  }
  tick(g, real) {
    const k = this.held();
    const L = k.LEFT.isDown || k.A.isDown, R = k.RIGHT.isDown || k.D.isDown;
    if (L || R) { this.cartTarget = null; this.cartX += (R ? 1 : -1) * 820 * real; }
    else if (this.cartTarget !== null) { const d = this.cartTarget - this.cartX; this.cartX += Math.sign(d) * Math.min(Math.abs(d), 1100 * real); if (Math.abs(d) < 1) this.cartTarget = null; }
    this.cartX = Math.max(-40, Math.min(1320, this.cartX)); this.cart.x = this.cartX;
    this.rain.clear(); this.rain.lineStyle(2, 0xBFE6FA, 0.35);
    for (const d of this.drops) { d.y += 500 * real; d.x -= 80 * real; if (d.y > 720) { d.y = 120; d.x = Math.random() * 1400; } this.rain.lineBetween(d.x, d.y, d.x - 6, d.y + 16); }
    const c = this.card; if (!c) { this.setTimer(null); return; }
    if (c.pause > 0) { c.pause -= real; this.setTimer(c.fall + Math.max(0, c.pause), c.fall + this.T(1.6)); return; }
    c.t += g / this.sf / c.fall;
    c.y = TOP_Y + (CATCH_Y - TOP_Y) * Math.min(1, c.t); c.angle = Math.sin(this.time.now / 300) * 2;
    this.setTimer((1 - c.t) * c.fall, c.fall + this.T(1.6));
    if (c.t >= 1) {
      const under = this.baskets.find((b) => Math.abs(this.cartX + OFF[this.baskets.indexOf(b)] - c.x) < 105);
      this.judge(c, under ? under.name : null);
    }
  }
  judge(c, given) {
    this.card = null; this.setTimer(null);
    const it = c.item, rt = Math.round(this.time.now - c.born); this.done++; this.setProgress(this.done / this.total);
    const stageA = this.stage.startsWith('A'), target = stageA ? STAGE_INFO[this.stage].open[0] : null;
    const basket = given && given !== 'swat' ? this.baskets.find((b) => b.name === given) : null;
    const fast = c.t < 0.5;
    let result, correctText;
    if (it.trap) {
      correctText = 'Not a cash flow: let it fall or swat it';
      result = (given === null || given === 'swat') ? 'trap' : 'wrong';
    } else if (stageA) {
      const isTarget = it.correct === target;
      correctText = isTarget ? it.correct + ' (catch it)' : `Let it fall (it is ${it.correct})`;
      if (isTarget) result = basket && basket.open && basket.name === target ? 'ok' : 'wrong';
      else result = basket && basket.open ? 'wrong' : 'letfall';
    } else {
      correctText = it.correct;
      result = basket && basket.name === it.correct ? 'ok' : 'wrong';
    }
    const gx = basket ? this.cartX + OFF[this.baskets.indexOf(basket)] : c.x;
    const givenText = given === 'swat' ? 'swatted' : given || 'let it fall';
    if (result === 'ok' || result === 'trap') {
      if (result === 'ok') {
        this.tweens.add({ targets: c, x: gx, y: CART_Y - 60, scale: 0.3, alpha: 0, duration: 240, onComplete: () => c.destroy() });
        const s = stampText(this, gx, CATCH_Y - 40, { Operating: 'CFO', Investing: 'CFI', Financing: 'CFF' }[it.correct]); this.time.delayedCall(700, () => s.destroy());
        coinBurst(this, gx, CART_Y - 80); this.counts[BASK.indexOf(it.correct)]++;
      } else {
        this.tweens.add({ targets: c, x: c.x + 600, y: c.y - 200, angle: 360, alpha: 0, duration: 500, onComplete: () => c.destroy() });
        this.counts[3]++;
      }
      this.markCorrect({ item: it, given: givenText, correct: correctText, x: gx, y: CATCH_Y - 90, fast: result === 'ok' && fast, trap: result === 'trap', label: result === 'trap' ? 'No cash moved' : it.correct, rt });
      this.updBoard();
      this.wait(1.2, () => this.spawn());
    } else if (result === 'letfall') {
      this.tweens.add({ targets: c, y: 760, alpha: 0.5, duration: 400, onComplete: () => c.destroy() });
      this.markLetFall({ item: it, x: c.x, y: 560 });
      this.floatText(c.x, 610, `Right to let it fall: ${it.correct}`, 'lbl');
      this.wait(1.2, () => this.spawn());
    } else {
      if (it.trap && basket) { const s = stampText(this, gx, CATCH_Y - 30, 'NO CASH MOVED', '#D55E00'); this.time.delayedCall(900, () => s.destroy()); sfx('poof'); puff(this, gx, CATCH_Y, 0xB9C2CC); c.setVisible(false); }
      else if (basket) { sfx('plop'); this.tweens.add({ targets: c, y: CATCH_Y - 70, duration: 200, yoyo: true }); }
      else this.tweens.add({ targets: c, y: 760, duration: 400 });
      const expl = stageA && it.correct !== target ? `Only ${target} was open in this stage. ${it.explanation}` : it.explanation;
      this.markWrong({ item: it, given: givenText, correctText, explanation: expl, rt, after: () => { c.destroy(); this.wait(0.8, () => this.spawn()); } });
    }
  }
  updBoard() { this.counts.forEach((n, i) => { const e = this.board.querySelector('.b' + i); if (e) e.textContent = n; }); }
  endExtra() { return { traps: this.counts[3], cfo: this.counts[0], cfi: this.counts[1], cff: this.counts[2] }; }
  finishLevel(failed) { if (!failed) confetti(this); super.finishLevel(failed); }
}
