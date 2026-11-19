// Flat cartoon vector art drawn in code (SVG strings). No text is baked into images.
export const C = {
  navy: '#1F3A5F', sky: '#56B4E9', green: '#009E73', orange: '#E69F00', verm: '#D55E00', purple: '#CC79A7',
  yellow: '#F0E442', cream: '#FFF6E5', char: '#222222', blue: '#0072B2', deep: '#5B3A8E', gold: '#F2B632',
};
const O = C.navy;
export const svg = (w, h, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
export const uri = (s) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);

export function pattern(id, kind, color = '#fff', op = 0.45, size = 16) {
  const s = size;
  const k = {
    dots: `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.17}" fill="${color}" opacity="${op}"/>`,
    diag: `<path d="M-2 ${s + 2} L${s + 2} -2" stroke="${color}" stroke-width="${s * 0.18}" opacity="${op}"/>`,
    chevrons: `<path d="M0 ${s * 0.7} L${s / 2} ${s * 0.3} L${s} ${s * 0.7}" fill="none" stroke="${color}" stroke-width="${s * 0.14}" opacity="${op}"/>`,
    waves: `<path d="M0 ${s / 2} Q${s / 4} ${s * 0.2} ${s / 2} ${s / 2} T${s} ${s / 2}" fill="none" stroke="${color}" stroke-width="${s * 0.14}" opacity="${op}"/>`,
    cross: `<path d="M0 0 L${s} ${s} M${s} 0 L0 ${s}" stroke="${color}" stroke-width="${s * 0.1}" opacity="${op}"/>`,
    checks: `<path d="M${s * 0.2} ${s * 0.55} L${s * 0.42} ${s * 0.75} L${s * 0.8} ${s * 0.3}" fill="none" stroke="${color}" stroke-width="${s * 0.13}" opacity="${op}"/>`,
    stripes: `<path d="M0 ${s / 2} H${s}" stroke="${color}" stroke-width="${s * 0.2}" opacity="${op}"/>`,
  }[kind] || '';
  return `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse">${k}</pattern>`;
}

