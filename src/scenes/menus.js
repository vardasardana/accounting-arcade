import Phaser from 'phaser';
import { S, LEVELS, newRun, nameProblem, unlockedLevels, classCode, allRuns, clearRuns, fmtTime } from '../core/state.js';
import { UI, esc, $ } from '../core/ui.js';
import { initAudio, playMusic, sfx, toggleMute } from '../core/audio.js';
import { localBoard, clearLocalBoard, sortBoard, fetchShared, sharedEnabled } from '../core/leaderboard.js';
import { bg, pennyUri, avatarUri, iconUri, fadeTo, fadeIn } from './common.js';
import { openSettings } from './settings.js';
import { POWERUPS } from '../core/state.js';
import { FILES } from '../core/data.js';

const gesture = () => { initAudio(); };

// ---------------- Main menu ----------------
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    UI.clear(); fadeIn(this); bg(this, 'bg_menu'); playMusic('menu');
    const pn = this.add.image(250, 470, 'penny_smile').setScale(1.1);
    if (!S.settings.reducedMotion) this.tweens.add({ targets: pn, y: 450, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.planes = [0, 1, 2].map((i) => this.add.image(-100 - i * 400, 120 + i * 70, 'plane').setScale(0.8 + i * 0.1));
    const who = S.player ? `<div class="bubble left" style="left:390px;top:478px;width:300px">Welcome back, <b>${esc(S.player.role)} ${esc(S.player.name)}</b>! Ready for the audit?</div>` : `<div class="bubble left" style="left:390px;top:478px;width:300px">Hi, I’m <b>Penny</b>! Let’s get your company to its first annual report.</div>`;
    const el = UI.add(`<div class="screen">
      <div class="ribbon title-rib">The Accounting Arcade</div>
      <div class="title-sub">Six levels · one company · your first annual report</div>
      ${who}
      <div class="menu-btns">
        <button class="btn big orange play">▶ Play</button>
        <div class="menu-row"><button class="btn cream practice">Practice</button><button class="btn cream how">How to Play</button><button class="btn cream lb">Leaderboard</button></div>
        <div class="muted" style="background:rgba(255,255,255,.85);padding:2px 12px;border-radius:999px;font-size:16px">Press <span class="kbd">Enter</span> to play</div>
      </div>
      <button class="iconbtn set" aria-label="Settings" style="position:absolute;right:92px;bottom:60px"><img alt="" src="${iconUri('gear', 30)}"></button>
      <button class="iconbtn lock" aria-label="Instructor console" style="position:absolute;right:20px;bottom:60px"><img alt="" src="${iconUri('lock', 30)}"></button>
      <button class="iconbtn mute" aria-label="Mute or unmute" style="position:absolute;right:164px;bottom:60px"><span style="font-size:26px">${S.settings.muted ? '🔇' : '🔊'}</span></button>
      </div>`);
    const go = (k, d) => { gesture(); sfx('click'); fadeTo(this, k, d); };
    $(el, '.play').addEventListener('click', () => go('Name', { next: 'run' }));
    $(el, '.practice').addEventListener('click', () => go('Practice'));
    $(el, '.how').addEventListener('click', () => go('HowTo', { next: 'menu' }));
    $(el, '.lb').addEventListener('click', () => go('Leaderboard', {}));
    $(el, '.set').addEventListener('click', () => { gesture(); openSettings(); });
    $(el, '.lock').addEventListener('click', () => go('Teacher'));
    $(el, '.mute').addEventListener('click', (e) => { gesture(); const m = toggleMute(); e.currentTarget.innerHTML = `<span style="font-size:26px">${m ? '🔇' : '🔊'}</span>`; });
    $(el, '.play').focus();
    this.kh = (e) => { if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && !document.querySelector('.dim')) { e.preventDefault(); go('Name', { next: 'run' }); } };
    window.addEventListener('keydown', this.kh);
    this.events.once('shutdown', () => window.removeEventListener('keydown', this.kh));
    window.addEventListener('pointerdown', gesture, { once: true });
  }
  update(t, d) { this.planes.forEach((p, i) => { p.x += d * (0.06 + i * 0.02); p.y += Math.sin(t / 700 + i) * 0.3; if (p.x > 1400) p.x = -100; }); }
}

