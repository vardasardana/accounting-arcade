import { LevelBase } from './base.js';
import { S, fs } from '../core/state.js';
import { UI, esc, $ } from '../core/ui.js';
import { sfx, musicTempo } from '../core/audio.js';
import { bg, shuffle } from '../scenes/common.js';
import { coinBurst, stampText, confetti, puff } from './fx.js';

const BELT_Y = 352, SORT_X = 560, RED_X = 1080, START_X = 150;
const CH = {
  'Equity': { key: 'W / ↑', keys: ['ArrowUp', 'w'], x: 525, y: 120, col: '#009E73', pat: 'pat-waves', icon: '👥' },
  'Non-current Asset': { key: 'A / ←', keys: ['ArrowLeft', 'a'], x: 60, y: 468, col: '#56B4E9', pat: 'pat-dots', icon: '🏭' },
  'Current Asset': { key: 'S / ↓', keys: ['ArrowDown', 's'], x: 525, y: 468, col: '#E69F00', pat: 'pat-diag', icon: '📦' },
  'Liability': { key: 'D / →', keys: ['ArrowRight', 'd'], x: 990, y: 468, col: '#CC79A7', pat: 'pat-chev', icon: '🧾' },
  'Current Liability': { key: 'D / →', keys: ['ArrowRight', 'd'], x: 990, y: 468, col: '#CC79A7', pat: 'pat-chev', icon: '🧾' },
  'Non-current Liability': { key: 'E', keys: ['e'], x: 990, y: 120, col: '#B79BE0', pat: 'pat-cross', icon: '🏦' },
  'Notes only / Not recorded': { key: 'Space', keys: [' '], x: 60, y: 120, col: '#B9C2CC', pat: 'pat-checks', icon: '📝' },
};
const RULE = {
  'Non-current Asset': 'Held for use over more than 12 months, not for sale?',
  'Current Asset': 'Will it turn into cash or be used up within 12 months (or the operating cycle)?',
  'Liability': 'Does the company owe it to someone outside?',
  'Current Liability': 'Must it be settled within 12 months?',
  'Non-current Liability': 'Is it settled only after more than 12 months?',
  'Equity': 'Does it belong to the shareholders?',
  'Notes only / Not recorded': 'Is it uncertain, unmeasurable, or not the company’s at all?',
};
const WAVES = { 1: 'Clear cases', 2: 'Intangibles and reserves', 3: 'Split liabilities', 4: 'Intention matters', 5: 'Rush with trapdoor' };

