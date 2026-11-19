import Phaser from 'phaser';
import { S, LEVELS, POWERUPS, streakMult, starsFor, speedFactor, unlockLevel, fs } from '../core/state.js';
import { UI, esc, $ } from '../core/ui.js';
import { sfx, playMusic, musicTempo } from '../core/audio.js';
import { pennyUri, iconUri, heartsHtml, fadeTo, fadeIn } from '../scenes/common.js';
import { openSettings } from '../scenes/settings.js';

export class LevelBase extends Phaser.Scene {
  constructor(key, n) { super(key); this.n = n; }

  // ---- lifecycle ----
  init(data) {
    this.lv = LEVELS[this.n - 1];
    this.practice = S.run?.mode === 'practice';
    this.st = { correct: 0, attempted: 0, best: 0, coins: 0, fastest: null, extra: {}, wrongs: [], subMiss: {} };
    this.streak = 0; this.timers = []; this.frozenBy = new Set(['intro']);
    this.slowLeft = 0; this.shieldOn = false; this.doubleLeft = 0; this.ended = false; this.peekItem = null;
    const cfg = S.config;
    this.maxHearts = cfg.max_hearts || 4;
    this.hearts = cfg.starting_hearts || 3;
    if (S.run.inventory.heart > 0) { S.run.inventory.heart--; this.hearts = Math.min(this.maxHearts, this.hearts + 1); }
    this.sf = speedFactor(); this._keys = null; this.modalKey = null; this.hud = null; this._pendingTheme = null;
  }
  create() {
    UI.clear();
    fadeIn(this);
    playMusic(this.lv.key);
    this.keyHandler = (e) => this.handleKey(e);
    window.addEventListener('keydown', this.keyHandler);
    this.events.once('shutdown', () => { window.removeEventListener('keydown', this.keyHandler); UI.clear(); musicTempo(1); });
    this.buildWorld();
    this.buildHud();
    this.showIntro();
  }
  get frozen() { return this.frozenBy.size > 0 || this.ended; }
  freeze(tag) { this.frozenBy.add(tag); }
  unfreeze(tag) { this.frozenBy.delete(tag); }

