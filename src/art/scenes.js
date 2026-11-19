// Backgrounds and level props (1280x720 scenes), flat cartoon style.
import { C, svg, pattern } from './svg.js';
const O = C.navy;
const W = 1280, H = 720;

const skyline = (y, col, op = 1, seed = 1) => {
  let x = 0, s = seed, out = '';
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  while (x < W) { const w = 50 + r() * 80, h = 40 + r() * 120; out += `<rect x="${x}" y="${y - h}" width="${w}" height="${h + 400}" fill="${col}" opacity="${op}"/>`; if (r() > 0.6) out += `<rect x="${x + w / 2 - 3}" y="${y - h - 24}" width="6" height="24" fill="${col}" opacity="${op}"/>`; x += w + 4; }
  return out;
};
const cloud = (x, y, s = 1, col = '#fff') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 30 Q0 10 22 12 Q30 -6 52 4 Q70 -4 80 14 Q100 14 98 30 Z" fill="${col}" stroke="${O}" stroke-width="2.5" opacity=".95"/></g>`;
const plant = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M30 0 Q0 -40 10 -80 Q30 -50 30 0 Q40 -60 70 -90 Q60 -40 30 0 Q55 -30 80 -40 Q60 -10 30 0" fill="${C.green}" stroke="${O}" stroke-width="3"/><path d="M8 0 H52 L46 40 H14 Z" fill="${C.verm}" stroke="${O}" stroke-width="3"/></g>`;

// ---------- Menu street ----------
export function bgMenu() {
  const icons = [
    (x, y) => `<circle cx="${x - 4}" cy="${y - 4}" r="13" fill="#DFF3FF" stroke="${O}" stroke-width="4"/><path d="M${x + 6} ${y + 6} L${x + 16} ${y + 16}" stroke="${O}" stroke-width="6" stroke-linecap="round"/>`,
    (x, y) => `<path d="M${x} ${y - 16} V${y + 14} M${x - 18} ${y - 8} H${x + 18} M${x - 18} ${y - 8} L${x - 24} ${y + 4} H${x - 12} Z M${x + 18} ${y - 8} L${x + 12} ${y + 4} H${x + 24} Z M${x - 10} ${y + 16} H${x + 10}" stroke="${O}" stroke-width="3.5" fill="${C.gold}" stroke-linejoin="round"/>`,
    (x, y) => `<circle cx="${x}" cy="${y}" r="11" fill="#C9CED6" stroke="${O}" stroke-width="4"/>${[0, 60, 120, 180, 240, 300].map((a) => `<rect x="${x - 3}" y="${y - 20}" width="6" height="8" fill="${O}" transform="rotate(${a} ${x} ${y})"/>`).join('')}`,
    (x, y) => `<rect x="${x - 20}" y="${y - 6}" width="40" height="14" rx="6" fill="${C.orange}" stroke="${O}" stroke-width="3"/><path d="M${x - 10} ${y - 6} L${x - 4} ${y - 14} H${x + 8} L${x + 12} ${y - 6}" fill="#DFF3FF" stroke="${O}" stroke-width="3"/><circle cx="${x - 11}" cy="${y + 10}" r="5" fill="${O}"/><circle cx="${x + 11}" cy="${y + 10}" r="5" fill="${O}"/>`,
    (x, y) => `<path d="M${x - 20} ${y + 2} Q${x - 22} ${y - 14} ${x - 6} ${y - 12} Q${x} ${y - 24} ${x + 12} ${y - 12} Q${x + 24} ${y - 10} ${x + 20} ${y + 2} Z" fill="#7E8A99" stroke="${O}" stroke-width="3"/><path d="M${x - 2} ${y + 4} L${x - 8} ${y + 14} H${x} L${x - 4} ${y + 22}" stroke="${C.yellow}" stroke-width="3" fill="none"/>`,
    (x, y) => `<path d="M${x} ${y - 20} Q${x + 12} ${y - 6} ${x + 8} ${y + 10} H${x - 8} Q${x - 12} ${y - 6} ${x} ${y - 20} Z" fill="#fff" stroke="${O}" stroke-width="3"/><circle cx="${x}" cy="${y - 4}" r="4" fill="${C.sky}"/><path d="M${x - 6} ${y + 10} L${x} ${y + 20} L${x + 6} ${y + 10}" fill="${C.orange}" stroke="${O}" stroke-width="2.5"/>`,
  ];
  const cols = ['#F7D6E6', '#FCE3B0', '#D7F0E6', '#DDEBFF', '#E6E1F5', '#FFE1CC'];
  const roofs = [C.purple, C.orange, C.green, C.sky, C.deep, C.verm];
  let b = '';
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 205, w = 180, h = 210 + (i % 2) * 50 + (i === 2 ? 30 : 0), y = 600 - h;
    b += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cols[i]}" stroke="${O}" stroke-width="3.5"/>`;
    b += `<rect x="${x - 6}" y="${y - 14}" width="${w + 12}" height="18" rx="4" fill="${roofs[i]}" stroke="${O}" stroke-width="3.5"/>`;
    for (let r = 0; r < Math.floor((h - 90) / 44); r++) for (let c = 0; c < 3; c++) b += `<rect x="${x + 20 + c * 52}" y="${y + 70 + r * 44}" width="36" height="28" rx="4" fill="#BFE6FA" stroke="${O}" stroke-width="2.5"/>`;
    b += `<rect x="${x + w / 2 - 22}" y="${600 - 54}" width="44" height="54" rx="4" fill="${roofs[i]}" stroke="${O}" stroke-width="3"/>`;
    b += `<circle cx="${x + w / 2}" cy="${y + 34}" r="27" fill="#fff" stroke="${O}" stroke-width="3.5"/>` + icons[i](x + w / 2, y + 34);
  }
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="url(#sky)"/>
   <circle cx="1120" cy="110" r="56" fill="${C.yellow}" opacity=".9"/>
   ${skyline(420, '#A9C7DE', 0.6, 7)}
   ${cloud(120, 70, 1.3)}${cloud(520, 40, 1)}${cloud(860, 120, 1.1)}
   ${b}
   <rect x="0" y="600" width="${W}" height="30" fill="#D9DEE5" stroke="${O}" stroke-width="3"/>
   <rect x="0" y="630" width="${W}" height="90" fill="#5C6670"/>
   ${Array.from({ length: 10 }, (_, i) => `<rect x="${i * 140 + 20}" y="672" width="70" height="8" rx="3" fill="#fff"/>`).join('')}`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED8F7"/><stop offset="1" stop-color="#E9F7FD"/></linearGradient>`);
}
export const paperPlane = () => svg(70, 40, `<path d="M2 20 L68 2 L40 38 L32 24 Z" fill="#fff" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><path d="M32 24 L68 2" stroke="${O}" stroke-width="2"/>`);