// ---------------- Name entry ----------------
export class NameScene extends Phaser.Scene {
  constructor() { super('Name'); }
  create(data) {
    UI.clear(); fadeIn(this); bg(this, 'bg_frame');
    const p = S.player || { name: '', role: 'CFO', avatar: 0, studentId: '' };
    const roles = ['CFO', 'Founder', 'CEO'];
    const el = UI.add(`<div class="panel" style="left:150px;top:40px;width:980px;height:620px">
      <img src="${pennyUri('wink')}" alt="Penny" style="position:absolute;left:30px;bottom:18px;width:110px">
      <h1 class="h1">Who is running the company?</h1>
      <p class="muted" style="margin:4px 0 14px">Only the name you choose is stored, with your scores. No email, no password.</p>
      <div style="display:grid;grid-template-columns:420px 1fr;gap:26px">
        <div>
          <label class="h2" for="nm" style="font-size:22px">Your first name or nickname</label>
          <input id="nm" type="text" maxlength="16" autocomplete="off" value="${esc(p.name)}" placeholder="e.g. Alex">
          <div class="err" id="err"></div>
          ${S.config.student_id_enabled ? `<label class="h2" for="sid" style="font-size:20px">Student ID (optional)</label><input id="sid" type="text" maxlength="20" value="${esc(p.studentId || '')}">` : ''}
          <div class="h2" style="font-size:22px;margin:12px 0 8px">Your role</div>
          <div style="display:flex;gap:10px">${roles.map((r) => `<button class="chip role ${p.role === r ? 'on' : ''}" data-r="${r}">${r}</button>`).join('')}</div>
          <div class="tag" style="margin-top:18px;font-size:18px" id="preview">${esc(p.role)} ${esc(p.name || '…')}</div>
        </div>
        <div><div class="h2" style="font-size:22px;margin-bottom:8px">Choose your avatar</div>
          <div style="display:grid;grid-template-columns:repeat(4,104px);gap:14px;padding:6px">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<button class="av ${p.avatar === i ? 'on' : ''}" style="width:100px;height:100px" data-a="${i}" aria-label="Avatar ${i + 1}"><img alt="" src="${avatarUri(i)}"></button>`).join('')}</div></div>
      </div>
      <div style="position:absolute;right:26px;bottom:24px;display:flex;gap:12px"><button class="btn cream back">Back</button><button class="btn big green go">Let’s go ▶</button></div>
    </div>`);
    let role = p.role, av = p.avatar;
    const nm = $(el, '#nm');
    const upd = () => { $(el, '#preview').textContent = `${role} ${nm.value.trim() || '…'}`; };
    nm.addEventListener('input', () => { $(el, '#err').textContent = ''; upd(); });
    el.querySelectorAll('.role').forEach((b) => b.addEventListener('click', () => { role = b.dataset.r; el.querySelectorAll('.role').forEach((x) => x.classList.toggle('on', x === b)); sfx('click'); upd(); }));
    el.querySelectorAll('.av').forEach((b) => b.addEventListener('click', () => { av = Number(b.dataset.a); el.querySelectorAll('.av').forEach((x) => x.classList.toggle('on', x === b)); sfx('click'); }));
    const go = () => {
      const prob = nameProblem(nm.value); if (prob) { $(el, '#err').textContent = prob; nm.focus(); sfx('bonk'); return; }
      S.player = { name: nm.value.trim().replace(/\s+/g, ' '), role, avatar: av, studentId: $(el, '#sid')?.value.trim() || '' };
      localStorage.setItem('aa_player', JSON.stringify(S.player));
      initAudio(); sfx('kaching');
      if (data?.next === 'run') { newRun('class'); fadeTo(this, 'HowTo', { next: 'run' }); } else fadeTo(this, 'Menu');
    };
    $(el, '.go').addEventListener('click', go);
    $(el, '.back').addEventListener('click', () => fadeTo(this, 'Menu'));
    nm.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    setTimeout(() => nm.focus(), 50);
  }
}

// ---------------- How to play ----------------
export class HowToScene extends Phaser.Scene {
  constructor() { super('HowTo'); }
  create(data) {
    UI.clear(); fadeIn(this); bg(this, 'bg_frame');
    const cards = [
      { t: 'Answer right, earn coins', s: 'Every correct answer earns 10 coins. Answer in the first half of the time for a +5 speed bonus.', a: `<div class="count-up"><img src="${iconUri('coin', 64)}" width="64" alt=""><span class="cu">0</span></div>` },
      { t: 'Build a streak', s: 'Answers in a row multiply your coins: ×1.5 at 3, ×2 at 6, ×3 at 10. A wrong answer costs a heart and shows a short explanation.', a: `<div class="flame-grow" style="display:flex;align-items:center;gap:16px"><img src="${iconUri('flame', 90)}" width="90" alt=""><span class="mult" style="font-size:40px;padding:4px 14px" id="mx">×1.5</span></div>` },
      { t: 'Shop between levels', s: 'Spend coins in Penny’s shop on power-ups. Spending never lowers your rank: the leaderboard uses Total Earned.', a: `<div style="display:flex;gap:16px">${POWERUPS.map((p) => `<div style="text-align:center"><img src="${iconUri(p.icon, 64)}" width="64" alt=""><div style="font-size:14px;font-weight:700">${p.name}</div></div>`).join('')}</div>` },
    ];
    let i = 0;
    const el = UI.add(`<div class="panel how-card" style="left:240px;top:90px;width:800px;height:500px">
      <img src="${pennyUri('smile')}" alt="" style="position:absolute;left:-150px;bottom:-10px;width:140px">
      <div class="muted">How to play · <span class="ix"></span> of 3</div><h1 class="h1 t" style="margin:8px 0"></h1>
      <div class="how-anim"></div><p class="s" style="font-size:22px;line-height:1.4;max-width:620px;margin:10px auto"></p>
      <div class="how-dots"><i></i><i></i><i></i></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px"><button class="btn cream skip">Skip</button><div style="display:flex;gap:10px"><button class="btn cream prev">◀ Back</button><button class="btn green next">Next ▶</button></div></div></div>`);
    let iv;
    const show = () => {
      const c = cards[i]; $(el, '.ix').textContent = i + 1; $(el, '.t').textContent = c.t; $(el, '.s').textContent = c.s; $(el, '.how-anim').innerHTML = c.a;
      el.querySelectorAll('.how-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
      $(el, '.prev').disabled = i === 0; $(el, '.next').textContent = i === 2 ? (data?.next === 'run' ? 'Start Level 1 ▶' : 'Done') : 'Next ▶';
      clearInterval(iv);
      if (i === 0) { let n = 0; iv = setInterval(() => { n = (n + 15) % 300; const e = $(el, '.cu'); if (e) e.textContent = n; }, 200); }
      if (i === 1) { let k = 0; iv = setInterval(() => { k = (k + 1) % 3; const e = $(el, '#mx'); if (e) e.textContent = ['×1.5', '×2', '×3'][k]; }, 1000); }
    };
    const finish = () => { clearInterval(iv); localStorage.setItem('aa_seen_howto', '1'); if (data?.next === 'run') fadeTo(this, 'L1'); else fadeTo(this, 'Menu'); };
    $(el, '.next').addEventListener('click', () => { sfx('click'); if (i < 2) { i++; show(); } else finish(); });
    $(el, '.prev').addEventListener('click', () => { if (i > 0) { i--; show(); } });
    $(el, '.skip').addEventListener('click', finish);
    let sx = null; el.addEventListener('pointerdown', (e) => (sx = e.clientX)); el.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 60) { if (e.clientX < sx && i < 2) i++; else if (e.clientX > sx && i > 0) i--; show(); } sx = null; });
    this.kh = (e) => { if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); $(el, '.next').click(); } if (e.key === 'ArrowLeft') $(el, '.prev').click(); if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', this.kh); this.events.once('shutdown', () => { window.removeEventListener('keydown', this.kh); clearInterval(iv); });
    show(); $(el, '.next').focus();
  }
}

