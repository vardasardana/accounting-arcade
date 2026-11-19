// Level 6: Ratio Supermarket (build the ratio, then compute it at checkout) followed by Analyst's Verdict.
import { LevelBase } from './base.js';
import { S, fs } from '../core/state.js';
import { UI, esc, $, $$ } from '../core/ui.js';
import { sfx, musicTempo } from '../core/audio.js';
import { bg, shuffle } from '../scenes/common.js';
import { coinBurst, confetti } from './fx.js';
import { uri } from '../art/svg.js';
import { trolley } from '../art/scenes.js';

const FAM = { Liquidity: '💧', Solvency: '🛡️', Profitability: '📈', Efficiency: '⚙️' };
const PCOL = ['#56B4E9', '#E69F00', '#009E73', '#CC79A7', '#F0E442'];
const money = (n) => '$' + n.toLocaleString('en-IN') + ' m';

export class Level6 extends LevelBase {
  constructor() { super('L6', 6); }
  introLines() {
    return [
      '<b>Ratio Supermarket.</b> The shelves hold line items from <b>Copperleaf Coffee Ltd</b>’s statements ($ million). Your shopping list names one ratio.',
      'Put the <b>numerator</b> (top of the formula) in the TOP of the trolley and the <b>denominator</b> in the BOTTOM: tap a product to drop it into the glowing slot, or drag it there. Tap a slot to choose it.',
      'A wrong product costs a few coins and Penny explains why; then try again. When both are right, press <b>Checkout</b> and pick the correct value (<span class="kbd">1</span>–<span class="kbd">4</span>).',
      '<b>Analyst’s Verdict.</b> Compare Copperleaf’s ratio with the industry average and rule: <b>Too low</b> (<span class="kbd">1</span>), <b>Healthy</b> (<span class="kbd">2</span>) or <b>Too high</b> (<span class="kbd">3</span>).',
    ];
  }
  introRule() { return 'Higher is not always better, and lower is not always better: always compare with the industry.'; }
  buildWorld() {
    bg(this, 'bg_market');
    this.add.image(855, 562, 'avatar_' + (S.player?.avatar ?? 0)).setScale(0.8);
    this.cfg = S.config.levels['6'] || {};
    this.ratios = shuffle(S.data.l6).slice(0, this.cfg.ratios ?? 6);
    this.verdicts = shuffle(S.data.l6v).slice(0, this.cfg.verdicts ?? 6);
    this.total = this.ratios.length + this.verdicts.length; this.done = 0;
    this.layer = UI.add('', '');
    this.byFam = {};
    this.tips = { Liquidity: 'Remember: current ratio = current assets ÷ current liabilities.', Solvency: 'Remember: debt means borrowings only, and interest cover uses EBIT.', Profitability: 'Remember: margins and returns use net profit after tax unless the ratio says otherwise.', Efficiency: 'Remember: inventory turnover uses cost of goods sold, not revenue.', Verdict: 'Remember: compare with the industry; too high can be as bad as too low.' };
    this.endLine = 'Shopping done and verdicts delivered!';
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
      <div class="q">What is Copperleaf’s ${esc(r.ratio)}?</div>
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
      this.markWrong({ item: r, given: given ? given + u : 'time up', correctText: `${r.ratio} = ${r.answer}${u}`, explanation: r.explanation, rt, prompt: `${r.ratio} for Copperleaf Coffee Ltd`, after: () => this.nextRatio() });
    }
  }
  // ---------- Stage B ----------
  startVerdicts() {
    this.layer.innerHTML = ''; this.mode = 'verdict'; this.vi = 0;
    this.setStageDots(2, 2, 'Stage'); musicTempo(1.1);
    this.setTheme('Analyst’s Verdict: compare with the industry');
    sfx('ding');
    this.banner('Stage B: Analyst’s Verdict', 'You are the judge. Compare Copperleaf’s ratio with the industry average. <b>Healthy</b> = close to the average. <b>Too low</b> or <b>Too high</b> = far below or far above it. Higher is not always better!', 7, () => this.nextVerdict());
  }
  nextVerdict() {
    this.layer.innerHTML = '';
    if (this.vi >= this.verdicts.length) { this.finishLevel(false); return; }
    const v = this.verdicts[this.vi++]; this.cur = v; this.peekItem = null; this.phase = 'judge';
    this.phaseT = this.T(this.cfg.verdict_time_s || 25); this.left = this.phaseT; this.born = this.time.now;
    const cv = parseFloat(v.company), iv = parseFloat(v.industry), mx = Math.max(cv, iv) || 1;
    const bar = (lab, val, n, col) => `<div class="vb"><span class="lb">${lab}</span><div class="tr"><i style="width:${Math.max(3, n / mx * 100)}%;background:${col}"></i></div><b>${esc(val)}</b></div>`;
    this.layer.innerHTML = `<div class="dim"></div><div class="bench pe">
      <div class="hd">⚖️ Copperleaf Coffee Ltd · ${esc(v.period)} <span>${this.vi} of ${this.verdicts.length}</span></div>
      <div class="rn">${esc(v.ratio)}</div>
      ${bar('Copperleaf', v.company, cv, '#0072B2')}${bar('Industry average', v.industry, iv, '#999')}
      <div class="rule">Healthy = close to the industry average · Too low / Too high = far below / far above it</div></div>
      <div class="gavels">${['Too low', 'Healthy', 'Too high'].map((g, i) => `<button class="btn ${['orange', 'green', 'verm'][i]} big gv pe" data-g="${g}"><span class="kbd" style="font-size:15px">${i + 1}</span> ${{ 'Too low': '⬇', Healthy: '✔', 'Too high': '⬆' }[g]} ${g}</button>`).join('')}</div>`;
    $$(this.layer, '.gv').forEach((b) => b.addEventListener('click', () => this.verdict(b.dataset.g)));
    this.setPreviewKey(v.correct);
  }
  verdict(g) {
    if (this.frozen || this.mode !== 'verdict' || this.phase !== 'judge') return;
    const v = this.cur; this.phase = 'done'; this.setTimer(null);
    const rt = Math.round(this.time.now - this.born); this.done++; this.setProgress(this.done / this.total);
    const fam = (this.byFam.Verdict ||= { c: 0, n: 0 }); fam.n++;
    $$(this.layer, '.gv').forEach((b) => { b.style.opacity = b.dataset.g === v.correct || b.dataset.g === g ? 1 : 0.4; });
    const prompt = `${v.ratio}: Copperleaf ${v.company} vs industry ${v.industry}`;
    if (g === v.correct) {
      fam.c++; sfx('fanfare'); coinBurst(this, 640, 330);
      this.markCorrect({ item: v, given: g, correct: v.correct, x: 640, y: 150, base: S.config.scoring.verdict_base, fast: rt / 1000 < this.phaseT / 2, label: v.correct + '!', rt });
      this.showNote(v, () => this.nextVerdict());
    } else this.markWrong({ item: v, given: g || 'time up', correctText: v.correct, explanation: v.explanation, rt, prompt, after: () => this.nextVerdict() });
  }
  // after a right verdict, show the teaching point briefly (no heart lost)
  showNote(v, next) {
    const el = document.createElement('div'); el.className = 'vnote pe'; el.innerHTML = `<b>Why:</b> ${esc(v.explanation)}<div style="text-align:right;margin-top:6px"><button class="btn small green">Next ▶</button></div>`;
    this.layer.appendChild(el);
    let done = false; const go = () => { if (done) return; done = true; this.modalKey = null; this.unfreeze('note'); next(); };
    this.freeze('note');
    el.querySelector('button').addEventListener('click', go);
    this.modalKey = (e) => { if (e.key === 'Enter' || e.key === ' ') go(); return true; };
    setTimeout(go, (S.config.explanation_auto_close_s || 12) * 1000);
  }
  currentItem() { return (this.mode === 'shop' && this.phase === 'pick') || (this.mode === 'verdict' && this.phase === 'judge') ? this.cur : null; }
  applyPeek(it) {
    if (this.mode === 'shop') { this.setTheme(`💡 ${esc(it.ratio)} = ${esc(it.formula)}`); return true; }
    this.setTheme('💡 Is Copperleaf’s figure close to the industry average, or far from it?'); return true;
  }
  onKey(e) {
    if (this.mode === 'shop' && this.phase === 'checkout' && /^[1-4]$/.test(e.key)) this.pay(Number(e.key) - 1);
    else if (this.mode === 'shop' && this.phase === 'pick' && e.key === 'Enter' && this.slots.top && this.slots.bottom) this.checkout();
    else if (this.mode === 'verdict' && this.phase === 'judge' && /^[1-3]$/.test(e.key)) this.verdict(['Too low', 'Healthy', 'Too high'][Number(e.key) - 1]);
  }
  tick(g) {
    const timed = (this.mode === 'shop' && (this.phase === 'pick' || this.phase === 'checkout')) || (this.mode === 'verdict' && this.phase === 'judge');
    if (!timed) { this.setTimer(null); return; }
    this.left -= g / this.sf; this.setTimer(this.left, this.phaseT);
    if (this.left > 0) return;
    if (this.mode === 'verdict') this.verdict(null);
    else if (this.phase === 'checkout') this.pay(-1);
    else { // ran out of shopping time
      const r = this.cur; this.phase = 'done'; this.setTimer(null); this.done++; this.setProgress(this.done / this.total);
      (this.byFam[r.subtopic] ||= { c: 0, n: 0 }).n++;
      this.markWrong({ item: r, given: 'time up', correctText: `${r.ratio} = ${r.formula} = ${r.answer}${r.unit === '%' ? '%' : r.unit === 'times' ? ' times' : ''}`, explanation: r.explanation, rt: Math.round(this.time.now - this.born), prompt: `${r.ratio} for Copperleaf Coffee Ltd`, after: () => this.nextRatio() });
    }
  }
  endExtra() { return { themes: this.byFam }; }
  finishLevel(failed) { if (!failed) confetti(this); this.layer.innerHTML = ''; super.finishLevel(failed); }
}
