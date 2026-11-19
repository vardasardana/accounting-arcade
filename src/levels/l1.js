import { LevelBase } from './base.js';
import { S, fs } from '../core/state.js';
import { sfx, musicTempo } from '../core/audio.js';
import { bg, shuffle } from '../scenes/common.js';
import { coinBurst, stampText, puff, confetti } from './fx.js';
import { SLOT } from '../art/textures.js';

const COLS = [330, 640, 950];
const TOP_Y = 182, CATCH_Y = 520, CART_Y = 660;

export class Level1 extends LevelBase {
  constructor() { super('L1', 1); }
  introLines() {
    return [
      'Case files fall from the shelf. Each one shows one accounting concept.',
      'Slide the cart with <span class="kbd">←</span> <span class="kbd">→</span>, the mouse or a finger, so the right basket is under the file.',
      'Or press <span class="kbd">1</span>–<span class="kbd">4</span> (or tap a basket label) and the cart glides there for you.',
      'The baskets change after every <b>two</b> files, so read the labels each time. Two files in a row can belong in the same basket.',
      'Press <span class="kbd">↓</span> to drop a file faster once you are sure (speed bonus).',
    ];
  }
  buildWorld() {
    bg(this, 'bg_archive');
    this.dust = [];
    for (let i = 0; i < (S.settings.reducedMotion ? 0 : 18); i++) { const d = this.add.circle(Math.random() * 1280, 120 + Math.random() * 500, 2, 0xffffff, 0.6); this.dust.push(d); }
    this.add.line(0, 0, 0, CATCH_Y + 70, 1280, CATCH_Y + 70, 0x1F3A5F, 0.35).setOrigin(0, 0).setLineWidth(3);
    this.cart = this.add.container(640, CART_Y).setDepth(20);
    this.cart.add(this.add.image(0, 20, 'cart'));
    this.avatarImg = this.add.image(440, -20, 'avatar_' + (S.player?.avatar ?? 0)).setScale(0.8);
    this.cart.add(this.avatarImg);
    this.baskets = []; this.cartX = 640; this.cartTarget = null;
    this.waves = S.data.waves1.slice().sort((a, b) => a.wave - b.wave);
    this.byName = Object.fromEntries(S.data.baskets.map((b) => [b.name, b]));
    this.input.on('pointermove', (p) => { if (!this.frozen && p.y > 380 && (p.isDown || p.pointerType === 'mouse')) this.cartTarget = p.x; });
    this.input.on('pointerdown', (p) => { if (!this.frozen && p.y > 380 && p.y < 560) this.cartTarget = p.x; });
    this.total = this.waves.reduce((a, w) => a + Math.min(w.cards, w.baskets[0] === 'RANDOM' ? (S.data.l1.filter((c) => c.wave === w.wave).length || S.data.l1.length) : S.data.l1.filter((c) => c.wave === w.wave).length), 0);
    this.done = 0;
    this.mastered = {};
    this.tips = { Accrual: 'Remember: revenue is recorded when earned, not when the cash arrives.', Matching: 'Remember: expenses follow the revenue they helped to earn.' };
    this.endLine = 'Audit cleared!';
  }
  begin() { this.waveIdx = -1; this.usedIds = new Set(); this.nextWave(); }

