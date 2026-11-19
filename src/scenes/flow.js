import Phaser from 'phaser';
import { S, LEVELS, POWERUPS, summarise, saveRunRecord, classCode, fmtTime, fmtMoney, newRun } from '../core/state.js';
import { UI, esc, $ } from '../core/ui.js';
import { sfx, playMusic } from '../core/audio.js';
import { addLocal, submitShared, sharedEnabled } from '../core/leaderboard.js';
import { TOPICS } from '../core/data.js';
import { bg, pennyUri, avatarUri, iconUri, fadeTo, fadeIn } from './common.js';
import { glassJar } from '../art/scenes.js';
import { uri } from '../art/svg.js';

const starRow = (n, size = 70) => [0, 1, 2].map((i) => `<img alt="" data-on="${i < n}" src="${iconUri('star', size, i < n)}" style="width:${size}px;height:${size}px">`).join('');

function mistakesModal(wrongs, onClose) {
  const el = UI.add(`<div class="dim"></div><div class="panel" role="dialog" style="left:160px;top:40px;width:960px;height:630px;z-index:60">
    <h1 class="h2">Review my mistakes</h1>
    <div class="scroll" style="height:480px">${wrongs.length ? wrongs.map((w) => `<div style="border-bottom:2px dashed #C9B99A;padding:8px 0"><div><b>${esc(w.prompt)}</b></div>
      ${w.given ? `<div style="color:#D55E00">✘ You chose: ${esc(w.given)}</div>` : ''}<div style="color:#007A5A">✔ ${esc(w.correct)}</div><div class="muted" style="font-size:16px">${esc(w.why || '')}</div></div>`).join('') : '<p>No mistakes. Brilliant!</p>'}</div>
    <div style="position:absolute;right:26px;bottom:20px"><button class="btn green close">Close</button></div></div>`, 'screen');
  const close = () => { el.remove(); onClose && onClose(); };
  $(el, '.close').addEventListener('click', close); $(el, '.close').focus();
}

function extraTile(res) {
  const x = res.extra || {};
  switch (res.n) {
    case 1: return { b: (x.mastered || []).length, s: 'Concepts mastered' + ((x.mastered || []).length ? ': ' + x.mastered.slice(0, 3).join(', ') + (x.mastered.length > 3 ? '…' : '') : '') };
    case 2: return { b: x.perfect ? 'Perfect!' : 'Balanced', s: x.equation || '' };
    case 3: return { b: res.fastest ? (res.fastest / 1000).toFixed(1) + 's' : '–', s: 'Fastest correct crate' };
    case 4: { const r = x.receipt || []; const np = r.find((l) => /net profit/i.test(l.label)); return { b: np ? np.amount : r.length + ' lines', s: np ? 'Net profit on your receipt' : 'Income Statement lines built' }; }
    case 5: return { b: `${x.cfo || 0}/${x.cfi || 0}/${x.cff || 0}`, s: `Operating / Investing / Financing caught · ${x.traps || 0} traps avoided` };
    case 6: { const t = x.themes || {}; const k = Object.keys(t); return { b: k.length ? k.filter((q) => t[q].c === t[q].n).length + '/' + k.length : '–', s: 'Ratio families all correct' }; }
    default: return { b: '', s: '' };
  }
}

