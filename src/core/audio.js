// Tiny WebAudio synth: sound effects and light generative music loops. No audio files needed.
import { S } from './state.js';

let ctx = null, master = null, sfxBus = null, musicBus = null, musicTimer = null, musicState = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.connect(master);
  applyVolumes();
}
export function applyVolumes() {
  if (!ctx) return;
  const m = S.settings.muted ? 0 : 1;
  master.gain.value = m;
  sfxBus.gain.value = 0.55 * S.settings.sfx;
  musicBus.gain.value = 0.16 * S.settings.music;
}
export function toggleMute() { S.settings.muted = !S.settings.muted; applyVolumes(); return S.settings.muted; }

function tone(freq, start, dur, { type = 'sine', vol = 0.5, attack = 0.005, bus = sfxBus, slide = 0 } = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, start);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(bus); o.start(start); o.stop(start + dur + 0.05);
}
function noise(start, dur, { vol = 0.3, freq = 1200, q = 0.8, type = 'bandpass', bus = sfxBus } = {}) {
  if (!ctx) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(bus); src.start(start);
}

const SFX = {
  ching: (t) => { tone(1568, t, 0.25, { type: 'triangle', vol: 0.35 }); tone(2093, t + 0.06, 0.35, { type: 'sine', vol: 0.3 }); },
  bonk: (t) => { tone(180, t, 0.22, { type: 'triangle', vol: 0.45, slide: 0.6 }); },
  arp: (t) => { [784, 988, 1175].forEach((f, i) => tone(f, t + i * 0.08, 0.2, { type: 'square', vol: 0.12 })); },
  kaching: (t) => { noise(t, 0.08, { vol: 0.25, freq: 3000 }); tone(1318, t + 0.08, 0.3, { vol: 0.3 }); tone(1760, t + 0.16, 0.45, { vol: 0.3 }); },
  shimmer: (t) => { [1320, 1760, 2093, 2637].forEach((f, i) => tone(f, t + i * 0.05, 0.4, { vol: 0.12 })); },
  click: (t) => { tone(900, t, 0.05, { type: 'square', vol: 0.08 }); },
  thud: (t) => { tone(110, t, 0.18, { type: 'sine', vol: 0.6, slide: 0.5 }); noise(t, 0.06, { vol: 0.15, freq: 400 }); },
  rustle: (t) => { noise(t, 0.25, { vol: 0.12, freq: 4000, q: 0.5, type: 'highpass' }); },
  ding: (t) => { tone(1046, t, 0.5, { vol: 0.25 }); tone(1046, t + 0.22, 0.6, { vol: 0.25 }); },
  whoosh: (t) => { noise(t, 0.35, { vol: 0.2, freq: 900, q: 0.6 }); },
  pssht: (t) => { noise(t, 0.2, { vol: 0.2, freq: 2500, q: 0.4, type: 'highpass' }); },
  boing: (t) => { tone(220, t, 0.35, { type: 'sine', vol: 0.4, slide: 2.2 }); },
  klaxon: (t) => { tone(330, t, 0.18, { type: 'sawtooth', vol: 0.1 }); tone(262, t + 0.18, 0.2, { type: 'sawtooth', vol: 0.1 }); },
  whistle: (t) => { tone(1400, t, 0.4, { type: 'sine', vol: 0.18, slide: 1.1 }); },
  ting: (t) => { tone(2349, t, 0.6, { vol: 0.25 }); tone(3136, t + 0.02, 0.5, { vol: 0.12 }); },
  creak: (t) => { tone(140, t, 0.4, { type: 'sawtooth', vol: 0.06, slide: 1.5 }); },
  clink: (t) => { tone(2600, t, 0.08, { type: 'triangle', vol: 0.2 }); },
  clunk: (t) => { tone(260, t, 0.12, { type: 'triangle', vol: 0.4, slide: 0.7 }); },
  tick: (t) => { tone(1800, t, 0.03, { type: 'square', vol: 0.06 }); },
  nitro: (t) => { noise(t, 0.5, { vol: 0.25, freq: 600, q: 0.4 }); tone(200, t, 0.5, { type: 'sawtooth', vol: 0.06, slide: 3 }); },
  squeal: (t) => { tone(1900, t, 0.35, { type: 'sawtooth', vol: 0.04, slide: 0.8 }); },
  printer: (t) => { for (let i = 0; i < 5; i++) noise(t + i * 0.04, 0.03, { vol: 0.12, freq: 2000 }); },
  cheer: (t) => { noise(t, 1.0, { vol: 0.18, freq: 1500, q: 0.3 }); SFX.arp(t + 0.1); },
  thunder: (t) => { noise(t, 1.2, { vol: 0.35, freq: 120, q: 0.4, type: 'lowpass' }); },
  plop: (t) => { tone(400, t, 0.12, { vol: 0.3, slide: 0.5 }); },
  poof: (t) => { noise(t, 0.25, { vol: 0.2, freq: 800, q: 0.5 }); },
  swish: (t) => { noise(t, 0.18, { vol: 0.2, freq: 2500, q: 1.2 }); },
  pew: (t) => { tone(1200, t, 0.14, { type: 'square', vol: 0.08, slide: 0.4 }); },
  shatter: (t) => { noise(t, 0.3, { vol: 0.2, freq: 5000, q: 0.5, type: 'highpass' }); tone(2637, t, 0.2, { vol: 0.15 }); },
  bwong: (t) => { tone(300, t, 0.35, { type: 'triangle', vol: 0.3, slide: 0.7 }); },
  fanfare: (t) => { tone(784, t, 0.18, { type: 'square', vol: 0.1 }); tone(1046, t + 0.16, 0.35, { type: 'square', vol: 0.1 }); },
  horn: (t) => { tone(196, t, 0.45, { type: 'sawtooth', vol: 0.1 }); },
  beep: (t) => { tone(1320, t, 0.06, { type: 'square', vol: 0.07 }); },
  stamp: (t) => { tone(90, t, 0.15, { vol: 0.6, slide: 0.6 }); noise(t, 0.05, { vol: 0.2, freq: 600 }); },
};
export function sfx(name) {
  if (!ctx || S.settings.muted) return;
  const f = SFX[name]; if (f) f(ctx.currentTime + 0.01);
}

