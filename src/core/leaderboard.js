// Leaderboard: local (localStorage) always; shared Google Sheet via Apps Script when LEADERBOARD_URL is set.
import { S, classCode } from './state.js';

const KEY = 'aa_leaderboard_v1';
export function localBoard() { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
export function clearLocalBoard() { localStorage.removeItem(KEY); }
export function sortBoard(rows) {
  return rows.slice().sort((a, b) => b.total - a.total || b.accuracy - a.accuracy || a.time_s - b.time_s);
}
export function addLocal(entry) {
  const rows = localBoard(); rows.push(entry);
  localStorage.setItem(KEY, JSON.stringify(sortBoard(rows).slice(0, 200)));
}
export function sharedEnabled() { return !!(S.config && S.config.LEADERBOARD_URL); }

export async function submitShared(entry) {
  if (!sharedEnabled()) return { ok: false, reason: 'off' };
  try {
    // text/plain avoids a CORS pre-flight, which Apps Script web apps cannot answer.
    const res = await fetch(S.config.LEADERBOARD_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(entry) });
    const j = await res.json().catch(() => ({}));
    return { ok: !!j.ok };
  } catch (e) { return { ok: false, reason: e.message }; }
}
export async function fetchShared(code = classCode()) {
  if (!sharedEnabled()) return null;
  try {
    const url = S.config.LEADERBOARD_URL + (S.config.LEADERBOARD_URL.includes('?') ? '&' : '?') + 'class=' + encodeURIComponent(code) + '&limit=20';
    const res = await fetch(url);
    const j = await res.json();
    return Array.isArray(j.rows) ? j.rows : [];
  } catch { return null; }
}
