import Phaser from 'phaser';
import { S, loadSettings, applyBodyClasses } from './core/state.js';
import { loadAll } from './core/data.js';
import { buildTextures } from './art/textures.js';
import { UI } from './core/ui.js';
import { MenuScene, NameScene, HowToScene, PracticeScene, LeaderboardScene, ValidationScene, TeacherScene } from './scenes/menus.js';
import { LevelEndScene, ShopScene, ResultsScene } from './scenes/flow.js';
import { Level1 as L1Scene } from './levels/l1.js';
import { Level2 as L2Scene } from './levels/l2.js';
import { Level3 as L3Scene } from './levels/l3.js';
import { Level4 as L4Scene } from './levels/l4.js';
import { Level5 as L5Scene } from './levels/l5.js';
import { Level6 as L6Scene } from './levels/l6.js';

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  async create() {
    const loading = document.getElementById('loading');
    try {
      const fonts = ['600 20px Fredoka', '700 20px Fredoka', '500 20px Fredoka', '400 20px "Atkinson Hyperlegible"', '700 20px "Atkinson Hyperlegible"'];
      await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 3000))]);
      const res = await loadAll();
      S.config = res.config; S.data = res.data; S.report = res.report; S.overrides = res.overrides || [];
      loadSettings(); applyBodyClasses();
      try { S.player = JSON.parse(localStorage.getItem('aa_player') || 'null'); } catch { S.player = null; }
      await buildTextures(this.game);
      window.__AA = { S, game: this.game };
      if (loading) loading.remove();
      if (S.report.some((r) => r.severity === 'error')) this.scene.start('Validation');
      else this.scene.start('Menu');
    } catch (e) {
      console.error(e);
      if (loading) loading.innerHTML = '<div style="max-width:600px;text-align:center">Sorry, the game could not start: ' + String(e.message || e).replace(/</g, '&lt;') + '</div>';
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280, height: 720,
  backgroundColor: '#0E1A2C',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, NameScene, HowToScene, PracticeScene, LeaderboardScene, ValidationScene, TeacherScene,
    L1Scene, L2Scene, L3Scene, L4Scene, L5Scene, L6Scene, LevelEndScene, ShopScene, ResultsScene],
});
UI.init(game);