// ---------------- Practice ----------------
export class PracticeScene extends Phaser.Scene {
  constructor() { super('Practice'); }
  create() {
    UI.clear(); fadeIn(this); bg(this, 'bg_frame');
    const un = unlockedLevels();
    const el = UI.add(`<div class="panel" style="left:140px;top:60px;width:1000px;height:590px"><h1 class="h1">Practice one level</h1><p class="muted">Replay any level unlocked on this device. Practice scores do not go on the class leaderboard.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:14px">${LEVELS.map((l) => `<button class="tile pe lvl" data-n="${l.n}" ${un.has(l.n) || S.preview ? '' : 'disabled'} style="cursor:pointer;min-height:150px;${un.has(l.n) || S.preview ? '' : 'opacity:.45'}"><b>${l.n}. ${esc(l.name)}</b><span>${esc(l.topic)}</span><div style="margin-top:6px">${un.has(l.n) || S.preview ? '▶ Play' : '🔒 Locked'}</div></button>`).join('')}</div>
      <div style="position:absolute;right:26px;bottom:24px"><button class="btn cream back">Back</button></div></div>`);
    el.querySelectorAll('.lvl').forEach((b) => b.addEventListener('click', () => {
      if (b.disabled) return; initAudio();
      if (!S.player) S.player = { name: 'Guest', role: 'CFO', avatar: 0 };
      const r = newRun('practice'); r.practiceLevel = Number(b.dataset.n); fadeTo(this, 'L' + b.dataset.n);
    }));
    $(el, '.back').addEventListener('click', () => fadeTo(this, 'Menu'));
  }
}