// ---------- Shared frame for menus, level-end and shop ----------
export function bgFrame(tint = '#E7F3FB') {
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="${tint}"/>
   ${skyline(150, '#C4DCEC', 1, 3)}
   <rect y="150" width="${W}" height="${H}" fill="${tint}"/>
   <path d="M0 0 H180 L0 180 Z" fill="${C.sky}" opacity=".18"/><path d="M${W} ${H} H${W - 180} L${W} ${H - 180} Z" fill="${C.orange}" opacity=".18"/>
   <circle cx="1180" cy="230" r="90" fill="${C.yellow}" opacity=".15"/><circle cx="90" cy="560" r="70" fill="${C.green}" opacity=".12"/>
   <rect y="${H - 46}" width="${W}" height="46" fill="#B5835A" stroke="${O}" stroke-width="3"/><rect y="${H - 46}" width="${W}" height="8" fill="#D6A577"/>`);
}

// ---------- Level 1: archive room ----------
export function bgArchive() {
  const shelf = (x, w) => {
    let s = `<rect x="${x}" y="90" width="${w}" height="560" fill="#B9C2CC" stroke="${O}" stroke-width="3"/>`;
    for (let r = 0; r < 5; r++) {
      const y = 150 + r * 105;
      s += `<rect x="${x}" y="${y}" width="${w}" height="12" fill="#8C97A4" stroke="${O}" stroke-width="2.5"/>`;
      let bx = x + 8;
      while (bx < x + w - 30) { const bw = 18 + ((bx * 7) % 22), bh = 50 + ((bx * 13) % 36); const cols = ['#F3DFB8', '#BFE6FA', '#F7D6E6', '#D7F0E6', '#FCE3B0']; s += `<rect x="${bx}" y="${y - bh}" width="${bw}" height="${bh}" fill="${cols[(bx >> 3) % 5]}" stroke="${O}" stroke-width="2"/>`; bx += bw + 3; }
    }
    return s;
  };
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="#EEF1F4"/>
   <rect x="420" y="0" width="440" height="40" fill="#CFEFFF" stroke="${O}" stroke-width="3"/>
   <path d="M420 40 L470 0 M520 40 L570 0 M620 40 L670 0 M720 40 L770 0 M820 40 L860 6" stroke="#fff" stroke-width="6" opacity=".7"/>
   <rect x="430" y="120" width="420" height="250" rx="8" fill="#BFE6FA" stroke="${O}" stroke-width="4"/>
   <clipPath id="win"><rect x="434" y="124" width="412" height="242"/></clipPath><g clip-path="url(#win)">${skyline(370, '#8FB4D0', 1, 11)}${cloud(470, 140, 0.8)}${cloud(700, 170, 0.7)}</g>
   <path d="M640 120 V370 M430 245 H850" stroke="${O}" stroke-width="4"/>
   ${shelf(0, 300)}${shelf(980, 300)}
   <rect x="0" y="0" width="${W}" height="95" fill="#9AA6B4" stroke="${O}" stroke-width="3"/>
   ${Array.from({ length: 26 }, (_, i) => `<rect x="${i * 50 + 6}" y="${30 + (i % 3) * 6}" width="${30 + (i % 4) * 4}" height="${58 - (i % 3) * 6}" fill="${['#F3DFB8', '#FCE3B0', '#E7D3AE'][i % 3]}" stroke="${O}" stroke-width="2"/>`).join('')}
   <rect x="0" y="88" width="${W}" height="14" fill="#6E7A88" stroke="${O}" stroke-width="3"/>
   <rect x="0" y="650" width="${W}" height="70" fill="#C99E6E" stroke="${O}" stroke-width="3"/>
   ${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 150} 650 V720" stroke="#A97F52" stroke-width="3"/>`).join('')}
   ${plant(330, 650, 0.9)}${plant(890, 650, 0.8)}`);
}

// ---------- Level 2: roastery counter ----------
export function bgRoastery() {
  const sack = (x, y) => `<path d="M${x} ${y} Q${x - 6} ${y - 70} ${x + 20} ${y - 86} H${x + 70} Q${x + 96} ${y - 70} ${x + 90} ${y} Z" fill="#C9A77A" stroke="${O}" stroke-width="3"/><path d="M${x + 20} ${y - 86} Q${x + 45} ${y - 100} ${x + 70} ${y - 86}" fill="none" stroke="${O}" stroke-width="3"/><circle cx="${x + 45}" cy="${y - 40}" r="14" fill="none" stroke="#7A5530" stroke-width="3"/>`;
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="#F6E3C8"/>
   <rect width="${W}" height="${H}" fill="url(#brick)"/>
   <rect x="40" y="40" width="250" height="170" rx="10" fill="#2F3A33" stroke="#7A5530" stroke-width="12"/>
   <path d="M70 80 h120 M70 110 h160 M70 140 h100 M70 170 h140" stroke="#E9EDE7" stroke-width="5" stroke-linecap="round" opacity=".75"/>
   <rect x="1010" y="40" width="130" height="150" rx="8" fill="#fff" stroke="${O}" stroke-width="3"/><rect x="1010" y="40" width="130" height="34" fill="${C.verm}" stroke="${O}" stroke-width="3"/>
   ${Array.from({ length: 4 }, (_, r) => Array.from({ length: 5 }, (_, c) => `<rect x="${1020 + c * 24}" y="${84 + r * 24}" width="18" height="16" rx="2" fill="${r === 0 && c === 0 ? C.yellow : '#EEE'}"/>`).join('')).join('')}
   <rect x="330" y="60" width="620" height="14" fill="#9C6B3F" stroke="${O}" stroke-width="3"/>
   ${Array.from({ length: 11 }, (_, i) => `<rect x="${345 + i * 55}" y="${18}" width="34" height="42" rx="6" fill="#E9F6FB" stroke="${O}" stroke-width="2.5" opacity=".95"/><rect x="${345 + i * 55}" y="${36}" width="34" height="24" rx="4" fill="${['#7A4A2A', '#A9713E', '#5B3A22'][i % 3]}"/>`).join('')}
   <rect x="0" y="600" width="${W}" height="120" fill="#9C6B3F" stroke="${O}" stroke-width="3"/>
   <rect x="0" y="590" width="${W}" height="18" fill="#C48C55" stroke="${O}" stroke-width="3"/>
   ${sack(30, 600)}${sack(1150, 600)}`,
    `<pattern id="brick" width="80" height="40" patternUnits="userSpaceOnUse"><path d="M0 40 H80 M40 0 V20 M0 20 H80 M0 20 V40" stroke="#E7CBA6" stroke-width="2"/></pattern>`);
}
export function jar(w, h, lid) {
  return svg(w, h, `
   <rect x="6" y="18" width="${w - 12}" height="${h - 24}" rx="16" fill="#EAF7FD" fill-opacity=".85" stroke="${O}" stroke-width="3"/>
   <rect x="14" y="26" width="8" height="${h - 50}" rx="4" fill="#fff" opacity=".8"/>
   <rect x="2" y="4" width="${w - 4}" height="18" rx="6" fill="${lid}" stroke="${O}" stroke-width="3"/>`);
}
export function weight(w, h, plus) {
  const col = plus ? C.green : C.verm;
  const handle = plus
    ? `<path d="M${w / 2 - 14} 14 H${w / 2 + 14} M${w / 2} 0 V28" stroke="${O}" stroke-width="12" stroke-linecap="round"/><path d="M${w / 2 - 14} 14 H${w / 2 + 14} M${w / 2} 0 V28" stroke="#E6C76A" stroke-width="6" stroke-linecap="round"/>`
    : `<path d="M${w / 2 - 18} 14 H${w / 2 + 18}" stroke="${O}" stroke-width="14" stroke-linecap="round"/><path d="M${w / 2 - 18} 14 H${w / 2 + 18}" stroke="#E6C76A" stroke-width="8" stroke-linecap="round"/>`;
  return svg(w, h, `
   <ellipse cx="${w / 2}" cy="${h - 8}" rx="${w / 2 - 6}" ry="8" fill="#000" opacity=".15"/>
   ${handle}
   <rect x="6" y="28" width="${w - 12}" height="${h - 38}" rx="12" fill="url(#brass)" stroke="${O}" stroke-width="3"/>
   <rect x="16" y="36" width="${w - 32}" height="${h - 54}" rx="8" fill="${col}" stroke="${O}" stroke-width="2.5"/>`,
    `<linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5D77E"/><stop offset="1" stop-color="#C8962E"/></linearGradient>`);
}
export function scaleParts() {
  const brass = `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7DA86"/><stop offset="1" stop-color="#C08A2A"/></linearGradient>`;
  return {
    pillar: svg(120, 420, `<rect x="45" y="20" width="30" height="340" rx="8" fill="url(#b)" stroke="${O}" stroke-width="3.5"/><path d="M10 410 Q10 360 60 360 Q110 360 110 410 Z" fill="url(#b)" stroke="${O}" stroke-width="3.5"/><circle cx="60" cy="22" r="18" fill="url(#b)" stroke="${O}" stroke-width="3.5"/>`, brass),
    beam: svg(980, 40, `<rect x="10" y="10" width="960" height="18" rx="9" fill="url(#b)" stroke="${O}" stroke-width="3.5"/><circle cx="20" cy="19" r="12" fill="url(#b)" stroke="${O}" stroke-width="3"/><circle cx="960" cy="19" r="12" fill="url(#b)" stroke="${O}" stroke-width="3"/>`, brass),
    pan: (w) => svg(w, 40, `<path d="M4 6 H${w - 4} Q${w - 30} 38 ${w / 2} 36 Q30 38 4 6 Z" fill="url(#b)" stroke="${O}" stroke-width="3.5"/>`, brass),
    dial: svg(150, 90, `<path d="M8 82 A67 67 0 0 1 142 82 Z" fill="${C.cream}" stroke="${O}" stroke-width="3.5"/><path d="M75 20 V34" stroke="${C.green}" stroke-width="6"/>${[-60, -40, -20, 20, 40, 60].map((a) => `<path d="M75 22 V30" stroke="${O}" stroke-width="3" transform="rotate(${a} 75 82)"/>`).join('')}`),
  };
}

