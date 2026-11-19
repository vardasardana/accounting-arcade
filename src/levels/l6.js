import { LevelBase } from './base.js';
import { S, fs } from '../core/state.js';
import { UI, esc, $ } from '../core/ui.js';
import { sfx, musicTempo } from '../core/audio.js';
import { bg, shuffle } from '../scenes/common.js';
import { coinBurst, confetti } from './fx.js';

const SHIP_Y = 640, CARD_TOP = 190, CARD_BOTTOM = 470;
const THEMES = { Liquidity: '💧', Efficiency: '⚙️', Solvency: '🛡️', Profitability: '📈' };
const ROUNDS = { 1: 'Liquidity', 2: 'Efficiency', 3: 'Solvency', 4: 'Profitability', 5: 'Mixed', 6: 'Pick the right figures' };

export class Level6 extends LevelBase {
  constructor() { super('L6', 6); }
  introLines() {
    return [
      'Company cards drift in. All are in the <b>same industry</b>. Shoot the <b>weaker</b> company on the ratio shown.',
      'Move the ship with <span class="kbd">←</span><span class="kbd">→</span> and fire with <span class="kbd">Space</span>, or press <span class="kbd">1</span>–<span class="kbd">3</span> to fire at a slot, or just click or tap a card.',
      'Final round: pick only the lines the formula needs (<span class="kbd">↑</span><span class="kbd">↓</span> + <span class="kbd">Space</span>, or tap), press <b>Compute</b> (<span class="kbd">Enter</span>), then shoot STRENGTH or RED FLAG.',
    ];
  }
  introRule() { return 'No ratio is good or bad on its own: always compare like with like, within one industry.'; }
  buildWorld() {
    bg(this, 'bg_space');
    this.stars = Array.from({ length: S.settings.reducedMotion ? 0 : 40 }, () => this.add.circle(Math.random() * 1280, Math.random() * 720, Math.random() * 1.6 + 0.5, 0xffffff, 0.8));
    this.ship = this.add.container(640, SHIP_Y).setDepth(20);
    this.ship.add(this.add.image(0, 0, 'ship'));
    this.ship.add(this.add.image(0, -8, 'avatar_' + (S.player?.avatar ?? 0)).setScale(0.3));
    this.beam = this.add.graphics().setDepth(19);
    this.shipX = 640; this.cards = [];
    this.input.on('pointermove', (p) => { if (!this.frozen && p.y > 540 && (p.isDown || p.pointerType === 'mouse') && this.mode === 'compare') this.shipX = p.x; });
    this.sets = S.data.l6.slice().sort((a, b) => a.round - b.round);
    this.extracts = S.data.l6x.slice();
    this.rounds = [...new Set(this.sets.map((s) => s.round))].sort((a, b) => a - b); if (this.extracts.length) this.rounds.push(6);
    this.total = this.sets.length + this.extracts.length * 2; this.done = 0;
    this.byTheme = {};
    this.layer = UI.add('', '');
    this.tips = { Liquidity: 'Remember: a current ratio below 1 means current liabilities exceed current assets.', Efficiency: 'Remember: longer collection or holding periods mean slower cash.', Solvency: 'Remember: debt means interest-bearing borrowings only, never trade payables.', 'Pick the right figures': 'Remember: pick only the lines the formula needs, and ignore decoys.' };
    this.endLine = 'Analyst-1 has docked. Report filed!';
  }
  begin() { this.ri = -1; this.nextRound(); }
  nextRound() {
    this.ri++;
    const r = this.rounds[this.ri];
    if (r === undefined) { this.finishLevel(false); return; }
    this.round = r; this.setStageDots(this.ri + 1, this.rounds.length, 'Round');
    if (this.ri === this.rounds.length - 1) musicTempo(1.1);
    sfx('whoosh');
    if (r === 6) { this.mode = 'extract'; this.queue = shuffle(this.extracts); this.qi = 0; this.setTheme('Pick the right figures, then give your verdict'); this.banner('Round 6: Pick the right figures', 'Shoot only the lines the formula needs, press Compute, then judge: STRENGTH or RED FLAG.', 3.6, () => this.nextExtract()); return; }
    this.mode = 'compare'; this.queue = this.sets.filter((s) => s.round === r); this.qi = 0;
    const theme = ROUNDS[r];
    this.banner(`Round ${r}: ${theme}`, r === 5 ? 'Three cards at once, and the theme changes each time. Shoot the WEAKEST.' : `${THEMES[theme] || ''} Shoot the WEAKER company.`, 3, () => this.nextSet());
  }
  nextSet() {
    this.cards.forEach((c) => c.destroy()); this.cards = [];
    if (this.qi >= this.queue.length) { this.wait(0.5, () => this.nextRound()); return; }
    const it = this.queue[this.qi++]; this.cur = it; this.peekItem = null;
    const n = it.cards.length; const slots = n === 3 ? [340, 640, 940] : [450, 830];
    const order = shuffle(it.cards.map((_, i) => i));
    this.weakSlot = order.indexOf(it.weaker);
    this.setTheme(`${THEMES[it.subtopic] || ''} ${esc(it.subtopic.toUpperCase())} – shoot the ${n === 3 ? 'WEAKEST' : 'WEAKER'} company<div style="font-family:var(--bd);font-weight:400;font-size:${fs(16)}px">${esc(it.ratio)} = ${esc(it.formula)}</div>`);
    order.forEach((ci, s) => {
      const cd = it.cards[ci];
      const c = this.add.container(slots[s], CARD_TOP).setDepth(10);
      c.add(this.add.image(0, 0, 'holo'));
      c.add(this.add.circle(-112, -58, 20, 0x1F3A5F)); c.add(this.add.text(-112, -58, cd.company.replace(/[^A-Z]/g, '').slice(0, 2), { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '17px', color: '#fff' }).setOrigin(0.5));
      c.add(this.add.text(-84, -60, cd.company, { fontFamily: 'Fredoka', fontStyle: '600', fontSize: fs(19) + 'px', color: '#1F3A5F', wordWrap: { width: 210 } }).setOrigin(0, 0.5));
      c.add(this.add.text(0, -24, it.industry, { fontFamily: 'Atkinson Hyperlegible', fontSize: fs(15) + 'px', color: '#fff', backgroundColor: '#0072B2', padding: { x: 8, y: 2 } }).setOrigin(0.5));
      c.add(this.add.text(0, 8, it.ratio, { fontFamily: 'Atkinson Hyperlegible', fontSize: fs(17) + 'px', color: '#333' }).setOrigin(0.5));
      c.add(this.add.text(0, 48, cd.value, { fontFamily: 'Atkinson Hyperlegible', fontStyle: '700', fontSize: '40px', color: '#1F3A5F' }).setOrigin(0.5));
      c.add(this.add.text(118, -58, String(s + 1), { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '18px', color: '#fff', backgroundColor: '#1F3A5F', padding: { x: 6, y: 1 } }).setOrigin(0.5));
      c.setSize(300, 180); c.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.fireAt(s));
      c.slot = s; c.ci = ci; c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 300 });
      this.cards.push(c);
    });
    const ts = S.config.levels['6'].set_time_s; this.setT = this.T(ts[Math.min(ts.length - 1, this.round - 1)] || 14); this.left = this.setT; this.born = this.time.now;
    this.setPreviewKey(it.cards[it.weaker].company);
  }
  currentItem() { return this.mode === 'compare' ? this.cur : this.mode === 'extract' && this.phase === 'pick' ? this.cur : null; }
  applyPeek(it) {
    if (this.mode === 'compare') { this.setTheme(`💡 ${esc(it.ratio)} = ${esc(it.formula)}<div style="font-family:var(--bd);font-weight:700;color:#0072B2;font-size:${fs(17)}px">${esc(it.better || '')}</div>`); return true; }
    const decoys = shuffle(this.lines.filter((l) => !l.d.needed && !l.sel)).slice(0, 2);
    decoys.forEach((l) => { l.cross = true; l.el.classList.add('cross'); });
    return decoys.length > 0;
  }
  fire(x) {
    sfx('pew'); const g = this.beam; g.clear(); g.lineStyle(8, 0xF0E442, 0.9).lineBetween(this.shipX, SHIP_Y - 50, x, CARD_TOP - 40); g.lineStyle(3, 0xffffff, 1).lineBetween(this.shipX, SHIP_Y - 50, x, CARD_TOP - 40);
    this.time.delayedCall(140, () => g.clear());
  }
  fireAt(s) {
    if (this.frozen || this.mode !== 'compare' || this.judging) return;
    const c = this.cards.find((cc) => cc.slot === s); if (!c) return;
    this.shipX = c.x; this.ship.x = c.x; this.fire(c.x);
    this.judgeSet(s);
  }
  onKey(e) {
    if (this.mode === 'compare') {
      if (/^[1-3]$/.test(e.key)) this.fireAt(Number(e.key) - 1);
      else if (e.key === ' ') { const c = this.cards.slice().sort((a, b) => Math.abs(a.x - this.shipX) - Math.abs(b.x - this.shipX))[0]; if (c && Math.abs(c.x - this.shipX) < 170) this.fireAt(c.slot); else this.fire(this.shipX); }
    } else if (this.mode === 'extract') {
      if (this.phase === 'pick') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { this.focus = (this.focus + (e.key === 'ArrowDown' ? 1 : -1) + this.lines.length) % this.lines.length; this.paintLines(); }
        else if (e.key === ' ') this.toggleLine(this.focus);
        else if (e.key === 'Enter') this.compute();
      } else if (this.phase === 'judge') {
        if (e.key === '1' || e.key === 'ArrowLeft') this.verdict('Strength');
        if (e.key === '2' || e.key === 'ArrowRight') this.verdict('Red Flag');
      }
    }
  }
  tick(g, real) {
    this.stars.forEach((s) => { s.y += 30 * real * (s.radius); if (s.y > 720) { s.y = 0; s.x = Math.random() * 1280; } });
    if (this.mode === 'compare') {
      const k = this.held(); if (k.LEFT.isDown || k.A.isDown) this.shipX -= 700 * real; if (k.RIGHT.isDown || k.D.isDown) this.shipX += 700 * real;
      this.shipX = Math.max(80, Math.min(1200, this.shipX)); this.ship.x += (this.shipX - this.ship.x) * Math.min(1, real * 14);
      if (!this.cur || this.judging || !this.cards.length) { this.setTimer(null); return; }
      this.left -= g / this.sf; const f = 1 - this.left / this.setT;
      this.cards.forEach((c) => (c.y = CARD_TOP + (CARD_BOTTOM - CARD_TOP) * f));
      this.setTimer(this.left, this.setT);
      if (this.left <= 0) this.judgeSet(-1);
    } else if (this.mode === 'extract' && (this.phase === 'pick' || this.phase === 'judge') && !this.judging) {
      this.left -= g / this.sf; this.setTimer(this.left, this.phaseT);
      if (this.left <= 0) { if (this.phase === 'pick') this.compute(true); else this.verdict(null); }
    } else this.setTimer(null);
  }
  judgeSet(s) {
    const it = this.cur; this.judging = true; this.setTimer(null);
    const rt = Math.round(this.time.now - this.born); this.done++; this.setProgress(this.done / this.total);
    const ok = s === this.weakSlot, fast = this.left > this.setT / 2;
    const theme = it.subtopic; (this.byTheme[theme] ||= { c: 0, n: 0 }).n++;
    const weakCard = this.cards.find((c) => c.slot === this.weakSlot);
    const given = s >= 0 ? it.cards[this.cardIndexAt(s)].company : 'time out';
    if (ok) {
      this.byTheme[theme].c++;
      sfx('shatter'); coinBurst(this, weakCard.x, weakCard.y);
      for (let i = 0; i < (S.settings.reducedMotion ? 4 : 16); i++) { const p = this.add.rectangle(weakCard.x + (Math.random() - 0.5) * 260, weakCard.y + (Math.random() - 0.5) * 150, 14, 14, 0x7FE7F5).setDepth(12); this.tweens.add({ targets: p, x: p.x + (Math.random() - 0.5) * 200, y: p.y + (Math.random() - 0.5) * 200, alpha: 0, duration: 600, onComplete: () => p.destroy() }); }
      weakCard.setVisible(false);
      this.cards.filter((c) => c !== weakCard).forEach((c) => this.tweens.add({ targets: c, y: -150, duration: 700, delay: 400 }));
      this.markCorrect({ item: it, given, correct: it.cards[it.weaker].company, x: weakCard.x, y: weakCard.y - 40, fast, label: it.explanation.split(':')[0].split('(')[0].trim() + ' is weaker', rt });
      this.wait(1.6, () => { this.judging = false; this.nextSet(); });
    } else {
      sfx('bwong'); if (!S.settings.reducedMotion) this.tweens.add({ targets: this.ship, x: this.ship.x + 12, yoyo: true, repeat: 2, duration: 50 });
      const outline = this.add.rectangle(weakCard.x, weakCard.y, 310, 190).setStrokeStyle(6, 0xD55E00).setDepth(11);
      this.markWrong({ item: it, given, correctText: `Weaker: ${it.cards[it.weaker].company} (${it.cards[it.weaker].value})`, explanation: `${it.ratio} = ${it.formula}. ${it.explanation}`, rt, prompt: `${it.ratio}, ${it.industry}: ` + it.cards.map((c) => `${c.company} ${c.value}`).join(' vs '), after: () => { outline.destroy(); this.judging = false; this.nextSet(); } });
    }
  }
  cardIndexAt(s) { const c = this.cards.find((cc) => cc.slot === s); return c ? c.ci : 0; }
  // ---------- round 6 ----------
  nextExtract() {
    this.cards.forEach((c) => c.destroy()); this.cards = []; this.layer.innerHTML = '';
    if (this.qi >= this.queue.length) { this.wait(0.5, () => this.nextRound()); return; }
    const x = this.queue[this.qi++]; this.cur = x; this.peekItem = null; this.focus = 0; this.phase = 'pick'; this.judging = false;
    this.phaseT = this.T(S.config.levels['6'].pick_time_s || 30); this.left = this.phaseT; this.born = this.time.now;
    this.layer.innerHTML = `<div class="extract"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-family:var(--hd);font-size:${fs(22)}px;color:#7FE7F5">${esc(x.company)}</b><span style="font-size:${fs(17)}px">Target: <b>${esc(x.ratio)}</b></span></div>
      <div style="font-size:${fs(17)}px;margin:4px 0 6px;color:#F0E442">${esc(x.ratio)} = ${esc(x.formula)}</div><div class="lines"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><span style="font-size:${fs(16)}px">Shoot only the lines you need.</span><button class="btn green compute">Compute <span class="kbd" style="font-size:13px">Enter</span></button></div></div>`;
    const box = $(this.layer, '.lines');
    this.lines = x.lines.map((d, i) => { const el = document.createElement('div'); el.className = 'xl pe'; el.innerHTML = `<span>${esc(d.label)}</span><b>${d.amount.toLocaleString('en-US')}</b>`; el.addEventListener('click', () => { this.focus = i; this.toggleLine(i); }); box.appendChild(el); return { d, el, sel: false, cross: false }; });
    $(this.layer, '.compute').addEventListener('click', () => this.compute());
    this.paintLines();
    this.setPreviewKey(x.lines.filter((l) => l.needed).map((l) => l.label).join(' + ') + ' → ' + (x.verdict || 'no verdict'));
  }
  paintLines() { this.lines.forEach((l, i) => { l.el.classList.toggle('sel', l.sel); l.el.classList.toggle('focus', i === this.focus); }); }
  toggleLine(i) { if (this.frozen || this.phase !== 'pick') return; const l = this.lines[i]; if (!l || l.cross) return; l.sel = !l.sel; sfx(l.sel ? 'beep' : 'click'); this.fire(this.lines.length ? 640 : 640); this.paintLines(); }
  compute(timeout = false) {
    if (this.frozen || this.phase !== 'pick') return;
    const x = this.cur; this.phase = 'computed'; this.setTimer(null);
    const rt = Math.round(this.time.now - this.born); this.done++; this.setProgress(this.done / this.total);
    const ok = this.lines.every((l) => l.sel === !!l.d.needed);
    const picked = this.lines.filter((l) => l.sel).map((l) => l.d.label).join(', ') || (timeout ? 'time out' : 'nothing');
    const need = x.lines.filter((l) => l.needed).map((l) => l.d ? l.d.label : l.label).join(', ');
    this.lines.forEach((l) => { if (l.sel && !l.d.needed) l.el.classList.add('badpick'); if (!l.sel && l.d.needed) l.el.style.outline = '3px dashed #F0E442'; });
    (this.byTheme['Pick the right figures'] ||= { c: 0, n: 0 }).n++;
    const it = { ...x, prompt: `${x.ratio}: which lines are needed?` };
    const goJudge = () => this.showVerdict();
    if (ok) { this.byTheme['Pick the right figures'].c++; this.markCorrect({ item: it, given: picked, correct: need, x: 640, y: 150, base: S.config.scoring.pick_figures_base, fast: rt / 1000 < this.phaseT / 2, label: 'Right figures!', rt }); this.wait(1.0, goJudge); }
    else this.markWrong({ item: it, given: picked, correctText: 'Needed: ' + need, explanation: x.explanation, rt, prompt: it.prompt, after: goJudge });
  }
  showVerdict() {
    const x = this.cur;
    const ex = $(this.layer, '.extract'); if (ex) ex.style.opacity = '0.35';
    if (!x.verdict) { this.layer.insertAdjacentHTML('beforeend', `<div class="banner"><div class="t">${esc(x.ratio)} = ${esc(x.result_display)}</div><div class="s">${esc(x.benchmark)}. No verdict needed: the gap is small.</div></div>`); this.wait(2.5, () => this.nextExtract()); return; }
    this.phase = 'judge'; this.phaseT = this.T(S.config.levels['6'].judge_time_s || 12); this.left = this.phaseT; this.born = this.time.now;
    this.layer.insertAdjacentHTML('beforeend', `<div class="banner" style="top:150px"><div class="t">${esc(x.ratio)} = ${esc(x.result_display)}</div><div class="s">${esc(x.benchmark)}. Strength or Red Flag?</div></div>
      <button class="gate pe g1" style="left:290px;top:370px;background:#009E73" aria-label="Strength (1)">⬆ STRENGTH <span class="kbd" style="position:absolute;left:10px;top:8px;font-size:15px">1</span></button>
      <button class="gate pe g2" style="left:720px;top:370px;background:#D55E00" aria-label="Red Flag (2)">⚑ RED FLAG <span class="kbd" style="position:absolute;left:10px;top:8px;font-size:15px">2</span></button>`);
    $(this.layer, '.g1').addEventListener('click', () => this.verdict('Strength'));
    $(this.layer, '.g2').addEventListener('click', () => this.verdict('Red Flag'));
  }
  verdict(v) {
    if (this.frozen || this.phase !== 'judge') return;
    this.phase = 'done'; this.setTimer(null);
    const x = this.cur, rt = Math.round(this.time.now - this.born); this.done++; this.setProgress(this.done / this.total);
    this.fire(v === 'Strength' ? 425 : v === 'Red Flag' ? 855 : 640);
    const it = { ...x, id: x.id + '-V', subtopic: 'Verdict', prompt: `${x.ratio} ${x.result_display} vs ${x.benchmark}` };
    if (v === x.verdict) { sfx(v === 'Strength' ? 'fanfare' : 'horn'); this.markCorrect({ item: it, given: v, correct: x.verdict, x: 640, y: 320, base: S.config.scoring.verdict_base, fast: rt / 1000 < this.phaseT / 2, label: x.verdict, rt }); this.wait(1.4, () => this.nextExtract()); }
    else this.markWrong({ item: it, given: v || 'time out', correctText: x.verdict, explanation: x.explanation, rt, prompt: it.prompt, after: () => this.nextExtract() });
  }
  endExtra() { return { themes: this.byTheme }; }
  finishLevel(failed) { if (!failed) confetti(this); this.layer.innerHTML = ''; super.finishLevel(failed); }
}