// ---------------- Leaderboard ----------------
export function boardTable(rows, meId) {
  if (!rows.length) return '<p class="muted" style="text-align:center;margin-top:40px">No scores yet. Be the first!</p>';
  return `<table class="tbl"><tr><th>#</th><th></th><th>Name</th><th>Total Earned</th><th>Stars</th><th>Accuracy</th><th>Speed</th></tr>${rows.slice(0, 20).map((r, i) => `<tr class="${r.run_id && r.run_id === meId ? 'me' : ''}"><td>${r.run_id && r.run_id === meId ? '➤ ' : ''}${i + 1}</td><td><img src="${avatarUri(r.avatar || 0)}" width="34" alt=""></td><td><b>${esc(r.role || '')} ${esc(r.name)}</b></td><td>${Number(r.total).toLocaleString('en-US')}</td><td>${r.stars}/18</td><td>${Math.round(Number(r.accuracy) * 100)}%</td><td>${esc(r.speed || '')}</td></tr>`).join('')}</table>`;
}
export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }
  create(data) {
    UI.clear(); fadeIn(this); bg(this, 'bg_frame'); playMusic('shop');
    const shared = sharedEnabled();
    const el = UI.add(`<div class="panel" style="left:160px;top:24px;width:960px;height:640px">
      <img src="${pennyUri('cheer')}" alt="" style="position:absolute;right:20px;top:10px;width:96px">
      <h1 class="h1">🏆 Leaderboard</h1>
      <div style="display:flex;gap:10px;margin:8px 0 10px">${shared ? `<button class="chip on tab" data-t="class">Class${S.config.section ? ' - ' + esc(S.config.section) : ''}</button>` : ''}<button class="chip ${shared ? '' : 'on'} tab" data-t="local">This device</button></div>
      <div class="scroll body" style="height:450px"></div>
      <div style="position:absolute;right:26px;bottom:20px;display:flex;gap:10px"><button class="btn cream back">Menu</button>${data?.fromResults ? '<button class="btn orange again">Play again</button>' : ''}</div></div>`);
    const body = $(el, '.body');
    const show = async (t) => {
      el.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      if (t === 'local') { body.innerHTML = boardTable(sortBoard(localBoard()), data?.runId); return; }
      body.innerHTML = '<p class="muted" style="text-align:center;margin-top:40px">Loading the class board…</p>';
      const rows = await fetchShared();
      body.innerHTML = rows === null ? '<p class="err" style="text-align:center">Could not reach the class leaderboard (offline?). Showing the scores saved on this device instead.</p>' + boardTable(sortBoard(localBoard()), data?.runId) : boardTable(sortBoard(rows), data?.runId);
    };
    el.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => show(b.dataset.t)));
    show(shared ? 'class' : 'local');
    $(el, '.back').addEventListener('click', () => fadeTo(this, 'Menu'));
    el.querySelector('.again')?.addEventListener('click', () => { newRun('class'); fadeTo(this, 'L1'); });
  }
}