// ---------- Level 3: factory ----------
export function bgFactory() {
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="#E4EAF0"/>
   <rect y="0" width="${W}" height="34" fill="url(#haz)" stroke="${O}" stroke-width="3"/>
   ${[140, 420, 860, 1140].map((x) => `<circle cx="${x}" cy="150" r="48" fill="#BFE6FA" stroke="${O}" stroke-width="5"/><path d="M${x - 48} 150 H${x + 48} M${x} 102 V198" stroke="${O}" stroke-width="3"/>`).join('')}
   <path d="M0 250 H1280" stroke="#9AA6B4" stroke-width="22"/><path d="M0 250 H1280" stroke="${O}" stroke-width="3" fill="none" transform="translate(0 -11)"/>
   ${[300, 980].map((x) => `<rect x="${x}" y="200" width="22" height="60" fill="#9AA6B4" stroke="${O}" stroke-width="3"/>`).join('')}
   <circle cx="640" cy="120" r="56" fill="#fff" stroke="${O}" stroke-width="6"/><path d="M640 120 V82 M640 120 L668 134" stroke="${O}" stroke-width="6" stroke-linecap="round"/>
   <rect x="0" y="640" width="${W}" height="80" fill="#B9C2CC" stroke="${O}" stroke-width="3"/>
   <rect x="0" y="636" width="${W}" height="14" fill="url(#haz)"/>`,
    `<pattern id="haz" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="40" fill="${C.yellow}"/><rect x="20" width="20" height="40" fill="${O}"/></pattern>`);
}
export function crate(w, h) {
  return svg(w, h, `
   <rect x="6" y="8" width="${w - 10}" height="${h - 12}" rx="14" fill="#000" opacity=".18"/>
   <rect x="3" y="3" width="${w - 10}" height="${h - 12}" rx="14" fill="#E9C994" stroke="${O}" stroke-width="3.5"/>
   <rect x="12" y="12" width="${w - 28}" height="${h - 30}" rx="9" fill="${C.cream}" stroke="#B88A4A" stroke-width="2.5"/>`);
}
export function pusher() {
  return svg(90, 150, `<rect x="30" y="0" width="30" height="90" fill="#9AA6B4" stroke="${O}" stroke-width="3"/><rect x="38" y="0" width="14" height="90" fill="#C9CED6"/><rect x="5" y="88" width="80" height="40" rx="10" fill="${C.orange}" stroke="${O}" stroke-width="3.5"/><rect x="5" y="118" width="80" height="20" rx="6" fill="url(#hz)" stroke="${O}" stroke-width="3"/>`,
    `<pattern id="hz" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="16" fill="${C.yellow}"/><rect x="8" width="8" height="16" fill="${O}"/></pattern>`);
}

// ---------- Level 4: highway scenery ----------
export function bgRoadSky() {
  return svg(960, 720, `
   <rect width="960" height="720" fill="url(#rs)"/>
   ${cloud(80, 60, 1.1)}${cloud(600, 30, 0.9)}${cloud(380, 110, 0.7)}
   <path d="M0 300 Q120 200 260 260 Q380 190 520 250 Q680 180 820 240 Q900 220 960 250 V330 H0 Z" fill="#7CC79A" stroke="${O}" stroke-width="3"/>
   <path d="M0 310 Q200 250 420 300 Q640 250 960 300 V330 H0 Z" fill="#5DB37E" stroke="${O}" stroke-width="3"/>
   ${[[150, 236], [700, 214], [830, 230]].map(([x, y]) => `<path d="M${x} ${y} V${y - 70}" stroke="#fff" stroke-width="5"/><g transform="translate(${x} ${y - 70})"><path d="M0 0 L-4 -34 L4 -34 Z M0 0 L30 16 L26 22 Z M0 0 L-30 18 L-26 12 Z" fill="#fff" stroke="${O}" stroke-width="2"/></g>`).join('')}
   <rect y="318" width="960" height="402" fill="#6DBB80"/>`,
    `<linearGradient id="rs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7EC8F2"/><stop offset=".45" stop-color="#D8F0FB"/></linearGradient>`);
}
export function raceCar() {
  return svg(220, 150, `
   <ellipse cx="110" cy="138" rx="100" ry="10" fill="#000" opacity=".2"/>
   <rect x="6" y="88" width="44" height="54" rx="12" fill="#2A2F36" stroke="${O}" stroke-width="3.5"/><rect x="170" y="88" width="44" height="54" rx="12" fill="#2A2F36" stroke="${O}" stroke-width="3.5"/>
   <rect x="14" y="28" width="192" height="16" rx="6" fill="${C.navy}" stroke="${O}" stroke-width="3"/>
   <path d="M40 120 Q34 70 70 60 H150 Q186 70 180 120 Z" fill="${C.orange}" stroke="${O}" stroke-width="4"/>
   <path d="M70 60 Q110 46 150 60 L140 82 H80 Z" fill="#BFE6FA" stroke="${O}" stroke-width="3"/>
   <path d="M60 104 Q80 94 90 112 M160 104 Q140 94 130 112" stroke="${C.verm}" stroke-width="6" fill="none" stroke-linecap="round"/>
   <rect x="86" y="108" width="48" height="14" rx="5" fill="#C9CED6" stroke="${O}" stroke-width="3"/>
   <path d="M100 28 V60 M120 28 V60" stroke="${O}" stroke-width="4"/>`);
}
export function tree() { return svg(90, 140, `<rect x="38" y="96" width="14" height="40" fill="#8A5A34" stroke="${O}" stroke-width="3"/><path d="M45 4 L82 60 H62 L86 104 H4 L28 60 H8 Z" fill="#2E8B57" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>`); }
export function rival(kind) {
  if (kind === 'truck') return svg(160, 140, `<rect x="10" y="10" width="140" height="100" rx="10" fill="#fff" stroke="${O}" stroke-width="3.5"/><rect x="10" y="80" width="140" height="14" fill="${C.sky}"/><rect x="18" y="110" width="30" height="24" rx="6" fill="#2A2F36"/><rect x="112" y="110" width="30" height="24" rx="6" fill="#2A2F36"/>`);
  if (kind === 'scooter') return svg(80, 130, `<rect x="30" y="80" width="20" height="44" rx="8" fill="#2A2F36"/><path d="M14 90 Q14 50 40 46 Q66 50 66 90 Z" fill="${C.purple}" stroke="${O}" stroke-width="3.5"/><circle cx="40" cy="30" r="20" fill="${C.yellow}" stroke="${O}" stroke-width="3.5"/>`);
  return svg(160, 140, `<path d="M10 110 V40 Q12 14 50 12 H120 Q150 14 150 40 V110 Z" fill="#FCE3B0" stroke="${O}" stroke-width="3.5"/><rect x="30" y="30" width="100" height="34" rx="8" fill="#BFE6FA" stroke="${O}" stroke-width="3"/><rect x="18" y="110" width="30" height="24" rx="6" fill="#2A2F36"/><rect x="112" y="110" width="30" height="24" rx="6" fill="#2A2F36"/>`);
}
export function coffeeStop() { return svg(200, 150, `<rect x="20" y="50" width="160" height="96" fill="#FCE3B0" stroke="${O}" stroke-width="3.5"/><path d="M10 54 L30 14 H170 L190 54 Z" fill="url(#aw)" stroke="${O}" stroke-width="3.5"/><rect x="40" y="76" width="120" height="40" rx="6" fill="#BFE6FA" stroke="${O}" stroke-width="3"/><path d="M84 96 h26 v14 q0 10 -13 10 q-13 0 -13 -10 z M110 100 q10 0 8 8 q-2 6 -8 4" fill="#fff" stroke="${O}" stroke-width="2.5"/>`, `<pattern id="aw" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="${C.verm}"/><rect x="20" width="20" height="40" fill="#fff"/></pattern>`); }

// ---------- Level 5: harbour ----------
export function bgHarbour() {
  const container = (x, y, col) => `<rect x="${x}" y="${y}" width="150" height="56" fill="${col}" stroke="${O}" stroke-width="3"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${x + 12 + i * 17} ${y + 6} V${y + 50}" stroke="${O}" stroke-width="2" opacity=".35"/>`).join('')}`;
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="url(#st)"/>
   ${skyline(430, '#344B66', 1, 5)}
   <path d="M1010 430 V140 H1030 V430 M1020 150 H1210 V170 H1020 M1190 170 V250" stroke="${C.yellow}" stroke-width="10" fill="none"/>
   <path d="M180 430 V170 H196 V430 M188 178 H40 V194 H188 M60 194 V260" stroke="${C.orange}" stroke-width="9" fill="none"/>
   <rect y="430" width="${W}" height="120" fill="#2D5A7B"/>
   ${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 110} ${470 + (i % 3) * 22} q20 -8 40 0" stroke="#7FB3D5" stroke-width="3" fill="none" opacity=".6"/>`).join('')}
   <rect y="540" width="${W}" height="180" fill="#6C7884" stroke="${O}" stroke-width="3"/>
   ${container(20, 484, C.verm)}${container(20, 428, C.sky)}${container(1110, 484, C.green)}${container(1110, 428, C.orange)}
   <rect x="300" y="540" width="${W - 600}" height="10" fill="#4C5662"/>
   ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${200 + i * 180}" cy="${640 + (i % 2) * 30}" rx="50" ry="8" fill="#9FC3DA" opacity=".35"/>`).join('')}`,
    `<linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22324A"/><stop offset="0.6" stop-color="#4E6A88"/></linearGradient>`);
}
export function stormCloud() {
  return svg(1280, 150, `<path d="M0 0 H1280 V90 Q1230 130 1170 100 Q1120 150 1050 110 Q990 150 920 108 Q860 146 790 106 Q720 150 650 108 Q590 148 520 104 Q450 150 380 108 Q320 146 250 104 Q180 150 110 104 Q50 140 0 100 Z" fill="#3B4A5E" stroke="#16202E" stroke-width="4"/><path d="M0 0 H1280 V60 Q1100 90 900 64 Q700 92 500 62 Q300 92 100 64 Q40 70 0 60 Z" fill="#53647A"/>`);
}
export function dockCart(w = 660) {
  return svg(w, 90, `<rect x="10" y="10" width="${w - 20}" height="24" rx="8" fill="#8A5A34" stroke="${O}" stroke-width="3.5"/><path d="M20 22 H${w - 20}" stroke="#B5835A" stroke-width="4"/>${[70, w / 2, w - 70].map((x) => `<circle cx="${x}" cy="56" r="22" fill="#2A2F36" stroke="${O}" stroke-width="3.5"/><circle cx="${x}" cy="56" r="8" fill="#C9CED6"/>`).join('')}`);
}
export function tarp(w, h) {
  return svg(w, h, `<path d="M8 10 H${w - 8} L${w - 18} ${h - 4} H18 Z" fill="url(#tp)" stroke="${O}" stroke-width="3.5"/>`, `<pattern id="tp" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="24" fill="#8C97A4"/><rect x="12" width="12" height="24" fill="#B9C2CC"/></pattern>`);
}
export function umbrella() { return svg(120, 120, `<path d="M10 60 Q60 -10 110 60 Q97 50 85 60 Q72 50 60 60 Q47 50 35 60 Q22 50 10 60 Z" fill="${C.purple}" stroke="${O}" stroke-width="3.5"/><path d="M60 60 V104 Q60 114 50 110" stroke="${O}" stroke-width="5" fill="none" stroke-linecap="round"/>`); }