// ---------------- Penny ----------------
export function penny(expr = 'smile', w = 220) {
  const eyes = {
    smile: `<circle cx="92" cy="112" r="9" fill="#8FE6FF"/><circle cx="128" cy="112" r="9" fill="#8FE6FF"/><path d="M90 132 Q110 148 130 132" stroke="#8FE6FF" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    wink: `<circle cx="92" cy="112" r="9" fill="#8FE6FF"/><path d="M118 113 Q128 104 138 113" stroke="#8FE6FF" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M90 132 Q110 148 130 132" stroke="#8FE6FF" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    eyebrow: `<circle cx="92" cy="114" r="8" fill="#8FE6FF"/><circle cx="128" cy="114" r="8" fill="#8FE6FF"/><path d="M80 98 L102 101" stroke="#8FE6FF" stroke-width="5" stroke-linecap="round"/><path d="M118 96 Q128 86 140 94" stroke="#8FE6FF" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M96 138 H124" stroke="#8FE6FF" stroke-width="6" stroke-linecap="round"/>`,
    cheer: `<path d="M82 116 L92 104 L102 116" stroke="#8FE6FF" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M118 116 L128 104 L138 116" stroke="#8FE6FF" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M90 128 Q110 156 130 128 Z" fill="#8FE6FF"/>`,
  }[expr] || '';
  const armsUp = expr === 'cheer';
  const arms = armsUp
    ? `<path d="M30 118 Q14 90 22 64" stroke="${O}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M30 118 Q14 90 22 64" stroke="#C9CED6" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="22" cy="60" r="10" fill="#C9CED6" stroke="${O}" stroke-width="3"/>
       <path d="M190 118 Q206 90 198 64" stroke="${O}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M190 118 Q206 90 198 64" stroke="#C9CED6" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="198" cy="60" r="10" fill="#C9CED6" stroke="${O}" stroke-width="3"/>`
    : `<path d="M30 128 Q12 140 20 166" stroke="${O}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M30 128 Q12 140 20 166" stroke="#C9CED6" stroke-width="7" fill="none" stroke-linecap="round"/>
       <rect x="2" y="150" width="34" height="44" rx="5" fill="#B5835A" stroke="${O}" stroke-width="3"/><rect x="8" y="158" width="22" height="30" rx="2" fill="#fff"/><rect x="12" y="146" width="14" height="8" rx="2" fill="#C9CED6" stroke="${O}" stroke-width="2"/><path d="M12 166h14M12 173h14M12 180h10" stroke="#8aa" stroke-width="2"/>
       <path d="M190 128 Q212 116 206 92" stroke="${O}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M190 128 Q212 116 206 92" stroke="#C9CED6" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="206" cy="88" r="10" fill="#C9CED6" stroke="${O}" stroke-width="3"/>`;
  const body = `
  <ellipse cx="110" cy="232" rx="58" ry="7" fill="#000" opacity="0.15"/>
  <path d="M110 22 V8" stroke="${O}" stroke-width="5"/><circle cx="110" cy="8" r="7" fill="${C.verm}" stroke="${O}" stroke-width="3"/>
  ${arms}
  <rect x="78" y="196" width="18" height="30" rx="7" fill="#C9CED6" stroke="${O}" stroke-width="3"/><rect x="124" y="196" width="18" height="30" rx="7" fill="#C9CED6" stroke="${O}" stroke-width="3"/>
  <circle cx="110" cy="120" r="94" fill="url(#pg)" stroke="${O}" stroke-width="5"/>
  <circle cx="110" cy="120" r="80" fill="none" stroke="#FBD976" stroke-width="5" stroke-dasharray="7 9"/>
  <path d="M40 90 A78 78 0 0 1 120 42" stroke="#FFF3C4" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.8"/>
  <rect x="62" y="84" width="96" height="74" rx="22" fill="${O}" stroke="#14273F" stroke-width="3"/>
  <rect x="68" y="90" width="30" height="8" rx="4" fill="#fff" opacity="0.15"/>
  ${eyes}`;
  return svg(w, Math.round(w * 240 / 220), `<g transform="scale(${w / 220})">${body}</g>`, `<radialGradient id="pg" cx="0.38" cy="0.32" r="0.8"><stop offset="0" stop-color="#FFD966"/><stop offset="0.7" stop-color="#F2B632"/><stop offset="1" stop-color="#E69F00"/></radialGradient>`);
}