// ---------------- Validation report ----------------
export function reportTable(rep) {
  if (!rep.length) return '<p>✅ All question files loaded with no problems.</p>';
  return `<table class="tbl"><tr><th>File</th><th>Row</th><th>Id</th><th>Problem</th></tr>${rep.map((r) => `<tr><td>${esc(r.file)}</td><td>${esc(r.row)}</td><td>${esc(r.id)}</td><td style="color:${r.severity === 'error' ? '#D55E00' : '#8A6A00'}">${r.severity === 'error' ? '⛔ Skipped: ' : '⚠ Warning: '}${esc(r.reason)}</td></tr>`).join('')}</table>`;
}
export class ValidationScene extends Phaser.Scene {
  constructor() { super('Validation'); }
  create() {
    UI.clear(); bg(this, 'bg_frame');
    const errs = S.report.filter((r) => r.severity === 'error');
    const el = UI.add(`<div class="panel" style="left:120px;top:40px;width:1040px;height:630px" role="alert"><h1 class="h1">Question file check</h1>
      <p>${errs.length} row(s) had problems and were <b>skipped</b>. The game still works with the remaining questions. Fix the rows below in the CSV/JSON file and reload.</p>
      <div class="scroll" style="height:420px">${reportTable(S.report)}</div>
      <div style="position:absolute;right:26px;bottom:20px"><button class="btn green go">Continue to the game ▶</button></div></div>`);
    $(el, '.go').addEventListener('click', () => this.scene.start('Menu'));
  }
}