// ---------- Level 6: space ----------
export function bgSpace() {
  let stars = '';
  let s = 3; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 160; i++) stars += `<circle cx="${r() * W}" cy="${r() * H}" r="${r() * 1.8 + 0.4}" fill="#fff" opacity="${0.4 + r() * 0.6}"/>`;
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="url(#sp)"/>${stars}
   <g transform="translate(1110 150)"><ellipse cx="0" cy="0" rx="120" ry="26" fill="none" stroke="#FFD27A" stroke-width="8" opacity=".7" transform="rotate(-18)"/><circle r="70" fill="${C.orange}" stroke="${O}" stroke-width="4"/><path d="M-60 -20 Q0 -36 64 -10 M-66 14 Q0 0 66 22" stroke="#C47F00" stroke-width="8" fill="none" opacity=".6"/><path d="M-120 -26 A120 26 -18 0 0 120 26" fill="none" stroke="#FFD27A" stroke-width="8" opacity=".9" transform="rotate(-18)"/></g>
   <g transform="translate(150 600)"><rect x="-40" y="-260" width="80" height="260" fill="#3B4F72" stroke="#8FB4D0" stroke-width="3"/><path d="M-60 -260 L0 -330 L60 -260 Z" fill="#4E6790" stroke="#8FB4D0" stroke-width="3"/>${Array.from({ length: 6 }, (_, i) => `<rect x="-24" y="${-240 + i * 38}" width="48" height="16" rx="3" fill="${C.yellow}" opacity=".85"/>`).join('')}<rect x="-110" y="-140" width="220" height="14" rx="6" fill="#8FB4D0"/></g>`,
    `<radialGradient id="sp" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#22305A"/><stop offset="1" stop-color="#0B1430"/></radialGradient>`);
}
export function ship() {
  return svg(150, 120, `<path d="M75 6 Q104 30 108 78 L140 100 V112 H10 V100 L42 78 Q46 30 75 6 Z" fill="${C.navy}" stroke="#BFE6FA" stroke-width="3.5"/><path d="M42 84 H108" stroke="${C.orange}" stroke-width="8"/><circle cx="75" cy="52" r="20" fill="#BFE6FA" stroke="#fff" stroke-width="3"/><path d="M60 112 L66 120 H84 L90 112" fill="${C.yellow}"/>`);
}
export function holoCard(w, h) {
  return svg(w, h, `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="16" fill="${C.cream}" stroke="#7FE7F5" stroke-width="6"/><rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="16" fill="none" stroke="${O}" stroke-width="2"/><path d="M14 ${h - 18} H${w - 14}" stroke="#7FE7F5" stroke-width="2" opacity=".6"/>`);
}

