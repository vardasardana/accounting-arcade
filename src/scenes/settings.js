import { S, saveSettings, speedLocked, effectiveSpeed } from '../core/state.js';
import { UI, $ } from '../core/ui.js';
import { applyVolumes, sfx } from '../core/audio.js';

export function openSettings(onClose) {
  const locked = speedLocked();
  const tg = (k, label, help) => `<div class="set-row"><label for="t_${k}">${label}</label><div style="display:flex;align-items:center;gap:12px"><button id="t_${k}" class="toggle ${S.settings[k] ? 'on' : ''}" data-k="${k}" role="switch" aria-checked="${!!S.settings[k]}"></button><span class="muted" style="font-size:16px">${help}</span></div></div>`;
  const el = UI.add(`<div class="dim"></div><div class="panel" role="dialog" aria-label="Settings" style="left:190px;top:40px;width:900px;max-height:640px">
    <h2 class="h1" style="margin-bottom:6px">⚙ Settings</h2>
    <div class="set-row"><label>Music volume</label><input type="range" min="0" max="1" step="0.05" value="${S.settings.music}" data-r="music" aria-label="Music volume"></div>
    <div class="set-row"><label>Effects volume</label><input type="range" min="0" max="1" step="0.05" value="${S.settings.sfx}" data-r="sfx" aria-label="Effects volume"></div>
    ${tg('muted', 'Mute all sound', 'Every sound also has a visual cue.')}
    <div class="set-row"><label>Game speed</label><div style="display:flex;gap:10px;align-items:center">${['relaxed', 'standard', 'fast'].map((s) => `<button class="chip ${effectiveSpeed() === s ? 'on' : ''}" data-s="${s}" ${locked ? 'disabled' : ''}>${{ relaxed: 'Relaxed 70%', standard: 'Standard', fast: 'Fast 120%' }[s]}</button>`).join('')}${locked ? '<span class="muted">🔒 set by instructor</span>' : ''}</div></div>
    ${tg('largeText', 'Large text', 'All text 20% bigger.')}
    ${tg('reducedMotion', 'Reduced motion', 'No shaking, fewer particles, no flashing.')}
    ${tg('highContrast', 'High contrast', 'Stronger outlines on panels.')}
    ${tg('patterns', 'Colour-blind patterns', 'Heavier patterns on baskets and chutes.')}
    <div style="text-align:right;margin-top:10px"><button class="btn green done">Done</button></div></div>`, 'screen');
  el.querySelectorAll('.toggle').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k; S.settings[k] = !S.settings[k]; b.classList.toggle('on', S.settings[k]); b.setAttribute('aria-checked', String(S.settings[k]));
    saveSettings(); applyVolumes(); document.body.classList.toggle('heavy-patterns', !!S.settings.patterns); sfx('click');
  }));
  el.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => { S.settings[r.dataset.r] = Number(r.value); saveSettings(); applyVolumes(); }));
  el.querySelectorAll('.chip[data-s]').forEach((c) => c.addEventListener('click', () => { if (locked) return; S.settings.speed = c.dataset.s; saveSettings(); el.querySelectorAll('.chip[data-s]').forEach((x) => x.classList.toggle('on', x === c)); }));
  const close = () => { el.remove(); onClose && onClose(); };
  $(el, '.done').addEventListener('click', close);
  $(el, '.dim').addEventListener('click', close);
  $(el, '.done').focus();
  return el;
}