// ---------------- Level end ----------------
export class LevelEndScene extends Phaser.Scene {
  constructor() { super('LevelEnd'); }
  create(res) {
    UI.clear(); fadeIn(this); bg(this, 'bg_frame'); playMusic('shop');
    const lv = LEVELS[res.n - 1], practice = S.run.mode === 'practice', last = res.n === 6;
    const ex = extraTile(res);
    const nextLabel = practice ? 'Back to practice' : last ? 'Final results ▶' : 'To the shop ▶';
    const el = UI.add(`<div class="panel" style="left:120px;top:24px;width:1040px;height:668px">
      <div class="ribbon" style="position:relative;left:auto;top:auto;transform:none;display:table;margin:-6px auto 4px;font-size:30px">${res.failed ? 'Office closed' : 'Level complete'} · ${esc(lv.name)}</div>
      <div class="stars" style="margin:6px 0">${starRow(res.stars)}</div>
      <div class="tiles" style="margin-top:12px">
        <div class="tile"><b class="cu" data-to="${res.coins}">0</b><span>Coins earned (incl. +${res.bonus} bonus)</span></div>
        <div class="tile"><b>${Math.round(res.acc * 100)}%</b><span>Accuracy (${res.correct}/${res.attempted})</span></div>
        <div class="tile"><b>${res.best}</b><span>Best streak</span></div>
        <div class="tile"><b style="font-size:${String(ex.b).length > 8 ? 22 : 34}px">${esc(ex.b)}</b><span>${esc(ex.s)}</span></div>
      </div>
      <div style="display:flex;gap:18px;align-items:center;margin-top:20px">
        <img src="${pennyUri(res.failed ? 'eyebrow' : 'cheer')}" alt="Penny" style="width:130px">
        <div class="bubble left" style="position:relative;flex:1;font-size:20px"><b>Penny’s tip:</b> ${esc(res.tip)}</div></div>
      <div style="position:absolute;left:30px;right:30px;bottom:22px;display:flex;justify-content:space-between">
        <button class="btn cream rev">Review my mistakes (${res.wrongs.length})</button>
        <button class="btn big orange next">${nextLabel}</button></div></div>`);
    // star + count-up animation
    el.querySelectorAll('.stars img').forEach((im, i) => setTimeout(() => { im.classList.add('in'); if (im.dataset.on === 'true') sfx('ding'); }, 300 + i * 350));
    const cu = $(el, '.cu'), to = res.coins; const t0 = performance.now();
    const tick = () => { const p = Math.min(1, (performance.now() - t0) / 1200); cu.textContent = Math.round(to * p); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    $(el, '.rev').addEventListener('click', () => mistakesModal(res.wrongs));
    const next = () => {
      sfx('click');
      if (practice) { S.run.end = Date.now(); fadeTo(this, 'Practice'); }
      else if (last) fadeTo(this, 'Results');
      else fadeTo(this, 'Shop', { next: res.n + 1 });
    };
    $(el, '.next').addEventListener('click', next);
    $(el, '.next').focus();
  }
}

// ---------------- Shop ----------------
const RECOMMEND = { 2: 'peek', 3: 'slow', 4: 'shield', 5: 'slow', 6: 'double' };
export class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }
  create(data) {
    UI.clear(); fadeIn(this); bg(this, 'bg_shop'); playMusic('shop');
    const next = data.next, lv = LEVELS[next - 1], price = S.config.shop, max = price.max_each || 2;
    const bought = {};
    const jarUri = uri(glassJar());
    const el = UI.add(`<div class="screen">
      <div class="ribbon" style="position:absolute;left:50%;top:14px;transform:translateX(-50%)">Penny’s Power-up Shop</div>
      <div class="hud" style="position:absolute;right:20px;top:16px"><div class="box"><img alt="" src="${iconUri('coin', 30)}"><b class="wallet"></b></div></div>
      <img src="${pennyUri('smile')}" alt="Penny" style="position:absolute;left:30px;top:250px;width:150px">
      <div class="bubble left" style="left:190px;top:240px;width:250px;font-size:18px">Next up: <b>Level ${next}, ${esc(lv.name)}</b>. ${esc(lv.goal)}</div>
      ${POWERUPS.map((p, i) => `<div class="shopjar" data-k="${p.key}" role="button" tabindex="0" aria-label="Buy ${p.name}" style="left:${470 + (i % 3) * 260}px;top:${i < 3 ? 110 : 390}px">
        ${RECOMMEND[next] === p.key ? '<div class="sticker">Recommended</div>' : ''}
        <div class="jarimg"><img class="j" alt="" src="${jarUri}"><img class="i" alt="" src="${iconUri(p.icon, 64)}"></div>
        <div style="font-family:var(--hd);font-weight:700;color:var(--navy);font-size:19px;background:rgba(255,255,255,.85);border-radius:8px">${p.name}</div>
        <div class="owned" style="background:rgba(255,255,255,.85);border-radius:8px;padding:2px 4px">${esc(p.desc)}</div>
        <div style="margin-top:4px"><span class="price"><img alt="" src="${iconUri('coin', 18)}" width="18">${price[p.key]}</span> <span class="owned own" style="background:#fff;border-radius:8px;padding:0 6px"></span></div></div>`).join('')}
      <div style="position:absolute;left:30px;bottom:20px" class="muted"><span style="background:rgba(255,255,255,.9);padding:4px 10px;border-radius:10px">Buy up to ${max} of each. Keys <span class="kbd">1</span>–<span class="kbd">5</span> buy, <span class="kbd">Enter</span> continues.</span></div>
      <button class="btn big green go" style="position:absolute;left:30px;bottom:70px">Continue to Level ${next} ▶</button></div>`);
    const refresh = () => {
      $(el, '.wallet').textContent = S.run.wallet;
      el.querySelectorAll('.shopjar').forEach((j) => {
        const k = j.dataset.k, can = S.run.wallet >= price[k] && (bought[k] || 0) < max;
        j.style.opacity = can ? 1 : 0.6; $(j, '.own').textContent = `You have ${S.run.inventory[k]}`;
      });
    };
    const buy = (k, j) => {
      if ((bought[k] || 0) >= max) { sfx('bonk'); UI.announce('You can buy at most ' + max); return; }
      if (S.run.wallet < price[k]) { sfx('bonk'); j.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 250); UI.announce('Not enough coins'); return; }
      S.run.wallet -= price[k]; S.run.inventory[k]++; bought[k] = (bought[k] || 0) + 1; sfx('kaching');
      UI.announce('Bought ' + k); refresh();
    };
    el.querySelectorAll('.shopjar').forEach((j) => { j.addEventListener('click', () => buy(j.dataset.k, j)); j.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); buy(j.dataset.k, j); } }); });
    const go = () => { sfx('click'); fadeTo(this, 'L' + next); };
    $(el, '.go').addEventListener('click', go);
    this.kh = (e) => { const n = Number(e.key); if (n >= 1 && n <= 5) { const j = el.querySelectorAll('.shopjar')[n - 1]; buy(j.dataset.k, j); } if (e.key === 'Enter' && document.activeElement?.classList.contains('shopjar') === false) go(); };
    window.addEventListener('keydown', this.kh); this.events.once('shutdown', () => window.removeEventListener('keydown', this.kh));
    refresh(); $(el, '.go').focus();
    const lim = S.config.shop_timer_s; if (lim > 0) this.time.delayedCall(lim * 1000, go);
  }
}

