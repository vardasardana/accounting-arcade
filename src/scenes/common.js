import { uri, penny, avatar, ICON } from '../art/svg.js';
import { S } from '../core/state.js';
const cache = {};
export const pennyUri = (e = 'smile') => (cache['p' + e] ||= uri(penny(e, 200)));
export const avatarUri = (i) => (cache['a' + i] ||= uri(avatar(i, 160)));
export const iconUri = (name, ...a) => { const k = name + a.join(','); return (cache[k] ||= uri(ICON[name](...a))); };
export function bg(scene, key) { return scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(1280, 720); }
export function heartsHtml(n, max) { let s = ''; for (let i = 0; i < max; i++) s += `<img alt="" src="${iconUri('heart', 30, i < n)}">`; return s; }
export function fadeTo(scene, key, data) {
  if (S.settings.reducedMotion) { scene.scene.start(key, data); return; }
  scene.cameras.main.fadeOut(220, 14, 26, 44);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}
export function fadeIn(scene) { if (!S.settings.reducedMotion) scene.cameras.main.fadeIn(250, 14, 26, 44); }
export function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
export function wrapText(s, max) {
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur); return lines.join('\n');
}
export function keyOf(e) { return e.key.length === 1 ? e.key.toLowerCase() : e.key; }
