// small shared visual effects for canvas levels
import { S } from '../core/state.js';
export function coinBurst(scene, x, y, n = 14) {
  if (S.settings.reducedMotion) n = 4;
  for (let i = 0; i < n; i++) {
    const c = scene.add.image(x, y, 'coin').setScale(0.7).setDepth(50);
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, d = 60 + Math.random() * 90;
    scene.tweens.add({ targets: c, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, angle: 360, duration: 700 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
  }
}
export function confetti(scene, colors = [0xE69F00, 0x56B4E9, 0x009E73, 0xCC79A7, 0xF0E442], n = 40, x0 = 0, w = 1280) {
  if (S.settings.reducedMotion) n = 10;
  for (let i = 0; i < n; i++) {
    const r = scene.add.rectangle(x0 + Math.random() * w, -20 - Math.random() * 100, 10, 6, colors[i % colors.length]).setDepth(60);
    scene.tweens.add({ targets: r, y: 760, angle: 720 * (Math.random() - 0.5), x: r.x + (Math.random() - 0.5) * 160, duration: 1400 + Math.random() * 900, onComplete: () => r.destroy() });
  }
}
export function stampText(scene, x, y, text, color = '#009E73', angle = -12) {
  const t = scene.add.text(x, y, text, { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '34px', color, stroke: '#ffffff', strokeThickness: 6 }).setOrigin(0.5).setAngle(angle).setDepth(40).setScale(1.8).setAlpha(0);
  scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
  return t;
}
export function puff(scene, x, y, color = 0xB9C2CC) {
  for (let i = 0; i < (S.settings.reducedMotion ? 3 : 8); i++) {
    const c = scene.add.circle(x, y, 10 + Math.random() * 10, color, 0.8).setDepth(45);
    scene.tweens.add({ targets: c, x: x + (Math.random() - 0.5) * 120, y: y - Math.random() * 60, alpha: 0, scale: 1.8, duration: 600, onComplete: () => c.destroy() });
  }
}
