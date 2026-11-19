// Level 6: Ratio Supermarket (build the ratio, then compute it at checkout) followed by Headline Slingshot.
import { LevelBase } from './base.js';
import { S, fs } from '../core/state.js';
import { UI, esc, $, $$ } from '../core/ui.js';
import { sfx, musicTempo } from '../core/audio.js';
import { bg, shuffle } from '../scenes/common.js';
import { coinBurst, confetti, puff } from './fx.js';
import { uri } from '../art/svg.js';
import { trolley, SLING } from '../art/scenes.js';

const TOWER_X = [795, 1105], CARD_X = [650, 960], GRAV = 900, PULL_K = 6.4;

const FAM = { Liquidity: '💧', Solvency: '🛡️', Profitability: '📈', Efficiency: '⚙️' };
const PCOL = ['#56B4E9', '#E69F00', '#009E73', '#CC79A7', '#F0E442'];
const money = (n) => '$' + n.toLocaleString('en-IN') + ' m';

export class Level6 extends LevelBase {
  constructor() { super('L6', 6); }
  introLines() {
    return [
      '<b>Ratio Supermarket.</b> The shelves hold line items from <b>Medivale Pharma Ltd</b>’s statements ($ million). Your shopping list names one ratio.',
      'Put the <b>numerator</b> (top of the formula) in the TOP of the trolley and the <b>denominator</b> in the BOTTOM: tap a product to drop it into the glowing slot, or drag it there. Tap a slot to choose it.',
      'A wrong product costs a few coins and Penny explains why; then try again. When both are right, press <b>Checkout</b> and pick the correct value (<span class="kbd">1</span>–<span class="kbd">4</span>).',
      '<b>Headline Slingshot.</b> Two rival companies stand on their towers with their ratio cards. A news headline is loaded in the slingshot: decide which company it is about and fire it at that CEO. Drag back and let go, or tap a company (or press <span class="kbd">1</span>/<span class="kbd">2</span>) and press <b>Launch</b> (<span class="kbd">Space</span>). A hit on the wrong CEO, or a miss, costs a heart.',
    ];
  }
  introRule() { return 'Read every number on both cards before you fire.'; }
  buildWorld() {
    bg(this, 'bg_market');
    this.avatarA = this.add.image(855, 562, 'avatar_' + (S.player?.avatar ?? 0)).setScale(0.8);
    this.bgB = this.add.image(0, 0, 'bg_sling').setOrigin(0, 0).setDisplaySize(1280, 720).setDepth(1).setVisible(false);
    this.cfg = S.config.levels['6'] || {};
    this.ratios = shuffle(S.data.l6).slice(0, this.cfg.ratios ?? 6);
    this.slingRounds = S.data.l6g.rounds;
    this.total = this.ratios.length + this.slingRounds.reduce((a, r) => a + r.headlines.length, 0); this.done = 0;
    this.layer = UI.add('', '');
    this.byFam = {};
    this.tips = { Liquidity: 'Remember: current ratio = current assets ÷ current liabilities.', Solvency: 'Remember: debt means borrowings only, and interest cover uses EBIT.', Profitability: 'Remember: margins and returns use net profit after tax unless the ratio says otherwise.', Efficiency: 'Remember: inventory turnover uses cost of goods sold, not revenue.', 'Market value': 'Remember: a high P/E means investors pay more for each unit of earnings.' };
    this.endLine = 'Shopping done and every headline delivered!';
  }
  begin() { this.stageNo = 0; this.startSupermarket(); }
  startSupermarket() {
    this.mode = 'shop'; this.ri = 0;
    this.setStageDots(1, 2, 'Stage');
    this.setTheme('Ratio Supermarket: fill the trolley, then check out');
    sfx('ding');
    this.banner('Stage A: Ratio Supermarket', 'Read the shopping list. Put the <b>numerator</b> in the TOP of the trolley and the <b>denominator</b> in the BOTTOM, then check out and choose the right value.', 6, () => this.nextRatio());
  }
  // ---------- Stage A ----------
  nextRatio() {
    this.layer.innerHTML = '';
    if (this.ri >= this.ratios.length) { this.wait(0.4, () => this.startVerdicts()); return; }
    const r = this.ratios[this.ri++]; this.cur = r; this.peekItem = null; this.phase = 'pick';
    this.slots = { top: null, bottom: null }; this.active = 'top'; this.wrongPicks = 0;
    this.phaseT = this.T(this.cfg.pick_time_s || 60); this.left = this.phaseT; this.born = this.time.now;
    const items = S.data.shelf;
    const prod = (x, i) => `<button class="prod pe" data-id="${esc(x.id)}" aria-label="${esc(x.label)} ${money(x.amount)}" style="left:${32 + (i % 5) * 176}px;top:${125 + Math.floor(i / 5) * 115}px;border-top:12px solid ${PCOL[i % 5]}">
        <span class="nm">${esc(x.label)}</span><span class="am">${money(x.amount)}</span></button>`;
    this.layer.innerHTML = `
      ${items.map(prod).join('')}
      <div class="slist"><div class="hd">🛒 Shopping list <span>${this.ri} of ${this.ratios.length}</span></div><div class="rn">${esc(r.ratio)}</div><div class="fm">${FAM[r.subtopic] || ''} ${esc(r.subtopic)} ratio</div></div>
      <img class="troll" alt="" src="${uri(trolley())}">
      <button class="slot pe top" data-s="top" aria-label="Top slot: numerator"><small>TOP · numerator</small><span class="v">Tap a product</span></button>
      <div class="divbar">÷</div>
      <button class="slot pe bottom" data-s="bottom" aria-label="Bottom slot: denominator"><small>BOTTOM · denominator</small><span class="v">Tap a product</span></button>
      <button class="btn green checkout" disabled style="position:absolute;left:960px;top:560px;width:272px">Checkout ▶</button>
      <div class="shophint">Tap a product to drop it in the glowing slot, or drag it into the trolley.</div>`;
    $$(this.layer, '.prod').forEach((b) => this.makeDraggable(b));
    $$(this.layer, '.slot').forEach((b) => b.addEventListener('click', () => this.slotTap(b.dataset.s)));
    $(this.layer, '.checkout').addEventListener('click', () => this.checkout());
    this.paintSlots();
    this.setPreviewKey(`${r.numerator} ÷ ${r.denominator} = ${r.answer}`);
  }
  makeDraggable(b) {
    let st = null;
    b.addEventListener('pointerdown', (e) => { if (this.frozen || this.phase !== 'pick') return; st = { x: e.clientX, y: e.clientY, drag: false, ghost: null }; b.setPointerCapture?.(e.pointerId); });
    b.addEventListener('pointermove', (e) => {
      if (!st) return;
      if (!st.drag && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 10) { st.drag = true; st.ghost = b.cloneNode(true); st.ghost.classList.add('ghost'); this.layer.appendChild(st.ghost); }
      if (st.drag) { const p = this.toUi(e.clientX, e.clientY); st.ghost.style.left = p.x - 80 + 'px'; st.ghost.style.top = p.y - 44 + 'px'; }
    });
    const end = (e) => {
      if (!st) return; const s = st; st = null;
      if (s.ghost) s.ghost.remove();
      if (!s.drag) { this.put(b.dataset.id, this.active); return; }
      const p = this.toUi(e.clientX, e.clientY);
      const target = p.x > 930 && p.y > 230 && p.y < 560 ? (p.y < 380 ? 'top' : 'bottom') : null;
      if (target) this.put(b.dataset.id, target);
    };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', () => { if (st?.ghost) st.ghost.remove(); st = null; });
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); this.put(b.dataset.id, this.active); } });
  }
  toUi(cx, cy) { const r = UI.root.getBoundingClientRect(), s = r.width / 1280; return { x: (cx - r.left) / s, y: (cy - r.top) / s }; }
  slotTap(s) {
    if (this.frozen || this.phase !== 'pick') return;
    if (this.slots[s]) { this.slots[s] = null; sfx('click'); }
    this.active = s; this.paintSlots();
  }
  paintSlots() {
    for (const s of ['top', 'bottom']) {
      const el = $(this.layer, '.slot.' + s); if (!el) continue;
      const it = this.slots[s] && S.data.shelf.find((x) => x.id === this.slots[s]);
      el.classList.toggle('act', this.active === s && !it); el.classList.toggle('full', !!it);
      $(el, '.v').innerHTML = it ? `${esc(it.label)}<br><b>${money(it.amount)}</b>` : (this.active === s ? 'Tap a product' : 'Empty');
    }
    $$(this.layer, '.prod').forEach((b) => b.classList.toggle('used', Object.values(this.slots).includes(b.dataset.id)));
    const cb = $(this.layer, '.checkout'); if (cb) cb.disabled = !(this.slots.top && this.slots.bottom);
  }
  put(id, slot) {
    if (this.frozen || this.phase !== 'pick' || !id) return;
    const r = this.cur, need = slot === 'top' ? r.numerator : r.denominator;
    const item = S.data.shelf.find((x) => x.id === id);
    if (Object.values(this.slots).includes(id)) return;
    if (id === need) {
      this.slots[slot] = id; sfx('beep');
      this.floatText(1095, slot === 'top' ? 300 : 420, '✔ ' + (slot === 'top' ? 'Top' : 'Bottom'), 'lbl');
      this.active = this.slots.top ? (this.slots.bottom ? null : 'bottom') : 'top';
      this.paintSlots();
      if (this.slots.top && this.slots.bottom) { const cb = $(this.layer, '.checkout'); cb && cb.focus(); }
      return;
    }
    // wrong product: costs coins, explains, lets the student try again (no heart lost)
    const cost = this.cfg.wrong_item_cost ?? 5;
    this.wrongPicks++; S.run.wallet = Math.max(0, S.run.wallet - cost); this.refreshHud();
    this.st.subMiss[r.subtopic] = (this.st.subMiss[r.subtopic] || 0) + 1;
    this.log({ ...r, id: r.id + '-' + slot }, item.label, false, { correct: S.data.shelf.find((x) => x.id === need).label, counted: false });
    sfx('bonk'); this.floatText(1095, slot === 'top' ? 300 : 420, '−' + cost + ' coins', 'bad');
    const other = slot === 'top' ? r.denominator : r.numerator;
    const why = id === other ? `${item.label} belongs in the ${slot === 'top' ? 'BOTTOM (denominator)' : 'TOP (numerator)'}, not the ${slot === 'top' ? 'top' : 'bottom'}. ` : `${item.label} is not part of the ${r.ratio}. `;
    this.showExplain({ prompt: `${r.ratio}: ${slot === 'top' ? 'top (numerator)' : 'bottom (denominator)'}`, correctText: `Try again. ${r.ratio} = ${r.formula}`, explanation: why + `This item cost you ${cost} coins; your heart is safe.` }, () => {});
    this.st.wrongs.push({ prompt: `${r.ratio}: ${slot === 'top' ? 'numerator' : 'denominator'}`, given: item.label, correct: S.data.shelf.find((x) => x.id === need).label, why: `${r.ratio} = ${r.formula}` });
  }
  checkout() {
    if (this.frozen || this.phase !== 'pick' || !(this.slots.top && this.slots.bottom)) return;
    const r = this.cur; this.phase = 'checkout'; sfx('kaching');
    const n = S.data.shelf.find((x) => x.id === r.numerator), d = S.data.shelf.find((x) => x.id === r.denominator);
    this.opts = shuffle(r.options);
    this.phaseT = this.T(this.cfg.checkout_time_s || 30); this.left = this.phaseT; this.born2 = this.time.now;
    const u = r.unit === '%' ? '%' : r.unit === 'times' ? ' times' : '';
    this.layer.insertAdjacentHTML('beforeend', `<div class="dim"></div><div class="till pe">
      <div class="hd">🧾 Checkout: ${esc(r.ratio)}</div>
      <div class="eq"><div><span>${esc(n.label)}</span><b>${n.amount}</b></div><div class="ln"></div><div><span>${esc(d.label)}</span><b>${d.amount}</b></div></div>
      ${r.unit === '%' ? '<div class="mul">× 100 (it is a percentage)</div>' : ''}
      <div class="q">What is Medivale’s ${esc(r.ratio)}?</div>
      <div class="opts">${this.opts.map((o, i) => `<button class="btn cream opt" data-i="${i}"><span class="kbd" style="font-size:14px">${i + 1}</span> ${esc(o)}${u}</button>`).join('')}</div></div>`);
    $$(this.layer, '.opt').forEach((b) => b.addEventListener('click', () => this.pay(Number(b.dataset.i))));
    this.setTheme(`Checkout: work out the ${esc(r.ratio)}`);
  }
  pay(i) {
    if (this.frozen || this.phase !== 'checkout') return;
    const r = this.cur; this.phase = 'done'; this.setTimer(null);
    const given = i >= 0 ? this.opts[i] : null, rt = Math.round(this.time.now - this.born);
    this.done++; this.setProgress(this.done / this.total);
    const u = r.unit === '%' ? '%' : r.unit === 'times' ? ' times' : '';
    const fam = (this.byFam[r.subtopic] ||= { c: 0, n: 0 }); fam.n++;
    $$(this.layer, '.opt').forEach((b) => { const v = this.opts[Number(b.dataset.i)]; if (v === r.answer) b.classList.add('green'); else if (Number(b.dataset.i) === i) b.classList.add('verm'); });
    this.setTheme('Ratio Supermarket: fill the trolley, then check out');
    if (given === r.answer) {
      if (!this.wrongPicks) fam.c++;
      coinBurst(this, 640, 300);
      this.markCorrect({ item: r, given: given + u, correct: r.answer + u, x: 640, y: 160, fast: (this.time.now - this.born2) / 1000 < this.phaseT / 2, label: `${r.ratio} = ${r.answer}${u}`, rt });
      this.wait(1.6, () => this.nextRatio());
    } else {
      this.markWrong({ item: r, given: given ? given + u : 'time up', correctText: `${r.ratio} = ${r.answer}${u}`, explanation: r.explanation, rt, prompt: `${r.ratio} for Medivale Pharma Ltd`, after: () => this.nextRatio() });
    }
  }
  // ---------- Stage B: Headline Slingshot ----------
  startVerdicts() {
    this.layer.innerHTML = ''; this.mode = 'sling'; this.gi = 0; this.rIdx = -1;
    this.setStageDots(2, 2, 'Stage'); musicTempo(1.1);
    this.bgB.setVisible(true); this.avatarA.setVisible(false);
    this.sling = this.add.image(SLING.x, SLING.ground - 80, 'slingshot').setDepth(5);
    this.band = this.add.graphics().setDepth(6); this.dots = this.add.graphics().setDepth(7);
    this.proj = this.add.image(SLING.x, SLING.y, 'newspaper').setDepth(8).setVisible(false);
    this.input.on('pointerdown', (p) => this.slingDown(p));
    this.input.on('pointermove', (p) => this.slingMove(p));
    this.input.on('pointerup', (p) => this.slingUp(p));
    this.setTheme('Headline Slingshot: which company is the news about?');
    sfx('ding');
    this.banner('Stage B: Headline Slingshot', 'A news headline is loaded in the slingshot. Read both companies’ numbers, then fire the headline at the CEO it is about. Drag back and let go, or tap a company and press <b>Launch</b>.', 7, () => this.nextRoundB());
  }
  nextRoundB() {
    this.rIdx++;
    const rd = this.slingRounds[this.rIdx];
    if (!rd) { this.finishLevel(false); return; }
    this.rd = rd; this.hq = shuffle(rd.headlines); this.hi = 0;
    this.buildTowers(rd);
    this.banner(`Round ${this.rIdx + 1}: ${rd.companies[0].name} vs ${rd.companies[1].name}`, `Both are ${esc(S.data.l6g.industry.toLowerCase())} companies. Study their numbers before you fire.`, 4, () => this.nextHeadline());
  }
  buildTowers(rd) {
    (this.towers || []).forEach((t) => t.parts.forEach((o) => o.destroy()));
    const R = S.data.l6g.ratios;
    const fmtV = (r, v) => v + (r.unit === '%' ? '%' : r.unit ? ' ' + r.unit : '');
    this.towers = rd.companies.map((c, i) => {
      const x = TOWER_X[i], parts = [], blocks = [];
      for (let k = 0; k < 3; k++) { const b = this.add.image(x, SLING.ground - 21 - k * 42, 'block').setDepth(3); blocks.push(b); parts.push(b); }
      const key = c.colour.replace('#', '');
      const ceo = this.add.image(x, SLING.ground - 126 - 60, this.textures.exists('ceo_' + key) ? 'ceo_' + key : 'ceo_0072B2').setDepth(4);
      const hat = this.add.image(x, SLING.ground - 126 - 122, this.textures.exists('hat_' + key) ? 'hat_' + key : 'hat_0072B2').setDepth(4);
      const plate = this.add.text(x, SLING.ground - 63, c.name.replace(/ Ltd$/, ''), { fontFamily: 'Fredoka', fontStyle: '700', fontSize: fs(15) + 'px', color: '#fff', backgroundColor: c.colour, padding: { x: 6, y: 2 } }).setOrigin(0.5).setDepth(4);
      parts.push(ceo, hat, plate);
      const zone = this.add.zone(x, SLING.ground - 160, 150, 330).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.aim(i));
      parts.push(zone);
      return { x, blocks, ceo, hat, plate, parts, c };
    });
    this.layer.innerHTML = rd.companies.map((c, i) => `<button class="rcard pe" data-i="${i}" style="left:${CARD_X[i]}px;border-color:${c.colour}" aria-label="Aim at ${esc(c.name)}">
      <div class="hd" style="background:${c.colour}">${esc(c.name)}<small>CEO ${esc(c.ceo)}</small></div>
      <table>${R.map((r) => `<tr data-k="${r.key}"><td>${esc(r.label)}</td><td>${esc(fmtV(r, c.ratios[r.key]))}</td></tr>`).join('')}</table></button>`).join('') +
      `<div class="headline"><div class="src">📰 <span></span></div><div class="tx"></div><div class="aimhint">Drag the paper back and let go, or tap a company and press <b>Launch</b> (keys 1, 2, Space).</div></div>
      <button class="btn orange launch pe" style="position:absolute;left:390px;top:548px;width:200px">🚀 Launch <span class="kbd" style="font-size:13px">Space</span></button>`;
    $$(this.layer, '.rcard').forEach((b) => b.addEventListener('click', () => this.aim(Number(b.dataset.i))));
    $(this.layer, '.launch').addEventListener('click', () => this.launch());
  }
  nextHeadline() {
    if (this.hi >= this.hq.length) { this.wait(0.6, () => this.nextRoundB()); return; }
    const h = this.hq[this.hi++]; this.cur = h; this.peekItem = null; this.phase = 'aim'; this.aimAt = null; this.flying = null;
    $$(this.layer, '.rcard').forEach((b) => b.classList.remove('aimed'));
    $$(this.layer, '.rcard tr').forEach((tr) => tr.classList.remove('peek'));
    $(this.layer, '.headline .src span').textContent = h.source; $(this.layer, '.headline .tx').textContent = '“' + h.text + '”';
    this.proj.setPosition(SLING.x, SLING.y).setVisible(true).setAngle(0);
    this.drawBand(SLING.x, SLING.y); this.dots.clear();
    this.phaseT = this.T(this.cfg.shot_time_s || 40); this.left = this.phaseT; this.born = this.time.now;
    this.setPreviewKey(this.rd.companies[h.answer].name);
    sfx('rustle');
  }
  drawBand(px, py) {
    const g = this.band; g.clear(); g.lineStyle(6, 0x5B3A1E, 1);
    g.lineBetween(SLING.x - 36, SLING.y - 14, px, py); g.lineBetween(SLING.x + 36, SLING.y - 14, px, py);
  }
  velFor(i) { // velocity that lands the paper on CEO i
    const tx = TOWER_X[i], ty = SLING.ground - 190, T = i ? 1.15 : 1.0; // the far shot flies higher so it clears the near tower
    return { vx: (tx - SLING.x) / T, vy: (ty - SLING.y - 0.5 * GRAV * T * T) / T };
  }
  drawArc(vx, vy) {
    const g = this.dots; g.clear(); g.fillStyle(0xffffff, 0.95);
    for (let t = 0.08; t < 1.6; t += 0.08) { const x = SLING.x + vx * t, y = SLING.y + vy * t + 0.5 * GRAV * t * t; if (y > SLING.ground || x > 1280) break; g.fillCircle(x, y, 5); if ((this.towers || []).some((tw) => Math.abs(x - tw.x) < 62 && y > SLING.ground - 260)) break; }
  }
  aim(i) {
    if (this.frozen || this.mode !== 'sling' || this.phase !== 'aim' || !this.towers?.[i]) return;
    this.aimAt = i; sfx('click');
    $$(this.layer, '.rcard').forEach((b) => b.classList.toggle('aimed', Number(b.dataset.i) === i));
    const v = this.velFor(i); this.drawArc(v.vx, v.vy);
    const k = 0.11, px = SLING.x - v.vx * k, py = SLING.y - v.vy * k * 0.5;
    this.proj.setPosition(px, py); this.drawBand(px, py);
  }
  launch(v) {
    if (this.frozen || this.mode !== 'sling' || this.phase !== 'aim') return;
    if (!v) { if (this.aimAt === null) { this.floatText(490, 520, 'Tap a company to aim first', 'lbl'); return; } v = this.velFor(this.aimAt); }
    this.phase = 'fly'; this.setTimer(null); this.dots.clear(); this.drawBand(SLING.x, SLING.y);
    this.flying = { x: SLING.x, y: SLING.y, vx: v.vx, vy: v.vy }; sfx('whoosh');
  }
  slingDown(p) {
    if (this.frozen || this.mode !== 'sling' || this.phase !== 'aim') return;
    if (Math.hypot(p.x - SLING.x, p.y - SLING.y) < 90) this.dragging = true;
  }
  slingMove(p) {
    if (!this.dragging || this.frozen) return;
    let dx = p.x - SLING.x, dy = p.y - SLING.y; const d = Math.hypot(dx, dy), m = 150;
    if (d > m) { dx *= m / d; dy *= m / d; }
    this.proj.setPosition(SLING.x + dx, SLING.y + dy); this.drawBand(SLING.x + dx, SLING.y + dy);
    this.drawArc(-dx * PULL_K, -dy * PULL_K);
  }
  slingUp() {
    if (!this.dragging) return; this.dragging = false;
    const dx = this.proj.x - SLING.x, dy = this.proj.y - SLING.y;
    if (Math.hypot(dx, dy) < 25) { this.proj.setPosition(SLING.x, SLING.y); this.drawBand(SLING.x, SLING.y); this.dots.clear(); return; }
    this.launch({ vx: -dx * PULL_K, vy: -dy * PULL_K });
  }
  flyStep(dt) {
    const f = this.flying; if (!f) return;
    let hit = -1; const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let s = 0; s < n && hit < 0; s++) { // exact ballistic sub-steps, so the flight matches the aiming dots at any frame rate
      f.x += f.vx * h; f.y += f.vy * h + 0.5 * GRAV * h * h; f.vy += GRAV * h;
      hit = this.towers.findIndex((t) => Math.abs(f.x - t.x) < 62 && f.y > SLING.ground - 260 && f.y < SLING.ground);
    }
    this.proj.setPosition(f.x, f.y).setAngle(this.proj.angle + 540 * dt);
    if (hit >= 0) { this.flying = null; this.shotResult(hit, f.x, f.y); return; }
    if (f.y >= SLING.ground || f.x > 1300 || f.x < -40) { this.flying = null; this.shotResult(-1, Math.min(1260, Math.max(20, f.x)), Math.min(f.y, SLING.ground)); }
  }
  shotResult(i, x, y) {
    const h = this.cur, rd = this.rd; this.phase = 'done';
    const rt = Math.round(this.time.now - this.born); this.done++; this.setProgress(this.done / this.total);
    const fam = (this.byFam[h.category] ||= { c: 0, n: 0 }); fam.n++;
    this.proj.setVisible(false);
    const r = S.data.l6g.ratios.find((q) => q.key === h.ratio);
    const vals = rd.companies.map((c) => `${c.name.replace(/ Ltd$/, '')} ${c.ratios[h.ratio]}${r.unit === '%' ? '%' : r.unit ? ' ' + r.unit : ''}`).join(' vs ');
    if (i === h.answer) {
      fam.c++;
      const t = this.towers[i];
      sfx('fanfare'); coinBurst(this, t.x, t.ceo.y - 40);
      this.tweens.add({ targets: t.hat, y: t.hat.y - 160, x: t.hat.x + 120, angle: 300, alpha: 0, duration: 700 });
      t.blocks.forEach((b, k) => this.tweens.add({ targets: b, x: b.x + (k % 2 ? 50 : -40) + 30, y: SLING.ground - 21, angle: k % 2 ? 80 : -70, duration: 450, delay: 80 * (2 - k), ease: 'Quad.In' }));
      this.tweens.add({ targets: t.ceo, y: SLING.ground - 60, angle: -12, duration: 450, ease: 'Quad.In' });
      this.markCorrect({ item: h, given: rd.companies[i].name, correct: rd.companies[h.answer].name, x: t.x, y: 330, fast: rt / 1000 < this.phaseT / 2, label: 'Headline lands! ' + rd.companies[i].name.replace(/ Ltd$/, ''), rt });
      this.wait(1.8, () => { this.buildTowers(rd); this.nextHeadline(); });
    } else {
      puff(this, x, y - 10);
      if (i >= 0) { const t = this.towers[i]; this.tweens.add({ targets: t.ceo, angle: 10, duration: 80, yoyo: true, repeat: 3 }); }
      const given = i >= 0 ? rd.companies[i].name : 'missed both';
      this.markWrong({ item: h, given, correctText: `${rd.companies[h.answer].name} (${r.label}: ${vals})`, explanation: h.explanation, rt, prompt: '“' + h.text + '”', after: () => this.nextHeadline() });
    }
  }
  currentItem() { return (this.mode === 'shop' && this.phase === 'pick') || (this.mode === 'sling' && this.phase === 'aim') ? this.cur : null; }
  applyPeek(it) {
    if (this.mode === 'shop') { this.setTheme(`💡 ${esc(it.ratio)} = ${esc(it.formula)}`); return true; }
    $$(this.layer, `.rcard tr[data-k="${it.ratio}"]`).forEach((tr) => tr.classList.add('peek'));
    this.setTheme('💡 The highlighted row is the one this news is about.'); return true;
  }
  onKey(e) {
    if (this.mode === 'shop' && this.phase === 'checkout' && /^[1-4]$/.test(e.key)) this.pay(Number(e.key) - 1);
    else if (this.mode === 'shop' && this.phase === 'pick' && e.key === 'Enter' && this.slots.top && this.slots.bottom) this.checkout();
    else if (this.mode === 'sling' && this.phase === 'aim') { if (/^[12]$/.test(e.key)) this.aim(Number(e.key) - 1); else if (e.key === ' ' || e.key === 'Enter') this.launch(); }
  }
  tick(g, real) {
    if (this.mode === 'sling' && this.phase === 'fly') { this.flyStep(Math.min(real, 0.05)); return; }
    const timed = (this.mode === 'shop' && (this.phase === 'pick' || this.phase === 'checkout')) || (this.mode === 'sling' && this.phase === 'aim');
    if (!timed) { this.setTimer(null); return; }
    this.left -= g / this.sf; this.setTimer(this.left, this.phaseT);
    if (this.left > 0) return;
    if (this.mode === 'sling') { this.dragging = false; this.dots.clear(); this.shotResult(-1, SLING.x, SLING.y); }
    else if (this.phase === 'checkout') this.pay(-1);
    else { // ran out of shopping time
      const r = this.cur; this.phase = 'done'; this.setTimer(null); this.done++; this.setProgress(this.done / this.total);
      (this.byFam[r.subtopic] ||= { c: 0, n: 0 }).n++;
      this.markWrong({ item: r, given: 'time up', correctText: `${r.ratio} = ${r.formula} = ${r.answer}${r.unit === '%' ? '%' : r.unit === 'times' ? ' times' : ''}`, explanation: r.explanation, rt: Math.round(this.time.now - this.born), prompt: `${r.ratio} for Medivale Pharma Ltd`, after: () => this.nextRatio() });
    }
  }
  endExtra() { return { themes: this.byFam }; }
  finishLevel(failed) { if (!failed) confetti(this); this.layer.innerHTML = ''; super.finishLevel(failed); }
}