// ---------- music: a small step sequencer per level ----------
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], mixo: [0, 2, 4, 5, 7, 9, 10] };
const THEMES = {
  menu: { bpm: 104, root: 60, scale: 'major', prog: [0, 5, 3, 4], lead: 'triangle', drums: 1 },
  L1: { bpm: 100, root: 62, scale: 'major', prog: [0, 3, 4, 3], lead: 'triangle', drums: 1 },
  L2: { bpm: 95, root: 57, scale: 'mixo', prog: [0, 3, 6, 3], lead: 'sine', drums: 0.6 },
  L3: { bpm: 110, root: 55, scale: 'dorian', prog: [0, 0, 3, 4], lead: 'square', drums: 1.2 },
  L4: { bpm: 128, root: 57, scale: 'minor', prog: [0, 5, 2, 6], lead: 'sawtooth', drums: 1.4 },
  L5: { bpm: 115, root: 50, scale: 'dorian', prog: [0, 6, 3, 4], lead: 'sine', drums: 1 },
  L6: { bpm: 120, root: 52, scale: 'minor', prog: [0, 5, 3, 6], lead: 'square', drums: 1.1 },
  shop: { bpm: 96, root: 60, scale: 'major', prog: [0, 3, 0, 4], lead: 'triangle', drums: 0.5 },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function playMusic(key) {
  if (!ctx) return;
  if (musicState && musicState.key === key) return;
  stopMusic();
  const th = THEMES[key] || THEMES.menu;
  const sc = SCALES[th.scale];
  const deg = (d, oct = 0) => th.root + sc[((d % 7) + 7) % 7] + 12 * (Math.floor(d / 7) + oct);
  // a deterministic melody pattern per theme
  let seed = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const melody = Array.from({ length: 32 }, (_, i) => (i % 2 === 0 || rnd() > 0.6) && rnd() > 0.25 ? Math.floor(rnd() * 5) : null);
  musicState = { key, step: 0, next: ctx.currentTime + 0.1, th, deg, melody, tempoMul: 1 };
  musicTimer = setInterval(() => {
    const st = musicState; if (!st) return;
    const spb = 60 / (st.th.bpm * st.tempoMul) / 2; // 8th notes
    while (st.next < ctx.currentTime + 0.25) {
      const i = st.step % 32, bar = Math.floor(st.step / 8) % 4, chord = st.th.prog[bar];
      const t = st.next;
      if (i % 4 === 0) tone(mtof(st.deg(chord, -2)), t, spb * 1.8, { type: 'triangle', vol: 0.5, bus: musicBus });
      if (i % 8 === 6) tone(mtof(st.deg(chord + 4, -2)), t, spb * 0.9, { type: 'triangle', vol: 0.35, bus: musicBus });
      if (i % 8 === 0) [0, 2, 4].forEach((d) => tone(mtof(st.deg(chord + d, 0)), t, spb * 6, { type: 'sine', vol: 0.06, attack: 0.08, bus: musicBus }));
      const m = st.melody[i]; if (m !== null) tone(mtof(st.deg(chord + m, 1)), t, spb * 1.2, { type: st.th.lead, vol: st.th.lead === 'sine' || st.th.lead === 'triangle' ? 0.22 : 0.06, bus: musicBus });
      if (st.th.drums) {
        if (i % 4 === 0) tone(120, t, 0.12, { vol: 0.5 * st.th.drums, slide: 0.4, bus: musicBus });
        if (i % 4 === 2) noise(t, 0.08, { vol: 0.12 * st.th.drums, freq: 1800, bus: musicBus });
        if (i % 2 === 1) noise(t, 0.03, { vol: 0.05 * st.th.drums, freq: 8000, type: 'highpass', bus: musicBus });
      }
      st.next += spb; st.step++;
    }
  }, 60);
}
export function musicTempo(mul) { if (musicState) musicState.tempoMul = mul; }
export function stopMusic() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; musicState = null; }