  setBaskets(names) {
    this.baskets.forEach((b) => b.c.destroy());
    this.baskets = [];
    const n = names.length, gap = n === 4 ? 190 : 205;
    names.forEach((name, i) => {
      const off = (i - (n - 1) / 2) * gap;
      const info = this.byName[name] || { short: name, idea: '', icon: '' };
      const c = this.add.container(off, -70);
      const slot = SLOT[i % 4];
      c.add(this.add.image(0, 0, 'basket_' + (i % 4) + (S.settings.patterns ? '_h' : '')));
      const plate = this.add.rectangle(0, 16, 176, 64, 0xFFF6E5).setStrokeStyle(3, 0x1F3A5F);
      c.add(plate);
      if (info.icon && this.textures.exists('ci_' + info.icon)) c.add(this.add.image(-66, 16, 'ci_' + info.icon).setScale(0.8));
      c.add(this.add.text(14, 16, info.short, { fontFamily: 'Fredoka', fontStyle: '600', fontSize: fs(20) + 'px', color: '#1F3A5F', align: 'center', wordWrap: { width: 128 }, lineSpacing: -4 }).setOrigin(0.5));
      const key = this.add.circle(-80, -26, 15, 0x1F3A5F).setStrokeStyle(2, 0xffffff);
      c.add(key); c.add(this.add.text(-80, -26, String(i + 1), { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '18px', color: '#fff' }).setOrigin(0.5));
      const idea = this.add.text(0, 62, info.idea, { fontFamily: 'Atkinson Hyperlegible', fontSize: fs(15) + 'px', color: '#1F3A5F', backgroundColor: '#F0E442', align: 'center', wordWrap: { width: 180 }, padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setVisible(false);
      c.add(idea);
      plate.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.snapTo(i));
      c.setScale(0, 1); this.tweens.add({ targets: c, scaleX: 1, duration: S.settings.reducedMotion ? 1 : 350, delay: i * 80 });
      this.cart.add(c);
      this.baskets.push({ name, off, c, idea, plate, slot });
    });
  }
  snapTo(i) {
    if (this.frozen || !this.baskets[i]) return;
    const x = this.card ? this.card.x : this.cartX + this.baskets[i].off;
    this.cartTarget = x - this.baskets[i].off;
    sfx('click');
  }
  // Basket sets: a fresh random set of 4 every two files; the files' own baskets are always in the set,
  // the rest are random (repeats across sets allowed), never a concept that could also fit either file.
  buildRandomSets(cards) {
    const all = S.data.baskets.map((b) => b.name), sets = [];
    const am = ['Accrual (Revenue Recognition) Concept', 'Matching Concept'];
    for (let k = 0; k < cards.length; k += 2) {
      const pair = cards.slice(k, k + 2);
      const req = [...new Set(pair.map((c) => c.correct))];
      const forbid = new Set(pair.flatMap((c) => c.conflicts));
      const set = req.slice();
      for (const n of shuffle(all.filter((n) => !forbid.has(n) && !req.includes(n)))) { if (set.length >= 4) break; if (am.includes(n) && set.some((s) => am.includes(s))) continue; set.push(n); }
      sets.push(shuffle(set));
    }
    return sets;
  }
  // Draws n files from this round's pool. Pairs share a basket set, so the second file of a pair must not
  // clash with the first; about half the time it deliberately belongs to the SAME basket as the first.
  drawCards(pool, n) {
    const left = shuffle(pool), cards = [];
    const ok = (a, b) => !a.conflicts.includes(b.correct) && !b.conflicts.includes(a.correct);
    while (cards.length < n && left.length) {
      const prev = cards.length % 2 === 1 ? cards[cards.length - 1] : null;
      let i = -1;
      if (prev) {
        if (Math.random() < 0.5) i = left.findIndex((c) => c.correct === prev.correct);
        if (i < 0) i = left.findIndex((c) => c.correct !== prev.correct && ok(prev, c));
        if (i < 0) i = left.findIndex((c) => ok(prev, c));
        if (i < 0) break;
      } else i = 0;
      cards.push(left.splice(i, 1)[0]);
    }
    return cards;
  }
  nextWave() {
    this.waveIdx++;
    const w = this.waves[this.waveIdx];
    if (!w) { this.finishLevel(false); return; }
    this.setStageDots(this.waveIdx + 1, this.waves.length, 'Audit round');
    let cards;
    if (w.baskets[0] === 'RANDOM') {
      const own = S.data.l1.filter((c) => c.wave === w.wave && !this.usedIds.has(c.id));
      const pool = own.length ? own : S.data.l1.filter((c) => !this.usedIds.has(c.id));
      cards = this.drawCards(pool, w.cards);
      cards.forEach((c) => this.usedIds.add(c.id));
      this.sets = this.buildRandomSets(cards);
    } else {
      cards = S.data.l1.filter((c) => c.wave === w.wave).sort((a, b) => a.difficulty - b.difficulty).slice(0, w.cards);
      cards = shuffle(cards);
      this.sets = null;
      this.setBaskets(w.baskets);
    }
    this.queue = cards; this.cardIdx = 0; this.wave = w;
    if (this.waveIdx === this.waves.length - 1) musicTempo(1.12);
    const names = this.sets ? 'The baskets on your cart change after every <b>two</b> files. A basket can come back, and two files in a row can belong in the same basket, so read every label!' : w.baskets.map((b) => this.byName[b]?.short || b).join(' · ');
    this.setTheme(`Audit round ${w.wave}: ${w.name}`);
    sfx('ding');
    this.banner(`Audit round ${w.wave}: ${w.name}`, names, 4.2, () => this.spawn());
  }
  spawn() {
    if (this.cardIdx >= this.queue.length) { this.wait(0.6, () => this.nextWave()); return; }
    if (this.sets && this.cardIdx % 2 === 0) { this.setBaskets(this.sets[Math.floor(this.cardIdx / 2)]); if (this.cardIdx > 0) { sfx('whoosh'); this.floatText(640, 470, '🔄 New baskets!', 'lbl'); this.basketChanges = (this.basketChanges || 0) + 1; } }
    const item = this.queue[this.cardIdx++];
    const col = COLS[Math.floor(Math.random() * 3)];
    const c = this.add.container(col, TOP_Y).setDepth(30);
    c.add(this.add.image(0, 0, 'case_file'));
    c.add(this.add.text(0, 8, item.prompt, { fontFamily: 'Atkinson Hyperlegible', fontSize: fs(21) + 'px', color: '#222222', align: 'center', wordWrap: { width: 296 }, lineSpacing: 1 }).setOrigin(0.5));
    c.item = item; c.phase = 'read'; c.t = 0; c.fallT = 0; c.fast = false; c.born = this.time.now;
    c.readTime = this.T(S.config.levels['1'].read_pause_s || 2.5);
    c.fallTime = this.wave.fall;
    this.card = c; this.setPreviewKey(item.correct);
    sfx('rustle');
    if (!S.settings.reducedMotion) this.tweens.add({ targets: c, angle: { from: -6, to: 6 }, duration: 300, yoyo: true, repeat: 1 });
    this.peekItem = null;
    this.baskets.forEach((b) => { b.c.setAlpha(1); b.idea.setVisible(false); });
  }
  currentItem() { return this.card?.item; }
  applyPeek(item) {
    const wrong = this.baskets.filter((b) => b.name !== item.correct);
    if (!wrong.length) return false;
    wrong[Math.floor(Math.random() * wrong.length)].c.setAlpha(0.3);
    this.baskets.forEach((b) => { if (b.c.alpha === 1) b.idea.setVisible(true); });
    return true;
  }
  onKey(e) {
    if (/^[1-4]$/.test(e.key)) this.snapTo(Number(e.key) - 1);
    if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && this.card && this.card.phase === 'fall') this.card.fast = true;
  }
  tick(g, real) {
    // cart movement (real time so it never feels sluggish)
    const k = this.held();
    const L = k.LEFT.isDown || k.A.isDown, R = k.RIGHT.isDown || k.D.isDown;
    if (L || R) { this.cartTarget = null; this.cartX += (R ? 1 : -1) * 820 * real; }
    else if (this.cartTarget !== null) { const d = this.cartTarget - this.cartX; this.cartX += Math.sign(d) * Math.min(Math.abs(d), 1100 * real); if (Math.abs(d) < 1) this.cartTarget = null; }
    this.cartX = Math.max(40, Math.min(1240, this.cartX));
    this.cart.x = this.cartX;
    this.dust.forEach((d) => { d.y -= 8 * real; d.x += Math.sin(this.time.now / 900 + d.y) * 0.2; if (d.y < 110) d.y = 620; });
    const c = this.card; if (!c) { this.setTimer(null); return; }
    if (c.phase === 'read') { c.t += real; this.setTimer(c.readTime - c.t + c.fallTime / this.sf, c.readTime + c.fallTime / this.sf); if (c.t >= c.readTime) c.phase = 'fall'; return; }
    const step = g / c.fallTime * (c.fast ? 4 : 1);
    c.fallT += step;
    c.x = c.x + Math.sin(this.time.now / 400) * 0.25;
    c.y = TOP_Y + (CATCH_Y - TOP_Y) * Math.min(1, c.fallT);
    this.setTimer((1 - c.fallT) * c.fallTime / this.sf, c.fallTime / this.sf);
    if (c.fallT >= 1) this.judge(c);
  }
  judge(c) {
    this.card = null; this.setTimer(null);
    const item = c.item;
    const under = this.baskets.find((b) => Math.abs(this.cartX + b.off - c.x) < 100 && b.c.alpha > 0.5) || this.baskets.find((b) => Math.abs(this.cartX + b.off - c.x) < 100);
    const elapsed = (this.time.now - c.born) / 1000;
    const fast = c.fast && c.fallT <= 1 && elapsed < c.readTime + (c.fallTime / this.sf) * 0.5 + 0.5;
    this.done++; this.setProgress(this.done / this.total);
    const short = this.byName[item.correct]?.short || item.correct;
    if (under && under.name === item.correct) {
      const bx = this.cartX + under.off;
      this.tweens.add({ targets: c, x: bx, y: CART_Y - 70, scale: 0.3, alpha: 0, duration: 260, onComplete: () => c.destroy() });
      const s = stampText(this, bx, CATCH_Y - 30, 'APPROVED'); this.time.delayedCall(700, () => s.destroy());
      this.tweens.add({ targets: under.c, y: -60, yoyo: true, duration: 120 });
      coinBurst(this, bx, CART_Y - 90); sfx('stamp');
      this.markCorrect({ item, given: under.name, correct: item.correct, x: bx, y: CATCH_Y - 90, fast, label: short, rt: Math.round(elapsed * 1000) });
      this.mastered[item.correct] = this.mastered[item.correct] !== false;
      this.wait(S.config.levels['1'].gap_s || 1.5, () => this.spawn());
    } else {
      this.mastered[item.correct] = false;
      if (under) { this.tweens.add({ targets: c, y: CATCH_Y - 60, angle: 20, duration: 200, yoyo: true }); puff(this, c.x, CATCH_Y + 40); }
      else { this.tweens.add({ targets: c, y: 700, angle: 30, duration: 300 }); sfx('rustle'); }
      this.markWrong({ item, given: under ? under.name : 'missed', correctText: item.correct, explanation: 'Auditor’s note: ' + item.explanation, rt: Math.round(elapsed * 1000), after: () => { c.destroy(); this.wait(0.8, () => this.spawn()); } });
    }
  }
  endExtra() { return { mastered: Object.entries(this.mastered).filter(([, v]) => v).map(([k]) => this.byName[k]?.short || k) }; }
  finishLevel(failed) { if (!failed) confetti(this); super.finishLevel(failed); }
}
