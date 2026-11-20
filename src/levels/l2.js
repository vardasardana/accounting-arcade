import Phaser from 'phaser';
import { LevelBase } from './base.js';
import { S, fs, fmtMoney, fmtSigned } from '../core/state.js';
import { UI, esc, $ } from '../core/ui.js';
import { sfx, musicTempo } from '../core/audio.js';
import { bg, shuffle, drawPerGroup } from '../scenes/common.js';
import { coinBurst, confetti } from './fx.js';

const PIVOT = { x: 640, y: 278 }, ARM = 330, PAN_DROP = 170;
const EQ = "Equity (Shareholders' funds)";

export class Level2 extends LevelBase {
  constructor() { super('L2', 2); }
  introLines() {
    return [
      'Each slip is one transaction of <b>Brightwave Appliances Ltd</b>, a maker of home appliances. Show its effect on the equation.',
      'Drag each weight onto the right jar (or tap a weight, then tap a jar). Some weights are decoys.',
      'Keyboard: <span class="kbd">←</span><span class="kbd">→</span> pick a weight, <span class="kbd">↑</span><span class="kbd">↓</span> pick a jar, <span class="kbd">Enter</span> drops it.',
      'Press <b>WEIGH!</b> (<span class="kbd">W</span>) when done. <span class="kbd">Backspace</span> undoes the last weight.',
    ];
  }
  introRule() { return 'Assets = Liabilities + Equity.'; }
  buildWorld() {
    bg(this, 'bg_roastery');
    this.items = drawPerGroup(S.data.l2, (x) => x.wave, S.config.levels['2'].per_wave).sort((a, b) => a.wave - b.wave || a.id.localeCompare(b.id));
    // jars from data, in first-appearance order per side
    const seen = new Map();
    for (const it of this.items) for (const e of it.effects) for (const n of e.alts || [e.item]) if (!seen.has(n)) seen.set(n, e.side);
    const sides = { Assets: [], Liabilities: [], Equity: [] };
    for (const [name, side] of seen) sides[side].push(name);
    this.bal = Object.fromEntries([...seen.keys()].map((k) => [k, 0]));
    this.sideOf = Object.fromEntries(seen);
    this.add.image(PIVOT.x, PIVOT.y + 196, 'sc_pillar').setDepth(2);
    this.beam = this.add.image(PIVOT.x, PIVOT.y, 'sc_beam').setDisplaySize(ARM * 2 + 70, 40).setDepth(4);
    this.dial = this.add.image(PIVOT.x, PIVOT.y - 70, 'sc_dial').setDepth(5);
    this.needle = this.add.rectangle(PIVOT.x, PIVOT.y - 8, 5, 64, 0x222222).setOrigin(0.5, 1).setDepth(6);
    this.chains = this.add.graphics().setDepth(3);
    this.panL = this.add.container(0, 0).setDepth(8); this.panR = this.add.container(0, 0).setDepth(8);
    this.panL.add(this.add.image(0, 22, 'sc_pan_l').setDisplaySize(500, 40));
    this.panR.add(this.add.image(0, 22, 'sc_pan_r').setDisplaySize(500, 40));
    this.jars = [];
    const mk = (pan, name, x, kind) => {
      const c = this.add.container(x, -52);
      const img = this.add.image(0, 0, 'jar_' + kind).setDisplaySize(96, 118);
      const fill = this.add.rectangle(0, 52, 76, 0, kind === 'assets' ? 0x56B4E9 : kind === 'liab' ? 0xCC79A7 : 0x009E73, 0.55).setOrigin(0.5, 1);
      const label = this.add.text(0, -18, name === EQ ? 'Equity\n(Shareholders’ funds)' : name, { fontFamily: 'Fredoka', fontStyle: '600', fontSize: fs(name === EQ ? 14 : 16) + 'px', color: '#1F3A5F', align: 'center', wordWrap: { width: 88 }, lineSpacing: -3 }).setOrigin(0.5);
      const amt = this.add.text(0, 28, '$0', { fontFamily: 'Atkinson Hyperlegible', fontStyle: '700', fontSize: fs(16) + 'px', color: '#222', backgroundColor: '#ffffffcc', padding: { x: 3, y: 1 } }).setOrigin(0.5);
      const ring = this.add.rectangle(0, 2, 104, 128).setStrokeStyle(5, 0xF0E442).setVisible(false);
      const sel = this.add.rectangle(0, 2, 108, 132).setStrokeStyle(5, 0x0072B2).setVisible(false);
      const chips = this.add.container(0, -84);
      c.add([fill, img, label, amt, ring, sel, chips]);
      c.setSize(100, 124); c.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapJar(j));
      pan.add(c);
      const j = { name, c, fill, amt, ring, sel, chips, kind, pan };
      this.jars.push(j);
    };
    const nA = sides.Assets.length, gapA = Math.min(96, 470 / Math.max(1, nA));
    sides.Assets.forEach((n, i) => mk(this.panL, n, (i - (nA - 1) / 2) * gapA, 'assets'));
    const right = [...sides.Liabilities.map((n) => [n, 'liab']), ...sides.Equity.map((n) => [n, 'equity'])];
    const nR = right.length, gapR = Math.min(104, 470 / Math.max(1, nR));
    right.forEach(([n, k], i) => mk(this.panR, n, (i - (nR - 1) / 2) * gapR + (k === 'equity' ? 14 : 0), k));
    if (sides.Liabilities.length && sides.Equity.length) { const x = ((sides.Liabilities.length - 0.5) - (nR - 1) / 2) * gapR + 7; this.panR.add(this.add.rectangle(x, -40, 6, 90, 0xC08A2A).setStrokeStyle(2, 0x1F3A5F)); }
    this.panL.add(this.add.text(0, 48, 'ASSETS', { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '22px', color: '#1F3A5F', backgroundColor: '#FFF6E5', padding: { x: 8, y: 0 } }).setOrigin(0.5));
    this.panR.add(this.add.text(0, 48, 'LIABILITIES + EQUITY', { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '22px', color: '#1F3A5F', backgroundColor: '#FFF6E5', padding: { x: 8, y: 0 } }).setOrigin(0.5));
    this.angle = 0; this.targetAngle = 0;
    this.weights = []; this.placed = []; this.selW = -1; this.selJ = -1;
    this.input.dragDistanceThreshold = 10;
    this.input.on('drag', (p, o, x, y) => { if (!this.frozen && o.wt) { o.x = x; o.y = y; o.dragged = true; } });
    this.input.on('dragend', (p, o) => { if (o.wt) this.dropAt(o.wt, p.x, p.y); });
    this.ui = UI.add(`<div class="slip" aria-live="polite"><span class="tx"></span><div class="tm"></div></div>
      <button class="btn green weigh" style="left:1074px;top:488px;width:190px">WEIGH! <span class="kbd" style="font-size:14px">W</span></button>
      <button class="btn cream undo" style="left:1074px;top:560px;width:190px;font-size:18px">↶ Undo</button>
      <div class="hintline" style="display:none"></div>`, '');
    $(this.ui, '.weigh').addEventListener('click', () => this.weigh());
    $(this.ui, '.undo').addEventListener('click', () => this.undo());
    this.layoutPans();
    this.updateEquation();
    this.tips = { 'Share buyback': 'Remember: a share buyback returns cash to shareholders, so both cash and equity fall.', Expense: 'Remember: an expense lowers equity, not a liability.' };
    this.endLine = 'The equation always balances!';
    this.perfect = 0;
  }
  begin() { this.idx = -1; this.wave = 0; this.next(); }
  next() {
    this.idx++;
    const it = this.items[this.idx];
    this.clearWeights(); $(this.ui, '.tx').textContent = ''; $(this.ui, '.hintline').style.display = 'none';
    this.jars.forEach((j) => j.ring.setVisible(false));
    if (!it) { this.finishLevel(false); return; }
    if (it.wave !== this.wave) {
      this.wave = it.wave;
      const names = { 1: 'Opening day', 2: 'First purchases', 3: 'Doors open', 4: 'Growing the business', 5: 'Rush hour' };
      const waves = [...new Set(this.items.map((i) => i.wave))];
      this.setStageDots(waves.indexOf(it.wave) + 1, waves.length, 'Wave');
      if (it.wave === waves[waves.length - 1]) musicTempo(1.1);
      this.banner(`Wave ${it.wave}: ${names[it.wave] || ''}`, 'Brightwave Appliances Ltd keeps growing. Keep the scale level!', 2.8, () => this.showSlip(it));
      return;
    }
    this.showSlip(it);
  }
  showSlip(it) {
    this.cur = it; this.peekItem = null; sfx('rustle');
    $(this.ui, '.tx').textContent = it.prompt;
    this.setPreviewKey(it.effects.map((e) => `${(e.alts || [e.item]).join('/')} ${fmtSigned(e.change)}`).join('; '));
    const per = S.config.levels['2'].time_per_wave_s; const t = per[Math.min(per.length - 1, it.wave - 1)] || 40;
    this.timeTotal = this.T(t); this.timeLeft = this.timeTotal; this.startDelay = 1.5; this.slipStart = this.time.now;
    const ws = [...it.effects.map((e) => e.change), ...it.decoys.map((d) => d.change)];
    const list = shuffle(ws);
    const n = list.length, gap = 162, x0 = 540 - ((n - 1) * gap) / 2;
    list.forEach((ch, i) => {
      const c = this.add.container(x0 + i * gap, 572).setDepth(30);
      c.add(this.add.image(0, 0, ch > 0 ? 'w_plus' : 'w_minus'));
      c.add(this.add.text(0, 9, fmtSigned(ch), { fontFamily: 'Atkinson Hyperlegible', fontStyle: '700', fontSize: fs(19) + 'px', color: '#ffffff', stroke: '#1F3A5F', strokeThickness: 4 }).setOrigin(0.5));
      const sel = this.add.rectangle(0, 6, 160, 92).setStrokeStyle(5, 0x0072B2).setVisible(false); c.add(sel);
      c.setSize(156, 86); c.setInteractive({ useHandCursor: true, draggable: true });
      const w = { change: ch, c, home: { x: c.x, y: c.y }, jar: null, sel };
      c.wt = w;
      c.on('pointerup', () => { if (!c.dragged) this.selectWeight(this.weights.indexOf(w)); c.dragged = false; });
      c.on('dragstart', () => { sfx('clink'); c.setDepth(40); });
      this.weights.push(w);
    });
    this.selW = -1; this.selJ = -1; this.refreshSel();
  }
  clearWeights() { this.weights.forEach((w) => w.c.destroy()); this.weights = []; this.placed = []; this.jars.forEach((j) => j.chips.removeAll(true)); this.updateLive(); }
  selectWeight(i) { if (this.frozen) return; const w = this.weights[i]; if (!w || w.jar) return; this.selW = i; sfx('clink'); this.refreshSel(); }
  tapJar(j) { if (this.frozen) return; this.selJ = this.jars.indexOf(j); if (this.selW >= 0) this.place(this.weights[this.selW], j); this.refreshSel(); }
  refreshSel() {
    this.weights.forEach((w, i) => w.sel.setVisible(i === this.selW && !w.jar));
    this.jars.forEach((j, i) => j.sel.setVisible(i === this.selJ));
  }
  dropAt(w, x, y) {
    const j = this.jars.find((jj) => { const b = jj.c.getBounds(); return x > b.x - 10 && x < b.right + 10 && y > b.y - 30 && y < b.bottom + 20; });
    if (j && !this.frozen) this.place(w, j); else { this.tweens.add({ targets: w.c, x: w.home.x, y: w.home.y, duration: 200 }); w.c.setDepth(30); }
  }
  place(w, j) {
    if (!w || w.jar) return;
    w.jar = j; this.placed.push(w); this.selW = -1;
    w.c.setVisible(false).disableInteractive();
    const chip = this.add.text(0, -j.chips.length * 26, fmtSigned(w.change), { fontFamily: 'Atkinson Hyperlegible', fontStyle: '700', fontSize: fs(16) + 'px', color: '#fff', backgroundColor: w.change > 0 ? '#009E73' : '#D55E00', padding: { x: 5, y: 2 } }).setOrigin(0.5);
    j.chips.add(chip); w.chip = chip;
    sfx('clunk'); coinBurst(this, j.c.getBounds().centerX, j.c.getBounds().y, 5);
    this.updateLive(); this.refreshSel();
  }
  undo() {
    if (this.frozen) return; const w = this.placed.pop(); if (!w) return;
    w.chip.destroy(); w.jar = null; w.c.setVisible(true).setPosition(w.home.x, w.home.y).setInteractive({ useHandCursor: true, draggable: true });
    this.updateLive(); sfx('click');
  }
  pending() { const p = {}; for (const w of this.placed) p[w.jar.name] = (p[w.jar.name] || 0) + w.change; return p; }
  updateLive() {
    const p = this.pending(); let a = 0, le = 0;
    for (const [k, v] of Object.entries(p)) { if (this.sideOf[k] === 'Assets') a += v; else le += v; }
    const diff = a - le, scale = Math.max(1, ...Object.values(p).map(Math.abs));
    this.targetAngle = Math.max(-14, Math.min(14, (-diff / scale) * 10));
    this.jars.forEach((j) => { const v = this.bal[j.name] + (p[j.name] || 0); j.amt.setText(fmtMoney(v)); });
    this.updateFills(p);
  }
  updateFills(p = {}) {
    const max = Math.max(1, ...this.jars.map((j) => Math.abs(this.bal[j.name] + (p[j.name] || 0))));
    this.jars.forEach((j) => { const v = Math.max(0, this.bal[j.name] + (p[j.name] || 0)); this.tweens.add({ targets: j.fill, height: 92 * Math.sqrt(v / max), duration: 300 }); });
  }
  totals() { let A = 0, L = 0, E = 0; for (const [k, v] of Object.entries(this.bal)) { const s = this.sideOf[k]; if (s === 'Assets') A += v; else if (s === 'Liabilities') L += v; else E += v; } return { A, L, E }; }
  updateEquation() { const t = this.totals(); this.setTheme(`<span style="font-size:19px">Assets ${fmtMoney(t.A)} = Liabilities ${fmtMoney(t.L)} + Equity ${fmtMoney(t.E)}</span>`); }
  layoutPans() {
    const a = Phaser.Math.DegToRad(this.angle);
    const lx = PIVOT.x - Math.cos(a) * ARM, ly = PIVOT.y - Math.sin(a) * ARM;
    const rx = PIVOT.x + Math.cos(a) * ARM, ry = PIVOT.y + Math.sin(a) * ARM;
    this.beam.setRotation(a); this.needle.setRotation(a * 1.6);
    this.panL.setPosition(lx, ly + PAN_DROP); this.panR.setPosition(rx, ry + PAN_DROP);
    this.chains.clear(); this.chains.lineStyle(3, 0x8A6A2A, 1);
    for (const [x, y] of [[lx, ly], [rx, ry]]) { for (const dx of [-230, 0, 230]) this.chains.lineBetween(x, y, x + dx, y + PAN_DROP + 6); }
  }
  currentItem() { return this.cur; }
  applyPeek(it) {
    const names = new Set(it.effects.flatMap((e) => e.alts || [e.item]));
    this.jars.forEach((j) => j.ring.setVisible(names.has(j.name)));
    const cnt = { Assets: 0, Liabilities: 0, Equity: 0 }; it.effects.forEach((e) => cnt[e.side]++);
    const word = (n, s, p) => (n === 1 ? 'one ' + s : n === 2 ? 'two ' + p : n + ' ' + p);
    const parts = []; if (cnt.Assets) parts.push(word(cnt.Assets, 'asset', 'assets')); if (cnt.Liabilities) parts.push(word(cnt.Liabilities, 'liability', 'liabilities')); if (cnt.Equity) parts.push('equity');
    const h = $(this.ui, '.hintline'); h.textContent = 'Hint: ' + parts.join(' and ').replace(/^./, (c) => c.toUpperCase()) + ' change.'; h.style.display = 'block';
    return true;
  }
  onKey(e) {
    if (!this.cur) return;
    const free = this.weights.map((w, i) => (w.jar ? -1 : i)).filter((i) => i >= 0);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Tab') {
      if (!free.length) return; const pos = free.indexOf(this.selW); const d = e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1;
      this.selW = free[(pos + d + free.length) % free.length]; if (this.selJ < 0) this.selJ = 0; sfx('click'); this.refreshSel();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      this.selJ = (Math.max(0, this.selJ) + (e.key === 'ArrowDown' ? 1 : -1) + this.jars.length) % this.jars.length; sfx('click'); this.refreshSel();
    } else if (e.key === 'Enter') {
      if (this.selW >= 0 && this.selJ >= 0) this.place(this.weights[this.selW], this.jars[this.selJ]); else this.weigh();
    } else if (e.key === 'w' || e.key === 'W') this.weigh();
    else if (e.key === 'Backspace') this.undo();
  }
  tick(g, real) {
    if (Math.abs(this.targetAngle - this.angle) > 0.01) { this.angle += (this.targetAngle - this.angle) * Math.min(1, real * 8); this.layoutPans(); }
    if (!this.cur || this.judging) return;
    if (this.startDelay > 0) { this.startDelay -= real; this.setTimer(this.timeLeft, this.timeTotal); return; }
    this.timeLeft -= g / this.sf; // slow-motion halves the timer; speed setting already scaled the total
    this.setTimer(this.timeLeft, this.timeTotal);
    if (this.timeLeft <= 0) this.weigh(true);
  }
  weigh(timeout = false) {
    if (this.frozen || !this.cur || this.judging) return;
    if (!timeout && !this.placed.length) { this.floatText(1168, 470, 'Place a weight first', 'lbl'); return; }
    const it = this.cur; this.judging = true;
    const raw = this.pending();
    // A money effect may go to either the Cash or the Bank jar: map what the student used onto the expected jar.
    const resolved = it.effects.map((e) => e.item);
    const p = { ...raw };
    it.effects.forEach((e, i) => {
      if (!e.alts || e.alts.length < 2) return;
      const wantedElsewhere = (n) => it.effects.some((f, k) => k !== i && f.item === n);
      const alt = e.alts.find((n) => n !== e.item && !wantedElsewhere(n) && (p[n] || 0) === e.change && (p[e.item] || 0) !== e.change);
      if (alt) { p[e.item] = (p[e.item] || 0) + p[alt]; delete p[alt]; resolved[i] = alt; }
    });
    const want = {}; it.effects.forEach((e) => (want[e.item] = (want[e.item] || 0) + e.change));
    const keys = new Set([...Object.keys(p), ...Object.keys(want)]);
    const itemsOk = [...keys].every((k) => (p[k] || 0) === (want[k] || 0)) && this.placed.length === it.effects.length;
    let a = 0, le = 0; for (const [k, v] of Object.entries(raw)) { if (this.sideOf[k] === 'Assets') a += v; else le += v; }
    const balanced = a === le && this.placed.length > 0;
    const fast = (this.timeTotal - this.timeLeft) < this.timeTotal / 2;
    const rt = Math.round(this.time.now - this.slipStart);
    const given = this.placed.map((w) => `${w.jar.name} ${fmtSigned(w.change)}`).join('; ') || (timeout ? 'time out' : 'nothing');
    const correctText = it.effects.map((e) => `${e.item === EQ ? 'Equity' : (e.alts || [e.item]).join(' or ')} ${fmtSigned(e.change)}`).join('; ');
    this.setTimer(null);
    const apply = () => { it.effects.forEach((e, i) => (this.bal[itemsOk ? resolved[i] : e.item] += e.change)); this.placed = []; this.jars.forEach((j) => j.chips.removeAll(true)); this.targetAngle = 0; this.updateLive(); this.updateEquation(); };
    this.setProgress((this.idx + 1) / this.items.length);
    if (itemsOk) {
      sfx('ting'); this.perfect++;
      const ring = this.add.circle(PIVOT.x, PIVOT.y - 70, 60).setStrokeStyle(8, 0x009E73).setDepth(9);
      this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
      confetti(this, [0x6B4226, 0x8B5A2B, 0x4A2C17], 24, 300, 680);
      this.markCorrect({ item: it, given, correct: correctText, x: PIVOT.x, y: 200, base: it.effects.length >= 3 ? S.config.scoring.three_weight_base : undefined, fast, label: 'Balanced!', rt });
      apply();
      this.wait(1.4, () => { this.judging = false; this.next(); });
    } else {
      if (!balanced) { this.targetAngle = a > le ? -18 : 18; sfx('creak'); }
      else this.jars.forEach((j) => { if ((p[j.name] || 0) !== (want[j.name] || 0)) j.ring.setStrokeStyle(5, 0xD55E00).setVisible(true); });
      const why = (timeout ? 'Time ran out. ' : !balanced ? 'The scale tipped: the two sides no longer balance. ' : 'Balanced, but not the right items. ') + it.explanation;
      this.wait(0.7, () => this.markWrong({ item: it, given, correctText: 'Assets = Liabilities + Equity: ' + correctText, explanation: why, rt, after: () => { this.jars.forEach((j) => j.ring.setStrokeStyle(5, 0xF0E442).setVisible(false)); apply(); this.judging = false; this.wait(0.5, () => this.next()); } }));
    }
  }
  endExtra() { const t = this.totals(); return { equation: `Assets ${fmtMoney(t.A)} = Liabilities ${fmtMoney(t.L)} + Equity ${fmtMoney(t.E)}`, perfect: this.perfect }; }
}
