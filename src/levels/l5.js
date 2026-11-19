// Level 5: Cash Flow Shooting Gallery. Wooden targets pop up at a fairground stall; shoot each with the right gun.
import { LevelBase } from './base.js';
import { S, fs } from '../core/state.js';
import { UI, esc, $, $$ } from '../core/ui.js';
import { sfx, musicTempo } from '../core/audio.js';
import { bg, shuffle } from '../scenes/common.js';
import { coinBurst, stampText, confetti, puff } from './fx.js';
import { FAIR } from '../art/scenes.js';

const XS = [330, 640, 950];
const ROWS = [{ y: FAIR.RAIL1 - 70, hide: FAIR.RAIL1 + 110, top: 120, bottom: FAIR.RAIL1 + 4 }, { y: FAIR.RAIL2 - 72, hide: FAIR.RAIL2 + 110, top: FAIR.RAIL1 + 26, bottom: FAIR.RAIL2 + 4 }];
const GUNS = {
  cf: [
    { key: 'Operating', short: 'O', label: 'Operating', col: '#56B4E9', hex: 0x56B4E9, txt: '#1F3A5F' },
    { key: 'Investing', short: 'I', label: 'Investing', col: '#E69F00', hex: 0xE69F00, txt: '#1F3A5F' },
    { key: 'Financing', short: 'F', label: 'Financing', col: '#CC79A7', hex: 0xCC79A7, txt: '#1F3A5F' },
  ],
  adj: [
    { key: 'Add back', short: '+', label: 'Add back', col: '#009E73', hex: 0x009E73, txt: '#fff' },
    { key: 'Deduct', short: '−', label: 'Deduct', col: '#D55E00', hex: 0xD55E00, txt: '#fff' },
  ],
};
const STAGE_INFO = {
  A: { title: 'Stage A: Operating, Investing or Financing?', sub: 'Pick a gun (<span class="kbd">1</span> O, <span class="kbd">2</span> I, <span class="kbd">3</span> F, or tap a gun), then shoot the target (tap it, or press <span class="kbd">Space</span>).', guns: 'cf', theme: 'Shoot with the right gun: O, I or F' },
  B: { title: 'Stage B: trickier transactions', sub: 'The same three guns. Read each target carefully before you shoot.', guns: 'cf', theme: 'Trickier transactions: think before you shoot' },
  C: { title: 'Stage C: indirect method', sub: 'Start from <b>profit before tax</b> and work out cash from operations. The guns change: <b>+ Add back</b> (<span class="kbd">1</span>) or <b>− Deduct</b> (<span class="kbd">2</span>). Non-cash expenses are added back; an increase in a current asset is deducted.', guns: 'adj', theme: 'Indirect method: Add back or Deduct?' },
};