// ---------- Shop ----------
export function bgShop() {
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="#EAF2F8"/>
   ${skyline(130, '#CFE0EC', 1, 9)}<rect y="130" width="${W}" height="${H}" fill="#EAF2F8"/>
   <path d="M120 140 H1160 L1200 200 H80 Z" fill="url(#aw2)" stroke="${O}" stroke-width="4"/>
   ${Array.from({ length: 13 }, (_, i) => `<path d="M${80 + i * 86} 200 q43 26 86 0" fill="${i % 2 ? '#fff' : C.green}" stroke="${O}" stroke-width="3"/>`).join('')}
   <rect x="120" y="250" width="1040" height="14" fill="#9C6B3F" stroke="${O}" stroke-width="3"/>
   <rect x="120" y="400" width="1040" height="14" fill="#9C6B3F" stroke="${O}" stroke-width="3"/>
   <rect x="0" y="560" width="${W}" height="160" fill="#B5835A" stroke="${O}" stroke-width="3"/><rect x="0" y="560" width="${W}" height="16" fill="#D6A577" stroke="${O}" stroke-width="3"/>
   <g transform="translate(1100 440)"><rect x="0" y="0" width="120" height="120" rx="10" fill="#3A3F47" stroke="${O}" stroke-width="3.5"/><rect x="14" y="14" width="92" height="30" rx="5" fill="#BFE6FA"/><rect x="44" y="70" width="32" height="40" rx="4" fill="#fff" stroke="${O}" stroke-width="2.5"/></g>`,
    `<pattern id="aw2" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="30" height="60" fill="${C.green}"/><rect x="30" width="30" height="60" fill="#fff"/></pattern>`);
}
export function glassJar() { return svg(130, 150, `<rect x="10" y="26" width="110" height="118" rx="22" fill="#EAF7FD" fill-opacity=".75" stroke="${O}" stroke-width="3.5"/><rect x="22" y="40" width="10" height="80" rx="5" fill="#fff"/><rect x="4" y="8" width="122" height="24" rx="8" fill="${C.gold}" stroke="${O}" stroke-width="3.5"/>`); }

// ---------- Level 5: fairground shooting gallery ----------
export const FAIR = { RAIL1: 318, RAIL2: 520 };
export function bgFair() {
  const bulbs = (y, n, x0, x1) => Array.from({ length: n }, (_, i) => { const x = x0 + (x1 - x0) * i / (n - 1); return `<circle cx="${x}" cy="${y + Math.sin(i) * 3}" r="7" fill="${[C.yellow, C.orange, C.sky, C.purple][i % 4]}" stroke="${O}" stroke-width="2"/>`; }).join('');
  const rail = (y) => `<rect x="40" y="${y}" width="1200" height="26" rx="6" fill="#B5835A" stroke="${O}" stroke-width="3.5"/><path d="M52 ${y + 12} H1228" stroke="#D6A577" stroke-width="5"/>${Array.from({ length: 13 }, (_, i) => `<circle cx="${70 + i * 95}" cy="${y + 13}" r="4" fill="${O}" opacity=".5"/>`).join('')}`;
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="#3A2A55"/>
   ${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 80} 120 Q${i * 80 + 40} 150 ${i * 80 + 80} 120 V600 H${i * 80} Z" fill="${i % 2 ? '#7A2E4E' : '#8E3A5E'}"/>`).join('')}
   <path d="M0 0 H${W} V96 ${Array.from({ length: 16 }, (_, i) => `Q${W - i * 80 - 40} 140 ${W - i * 80 - 80} 96`).join(' ')} Z" fill="url(#fa)" stroke="${O}" stroke-width="4"/>
   <path d="M0 150 Q320 190 640 150 Q960 190 1280 150" stroke="${O}" stroke-width="2.5" fill="none"/>${bulbs(162, 20, 20, 1260)}
   <rect x="0" y="${FAIR.RAIL1 + 20}" width="${W}" height="${FAIR.RAIL2 - FAIR.RAIL1 - 20}" fill="#4B2F60" opacity=".55"/>
   ${rail(FAIR.RAIL1)}
   <rect x="0" y="${FAIR.RAIL2}" width="${W}" height="${H - FAIR.RAIL2}" fill="#9C6B3F" stroke="${O}" stroke-width="4"/>
   <rect x="0" y="${FAIR.RAIL2}" width="${W}" height="24" fill="#D6A577" stroke="${O}" stroke-width="4"/>
   ${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 160} ${FAIR.RAIL2 + 24} V${H}" stroke="${O}" stroke-width="2" opacity=".35"/>`).join('')}