// ---------------- Avatars ----------------
export const AVATARS = [
  { skin: '#F1C27D', hair: '#3B2416', style: 'short', outfit: C.navy, shirt: '#fff', bg: '#BFE6FA', glasses: false },
  { skin: '#8D5524', hair: '#1A1A1A', style: 'curly', outfit: C.green, shirt: '#FFF6E5', bg: '#FCE3B0', glasses: true },
  { skin: '#E0AC8A', hair: '#2A1A12', style: 'long', outfit: '#7A4E9E', shirt: '#fff', bg: '#D7F0E6', glasses: false },
  { skin: '#C68642', hair: '#000', style: 'scarf', outfit: C.navy, shirt: '#fff', bg: '#F7D6E6', glasses: false, scarf: C.purple },
  { skin: '#F5D0B5', hair: '#A0522D', style: 'bob', outfit: C.orange, shirt: '#fff', bg: '#DDEBFF', glasses: true },
  { skin: '#6B3E26', hair: '#141414', style: 'buzz', outfit: C.sky, shirt: '#1F3A5F', bg: '#FFF1B8', glasses: false },
  { skin: '#D9A07B', hair: '#24160F', style: 'bun', outfit: '#3A3F47', shirt: '#F0E442', bg: '#E2F5FB', glasses: false },
  { skin: '#A0673E', hair: '#B9BEC6', style: 'side', outfit: C.blue, shirt: '#fff', bg: '#FFE1CC', glasses: true },
];
export function avatar(i, size = 160, withBg = true) {
  const a = AVATARS[i % AVATARS.length];
  const hairBack = {
    long: `<path d="M44 74 Q40 140 52 150 H108 Q120 140 116 74 Z" fill="${a.hair}" stroke="${O}" stroke-width="3"/>`,
    bun: `<circle cx="80" cy="30" r="15" fill="${a.hair}" stroke="${O}" stroke-width="3"/>`,
    curly: '',
    scarf: `<path d="M38 80 Q36 30 80 26 Q124 30 122 80 L128 150 H32 Z" fill="${a.scarf}" stroke="${O}" stroke-width="3"/>`,
  }[a.style] || '';
  const hairFront = {
    short: `<path d="M50 68 Q48 36 80 34 Q114 34 110 70 Q100 52 82 52 Q64 54 50 68 Z" fill="${a.hair}" stroke="${O}" stroke-width="3"/>`,
    curly: `<g fill="${a.hair}" stroke="${O}" stroke-width="3">${[[52, 56], [62, 42], [78, 36], [94, 40], [106, 52], [110, 66], [50, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13"/>`).join('')}</g>`,
    long: `<path d="M48 76 Q46 36 80 34 Q114 36 112 76 Q100 50 80 52 Q60 50 48 76 Z" fill="${a.hair}" stroke="${O}" stroke-width="3"/>`,
    scarf: `<path d="M46 66 Q50 34 80 34 Q110 34 114 66 Q104 50 80 50 Q56 50 46 66 Z" fill="${a.scarf}" stroke="${O}" stroke-width="3"/>`,
    bob: `<path d="M44 92 Q38 36 80 34 Q122 36 116 92 L106 92 Q108 60 90 52 Q70 62 54 60 Q52 80 54 92 Z" fill="${a.hair}" stroke="${O}" stroke-width="3"/>`,
    buzz: `<path d="M52 62 Q54 38 80 38 Q106 38 108 62 Q94 52 80 52 Q66 52 52 62 Z" fill="${a.hair}" stroke="${O}" stroke-width="3" opacity="0.95"/>`,
    bun: `<path d="M50 68 Q50 40 80 38 Q110 40 110 68 Q96 52 80 52 Q64 52 50 68 Z" fill="${a.hair}" stroke="${O}" stroke-width="3"/>`,
    side: `<path d="M50 70 Q46 36 82 34 Q114 36 110 66 Q96 46 66 54 Q58 60 50 70 Z" fill="${a.hair}" stroke="${O}" stroke-width="3"/>`,
  }[a.style] || '';
  const glasses = a.glasses ? `<g fill="none" stroke="${O}" stroke-width="3"><rect x="58" y="70" width="18" height="14" rx="5"/><rect x="84" y="70" width="18" height="14" rx="5"/><path d="M76 76 H84"/></g>` : '';
  const body = `
   ${withBg ? `<circle cx="80" cy="80" r="78" fill="${a.bg}" stroke="${O}" stroke-width="3"/>` : ''}
   <clipPath id="cl${i}"><circle cx="80" cy="80" r="76"/></clipPath>
   <g clip-path="url(#cl${i})">
    ${hairBack}
    <path d="M22 168 Q24 120 80 116 Q136 120 138 168 Z" fill="${a.outfit}" stroke="${O}" stroke-width="3"/>
    <path d="M66 118 L80 146 L94 118 Z" fill="${a.shirt}" stroke="${O}" stroke-width="2.5"/>
    <rect x="70" y="98" width="20" height="22" rx="6" fill="${a.skin}" stroke="${O}" stroke-width="3"/>
    <ellipse cx="80" cy="74" rx="30" ry="34" fill="${a.skin}" stroke="${O}" stroke-width="3"/>
    <circle cx="68" cy="77" r="3.5" fill="${O}"/><circle cx="92" cy="77" r="3.5" fill="${O}"/>
    <path d="M70 92 Q80 99 90 92" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="62" cy="88" r="4" fill="#E87F6B" opacity="0.35"/><circle cx="98" cy="88" r="4" fill="#E87F6B" opacity="0.35"/>
    ${hairFront}${glasses}
   </g>`;
  return svg(size, size, `<g transform="scale(${size / 160})">${body}</g>`);
}

// ---------------- Small icons ----------------
export const ICON = {
  coin: (s = 32) => svg(s, s, `<g transform="scale(${s / 32})"><circle cx="16" cy="16" r="14" fill="${C.orange}" stroke="${O}" stroke-width="2.5"/><circle cx="16" cy="16" r="9" fill="none" stroke="#FFD27A" stroke-width="2.5"/><path d="M10 10 A9 9 0 0 1 18 7" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/></g>`),
  heart: (s = 30, full = true) => svg(s, s, `<g transform="scale(${s / 30})"><path d="M15 26 C4 18 2 12 4 8 C6 3 12 3 15 8 C18 3 24 3 26 8 C28 12 26 18 15 26 Z" fill="${full ? C.verm : 'none'}" stroke="${full ? '#fff' : '#8A94A6'}" stroke-width="${full ? 2.5 : 2.5}" ${full ? '' : 'stroke-dasharray="3 2"'}/></g>`),
  flame: (s = 30, col = C.orange) => svg(s, s, `<g transform="scale(${s / 30})"><path d="M15 28 C7 28 4 21 7 15 C9 11 12 10 12 4 C17 8 18 11 18 14 C20 12 21 10 21 8 C26 13 26 19 24 23 C22 26 19 28 15 28 Z" fill="${col}" stroke="${O}" stroke-width="2"/><path d="M15 26 C11 26 10 22 12 19 C13 17 15 16 15 13 C18 16 19 19 18 22 C17 25 16 26 15 26Z" fill="#FFF3A0"/></g>`),
  pu_peek: (s = 48) => svg(s, s, `<g transform="scale(${s / 48})"><circle cx="20" cy="20" r="13" fill="#DFF3FF" stroke="${O}" stroke-width="3.5"/><path d="M29 29 L42 42" stroke="${O}" stroke-width="6" stroke-linecap="round"/><path d="M14 20 h12 M20 14 v12" stroke="${C.blue}" stroke-width="3" stroke-linecap="round"/></g>`),
  pu_slow: (s = 48) => svg(s, s, `<g transform="scale(${s / 48})"><circle cx="24" cy="25" r="17" fill="#FFF6E5" stroke="${O}" stroke-width="3.5"/><path d="M24 25 V14 M24 25 L32 29" stroke="${O}" stroke-width="3.5" stroke-linecap="round"/><path d="M8 10 Q4 18 7 24" stroke="${C.sky}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`),
  pu_shield: (s = 48) => svg(s, s, `<g transform="scale(${s / 48})"><path d="M24 4 L40 10 V22 C40 33 33 40 24 44 C15 40 8 33 8 22 V10 Z" fill="${C.green}" stroke="${O}" stroke-width="3.5"/><path d="M17 24 L22 29 L31 18" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`),
  pu_double: (s = 48) => svg(s, s, `<g transform="scale(${s / 48})"><circle cx="24" cy="24" r="19" fill="${C.yellow}" stroke="${O}" stroke-width="3.5"/><path d="M14 18 L22 30 M22 18 L14 30" stroke="${O}" stroke-width="3.5" stroke-linecap="round"/><path d="M26 20 Q30 15 33 19 Q35 23 26 30 H35" stroke="${O}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`),
  pu_heart: (s = 48) => svg(s, s, `<g transform="scale(${s / 48})"><path d="M24 42 C8 31 4 22 7 15 C10 8 19 8 24 15 C29 8 38 8 41 15 C44 22 40 31 24 42 Z" fill="${C.verm}" stroke="${O}" stroke-width="3.5"/><path d="M24 20 V32 M18 26 H30" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g>`),
  lock: (s = 30) => svg(s, s, `<g transform="scale(${s / 30})"><rect x="6" y="13" width="18" height="14" rx="3" fill="${C.navy}"/><path d="M10 13 V9 a5 5 0 0 1 10 0 V13" stroke="${C.navy}" stroke-width="3" fill="none"/></g>`),
  gear: (s = 30) => svg(s, s, `<g transform="scale(${s / 30})"><circle cx="15" cy="15" r="8" fill="none" stroke="${C.navy}" stroke-width="4"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="13" y="1" width="4" height="6" rx="1" fill="${C.navy}" transform="rotate(${a} 15 15)"/>`).join('')}</g>`),
  star: (s = 40, on = true) => svg(s, s, `<g transform="scale(${s / 40})"><path d="M20 3 L25 14 L37 15 L28 23 L31 35 L20 29 L9 35 L12 23 L3 15 L15 14 Z" fill="${on ? C.yellow : '#E3E7EE'}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/></g>`),
};