export class Level5 extends LevelBase {
  constructor() { super('L5', 5); }
  introLines() {
    return [
      'Welcome to the fairground! Wooden targets pop up, each showing a cash flow of <b>Skyroute Airways Ltd</b>, an airline ($ million).',
      'You have three guns: <b>O</b> Operating, <b>I</b> Investing, <b>F</b> Financing. Choose one with <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span> or by tapping it.',
      'Then shoot the target: click or tap it, or press <span class="kbd">Space</span>. Right gun = coins. Wrong gun = lose a heart.',
      'Each target stays up for a few seconds. If it drops before you shoot, it counts as a miss.',
      'In the last stage the guns change to <b>Add back</b> and <b>Deduct</b> for the indirect method.',
    ];
  }
  introRule() { return ''; }
  buildWorld() {
    bg(this, 'bg_fair');
    this.lights = [];
    this.masks = ROWS.map((r) => { const g = this.make.graphics({ add: false }); g.fillStyle(0xffffff).fillRect(0, r.top, 1280, r.bottom - r.top); return g.createGeometryMask(); });
    this.avatar = this.add.image(1035, 640, 'avatar_' + (S.player?.avatar ?? 0)).setScale(0.78).setDepth(5);
    this.cross = this.add.image(640, 360, 'crosshair').setDepth(50).setVisible(false);
    this.input.on('pointermove', (p) => { if (p.pointerType === 'mouse' && p.y < FAIR.RAIL2 + 10) { this.cross.setPosition(p.x, p.y).setVisible(true); } else this.cross.setVisible(false); });
    this.counts = { Operating: 0, Investing: 0, Financing: 0, 'Add back': 0, Deduct: 0 };
    this.gunbar = UI.add('', '');
    this.board = UI.add(`<div class="box" style="position:absolute;left:640px;top:68px;transform:translateX(-50%);white-space:nowrap;background:rgba(255,246,229,.95);border:3px solid var(--navy);border-radius:999px;padding:3px 16px;font-size:16px;display:flex;gap:14px">
       <b style="font-family:var(--hd);color:var(--navy)">Score board</b><span>O <b class="bO">0</b></span><span>I <b class="bI">0</b></span><span>F <b class="bF">0</b></span><span>+ <b class="bA">0</b></span><span>− <b class="bD">0</b></span><span style="color:#555">Missed <b class="bM">0</b></span></div>`, '');
    this.missed = 0;
    this.deal();
    this.tips = { Interest: 'Remember (Ind AS 7): interest paid = Financing, interest received = Investing.', Dividends: 'Remember (Ind AS 7): dividends paid = Financing, dividends received = Investing.', Tax: 'Remember: income tax paid is Operating unless linked to investing or financing.', 'Working capital': 'Remember: an increase in a current asset is deducted; an increase in a current liability is added back.', 'Non-cash': 'Remember: depreciation and amortisation used no cash, so add them back.', 'Non-operating': 'Remember: gains and income shown elsewhere are deducted; losses and expenses shown elsewhere are added back.' };
    this.endLine = 'Gallery cleared: profit is an opinion, cash is a fact!';
  }
  deal() {
    const cfg = S.config.levels['5'] || {};
    this.stages = [];
    for (const s of ['A', 'B', 'C']) {
      const n = cfg.targets?.[s] ?? 8;
      const pool = S.data.l5.filter((c) => c.stage === s);
      const cards = shuffle(pool).slice(0, n);
      if (cards.length) this.stages.push({ s, cards });
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
    this.guns = GUNS[info.guns]; this.gun = 0; this.buildGuns();
    this.setStageDots(this.si + 1, this.stages.length, 'Stage');
    this.setTheme(info.theme);
    if (this.si === this.stages.length - 1) musicTempo(1.08);
    if (st.s === 'C' && this.hearts < 3) { this.hearts++; this.refreshHud(); this.floatText(1200, 120, '+1 heart'); }
    sfx('ding');
    this.banner(info.title, info.sub, st.s === 'A' ? 5 : 8, () => this.spawn());
  }
  buildGuns() {
    const n = this.guns.length, w = n === 3 ? 206 : 250, gap = 14, x0 = 640 - (n * w + (n - 1) * gap) / 2;
    this.gunbar.innerHTML = this.guns.map((g, i) => `<button class="gun pe" data-i="${i}" aria-label="${esc(g.label)} gun (${i + 1})" style="position:absolute;left:${x0 + i * (w + gap)}px;top:546px;width:${w}px;height:84px;background:${g.col};color:${g.txt};border:4px solid var(--navy);border-radius:18px;box-shadow:0 5px 0 var(--navy);font-family:var(--hd);cursor:pointer;display:flex;align-items:center;gap:8px;padding:0 10px">
      <span style="width:52px;height:52px;border-radius:50%;background:#fff;color:var(--navy);display:grid;place-items:center;font-size:34px;font-weight:700;border:3px solid var(--navy);flex:none">${esc(g.short)}</span>
      <span style="text-align:left;line-height:1.05"><span style="font-size:${fs(22)}px;font-weight:700;display:block">${esc(g.label)}</span><span class="kbd" style="font-size:14px">${i + 1}</span></span></button>`).join('');
    $$(this.gunbar, '.gun').forEach((b) => b.addEventListener('click', () => this.pickGun(Number(b.dataset.i))));
    this.paintGuns();
  }
  paintGuns() {
    $$(this.gunbar, '.gun').forEach((b, i) => {
      const on = i === this.gun;
      b.style.transform = on ? 'translateY(-10px) scale(1.04)' : 'none';
      b.style.outline = on ? '5px solid #F0E442' : 'none'; b.style.outlineOffset = '2px';
      b.style.opacity = on ? '1' : '0.78';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const g = this.guns[this.gun]; if (this.cross) this.cross.setTint(g.hex);
  }
  pickGun(i) { if (!this.guns[i]) return; this.gun = i; sfx('click'); this.paintGuns(); }
  spawn() {
    if (this.qi >= this.queue.length) { this.wait(0.8, () => this.nextStage()); return; }
    const it = this.queue[this.qi++];
    const row = Math.random() < 0.5 ? 0 : 1, R = ROWS[row];
    let xi = Math.floor(Math.random() * 3); if (this.lastSlot && this.lastSlot[0] === row && this.lastSlot[1] === xi) xi = (xi + 1) % 3;
    this.lastSlot = [row, xi];
    const x = XS[xi];
    const c = this.add.container(x, R.hide).setDepth(10 + row);
    c.add(this.add.image(0, 30, 'target'));
    c.add(this.add.text(30, 0, it.text, { fontFamily: 'Atkinson Hyperlegible', fontStyle: '700', fontSize: fs(19) + 'px', color: '#222', align: 'center', wordWrap: { width: 236 }, lineSpacing: 0 }).setOrigin(0.5));
    c.setMask(this.masks[row]);
    c.setSize(340, 130); c.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.shoot(c));
    const up = this.T((S.config.levels['5']?.up_time_s || {})[this.stage] || 9);
    Object.assign(c, { item: it, row, baseX: x, upY: R.y, upT: up, left: up, phase: 'rise', born: this.time.now, sway: Math.random() * Math.PI * 2 });
    this.tweens.add({ targets: c, y: R.y, duration: S.settings.reducedMotion ? 1 : 320, ease: 'Back.Out', onComplete: () => { if (c.phase === 'rise') c.phase = 'up'; } });
    this.target = c; this.peekItem = null;
    this.setPreviewKey(it.correct);
    sfx('rustle');
  }
  currentItem() { return this.target?.item; }
  applyPeek(it) {
    if (!this.target) return false;
    const hint = { Operating: 'Is this the company’s main trading (coffee) business?', Investing: 'Long-term assets or investments, or returns on them received?', Financing: 'Shareholders or lenders: raising, repaying or rewarding them?', 'Add back': 'Did this lower profit without cash leaving, or is it shown elsewhere?', Deduct: 'Did this raise profit without cash coming in, or is it shown elsewhere?' }[it.correct];
    this.setTheme('💡 ' + esc(hint)); return true;
  }
  onKey(e) {
    if (/^[1-3]$/.test(e.key)) this.pickGun(Number(e.key) - 1);
    if ((e.key === ' ' || e.key === 'Enter') && this.target) this.shoot(this.target);
  }
  tick(g, real) {
    const c = this.target; if (!c) { this.setTimer(null); return; }
    if (!S.settings.reducedMotion && c.phase !== 'down') c.x = c.baseX + Math.sin(this.time.now / 700 + c.sway) * 26;
    if (c.phase === 'up' || c.phase === 'rise') {
      c.left -= g / this.sf; this.setTimer(c.left, c.upT);
      if (c.left <= 0) this.judge(c, null);
    }
  }
  muzzle(x, y, hex) {
    sfx('pew');
    const r = this.add.circle(x, y, 10, hex, 1).setStrokeStyle(4, 0xffffff).setDepth(40);
    this.tweens.add({ targets: r, radius: 46, alpha: 0, duration: 260, onComplete: () => r.destroy() });
    const g = this.add.graphics().setDepth(39); g.lineStyle(5, hex, 0.9).lineBetween(this.avatar.x - 20, this.avatar.y - 50, x, y);
    this.time.delayedCall(110, () => g.destroy());
  }
  shoot(c) {
    if (this.frozen || c !== this.target || c.phase === 'down') return;
    const gun = this.guns[this.gun];
    const p = this.input.activePointer; const hx = (p && Math.abs(p.x - c.x) < 170 && Math.abs(p.y - c.y) < 70) ? p.x : c.x - 128, hy = (p && Math.abs(p.x - c.x) < 170 && Math.abs(p.y - c.y) < 70) ? p.y : c.y;
    this.muzzle(hx, hy, gun.hex);
    this.judge(c, gun.key);
  }
  judge(c, given) {
    c.phase = 'down'; this.target = null; this.setTimer(null);
    const it = c.item, rt = Math.round(this.time.now - c.born);
    this.done++; this.setProgress(this.done / this.total);
    const drop = (after) => this.tweens.add({ targets: c, y: ROWS[c.row].hide, duration: S.settings.reducedMotion ? 1 : 300, ease: 'Quad.In', onComplete: () => { c.destroy(); after && after(); } });
    if (given === it.correct) {
      this.counts[it.correct]++;
      const s = stampText(this, c.x, c.y - 10, ({ Operating: 'CFO', Investing: 'CFI', Financing: 'CFF', 'Add back': '+ ADD BACK', Deduct: '− DEDUCT' })[it.correct], '#009E73'); this.time.delayedCall(700, () => s.destroy());
      coinBurst(this, c.x, c.y); sfx('stamp');
      this.markCorrect({ item: it, given, correct: it.correct, x: c.x, y: c.y - 70, fast: rt / 1000 < c.upT / 2, label: it.correct, rt });
      this.updBoard();
      if (!S.settings.reducedMotion) this.tweens.add({ targets: c, scaleY: 0.1, duration: 160, delay: 120, onComplete: () => drop() }); else drop();
      this.wait(1.1, () => this.spawn());
    } else {
      if (given) { puff(this, c.x, c.y, 0xB9C2CC); sfx('plop'); if (!S.settings.reducedMotion) this.tweens.add({ targets: c, angle: 8, duration: 60, yoyo: true, repeat: 2 }); }
      else { this.missed++; this.updBoard(); this.floatText(c.x, c.y - 70, 'Missed!', 'bad'); }
      const expl = (given ? '' : 'The target dropped before you shot it. ') + it.explanation;
      this.markWrong({ item: it, given: given || 'missed (time up)', correctText: it.correct, explanation: expl, rt, prompt: it.text, after: () => drop(() => this.wait(0.5, () => this.spawn())) });
    }
  }
  updBoard() { const m = { bO: 'Operating', bI: 'Investing', bF: 'Financing', bA: 'Add back', bD: 'Deduct' }; for (const [k, v] of Object.entries(m)) { const e = this.board.querySelector('.' + k); if (e) e.textContent = this.counts[v]; } const e = this.board.querySelector('.bM'); if (e) e.textContent = this.missed; }
  endExtra() { return { cfo: this.counts.Operating, cfi: this.counts.Investing, cff: this.counts.Financing, adj: this.counts['Add back'] + this.counts.Deduct, missed: this.missed }; }
  finishLevel(failed) { if (!failed) confetti(this); this.gunbar.innerHTML = ''; super.finishLevel(failed); }
}