`,
    `<pattern id="fa" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="40" height="80" fill="${C.verm}"/><rect x="40" width="40" height="80" fill="#FFF6E5"/></pattern>`);
}
export function woodTarget(w = 340, h = 130) {
  return svg(w, h + 60, `<rect x="${w / 2 - 9}" y="${h - 10}" width="18" height="70" fill="#7A4E2A" stroke="${O}" stroke-width="3"/>
   <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="18" fill="#E9C38F" stroke="${O}" stroke-width="4"/>
   ${[28, 54, 80].map((y) => `<path d="M14 ${y} Q${w / 2} ${y + 6} ${w - 14} ${y}" stroke="#C99A62" stroke-width="2.5" fill="none" opacity=".7"/>`).join('')}
   <rect x="12" y="12" width="${w - 24}" height="${h - 24}" rx="12" fill="#FFF6E5" opacity=".88"/>
   <g transform="translate(46 ${h / 2})"><circle r="30" fill="#fff" stroke="${O}" stroke-width="3"/><circle r="21" fill="${C.verm}"/><circle r="12" fill="#fff"/><circle r="5" fill="${C.verm}"/></g>`);
}
export function crosshair() { return svg(64, 64, `<circle cx="32" cy="32" r="20" fill="none" stroke="#fff" stroke-width="7"/><circle cx="32" cy="32" r="20" fill="none" stroke="${O}" stroke-width="3"/><path d="M32 2 V20 M32 44 V62 M2 32 H20 M44 32 H62" stroke="#fff" stroke-width="7"/><path d="M32 2 V20 M32 44 V62 M2 32 H20 M44 32 H62" stroke="${O}" stroke-width="3"/>`); }

// ---------- Level 6: supermarket ----------
export function bgMarket() {
  const tiles = Array.from({ length: 22 }, (_, i) => `<path d="M${i * 64} 470 V${H}" stroke="#C9D3DC" stroke-width="2"/>`).join('') + [520, 580, 650].map((y) => `<path d="M0 ${y} H${W}" stroke="#C9D3DC" stroke-width="2"/>`).join('');
  const shelf = (y) => `<rect x="22" y="${y}" width="886" height="16" rx="4" fill="#E69F00" stroke="${O}" stroke-width="3"/><rect x="22" y="${y + 16}" width="886" height="8" fill="#B87A00" stroke="${O}" stroke-width="2"/>`;
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="#F3F7FB"/>
   <rect y="0" width="${W}" height="90" fill="${C.green}"/><rect y="86" width="${W}" height="8" fill="${O}"/>
   <rect x="14" y="100" width="902" height="360" rx="10" fill="#DDE7F0" stroke="${O}" stroke-width="3.5"/>
   ${[205, 320, 435].map(shelf).join('')}
   <rect y="470" width="${W}" height="${H - 470}" fill="#EEF2F5"/>${tiles}
   <rect x="924" y="100" width="344" height="512" rx="14" fill="#E6F2EC" stroke="${O}" stroke-width="3" opacity=".9"/>`);
}
export function trolley() {
  return svg(330, 330, `<path d="M10 20 H48 L70 70" stroke="${O}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
   <path d="M62 60 H316 L290 262 H92 Z" fill="#BFE6FA" fill-opacity=".55" stroke="${O}" stroke-width="5" stroke-linejoin="round"/>
   ${Array.from({ length: 9 }, (_, i) => `<path d="M${90 + i * 26} 64 L${106 + i * 21} 258" stroke="${O}" stroke-width="2" opacity=".35"/>`).join('')}
   <path d="M70 160 H306" stroke="${O}" stroke-width="5"/>
   <path d="M92 262 L100 296 H286" stroke="${O}" stroke-width="7" fill="none" stroke-linejoin="round"/>
   ${[118, 266].map((x) => `<circle cx="${x}" cy="308" r="16" fill="#2A2F36" stroke="${O}" stroke-width="4"/><circle cx="${x}" cy="308" r="6" fill="#C9CED6"/>`).join('')}`);
}

