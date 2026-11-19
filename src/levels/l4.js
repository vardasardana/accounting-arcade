import Phaser from 'phaser';
import { LevelBase } from './base.js';
import { S, fs } from '../core/state.js';
import { UI, esc, $ } from '../core/ui.js';
import { sfx, musicTempo } from '../core/audio.js';
import { bg, shuffle } from '../scenes/common.js';
import { confetti, puff } from './fx.js';

const HZ = 318, VX = 480, ROADW = 470, CAR_Y = 612;
const CHECKS = ['Revenue', 'COGS', 'Gross Profit', 'Operating expenses', 'EBITDA', 'D&A', 'EBIT', 'Non-operating', 'PBT', 'Tax', 'Net Profit'];
const STAGES = { 1: 'Toll plaza', 2: 'Countryside', 3: 'Coffee-stop stretch', 4: 'City approach' };
const LANE_COL = ['#56B4E9', '#E69F00', '#CC79A7'], LANE_PAT = ['pat-dots', 'pat-diag', 'pat-chev'];

export class Level4 extends LevelBase {
  constructor() { super('L4', 4); }
  introLines() {
    return [
      'Drive <b>Threadline Fashions Ltd</b>, a fashion retailer ($ million), from Revenue to the NET PROFIT finish line.',
      'Before each fork a question appears. Steer into the lane with the right answer: <span class="kbd">←</span><span class="kbd">→</span>, <span class="kbd">1</span>–<span class="kbd">3</span>, or tap a lane sign.',
      'Sure already? Press <span class="kbd">↑</span> (or double-tap a sign) to lock in early for a speed bonus.',
      'Every correct fork prints a line on your Income Statement receipt.',
    ];
  }
  introRule() { return 'Functional order: Revenue → COGS → Gross Profit → Operating expenses → EBITDA → D&A → EBIT → Non-operating items → PBT → Tax → Net Profit.'; }
  buildWorld() {
    bg(this, 'bg_road').setDisplaySize(960, 720);
    this.items = S.data.l4.slice().sort((a, b) => a.stage - b.stage);
    this.road = this.add.graphics().setDepth(2);
    this.gantry = this.add.graphics().setDepth(8);
    this.scenery = [];
    for (let i = 0; i < 10; i++) this.scenery.push({ d: 2 + i * 3.2, side: i % 2 ? 1 : -1, kind: i % 5 === 3 ? 'coffee' : 'tree', img: null });
    this.scenery.forEach((s) => (s.img = this.add.image(0, 0, s.kind).setDepth(3)));
    this.rivals = ['truck', 'scooter', 'camper'].map((k, i) => ({ img: this.add.image(0, 0, k).setDepth(4), d: 6 + i * 7, lane: [-0.9, 0.95, -0.95][i], v: 0.6 + i * 0.25 }));
    this.car = this.add.container(VX, CAR_Y).setDepth(20);
    this.flames = this.add.graphics(); this.car.add(this.flames);
    this.car.add(this.add.image(0, 0, 'car'));
    this.car.add(this.add.image(0, -38, 'avatar_' + (S.player?.avatar ?? 0)).setScale(0.36));
    this.carLane = 0; this.lanes = 2; this.scroll = 0; this.speed = 5; this.nitro = 0;
    this.ui = UI.add(`<div class="ribbon-dots">${CHECKS.map((c) => `<span>${c}</span>`).join('')}</div>
      <div class="billboard" style="display:none"><div class="q"></div><div class="hint"></div></div>
      <div class="signs"></div>
      <div class="receipt"><div style="font-family:var(--hd);font-weight:700;color:var(--navy);font-size:20px;margin-bottom:6px">Live Income Statement</div><div class="muted" style="font-size:15px;margin-bottom:8px">Threadline Fashions Ltd ($ million)</div><div class="roll"></div></div>`, '');
    this.total = this.items.length; this.done = 0; this.receipt = [];
    this.tips = { COGS: 'Remember: freight outward and head-office costs are never part of COGS.', 'What counts as income': 'Remember: money from shareholders is equity, not income.' };
    this.endLine = 'NET PROFIT – you crossed the finish line!';
  }
  laneX(i, n, invD = 1) { const half = ROADW * invD; const w = (2 * half) / n; return VX - half + w * (i + 0.5); }
  begin() { this.idx = -1; this.stage = 0; this.next(); }
  next() {
    this.idx++;
    const it = this.items[this.idx];
    $(this.ui, '.billboard').style.display = 'none'; $(this.ui, '.signs').innerHTML = '';
    if (!it) { this.finish(); return; }
    if (it.stage !== this.stage) {
      this.stage = it.stage; const stages = [...new Set(this.items.map((i) => i.stage))];
      this.setStageDots(stages.indexOf(it.stage) + 1, stages.length, 'Stage');
      if (it.stage === stages[stages.length - 1]) musicTempo(1.1);
      this.speed = 5 * (1 + 0.1 * (stages.indexOf(it.stage)));
      this.setTheme(`Stage ${it.stage}: ${STAGES[it.stage] || ''}`);
      this.banner(`Stage ${it.stage}: ${STAGES[it.stage] || ''}`, it.stage === 1 ? 'Start your engine at the Revenue toll plaza.' : 'Next checkpoints ahead.', 2.6, () => this.fork(it));
      return;
    }
    this.wait(1.2, () => this.fork(it));
  }
  fork(it) {
    this.cur = it; this.peekItem = null; this.locked = false; this.closed = -1;
    const order = shuffle(it.options.map((o, i) => i));
    this.order = order; this.lanes = order.length; this.correctLane = order.indexOf(it.correct);
    this.carLane = Math.min(this.carLane, this.lanes - 1); if (this.lanes === 3 && this.carLane === 0 && this.idx === 0) this.carLane = 1;
    this.car.x = this.laneX(this.carLane, this.lanes);
    const ws = S.config.levels['4'].warning_s; this.warn = this.T(ws[Math.min(ws.length - 1, it.stage - 1)] || 9);
    this.D0 = 1 + this.speed * this.warn; this.D = this.D0; this.born = this.time.now;
    const bb = $(this.ui, '.billboard'); bb.style.display = 'block'; $(bb, '.q').textContent = it.prompt; $(bb, '.hint').textContent = '';
    this.renderSigns();
    this.setPreviewKey(it.options[it.correct]);
    const ci = CHECKS.findIndex((c) => c.toLowerCase() === (it.checkpoint || '').toLowerCase());
    this.ribbon(ci);
    sfx('beep');
  }
  ribbon(cur) { this.ui.querySelectorAll('.ribbon-dots span').forEach((s, i) => { s.className = i < cur ? 'done' : i === cur ? 'cur' : ''; }); }
  renderSigns() {
    const n = this.lanes, w = (2 * ROADW) / n - 16;
    $(this.ui, '.signs').innerHTML = this.order.map((oi, i) => `<button class="lane-sign pe ${LANE_PAT[i]} ${i === this.closed ? 'closed' : ''}" data-l="${i}" style="left:${this.laneX(i, n) - w / 2}px;top:${i === this.closed ? 236 : 236}px;width:${w}px;min-height:82px;font-size:${fs(23)}px;background-color:${i === this.closed ? '#8C97A4' : LANE_COL[i]};color:#1F3A5F;${i === this.carLane ? 'outline:5px solid #F0E442;' : ''}"><span class="kbd" style="position:absolute;left:6px;top:4px">${i + 1}</span>${i === this.closed ? '🚧 Closed' : esc(this.cur.options[oi])}</button>`).join('');
    this.ui.querySelectorAll('.lane-sign').forEach((b) => {
      b.addEventListener('click', () => this.steer(Number(b.dataset.l)));
      b.addEventListener('dblclick', () => { this.steer(Number(b.dataset.l)); this.lock(); });
    });
  }
  steer(i) {
    if (this.frozen || !this.cur || i < 0 || i >= this.lanes || i === this.closed || this.locked) return;
    if (i !== this.carLane) { sfx('click'); this.carLane = i; this.tweens.add({ targets: this.car, x: this.laneX(i, this.lanes), angle: { from: i > this.carLane ? 6 : -6, to: 0 }, duration: 220 }); }
    this.renderSigns();
  }
  lock() { if (this.frozen || !this.cur || this.locked) return; this.locked = true; sfx('nitro'); this.nitro = 0.6; this.floatText(this.car.x, CAR_Y - 110, 'Locked in!', 'lbl'); }
  onKey(e) {
    if (!this.cur) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') this.steer(this.carLane - 1 === this.closed ? this.carLane - 2 : this.carLane - 1);
    else if (e.key === 'ArrowRight' || e.key === 'd') this.steer(this.carLane + 1 === this.closed ? this.carLane + 2 : this.carLane + 1);
    else if (/^[1-3]$/.test(e.key)) this.steer(Number(e.key) - 1);
    else if (e.key === 'ArrowUp' || e.key === 'w') this.lock();
  }
  currentItem() { return this.cur; }
  applyPeek(it) {
    $(this.ui, '.hint').textContent = '💡 ' + (it.hint || '');
    if (this.lanes === 3) { const wrong = [0, 1, 2].filter((l) => l !== this.correctLane && l !== this.carLane); this.closed = wrong[Math.floor(Math.random() * wrong.length)] ?? -1; this.renderSigns(); }
    return true;
  }
  tick(g, real) {
    const sp = this.speed * (this.nitro > 0 ? 1.8 : 1);
    this.scroll = (this.scroll + g * sp) % 2;
    if (this.nitro > 0) this.nitro -= real;
    this.drawRoad();
    if (this.cur && !this.judging) {
      const mul = this.locked ? 3 : 1;
      this.D -= g / this.sf * this.speed * mul;
      const left = (this.D - 1) / this.speed; this.setTimer(this.locked ? null : Math.max(0, left), this.warn);
      if (this.D <= 1.05) this.judge();
    } else this.setTimer(null);
    this.drawGantry();
    // scenery
    for (const s of this.scenery) {
      s.d -= g * sp * 0.9; if (s.d < 0.9) s.d += 32;
      const inv = 1 / s.d, y = HZ + (720 - HZ) * inv, x = VX + s.side * (ROADW * inv + 90 * inv + 40 * inv);
      s.img.setPosition(x, y).setScale(Math.min(2, inv * 1.6)).setOrigin(0.5, 1).setVisible(s.d < 30);
    }
    for (const r of this.rivals) {
      r.d -= g * (sp - this.speed * r.v) * 0.3; if (r.d < 1.2) r.d += 20; if (r.d > 22) r.d -= 20;
      const inv = 1 / r.d; r.img.setPosition(VX + r.lane * ROADW * inv * 0.8, HZ + (720 - HZ) * inv).setScale(inv * 1.3).setOrigin(0.5, 1).setDepth(4);
    }
    this.flames.clear();
    if (this.nitro > 0) { this.flames.fillStyle(0x56B4E9, 0.9); this.flames.fillTriangle(-30, 60, -18, 60, -24, 60 + 40 + Math.random() * 20); this.flames.fillTriangle(18, 60, 30, 60, 24, 60 + 40 + Math.random() * 20); this.flames.fillStyle(0xFFFFFF, 0.9); this.flames.fillTriangle(-27, 60, -21, 60, -24, 80); this.flames.fillTriangle(21, 60, 27, 60, 24, 80); }
  }
  drawRoad() {
    const g = this.road; g.clear();
    const N = 40;
    for (let k = N; k >= 1; k--) {
      const d1 = 1 + (k - 1) * 0.75 - this.scroll * 0.375, d2 = d1 + 0.75;
      if (d1 < 0.6) continue;
      const i1 = 1 / Math.max(0.6, d1), i2 = 1 / d2;
      const y1 = HZ + (720 - HZ) * i1, y2 = HZ + (720 - HZ) * i2;
      const h1 = ROADW * i1, h2 = ROADW * i2;
      const odd = Math.floor((k + this.scroll) ) % 2;
      g.fillStyle(odd ? 0x6DBB80 : 0x62B075).fillRect(0, y2, 960, y1 - y2 + 1);
      g.fillStyle(odd ? 0xD55E00 : 0xffffff); g.fillPoints([{ x: VX - h2 * 1.1, y: y2 }, { x: VX + h2 * 1.1, y: y2 }, { x: VX + h1 * 1.1, y: y1 }, { x: VX - h1 * 1.1, y: y1 }], true);
      g.fillStyle(odd ? 0x6B7280 : 0x737B88); g.fillPoints([{ x: VX - h2, y: y2 }, { x: VX + h2, y: y2 }, { x: VX + h1, y: y1 }, { x: VX - h1, y: y1 }], true);
      if (odd) { g.fillStyle(0xffffff); for (let l = 1; l < this.lanes; l++) { const f = -1 + (2 * l) / this.lanes; const w1 = 6 * i1, w2 = 6 * i2; g.fillPoints([{ x: VX + f * h2 - w2, y: y2 }, { x: VX + f * h2 + w2, y: y2 }, { x: VX + f * h1 + w1, y: y1 }, { x: VX + f * h1 - w1, y: y1 }], true); } }
    }
  }
  drawGantry() {
    const g = this.gantry; g.clear();
    if (!this.cur || this.judging || this.D > 40) return;
    const inv = 1 / this.D, y = HZ + (720 - HZ) * inv, h = ROADW * inv, top = y - 260 * inv;
    g.fillStyle(0x1F3A5F); g.fillRect(VX - h * 1.15 - 6 * inv, top, 12 * inv, y - top); g.fillRect(VX + h * 1.15 - 6 * inv, top, 12 * inv, y - top);
    g.fillRect(VX - h * 1.15, top, h * 2.3, 14 * inv);
    for (let i = 0; i < this.lanes; i++) {
      const cx = this.laneX(i, this.lanes, inv), w = (2 * h) / this.lanes - 10 * inv;
      g.fillStyle(i === this.closed ? 0x8C97A4 : Phaser.Display.Color.HexStringToColor(LANE_COL[i]).color).fillRect(cx - w / 2, top + 14 * inv, w, 70 * inv);
      g.lineStyle(Math.max(1, 3 * inv), 0xffffff).strokeRect(cx - w / 2, top + 14 * inv, w, 70 * inv);
      if (inv > 0.3) { g.fillStyle(0x1F3A5F); g.fillCircle(cx, top + 49 * inv, 10 * inv); }
    }
  }
  judge() {
    const it = this.cur; this.judging = true; this.cur = null;
    const rt = Math.round(this.time.now - this.born), lane = this.carLane;
    const ok = lane === this.correctLane, fast = this.locked && rt / 1000 < this.warn * 0.75;
    this.done++; this.setProgress(this.done / this.total);
    const chosen = it.options[this.order[lane]];
    const after = () => { this.printReceipt(it); this.judging = false; this.next(); };
    if (ok) {
      sfx('nitro'); this.nitro = 3;
      this.markCorrect({ item: it, given: chosen, correct: it.options[it.correct], x: this.car.x, y: CAR_Y - 120, fast, label: it.options[it.correct], rt });
      this.wait(0.3, after);
    } else {
      sfx('squeal'); puff(this, this.car.x, CAR_Y + 40, 0xDDDDDD);
      if (!S.settings.reducedMotion) this.tweens.add({ targets: this.car, x: this.car.x + 30, angle: 8, yoyo: true, duration: 240 });
      const pit = this.add.image(this.car.x + 170 > 900 ? this.car.x - 170 : this.car.x + 170, CAR_Y + 10, 'coffee').setScale(0.8).setDepth(19);
      this.markWrong({ item: it, given: chosen, correctText: it.options[it.correct], explanation: '☕ Pit stop: ' + it.explanation, rt, after: () => { pit.destroy(); after(); } });
    }
  }
  printReceipt(it) {
    if (!it.receipt?.length) return;
    sfx('printer');
    const roll = $(this.ui, '.roll');
    for (const r of it.receipt) {
      this.receipt.push(r);
      const sub = /^[A-Z]/.test(r.label) && !r.label.startsWith('(') && r.amount > 0 && !/Revenue|income/i.test(r.label) ? true : /GROSS|NET|EBIT|PBT/.test(r.label);
      const d = document.createElement('div'); d.className = 'ln' + (sub ? ' sub' : '');
      d.innerHTML = `<span>${esc(r.label)}</span><b>${r.amount < 0 ? '(' + Math.abs(r.amount) + ')' : r.amount}</b>`;
      roll.appendChild(d);
    }
  }
  finish() {
    this.ribbon(CHECKS.length);
    $(this.ui, '.billboard').style.display = 'none';
    confetti(this, undefined, 50, 0, 960);
    sfx('cheer');
    this.finishLevel(false);
  }
  endExtra() { return { receipt: this.receipt }; }
}