// ---------------- Results ----------------
function medalFor(acc, stars) { if (acc >= 0.9 && stars >= 15) return ['Gold Auditor', '#E69F00']; if (acc >= 0.75) return ['Silver Analyst', '#B8C2CC']; return ['Bronze Bookkeeper', '#C77B3B']; }

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }
  create() {
    UI.clear(); fadeIn(this); bg(this, 'bg_frame'); playMusic('menu');
    const run = S.run; run.end = run.end || Date.now();
    const sm = summarise(run); const p = S.player || { name: 'Guest', role: 'CFO', avatar: 0 };
    const [medal, mcol] = medalFor(sm.acc, sm.stars);
    const topics = {}; Object.entries(sm.byTopic).forEach(([t, v]) => (topics[t] = Math.round((v.c / v.n) * 100) / 100));
    if (!run.saved) {
      run.saved = true; run.run_id = run.run_id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const entry = { run_id: run.run_id, timestamp: new Date().toISOString(), name: p.name, role: p.role, avatar: p.avatar, class_code: classCode(), total: run.total, stars: sm.stars, accuracy: Math.round(sm.acc * 1000) / 1000, best_streak: run.bestStreak, time_s: sm.time, speed: run.speed, topics };
      if (S.config.student_id_enabled && p.studentId) entry.student_id = p.studentId;
      addLocal(entry);
      saveRunRecord({ run_id: run.run_id, name: p.name, class_code: classCode(), log: run.log, total: run.total, timestamp: entry.timestamp });
      if (run.mode === 'class' && sharedEnabled()) submitShared(entry).then((r) => { const s = document.querySelector('.shared-status'); if (s) s.textContent = r.ok ? '✅ Saved to the class leaderboard' : '⚠ Could not reach the class leaderboard (saved on this device)'; });
    }
    this.sm = sm;
    const el = UI.add(`<div class="panel" style="left:40px;top:14px;width:1200px;height:692px">
      <div style="display:flex;align-items:center;gap:16px">
        <img src="${avatarUri(p.avatar || 0)}" alt="" style="width:80px">
        <div><h1 class="h1" style="margin:0">${esc(p.role)} ${esc(p.name)}, here is your annual report!</h1>
        <div class="muted">Copperleaf Coffee Ltd · ${esc(run.speed)} speed · <span class="shared-status">${run.mode === 'class' && sharedEnabled() ? 'Saving to the class leaderboard…' : 'Saved on this device'}</span></div></div>
        <div class="medal" style="margin-left:auto;background:${mcol}">🏅 ${medal}</div></div>
      <div class="tiles" style="grid-template-columns:repeat(5,1fr);margin-top:12px">
        <div class="tile"><b>${run.total.toLocaleString('en-US')}</b><span>Total Earned</span></div>
        <div class="tile"><b>${sm.stars}/18</b><span>Stars</span></div>
        <div class="tile"><b>${Math.round(sm.acc * 100)}%</b><span>Accuracy (${sm.correct}/${sm.attempted})</span></div>
        <div class="tile"><b>${run.bestStreak}</b><span>Best streak</span></div>
        <div class="tile"><b>${fmtTime(sm.time)}</b><span>Time</span></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:12px">
        <div><div class="h2" style="font-size:20px">Accuracy by topic</div>
          ${LEVELS.map((l) => { const t = sm.byTopic[TOPICS[l.n]] || sm.byTopic[l.topic]; const pc = t ? Math.round((t.c / t.n) * 100) : null; const lr = run.levels[l.n];
            return `<div class="topicbar" style="grid-template-columns:230px 1fr 110px"><span>${l.n}. ${esc(l.name)}</span><div class="bar"><i style="width:${pc ?? 0}%"></i></div><span>${pc === null ? '–' : pc + '%'} ${lr ? '★'.repeat(lr.stars) + '☆'.repeat(3 - lr.stars) : ''}</span></div>`; }).join('')}</div>
        <div><div class="h2" style="font-size:20px">Revise these</div>
          ${sm.revise.length ? sm.revise.map((r) => `<div style="background:#fff;border:2px solid var(--navy);border-radius:12px;padding:6px 10px;margin:6px 0"><b>${esc(r.sub || r.topic)}</b><div class="muted" style="font-size:15px">${esc(r.topic)} · ${r.c}/${r.n} right</div></div>`).join('') : '<p>Nothing to revise. Superb work!</p>'}</div></div>
      <div style="position:absolute;left:30px;right:30px;bottom:18px;display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn cream mis">Review all mistakes</button><button class="btn cream png">Download summary (PNG)</button>
        <button class="btn cream lb">Leaderboard</button><button class="btn cream prac">Practise a level</button><button class="btn orange again">Play again</button></div></div>`);
    sfx('fanfare');
    $(el, '.mis').addEventListener('click', () => mistakesModal(Object.values(run.levels).flatMap((l) => l.wrongs || [])));
    $(el, '.png').addEventListener('click', () => this.downloadPng(p, sm, medal));
    $(el, '.lb').addEventListener('click', () => fadeTo(this, 'Leaderboard', { fromResults: true, runId: run.run_id }));
    $(el, '.prac').addEventListener('click', () => fadeTo(this, 'Practice'));
    $(el, '.again').addEventListener('click', () => { newRun('class'); fadeTo(this, 'L1'); });
    $(el, '.again').focus();
  }
  downloadPng(p, sm, medal) {
    const c = document.createElement('canvas'); c.width = 1000; c.height = 640; const g = c.getContext('2d');
    g.fillStyle = '#FFF8EC'; g.fillRect(0, 0, 1000, 640); g.fillStyle = '#0E1A2C';
    g.font = '700 40px Fredoka, sans-serif'; g.fillText('The Accounting Arcade', 40, 70);
    g.font = '600 26px Fredoka, sans-serif'; g.fillText(`${p.role} ${p.name} · ${medal}`, 40, 115);
    g.font = '22px "Atkinson Hyperlegible", sans-serif';
    g.fillText(`Total Earned ${S.run.total} · Stars ${sm.stars}/18 · Accuracy ${Math.round(sm.acc * 100)}% · Time ${fmtTime(sm.time)}`, 40, 160);
    LEVELS.forEach((l, i) => { const t = sm.byTopic[TOPICS[l.n]]; const pc = t ? t.c / t.n : 0; const y = 210 + i * 52;
      g.fillStyle = '#0E1A2C'; g.fillText(`${l.n}. ${l.name}`, 40, y + 20); g.fillStyle = '#E2D6BF'; g.fillRect(380, y, 460, 26); g.fillStyle = '#009E73'; g.fillRect(380, y, 460 * pc, 26);
      g.fillStyle = '#0E1A2C'; g.fillText(t ? Math.round(pc * 100) + '%' : '–', 860, y + 20); });
    g.fillText('Revise: ' + (sm.revise.map((r) => r.sub || r.topic).join(', ') || 'nothing!'), 40, 560);
    g.font = '16px sans-serif'; g.fillText(new Date().toLocaleString('en-IN'), 40, 610);
    const a = document.createElement('a'); a.download = 'accounting_arcade_summary.png'; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  }
}