// ---------------- Instructor console (minimal) ----------------
function csvCell(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function download(name, text, type = 'text/csv') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

export class TeacherScene extends Phaser.Scene {
  constructor() { super('Teacher'); }
  create() {
    UI.clear(); fadeIn(this); bg(this, 'bg_frame');
    const pinEl = UI.add(`<div class="panel" style="left:390px;top:180px;width:500px"><h1 class="h2">🔒 Instructor console</h1><p class="muted">Enter the instructor PIN (set in <code>data/config.json</code>).</p>
      <input type="password" id="pin" inputmode="numeric" maxlength="12" aria-label="PIN"><div class="err" id="perr"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn cream back">Back</button><button class="btn green ok">Open</button></div></div>`);
    const tryPin = () => { if ($(pinEl, '#pin').value === String(S.config.instructor_pin)) { pinEl.remove(); this.console(); } else { $(pinEl, '#perr').textContent = 'That PIN is not right.'; sfx('bonk'); } };
    $(pinEl, '.ok').addEventListener('click', tryPin);
    $(pinEl, '#pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryPin(); });
    $(pinEl, '.back').addEventListener('click', () => fadeTo(this, 'Menu'));
    setTimeout(() => $(pinEl, '#pin').focus(), 50);
  }
  console() {
    const runs = allRuns(), board = sortBoard(localBoard());
    const el = UI.add(`<div class="panel" style="left:40px;top:16px;width:1200px;height:680px">
      <h1 class="h2">Instructor console <span class="tag">Trial</span></h1>
      <div style="display:grid;grid-template-columns:380px 1fr;gap:22px;margin-top:10px;height:580px">
        <div>
          <label class="h2" style="font-size:19px" for="cc">Class code (shared leaderboard)</label>
          <input id="cc" type="text" value="${esc(classCode())}" style="font-size:19px">
          <p class="muted" style="font-size:15px;margin:4px 0 10px">Shared board: ${sharedEnabled() ? `✅ connected (${S.config.defaultSheet ? 'default Google Sheet' : 'your Google Sheet from this link'})` : '⚪ off. Set LEADERBOARD_URL in config.json'}${S.config.section ? ` · section from link: <b>${esc(S.config.section)}</b>` : ''}</p>
          <label class="h2" style="font-size:19px">Lock speed for this device</label>
          <div style="display:flex;gap:6px;margin:6px 0 12px">${['', 'relaxed', 'standard', 'fast'].map((s) => `<button class="chip lock ${((localStorage.getItem('aa_speed_lock') || '') === s) ? 'on' : ''}" data-s="${s}" style="font-size:16px">${s || 'Not locked'}</button>`).join('')}</div>
          <label class="h2" style="font-size:19px">Preview mode (answer key on screen)</label>
          <div style="margin:6px 0 12px"><button class="toggle ${S.preview ? 'on' : ''}" id="pv" role="switch"></button></div>
          <label class="h2" style="font-size:19px">Load a question file (CSV/JSON)</label>
          <select id="fsel" style="font-size:16px;width:100%;margin:6px 0">${Object.values(FILES).map((f) => `<option>${f}</option>`).join('')}</select>
          <input type="file" id="file" accept=".csv,.json,text/csv,application/json" style="font-size:15px">
          <div style="display:flex;gap:8px;margin-top:8px"><button class="btn small cream clearov">Remove loaded files${S.overrides.length ? ` (${S.overrides.length})` : ''}</button></div>
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn small green exp1">Export scores CSV</button><button class="btn small green exp2">Export item log CSV</button><button class="btn small verm clr">Clear local scores</button></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;min-height:0;padding-bottom:58px;box-sizing:border-box">
          <div class="qsrc" style="font-size:15px;background:#fff;border:2px solid var(--navy);border-radius:12px;padding:6px 10px"><b>Questions from:</b> ${esc(S.qsource?.note || 'Built-in question files')}${S.qsource?.tabs?.length ? ` <span class="muted">(${S.qsource.tabs.length} tabs)</span>` : ''} <button class="btn small cream reloadq" style="margin-left:8px;padding:2px 10px;font-size:14px">Reload questions</button></div>
          <div class="h2" style="font-size:20px">Validation report <span class="muted" style="font-size:15px">(${S.report.filter((r) => r.severity === 'error').length} rows skipped, ${S.report.filter((r) => r.severity !== 'error').length} notes)</span></div><div class="scroll" style="height:150px;background:#fff;border:2px solid var(--navy);border-radius:12px;padding:6px">${reportTable(S.report)}</div>
          <div class="h2" style="font-size:20px">Local scores on this device (${board.length} runs)</div><div class="scroll" style="flex:1;background:#fff;border:2px solid var(--navy);border-radius:12px;padding:6px">${boardTable(board)}</div>
        </div></div>
      <div style="position:absolute;right:26px;bottom:16px;display:flex;gap:10px"><button class="btn green mklink">🔗 Make a game link + QR</button><button class="btn cream back">Back to menu</button></div></div>`);
    $(el, '#cc').addEventListener('change', (e) => localStorage.setItem('aa_class_code', e.target.value.trim()));
    el.querySelectorAll('.chip.lock').forEach((b) => b.addEventListener('click', () => { if (b.dataset.s) localStorage.setItem('aa_speed_lock', b.dataset.s); else localStorage.removeItem('aa_speed_lock'); el.querySelectorAll('.chip.lock').forEach((x) => x.classList.toggle('on', x === b)); }));
    $(el, '.reloadq').addEventListener('click', () => location.reload());
    $(el, '.mklink').addEventListener('click', () => window.open('make-link.html', '_blank', 'noopener'));
    $(el, '#pv').addEventListener('click', (e) => { S.preview = !S.preview; e.currentTarget.classList.toggle('on', S.preview); });
    $(el, '#file').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      localStorage.setItem('aa_override_' + $(el, '#fsel').value, await f.text());
      alert('Loaded. The game will now reload and check the file.'); location.reload();
    });
    $(el, '.clearov').addEventListener('click', () => { Object.values(FILES).forEach((f) => localStorage.removeItem('aa_override_' + f)); location.reload(); });
    $(el, '.exp1').addEventListener('click', () => {
      const cols = ['timestamp', 'name', 'role', 'class_code', 'total', 'stars', 'accuracy', 'best_streak', 'time_s', 'speed', 'topic_accuracy'];
      download('accounting_arcade_scores.csv', [cols.join(','), ...board.map((r) => cols.map((c) => csvCell(c === 'topic_accuracy' ? JSON.stringify(r.topics || {}) : r[c])).join(','))].join('\n'));
    });
    $(el, '.exp2').addEventListener('click', () => {
      const cols = ['run_id', 'name', 'class_code', 'id', 'level', 'topic', 'subtopic', 'given', 'correct', 'ok', 'rt_ms', 'hint', 'counted', 'mode'];
      const rows = runs.flatMap((r) => (r.log || []).map((l) => ({ ...l, run_id: r.run_id, name: r.name, class_code: r.class_code })));
      download('accounting_arcade_item_log.csv', [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n'));
    });
    $(el, '.clr').addEventListener('click', () => { if (confirm('Clear all local scores and logs on this device?')) { clearLocalBoard(); clearRuns(); this.scene.restart(); } });
    $(el, '.back').addEventListener('click', () => fadeTo(this, 'Menu'));
  }
}