// Concept icons for Level 1 (44x44)
export function conceptIcon(key, s = 44) {
  const g = {
    entity: `<path d="M4 22 L12 14 L20 22 V36 H4Z" fill="#fff" stroke="${O}" stroke-width="2.5"/><path d="M24 20 L33 11 L42 20 V36 H24Z" fill="${C.sky}" stroke="${O}" stroke-width="2.5"/><path d="M22 8 V40" stroke="${O}" stroke-width="2" stroke-dasharray="3 3"/>`,
    goingconcern: `<circle cx="22" cy="22" r="17" fill="#fff" stroke="${O}" stroke-width="2.5"/><path d="M12 22 C12 16 19 16 22 22 C25 28 32 28 32 22 C32 16 25 16 22 22 C19 28 12 28 12 22Z" fill="none" stroke="${C.green}" stroke-width="3"/>`,
    period: `<rect x="6" y="9" width="32" height="29" rx="4" fill="#fff" stroke="${O}" stroke-width="2.5"/><path d="M6 17 H38 M22 17 V38 M6 27 H38" stroke="${O}" stroke-width="2"/><rect x="6" y="9" width="32" height="8" fill="${C.verm}" opacity=".8"/>`,
    money: `<rect x="4" y="26" width="36" height="10" rx="2" fill="${C.yellow}" stroke="${O}" stroke-width="2.5"/><path d="M10 26 V31 M16 26 V30 M22 26 V31 M28 26 V30 M34 26 V31" stroke="${O}" stroke-width="2"/><path d="M22 4 V22 M27 8 Q22 5 18 8 Q15 12 22 13 Q29 14 26 19 Q22 22 17 19" stroke="${C.green}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    histcost: `<path d="M9 4 H35 V40 L31 37 L27 40 L23 37 L19 40 L15 37 L9 40 Z" fill="#F3E3C3" stroke="${O}" stroke-width="2.5"/><path d="M14 13 H30 M14 20 H30 M14 27 H24" stroke="#9A7B4F" stroke-width="2.5"/>`,
    consistency: `${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${5 + c * 12}" y="${5 + r * 12}" width="10" height="10" rx="2" fill="${C.sky}" stroke="${O}" stroke-width="2"/>`).join('')).join('')}`,
    accrual: `<rect x="3" y="6" width="22" height="22" rx="3" fill="#fff" stroke="${O}" stroke-width="2.5"/><path d="M8 17 L13 22 L21 12" stroke="${C.green}" stroke-width="3" fill="none"/><rect x="18" y="24" width="23" height="14" rx="2" fill="#9FD9B7" stroke="${O}" stroke-width="2.5"/><circle cx="29.5" cy="31" r="3.5" fill="none" stroke="${O}" stroke-width="2"/>`,
    matching: `<path d="M4 10 H18 V16 A4 4 0 1 1 18 24 V34 H4 Z" fill="${C.orange}" stroke="${O}" stroke-width="2.5"/><path d="M22 10 H40 V34 H22 V24 A4 4 0 1 0 22 16 Z" fill="${C.sky}" stroke="${O}" stroke-width="2.5"/>`,
    dual: `<path d="M6 16 H34 L28 10 M6 28 H38 M38 28 L32 34" stroke="${O}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 16 L14 10" stroke="${O}" stroke-width="0"/>`,
    prudence: `<path d="M4 22 Q22 0 40 22 Z" fill="${C.purple}" stroke="${O}" stroke-width="2.5"/><path d="M22 22 V36 Q22 41 17 39" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    materiality: `<circle cx="30" cy="32" r="6" fill="${C.orange}" stroke="${O}" stroke-width="2"/><circle cx="18" cy="18" r="12" fill="#DFF3FF" fill-opacity=".7" stroke="${O}" stroke-width="3"/><path d="M27 27 L40 40" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`,
    disclosure: `<path d="M4 8 Q13 4 22 9 Q31 4 40 8 V38 Q31 34 22 39 Q13 34 4 38 Z" fill="#fff" stroke="${O}" stroke-width="2.5"/><path d="M22 9 V39" stroke="${O}" stroke-width="2"/><path d="M27 16 H35 M27 22 H35 M9 16 H17 M9 22 H17" stroke="#8C9BB0" stroke-width="2"/><circle cx="12" cy="30" r="3" fill="${C.verm}"/>`,
    objectivity: `<rect x="6" y="5" width="26" height="33" rx="2" fill="#fff" stroke="${O}" stroke-width="2.5"/><path d="M11 12 H27 M11 18 H27" stroke="#8C9BB0" stroke-width="2"/><circle cx="30" cy="30" r="10" fill="none" stroke="${C.verm}" stroke-width="3"/><path d="M25 30 L29 34 L35 26" stroke="${C.verm}" stroke-width="3" fill="none"/>`,
  }[key] || `<circle cx="22" cy="22" r="16" fill="#fff" stroke="${O}" stroke-width="2.5"/>`;
  return svg(s, s, `<g transform="scale(${s / 44})">${g}</g>`);
}

// Crate icons for Level 3 (48x48)
export function crateIcon(key, s = 48) {
  const g = {
    gear: `<circle cx="24" cy="24" r="10" fill="#C9CED6" stroke="${O}" stroke-width="3"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="21" y="4" width="6" height="8" rx="1.5" fill="#C9CED6" stroke="${O}" stroke-width="2" transform="rotate(${a} 24 24)"/>`).join('')}<circle cx="24" cy="24" r="4" fill="${O}"/>`,
    boxes: `<rect x="4" y="22" width="20" height="20" fill="#D8B27C" stroke="${O}" stroke-width="2.5"/><rect x="24" y="22" width="20" height="20" fill="#E6C493" stroke="${O}" stroke-width="2.5"/><rect x="14" y="4" width="20" height="18" fill="#D8B27C" stroke="${O}" stroke-width="2.5"/>`,
    invoice_out: `<rect x="6" y="4" width="24" height="34" rx="2" fill="#fff" stroke="${O}" stroke-width="2.5"/><path d="M11 12 H25 M11 18 H25 M11 24 H20" stroke="#8C9BB0" stroke-width="2"/><path d="M26 34 H44 M38 28 L44 34 L38 40" stroke="${C.verm}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    certificate: `<rect x="3" y="8" width="42" height="30" rx="3" fill="#FFF6E5" stroke="${O}" stroke-width="2.5"/><rect x="7" y="12" width="34" height="22" fill="none" stroke="${C.green}" stroke-width="2"/><circle cx="34" cy="36" r="7" fill="${C.verm}" stroke="${O}" stroke-width="2"/>`,
    handshake: `<path d="M2 22 L14 14 L24 20 L34 14 L46 22 L34 34 Q30 38 26 34 L22 30 Q18 34 14 30 Z" fill="${C.yellow}" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>`,
    calendar_coin: `<rect x="3" y="8" width="30" height="30" rx="3" fill="#fff" stroke="${O}" stroke-width="2.5"/><rect x="3" y="8" width="30" height="9" fill="${C.sky}" stroke="${O}" stroke-width="2.5"/><circle cx="35" cy="34" r="10" fill="${C.orange}" stroke="${O}" stroke-width="2.5"/>`,
    vault: `<rect x="5" y="6" width="38" height="36" rx="4" fill="#9AA6B8" stroke="${O}" stroke-width="2.5"/><circle cx="24" cy="24" r="10" fill="#C9CED6" stroke="${O}" stroke-width="2.5"/><path d="M24 16 V32 M16 24 H32" stroke="${O}" stroke-width="2.5"/>`,
    bank_minus: `<path d="M4 18 L24 6 L44 18 Z" fill="#C9CED6" stroke="${O}" stroke-width="2.5"/><path d="M9 20 V36 M19 20 V36 M29 20 V36 M39 20 V36" stroke="${O}" stroke-width="3.5"/><rect x="4" y="36" width="40" height="5" fill="#C9CED6" stroke="${O}" stroke-width="2"/><circle cx="38" cy="10" r="8" fill="${C.verm}" stroke="${O}" stroke-width="2"/><path d="M34 10 H42" stroke="#fff" stroke-width="3"/>`,
    bank_long: `<path d="M4 18 L24 6 L44 18 Z" fill="#C9CED6" stroke="${O}" stroke-width="2.5"/><path d="M9 20 V36 M19 20 V36 M29 20 V36 M39 20 V36" stroke="${O}" stroke-width="3.5"/><rect x="4" y="36" width="40" height="5" fill="#C9CED6" stroke="${O}" stroke-width="2"/>`,
    wallet_clock: `<rect x="3" y="14" width="32" height="24" rx="4" fill="#9C6B3F" stroke="${O}" stroke-width="2.5"/><circle cx="36" cy="14" r="10" fill="#fff" stroke="${O}" stroke-width="2.5"/><path d="M36 14 V8 M36 14 L40 16" stroke="${O}" stroke-width="2.5"/>`,
    bicycle: `<circle cx="12" cy="32" r="9" fill="none" stroke="${O}" stroke-width="3"/><circle cx="36" cy="32" r="9" fill="none" stroke="${O}" stroke-width="3"/><path d="M12 32 L20 18 H32 L36 32 M20 18 L26 32 L32 18 M18 14 H24" stroke="${C.verm}" stroke-width="3" fill="none" stroke-linejoin="round"/>`,
    cash: `<rect x="3" y="12" width="36" height="20" rx="3" fill="#9FD9B7" stroke="${O}" stroke-width="2.5"/><circle cx="21" cy="22" r="5" fill="none" stroke="${O}" stroke-width="2"/><circle cx="38" cy="34" r="8" fill="${C.orange}" stroke="${O}" stroke-width="2.5"/>`,
    gavel: `<rect x="6" y="10" width="22" height="10" rx="3" fill="#9C6B3F" stroke="${O}" stroke-width="2.5" transform="rotate(-30 17 15)"/><path d="M20 20 L36 40" stroke="${O}" stroke-width="5" stroke-linecap="round"/><rect x="4" y="38" width="22" height="6" rx="2" fill="#9C6B3F" stroke="${O}" stroke-width="2"/>`,
    house: `<path d="M4 22 L24 6 L44 22 V42 H4 Z" fill="#FCE3B0" stroke="${O}" stroke-width="2.5"/><rect x="19" y="28" width="10" height="14" fill="${C.sky}" stroke="${O}" stroke-width="2"/><path d="M30 6 L40 6 L40 14" fill="none" stroke="${O}" stroke-width="0"/>`,
    scroll: `<rect x="8" y="8" width="32" height="32" rx="2" fill="#FFF6E5" stroke="${O}" stroke-width="2.5"/><circle cx="8" cy="12" r="5" fill="#E6C493" stroke="${O}" stroke-width="2"/><circle cx="40" cy="36" r="5" fill="#E6C493" stroke="${O}" stroke-width="2"/><path d="M14 18 H34 M14 24 H34 M14 30 H26" stroke="#8C9BB0" stroke-width="2"/>`,
    patent: `<rect x="5" y="5" width="30" height="36" rx="2" fill="#fff" stroke="${O}" stroke-width="2.5"/><path d="M10 13 H30 M10 19 H30" stroke="#8C9BB0" stroke-width="2"/><circle cx="32" cy="32" r="8" fill="${C.yellow}" stroke="${O}" stroke-width="2.5"/><path d="M28 38 L26 46 L32 42 L38 46 L36 38" fill="${C.verm}" stroke="${O}" stroke-width="2"/>`,
  }[key] || `<rect x="8" y="8" width="32" height="32" rx="4" fill="#E6C493" stroke="${O}" stroke-width="2.5"/>`;
  return svg(s, s, `<g transform="scale(${s / 48})">${g}</g>`);
}

// ---------------- Generic props ----------------
export function card(w, h, { tab = false, seal = false, glow = false, fill = C.cream } = {}) {
  const body = `
   ${glow ? `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="16" fill="none" stroke="#7FE7F5" stroke-width="6" opacity=".6"/>` : ''}
   <rect x="5" y="${tab ? 14 : 6}" width="${w - 10}" height="${h - (tab ? 20 : 12)}" rx="12" fill="#000" opacity=".15" transform="translate(4 5)"/>
   ${tab ? `<path d="M16 16 V8 Q16 4 20 4 H90 Q96 4 98 10 L100 16 Z" fill="#F3DFB8" stroke="${O}" stroke-width="3"/>` : ''}
   <rect x="5" y="${tab ? 14 : 6}" width="${w - 10}" height="${h - (tab ? 20 : 12)}" rx="12" fill="${fill}" stroke="${O}" stroke-width="3"/>
   ${tab ? `<path d="M${w / 2 - 12} ${h - 6} q-6 10 -16 12 M${w / 2 + 6} ${h - 6} q6 10 16 12" stroke="${O}" stroke-width="2.5" fill="none"/><circle cx="${w / 2}" cy="${h - 7}" r="5" fill="#fff" stroke="${O}" stroke-width="2.5"/>` : ''}
   ${seal ? `<circle cx="${w - 30}" cy="${tab ? 34 : 26}" r="11" fill="${C.verm}" stroke="${O}" stroke-width="2.5"/><circle cx="${w - 30}" cy="${tab ? 34 : 26}" r="5" fill="none" stroke="#FFD2B8" stroke-width="2"/>` : ''}`;
  return svg(w, h + 8, body);
}

export function basket(w, h, color, pat, heavy = false) {
  const pid = 'p' + pat;
  return svg(w, h, `
   <path d="M10 14 H${w - 10} L${w - 22} ${h - 6} H22 Z" fill="${color}" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>
   <path d="M10 14 H${w - 10} L${w - 22} ${h - 6} H22 Z" fill="url(#${pid})"/>
   ${Array.from({ length: 6 }, (_, i) => `<path d="M${18 + i * (w - 36) / 5} 16 L${26 + i * (w - 52) / 5} ${h - 8}" stroke="${O}" stroke-width="1.5" opacity=".35"/>`).join('')}
   <rect x="4" y="6" width="${w - 8}" height="12" rx="6" fill="#DCE3EA" stroke="${O}" stroke-width="3"/>`,
    pattern(pid, pat, '#fff', heavy ? 0.85 : 0.45, heavy ? 14 : 16));
}

export function fileCart(w = 760) {
  return svg(w, 120, `
   <rect x="20" y="10" width="${w - 40}" height="26" rx="8" fill="#A9B4C2" stroke="${O}" stroke-width="3.5"/>
   <rect x="30" y="36" width="${w - 60}" height="10" fill="#7E8A99" stroke="${O}" stroke-width="3"/>
   <path d="M${w - 30} 14 L${w - 6} -6" stroke="${O}" stroke-width="8" stroke-linecap="round"/>
   ${[60, w / 2, w - 60].map((x) => `<path d="M${x} 46 V70" stroke="${O}" stroke-width="5"/><circle cx="${x}" cy="84" r="20" fill="#3A3F47" stroke="${O}" stroke-width="3.5"/><circle cx="${x}" cy="84" r="7" fill="#C9CED6"/>`).join('')}`);
}

export function stamp(text = '', w = 210, color = C.green) {
  return svg(w, 70, `<rect x="5" y="5" width="${w - 10}" height="60" rx="10" fill="none" stroke="${color}" stroke-width="6"/><rect x="13" y="13" width="${w - 26}" height="44" rx="6" fill="none" stroke="${color}" stroke-width="2"/>`);
}
