import { uri, penny, avatar, card, basket, fileCart, conceptIcon, crateIcon, C, ICON } from './svg.js';
import * as A from './scenes.js';

function addSvg(game, key, s) {
  return new Promise((res) => {
    if (game.textures.exists(key)) game.textures.remove(key);
    const img = new Image();
    img.onload = () => { game.textures.addImage(key, img); res(); };
    img.onerror = () => { console.warn('Texture failed', key); res(); };
    img.src = uri(s);
  });
}

export const SLOT = [
  { color: C.sky, pat: 'dots' }, { color: C.orange, pat: 'diag' }, { color: C.green, pat: 'chevrons' }, { color: C.purple, pat: 'waves' },
];
export const CONCEPT_ICONS = ['entity', 'goingconcern', 'period', 'money', 'histcost', 'consistency', 'accrual', 'matching', 'dual', 'prudence', 'materiality', 'disclosure', 'objectivity'];
export const CRATE_ICONS = ['gear', 'boxes', 'invoice_out', 'certificate', 'handshake', 'calendar_coin', 'vault', 'bank_minus', 'bank_long', 'wallet_clock', 'bicycle', 'cash', 'gavel', 'house', 'scroll', 'patent'];

export async function buildTextures(game) {
  const sp = A.scaleParts();
  const list = [
    ['bg_menu', A.bgMenu()], ['bg_frame', A.bgFrame()], ['plane', A.paperPlane()],
    ['bg_archive', A.bgArchive()], ['bg_roastery', A.bgRoastery()], ['bg_factory', A.bgFactory()],
    ['bg_road', A.bgRoadSky()], ['bg_shop', A.bgShop()],
    ['case_file', card(340, 150, { tab: true, seal: true })], ['cf_card', card(300, 96)], ['cart', fileCart(760)],
    ['jar_assets', A.jar(104, 128, C.sky)], ['jar_liab', A.jar(104, 128, C.purple)], ['jar_equity', A.jar(104, 128, C.green)],
    ['w_plus', A.weight(156, 86, true)], ['w_minus', A.weight(156, 86, false)],
    ['sc_pillar', sp.pillar], ['sc_beam', sp.beam], ['sc_pan_l', sp.pan(470)], ['sc_pan_r', sp.pan(470)], ['sc_dial', sp.dial],
    ['crate', A.crate(280, 132)], ['pusher', A.pusher()],
    ['car', A.raceCar()], ['tree', A.tree()], ['truck', A.rival('truck')], ['scooter', A.rival('scooter')], ['camper', A.rival('camper')], ['coffee', A.coffeeStop()],
        ['bg_fair', A.bgFair()], ['target', A.woodTarget()], ['crosshair', A.crosshair()], ['bg_market', A.bgMarket()], ['trolley', A.trolley()], ['jarglass', A.glassJar()],
    ['coin', ICON.coin(28)],
  ];
  ['smile', 'wink', 'eyebrow', 'cheer'].forEach((e) => list.push(['penny_' + e, penny(e, 200)]));
  for (let i = 0; i < 8; i++) list.push(['avatar_' + i, avatar(i, 120)]);
  SLOT.forEach((s, i) => { list.push(['basket_' + i, basket(190, 104, s.color, s.pat)]); list.push(['basket_' + i + '_h', basket(190, 104, s.color, s.pat, true)]); });
  CONCEPT_ICONS.forEach((k) => list.push(['ci_' + k, conceptIcon(k, 40)]));
  CRATE_ICONS.forEach((k) => list.push(['cr_' + k, crateIcon(k, 46)]));
  await Promise.all(list.map(([k, s]) => addSvg(game, k, s)));
}