export class Level3 extends LevelBase {
  constructor() { super('L3', 3); }
  introLines() {
    return [
      'Crates ride the belt at <b>Halcyon Home Appliances Inc.</b> Push each one into the right Balance Sheet chute before the red line.',
      'Use the arrow keys or <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> (shown on each chute sign), click a sign, or swipe on the crate.',
      'From Wave 3, liabilities split into Current and Non-current (<span class="kbd">E</span>). In Wave 5 a trapdoor opens (<span class="kbd">Space</span>) for items that are never recorded.',
      'Sort before the crate passes the glowing square for a speed bonus.',
    ];
  }
  introRule() { return 'Intention decides: the same bicycle is inventory for a bike shop but PPE for a courier.'; }
  buildWorld() {
    bg(this, 'bg_factory');
    this.items = S.data.l3;
    this.waveList = [...new Set(this.items.map((i) => i.wave))].sort((a, b) => a - b);
    this.beltG = this.add.graphics().setDepth(5); this.beltOff = 0;
    this.add.rectangle(SORT_X, BELT_Y, 130, 120).setStrokeStyle(5, 0xF0E442, 0.9).setDepth(6);
    this.add.rectangle(RED_X, BELT_Y, 8, 150, 0xD55E00).setDepth(6);
    this.trap = this.add.rectangle(380, BELT_Y, 130, 100, 0x222222, 0.0).setStrokeStyle(4, 0x1F3A5F, 0).setDepth(6);
    this.pusher = this.add.image(SORT_X, BELT_Y - 150, 'pusher').setDepth(25);
    this.chutesEl = UI.add('', '');
    this.input.on('pointerdown', (p) => { this.swipeStart = { x: p.x, y: p.y }; });
    this.input.on('pointerup', (p) => {
      if (!this.swipeStart || !this.crate || this.frozen) return;
      const dx = p.x - this.swipeStart.x, dy = p.y - this.swipeStart.y; this.swipeStart = null;
      if (Math.hypot(dx, dy) < 50) return;
      let dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
      const ch = this.chutes.find((c) => CH[c].keys.includes(dir)); if (ch) this.choose(ch);
    });
    this.total = this.items.length; this.done = 0;
    this.tips = { 'Current liabilities': 'Remember: anything due within 12 months is a current liability.', Intention: 'Remember: why the item is held decides its class.', 'Not recorded': 'Remember: contingent liabilities go to the notes; owners’ personal assets are not recorded.' };
    this.endLine = 'Balance Sheet Mill: all sorted!';
  }
  drawBelt(real) {
    this.beltOff = (this.beltOff + real * (this.crate ? this.crate.speed : 60)) % 60;
    const g = this.beltG; g.clear();
    g.fillStyle(0x3A3F47).fillRect(0, BELT_Y - 62, RED_X + 60, 124);
    g.fillStyle(0x50565F); for (let x = -60 + this.beltOff; x < RED_X + 60; x += 60) g.fillRect(x, BELT_Y - 62, 28, 124);
    g.lineStyle(4, 0x1F3A5F).strokeRect(0, BELT_Y - 62, RED_X + 60, 124);
    g.fillStyle(0x9AA6B4); for (let x = 30; x < RED_X + 60; x += 70) { g.fillCircle(x, BELT_Y + 70, 12); }
    if (this.trapOpen) { g.fillStyle(0x111111).fillRect(320, BELT_Y - 50, 120, 100); g.lineStyle(4, 0xF0E442).strokeRect(320, BELT_Y - 50, 120, 100); }
  }
  setChutes(names) {
    this.chutes = names;
    this.chutesEl.innerHTML = names.map((n) => { const c = CH[n]; return `<button class="chute ${c.pat}" data-ch="${esc(n)}" style="left:${c.x}px;top:${c.y}px;background-color:${c.col}"><span class="k kbd">${c.key}</span><span style="display:block;padding:18px 8px 0 8px">${c.icon} ${esc(n)}</span></button>`; }).join('');
    this.chutesEl.querySelectorAll('.chute').forEach((b) => b.addEventListener('click', () => this.choose(b.dataset.ch)));
  }
  chuteEl(n) { return this.chutesEl.querySelector(`.chute[data-ch="${n}"]`); }
  begin() { this.wi = -1; this.nextWave(); }
  nextWave() {
    this.wi++;
    const w = this.waveList[this.wi];
    if (w === undefined) { this.finishLevel(false); return; }
    this.wave = w; this.queue = shuffle(this.items.filter((i) => i.wave === w)); this.qi = 0;
    const five = w >= 3, trap = this.queue.some((i) => i.c5 === 'Notes only / Not recorded') || w >= 5;
    const names = ['Equity', 'Non-current Asset', 'Current Asset', five ? 'Current Liability' : 'Liability'];
    if (five) names.push('Non-current Liability');
    if (trap) names.push('Notes only / Not recorded');
    this.trapOpen = trap;
    this.setChutes(names);
    this.setStageDots(this.wi + 1, this.waveList.length, 'Wave');
    this.setTheme(`Wave ${w}: ${WAVES[w] || ''}`);
    if (this.wi === this.waveList.length - 1) musicTempo(1.14);
    sfx('whistle');
    const sub = five && this.wi > 0 && w === 3 ? 'Liabilities now split: <b>Current</b> (→) and <b>Non-current</b> (E).' : trap ? 'The trapdoor is open! <b>Space</b> = Notes only / Not recorded.' : `${names.length} chutes. The belt is getting faster.`;
    this.banner(`Wave ${w}: ${WAVES[w] || ''}`, sub, 3.2, () => this.spawn());
  }
  spawn() {
    if (this.qi >= this.queue.length) { this.wait(0.6, () => this.nextWave()); return; }
    const it = this.queue[this.qi++];
    const bt = S.config.levels['3'].belt_time_s; const t = this.T(bt[Math.min(bt.length - 1, this.wave - 1)] || 10);
    const c = this.add.container(START_X, BELT_Y - 8).setDepth(20);
    c.add(this.add.image(0, 0, 'crate'));
    const icon = this.textures.exists('cr_' + it.icon) ? 'cr_' + it.icon : 'cr_boxes';
    c.add(this.add.image(-118, -50, icon).setScale(0.9));
    c.add(this.add.text(8, it.context ? -18 : -4, it.item, { fontFamily: 'Fredoka', fontStyle: '600', fontSize: fs(23) + 'px', color: '#1F3A5F', align: 'center', wordWrap: { width: 236 }, lineSpacing: -4 }).setOrigin(0.5));
    if (it.context) c.add(this.add.text(8, 26, it.context, { fontFamily: 'Atkinson Hyperlegible', fontStyle: 'italic', fontSize: fs(18) + 'px', color: '#333', align: 'center', wordWrap: { width: 236 } }).setOrigin(0.5));
    c.item = it; c.speed = (RED_X - START_X) / t; c.born = this.time.now; c.tTotal = t;
    this.crate = c; this.peekItem = null;
    this.answer = this.wave >= 3 ? it.c5 : (it.c4 || it.c5);
    this.setPreviewKey(this.answer);
    this.chutesEl.querySelectorAll('.chute').forEach((b) => b.classList.remove('grey', 'flash-ok', 'flash-key'));
    this.setTheme(`Wave ${this.wave}: ${WAVES[this.wave] || ''}`);
  }
  currentItem() { return this.crate?.item; }
  applyPeek() {
    const wrong = shuffle(this.chutes.filter((n) => n !== this.answer)).slice(0, 2);
    wrong.forEach((n) => this.chuteEl(n)?.classList.add('grey'));
    this.setTheme(`<span style="color:#0072B2">💡 ${esc(RULE[this.answer] || '')}</span>`);
    return true;
  }
  onKey(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const ch = this.chutes?.find((n) => CH[n].keys.includes(k)); if (ch) this.choose(ch);
  }
  tick(g, real) {
    this.drawBelt(real);
    const c = this.crate; if (!c || c.judging) { this.setTimer(null); return; }
    c.x += c.speed * g / this.sf * (1);
    const left = (RED_X - c.x) / c.speed; this.setTimer(left, c.tTotal);
    if (c.x >= RED_X) this.judge(c, null);
  }
  choose(name) {
    const c = this.crate; if (!c || c.judging || this.frozen || !this.chutes.includes(name)) return;
    this.judge(c, name);
  }
  judge(c, name) {
    c.judging = true; this.crate = null; this.setTimer(null);
    const it = c.item, rt = Math.round(this.time.now - c.born);
    const fast = name && c.x < SORT_X + 65;
    this.done++; this.setProgress(this.done / this.total);
    const el = name ? this.chuteEl(name) : null;
    if (name) {
      sfx('pssht');
      this.tweens.add({ targets: this.pusher, x: c.x, duration: 90, onComplete: () => this.tweens.add({ targets: this.pusher, y: BELT_Y - 110, yoyo: true, duration: 90 }) });
    }
    const target = name ? (name === 'Notes only / Not recorded' ? { x: 380, y: BELT_Y + 60 } : { x: CH[name].x + 115, y: CH[name].y + 46 }) : { x: RED_X + 120, y: 640 };
    const ok = name === this.answer;
    this.tweens.add({ targets: c, x: target.x, y: target.y, scale: 0.35, alpha: ok ? 0 : 1, duration: 320, delay: name ? 120 : 0, ease: 'Quad.easeIn', onComplete: () => { if (ok) c.destroy(); } });
    const isTrap = this.answer === 'Notes only / Not recorded';
    if (ok) {
      el?.classList.add('flash-ok'); setTimeout(() => el?.classList.remove('flash-ok'), 700);
      this.time.delayedCall(330, () => { coinBurst(this, target.x, target.y); const s = stampText(this, target.x, target.y - 40, '✓ Filed'); this.time.delayedCall(700, () => s.destroy()); sfx('whoosh'); });
      this.markCorrect({ item: it, given: name, correct: this.answer, x: target.x, y: target.y - 80, fast, trap: isTrap, label: this.answer, rt });
      this.wait(1.0, () => this.spawn());
    } else {
      this.time.delayedCall(350, () => { sfx(name ? 'boing' : 'klaxon'); puff(this, target.x, target.y); this.tweens.add({ targets: c, y: 640, x: c.x + 40, duration: 300 }); });
      const right = this.chuteEl(this.answer); right?.classList.add('flash-key');
      this.wait(0.7, () => this.markWrong({ item: it, given: name || 'missed (passed the red line)', correctText: this.answer, explanation: it.explanation, rt, prompt: it.item + (it.context ? ` (${it.context})` : ''), after: () => { c.destroy(); right?.classList.remove('flash-key'); this.wait(0.6, () => this.spawn()); } }));
    }
  }
  endExtra() { return { fastest: this.st.fastest }; }
  finishLevel(failed) { if (!failed) confetti(this, [0xE9C994, 0x56B4E9, 0xE69F00, 0x009E73], 40); super.finishLevel(failed); }
}