  update(time, delta) {
    const real = Math.min(delta, 100) / 1000;
    if (!this.frozen && this.slowLeft > 0) { this.slowLeft -= real; if (this.slowLeft <= 0) { this.slowLeft = 0; this.refreshTray(); } }
    if (this.frozen) return;
    const g = real * this.sf * (this.slowLeft > 0 ? 0.5 : 1); // game-time step
    for (const t of this.timers.slice()) { t.left -= real; if (t.left <= 0) { this.timers.splice(this.timers.indexOf(t), 1); t.fn(); } }
    this.tick(g, real);
  }
  held() { return (this._keys ||= this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S', false)); }
  wait(sec, fn) { const t = { left: sec, fn }; this.timers.push(t); return t; }
  // reading/answer time scaled by speed setting: longer when Relaxed
  T(sec) { return sec / this.sf; }

  // ---- to be implemented by levels ----
  buildWorld() {} begin() {} tick() {} applyPeek() { return false; } currentItem() { return null; }
  introLines() { return []; } introRule() { return ''; } onKey() {}

  // ---- HUD ----
  buildHud() {
    const tray = POWERUPS.filter((p) => p.key !== 'heart').map((p, i) => `<button class="pu" data-pu="${p.key}" aria-label="${p.name} (${p.hotkey})" title="${p.name}: ${p.desc}"><img alt="" src="${iconUri(p.icon, 48)}"><span class="n">0</span><span class="k">⇧${i + 1}</span></button>`).join('');
    this.hud = UI.add(`
      <div class="ring-active"></div>
      <div class="box hud-tl"><div class="lv">${this.n}. ${esc(this.lv.name)}</div><div class="dots"></div></div>
      <div class="box hud-tc"></div>
      <div class="box hud-tr"><div class="coins"><img alt="" src="${iconUri('coin', 30)}" width="30"><div><span class="w">0</span><small>Total <span class="t">0</span></small></div></div>
        <div class="streak" title="Streak"><img class="fl" alt="" src="${iconUri('flame', 30)}" width="30"><span class="sc">0</span><span class="mult">×1</span></div>
        <button class="iconbtn mute pe" aria-label="Mute or unmute" style="width:44px;height:44px"><span style="font-size:22px">${S.settings.muted ? '🔇' : '🔊'}</span></button></div>
      <div class="box hud-hearts" aria-label="Hearts"></div>
      <div class="box hud-bl">${tray}</div>
      <div class="box hud-bc"><div class="bar"><i></i></div></div>
      <div class="box hud-br"><div class="timer"><svg width="56" height="56"><circle cx="28" cy="28" r="23" stroke="#E2D6BF" stroke-width="7" fill="none"/><circle class="arc" cx="28" cy="28" r="23" stroke="#E69F00" stroke-width="7" fill="none" stroke-dasharray="144.5" stroke-dashoffset="0" stroke-linecap="round"/></svg><span>0</span></div>
        <button class="iconbtn pausebtn" aria-label="Pause (Esc or P)"><svg width="26" height="26"><rect x="4" y="3" width="6" height="20" rx="2" fill="#1F3A5F"/><rect x="16" y="3" width="6" height="20" rx="2" fill="#1F3A5F"/></svg></button></div>
      ${S.preview ? '<div class="preview-key" id="pkey"></div>' : ''}`, 'hud');
    this.hud.querySelectorAll('.pu').forEach((b) => b.addEventListener('click', () => this.usePowerUp(b.dataset.pu)));
    $(this.hud, '.pausebtn').addEventListener('click', () => this.pause());
    $(this.hud, '.mute').addEventListener('click', (e) => { import('../core/audio.js').then((a) => { const m = a.toggleMute(); e.currentTarget.innerHTML = `<span style="font-size:22px">${m ? '🔇' : '🔊'}</span>`; }); });
    this.refreshHud();
    if (this._pendingTheme) this.setTheme(this._pendingTheme);
  }
  setPreviewKey(text) { const k = document.getElementById('pkey'); if (k) k.textContent = 'Answer key: ' + text; }
  setStageDots(cur, total, label) {
    let d = ''; for (let i = 1; i <= total; i++) d += `<span class="dot ${i < cur ? 'done' : i === cur ? 'cur' : ''}"></span>`;
    $(this.hud, '.dots').innerHTML = `${esc(label)} ${d}`;
  }
  setTheme(html) { if (!this.hud) { this._pendingTheme = html; return; } $(this.hud, '.hud-tc').innerHTML = html || ''; }
  setProgress(f) { $(this.hud, '.bar i').style.width = Math.round(Math.min(1, f) * 100) + '%'; }
  setTimer(left, total) {
    const t = $(this.hud, '.timer');
    if (left === null || left === undefined) { t.classList.remove('show'); return; }
    t.classList.add('show');
    t.querySelector('span').textContent = Math.max(0, Math.ceil(left));
    t.querySelector('.arc').setAttribute('stroke-dashoffset', String(144.5 * (1 - Math.max(0, left) / total)));
    t.querySelector('.arc').setAttribute('stroke', left < 5 ? '#D55E00' : '#E69F00');
  }
  refreshHud() {
    if (!this.hud) return;
    $(this.hud, '.w').textContent = S.run.wallet; $(this.hud, '.t').textContent = S.run.total;
    $(this.hud, '.sc').textContent = this.streak;
    const m = streakMult(this.streak); $(this.hud, '.mult').textContent = '×' + m;
    const col = this.streak >= 10 ? '#FFFFFF' : this.streak >= 6 ? '#F0E442' : '#E69F00';
    $(this.hud, '.fl').src = iconUri('flame', 30, col);
    $(this.hud, '.hud-hearts').innerHTML = heartsHtml(this.hearts, Math.max(3, this.hearts, this.maxHeartsShown || 3));
    this.refreshTray();
  }
  refreshTray() {
    if (!this.hud) return;
    this.hud.querySelectorAll('.pu').forEach((b) => {
      const k = b.dataset.pu, n = S.run.inventory[k];
      b.querySelector('.n').textContent = n; b.disabled = n <= 0;
      b.classList.toggle('active', (k === 'slow' && this.slowLeft > 0) || (k === 'shield' && this.shieldOn) || (k === 'double' && this.doubleLeft > 0));
    });
    $(this.hud, '.ring-active').classList.toggle('on', this.slowLeft > 0 || this.shieldOn || this.doubleLeft > 0);
  }
  floatText(x, y, text, cls = '') {
    const d = document.createElement('div'); d.className = 'float ' + cls; d.style.left = x + 'px'; d.style.top = y + 'px'; d.textContent = text;
    UI.root.appendChild(d); setTimeout(() => d.remove(), 1500);
  }
  callout(text) { const d = document.createElement('div'); d.className = 'callout'; d.textContent = text; UI.root.appendChild(d); setTimeout(() => d.remove(), 1300); }

  // ---- power-ups ----
  usePowerUp(k) {
    if (this.frozen || S.run.inventory[k] <= 0) return;
    if (k === 'peek') { const it = this.currentItem(); if (!it || this.peekItem === it.id) return; if (!this.applyPeek(it)) return; this.peekItem = it.id; }
    else if (k === 'slow') { if (this.slowLeft > 0) return; this.slowLeft = S.config.shop.slow_seconds || 10; }
    else if (k === 'shield') { if (this.shieldOn) return; this.shieldOn = true; }
    else if (k === 'double') { if (this.doubleLeft > 0) return; this.doubleLeft = S.config.shop.double_count || 5; }
    S.run.inventory[k]--; sfx('shimmer'); this.refreshTray();
    UI.announce(POWERUPS.find((p) => p.key === k).name + ' activated');
  }

  // ---- keys ----
  handleKey(e) {
    if (this.modalKey && this.modalKey(e)) { e.preventDefault(); return; }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (!this.frozenBy.has('intro')) { e.preventDefault(); this.pause(); } return; }
    if (e.shiftKey && /Digit[1-4]/.test(e.code)) { e.preventDefault(); this.usePowerUp(['peek', 'slow', 'shield', 'double'][Number(e.code.slice(-1)) - 1]); return; }
    if (this.frozen) return;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace', 'Enter'].includes(e.key)) e.preventDefault();
    this.onKey(e);
  }

  // ---- scoring ----
  log(item, given, ok, extra = {}) {
    S.run.log.push({ id: item.id, level: this.n, topic: item.topic || this.lv.topic, subtopic: item.subtopic || '', given: String(given ?? ''), correct: String(extra.correct ?? ''), ok, rt_ms: extra.rt ?? '', hint: this.peekItem === item.id, counted: extra.counted !== false, mode: S.run.mode });
  }
  markCorrect({ item, given, correct, x = 640, y = 360, base, fast = false, trap = false, label = '', rt }) {
    const sc = S.config.scoring;
    this.streak++; this.st.best = Math.max(this.st.best, this.streak); S.run.bestStreak = Math.max(S.run.bestStreak, this.streak);
    let mult = streakMult(this.streak);
    if (this.doubleLeft > 0) { mult *= 2; this.doubleLeft--; }
    mult = Math.min(mult, sc.multiplier_cap || 4);
    const pre = (base ?? sc.base) + (fast ? sc.speed_bonus : 0) + (trap ? sc.trap_bonus : 0);
    const coins = Math.ceil(pre * mult * (S.config.levels?.[String(this.n)]?.coin_scale ?? 1));
    this.addCoins(coins);
    this.st.correct++; this.st.attempted++;
    if (rt !== undefined && (this.st.fastest === null || rt < this.st.fastest)) this.st.fastest = rt;
    this.log(item, given, true, { correct, rt });
    this.floatText(x, y, '+' + coins + (fast ? ' ⚡' : ''));
    if (label) setTimeout(() => this.floatText(x, y + 44, label, 'lbl'), 60);
    if (trap) setTimeout(() => this.floatText(x, y - 50, '+5 Smart dodge', ''), 200);
    sfx('ching');
    if ([3, 6, 10].includes(this.streak)) { this.callout({ 3: 'Nice!', 6: 'On fire!', 10: 'Legend!' }[this.streak]); sfx('arp'); this.hud.querySelector('.mult').classList.add('pulse'); setTimeout(() => this.hud.querySelector('.mult')?.classList.remove('pulse'), 1300); }
    UI.announce('Correct. ' + (label || ''));
    this.refreshHud();
    return coins;
  }
  markLetFall({ item, x = 640, y = 600 }) {
    const c = S.config.scoring.let_fall_stage_a || 2;
    this.addCoins(c); this.log(item, 'let fall', true, { counted: false, correct: 'let fall' });
    this.floatText(x, y, '+' + c); this.refreshHud();
  }
  addCoins(c) { const cap = S.config.wallet_cap || 0; S.run.wallet = cap ? Math.min(cap, S.run.wallet + c) : S.run.wallet + c; S.run.total += c; this.st.coins += c; }
  /** wrong answer: logs, costs a heart (unless shield), then shows the explanation; calls after() when play resumes */
  markWrong({ item, given, correctText, explanation, rt, after, prompt }) {
    this.st.attempted++;
    this.log(item, given, false, { correct: correctText, rt });
    this.st.wrongs.push({ prompt: prompt || item.prompt || item.text || item.item || item.ratio, given, correct: correctText, why: explanation || item.explanation });
    const sk = item.subtopic || this.lv.topic; this.st.subMiss[sk] = (this.st.subMiss[sk] || 0) + 1;
    let shielded = false;
    if (this.shieldOn) { this.shieldOn = false; shielded = true; }
    else { this.hearts--; this.streak = 0; const pen = S.config.wrong_answer_penalty || 0; if (pen) S.run.wallet = Math.max(0, S.run.wallet - pen); }
    sfx('bonk');
    if (!S.settings.reducedMotion) this.cameras.main.shake(180, 0.004);
    this.refreshHud();
    this.showExplain({ prompt: prompt || item.prompt || item.text || item.item, correctText, explanation: explanation || item.explanation, shielded }, () => {
      if (this.hearts <= 0) { this.finishLevel(true); return; }
      after && after();
    });
  }
  showExplain({ prompt, correctText, explanation, shielded }, done) {
    this.freeze('explain');
    const auto = S.config.explanation_auto_close_s ?? 12;
    const el = UI.add(`<div class="dim"></div><div class="explain" role="dialog" aria-label="Explanation">
      <div class="rib">Not quite${shielded ? ' – Shield saved your heart!' : ''}</div>
      <img class="pn" alt="Penny" src="${pennyUri('eyebrow')}">
      <div class="item">${esc(prompt || '')}</div>
      <div class="ans">✔ ${esc(correctText)}</div>
      <div class="why">${esc(explanation || '')}</div>
      <div class="foot"><span>Tap, <span class="kbd">Space</span> or <span class="kbd">Enter</span> to continue</span><span class="cd"></span><button class="btn small green go">Got it</button></div></div>`, 'screen');
    UI.announce('Not quite. Correct answer: ' + correctText + '. ' + (explanation || ''));
    let left = auto, closed = false;
    const iv = auto > 0 ? setInterval(() => { left--; const c = el.querySelector('.cd'); if (c) c.textContent = `Continues in ${left}s`; if (left <= 0) close(); }, 1000) : null;
    if (auto > 0) el.querySelector('.cd').textContent = `Continues in ${left}s`;
    const close = () => {
      if (closed) return; closed = true; if (iv) clearInterval(iv); el.remove(); this.modalKey = null;
      if (this.hearts <= 0) { this.unfreeze('explain'); done(); return; }
      const cd = UI.add('<div class="count3">1</div>', 'noclick');
      setTimeout(() => { cd.remove(); this.unfreeze('explain'); done(); }, 900);
    };
    el.querySelector('.go').addEventListener('click', close);
    el.querySelector('.dim').addEventListener('click', close);
    setTimeout(() => { this.modalKey = (e) => { if (e.key === ' ' || e.key === 'Enter') { close(); return true; } return true; }; }, 350);
  }

  // ---- banners / intro / pause ----
  banner(title, sub, sec, cb, tag = 'banner') {
    this.freeze(tag);
    const el = UI.add(`<div class="banner pe" role="status"><div class="t">${esc(title)}</div>${sub ? `<div class="s">${sub}</div>` : ''}<div class="s" style="opacity:.75;font-size:15px;margin-top:8px">Tap or press Space to start now</div></div>`, '');
    UI.announce(title + '. ' + (sub || '').replace(/<[^>]+>/g, ''));
    let done = false;
    const fin = () => { if (done) return; done = true; el.remove(); this.modalKey = null; this.unfreeze(tag); cb && cb(); };
    el.addEventListener('click', fin);
    setTimeout(() => { if (!done) this.modalKey = (e) => { if (e.key === ' ' || e.key === 'Enter') { fin(); } return true; }; }, 400);
    setTimeout(fin, sec * 1000 / Math.min(1, this.sf));
  }
  showIntro() {
    const lines = this.introLines().map((l) => `<li>${l}</li>`).join('');
    const rule = this.introRule();
    const el = UI.add(`<div class="dim"></div><div class="panel intro" role="dialog">
      <img class="pn" alt="Penny" src="${pennyUri('wink')}">
      <div class="num">Level ${this.n} of 6 · ${esc(this.lv.place)}</div>
      <h1 class="h1">${esc(this.lv.name)}</h1>
      <div class="muted" style="font-size:20px;margin-top:4px">${esc(this.lv.topic)}: ${esc(this.lv.goal)}</div>
      <ul>${lines}</ul>${rule ? `<div class="rule">${rule}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
        <span class="muted">Power-ups: <span class="kbd">Shift</span>+<span class="kbd">1</span>–<span class="kbd">4</span> · Pause: <span class="kbd">Esc</span></span>
        <button class="btn big green start">Start ▶</button></div></div>`, 'screen');
    const go = () => { el.remove(); this.modalKey = null; this.unfreeze('intro'); this.begin(); };
    el.querySelector('.start').addEventListener('click', go);
    el.querySelector('.start').focus();
    this.modalKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { go(); } return true; };
  }
  pause() {
    if (this.frozenBy.has('pause') || this.ended) return;
    this.freeze('pause');
    const el = UI.add(`<div class="frost"></div><div class="panel" style="left:390px;top:150px;width:500px;text-align:center">
      <h2 class="h1" style="margin-bottom:16px">Paused</h2>
      <div style="display:flex;flex-direction:column;gap:12px;align-items:stretch">
        <button class="btn green big resume">Resume</button>
        <button class="btn cream how">How to play this level</button>
        <button class="btn cream set">Settings</button>
        <button class="btn verm quit">Quit to menu</button></div></div>`, 'screen');
    const resume = () => { el.remove(); this.modalKey = null; this.unfreeze('pause'); };
    el.querySelector('.resume').addEventListener('click', resume);
    el.querySelector('.how').addEventListener('click', () => {
      const h = UI.add(`<div class="dim"></div><div class="panel" style="left:240px;top:120px;width:800px"><h2 class="h2">${esc(this.lv.name)}: how to play</h2><ul style="font-size:19px;line-height:1.5">${this.introLines().map((l) => `<li>${l}</li>`).join('')}</ul>${this.introRule() ? `<p>${this.introRule()}</p>` : ''}<button class="btn green">Back</button></div>`, 'screen');
      h.querySelector('button').addEventListener('click', () => h.remove());
    });
    el.querySelector('.set').addEventListener('click', () => openSettings(() => { this.sf = speedFactor(); this.refreshHud(); }));
    el.querySelector('.quit').addEventListener('click', () => {
      if (!confirm('Quit to the main menu? Progress in this run will be lost.')) return;
      this.ended = true; fadeTo(this, 'Menu');
    });
    this.modalKey = (e) => { if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') resume(); return true; };
  }

  // ---- end ----
  pennyTip() {
    const worst = Object.entries(this.st.subMiss).sort((a, b) => b[1] - a[1])[0];
    return worst ? (this.tips?.[worst[0]] || `Remember to revisit “${worst[0]}”.`) : 'Clean sheet! Every answer was right first time.';
  }
  finishLevel(failed = false) {
    if (this.ended) return; this.ended = true;
    this.setTimer(null);
    const sc = S.config.scoring;
    const acc = this.st.attempted ? this.st.correct / this.st.attempted : 0;
    const stars = starsFor(failed, acc);
    let bonus = 0;
    if (!failed) bonus += sc.level_complete; bonus += stars * sc.per_star;
    this.addCoins(bonus);
    const res = { n: this.n, failed, stars, acc, correct: this.st.correct, attempted: this.st.attempted, best: this.st.best, coins: this.st.coins, bonus, wrongs: this.st.wrongs, tip: this.pennyTip(), extra: this.endExtra ? this.endExtra() : {}, fastest: this.st.fastest };
    S.run.levels[this.n] = res;
    unlockLevel(this.n); if (this.n < 6) unlockLevel(this.n + 1);
    sfx(failed ? 'horn' : 'kaching');
    const msg = failed ? 'Office closed for today!' : (this.endLine || 'Level complete!');
    const el = UI.add(`<div class="banner"><div class="t">${esc(msg)}</div><div class="s">${failed ? 'Out of hearts. Your coins are safe, and you move on with the class.' : 'Counting your coins…'}</div></div><img alt="" src="${pennyUri(failed ? 'eyebrow' : 'cheer')}" style="position:absolute;left:150px;top:300px;width:170px">`, 'noclick');
    UI.announce(msg);
    setTimeout(() => { el.remove(); fadeTo(this, 'LevelEnd', res); }, 2200);
  }
  goNextScreen() {}
}