// ---------- Level 6 stage B: Headline Slingshot ----------
export const SLING = { x: 230, y: 478, ground: 612 };
export function bgSling() {
  return svg(W, H, `
   <rect width="${W}" height="${H}" fill="url(#sk)"/>
   ${cloud(80, 250, 1.1)}${cloud(470, 300, 0.9)}${cloud(560, 210, 0.7)}
   <path d="M0 520 Q200 430 420 500 T860 470 T1280 480 V${SLING.ground} H0 Z" fill="#9ED8A8" stroke="${O}" stroke-width="3"/>
   <path d="M0 560 Q260 500 560 550 T1280 540 V${SLING.ground} H0 Z" fill="#6CC17A" stroke="${O}" stroke-width="3"/>
   <rect y="${SLING.ground}" width="${W}" height="${H - SLING.ground}" fill="#8A5A34" stroke="${O}" stroke-width="4"/>
   <rect y="${SLING.ground}" width="${W}" height="14" fill="#4FA35F" stroke="${O}" stroke-width="3"/>`,
    `<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7EC8F0"/><stop offset="1" stop-color="#DFF3FF"/></linearGradient>`);
}
export function slingshot() {
  return svg(120, 170, `<path d="M60 168 V86 M60 90 Q60 60 22 20 M60 90 Q60 60 98 20" stroke="${O}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M60 168 V86 M60 90 Q60 60 22 20 M60 90 Q60 60 98 20" stroke="#A86B3C" stroke-width="14" fill="none" stroke-linecap="round"/>`);
}
export function newspaper() {
  return svg(64, 44, `<rect x="3" y="6" width="58" height="34" rx="6" fill="#F4F1E8" stroke="${O}" stroke-width="3" transform="rotate(-8 32 22)"/><path d="M12 16 H40 M12 23 H52 M12 30 H46" stroke="${O}" stroke-width="3" transform="rotate(-8 32 22)"/><rect x="42" y="12" width="12" height="9" fill="${C.verm}" transform="rotate(-8 32 22)"/>`);
}
export function ceo(col) {
  return svg(90, 120, `<path d="M18 118 V74 Q18 56 45 56 Q72 56 72 74 V118 Z" fill="${col}" stroke="${O}" stroke-width="3.5"/>
   <path d="M45 58 L38 70 L45 96 L52 70 Z" fill="#fff" stroke="${O}" stroke-width="2"/><path d="M45 70 L41 76 L45 92 L49 76 Z" fill="${C.verm}"/>
   <circle cx="45" cy="34" r="22" fill="#E8B48A" stroke="${O}" stroke-width="3.5"/><circle cx="37" cy="33" r="3" fill="${O}"/><circle cx="53" cy="33" r="3" fill="${O}"/><path d="M37 43 Q45 49 53 43" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
}
export function topHat(col) {
  return svg(70, 50, `<rect x="16" y="4" width="38" height="34" rx="4" fill="#222" stroke="${O}" stroke-width="3"/><rect x="16" y="26" width="38" height="8" fill="${col}"/><rect x="4" y="36" width="62" height="10" rx="5" fill="#222" stroke="${O}" stroke-width="3"/>`);
}
export function block(w = 120, h = 42) {
  return svg(w, h, `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="5" fill="#C98B4E" stroke="${O}" stroke-width="3"/><path d="M10 ${h / 2} H${w - 10}" stroke="#A86B3C" stroke-width="3" opacity=".7"/><circle cx="12" cy="10" r="2.5" fill="${O}" opacity=".5"/><circle cx="${w - 12}" cy="${h - 10}" r="2.5" fill="${O}" opacity=".5"/>`);
}
