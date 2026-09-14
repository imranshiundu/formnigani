'use client';

// Local persistence (session-scoped UI state only). All content data comes
// from the backend — nothing is hardcoded here.
export const IMGP = (s, w, h) => `https://picsum.photos/seed/${s}/${w}/${h}`;
export const AVA = (n) => `https://i.pravatar.cc/64?img=${n}`;
export const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n ?? 0));
export function hostPhoto(host) {
  if (!host) return AVA(12);
  if (host.photo) return host.photo;
  return AVA(host.ava ?? 12);
}
export function hydrateComment(c) {
  return { ...c, ts: c.ts || Date.now() - (c.minAgo || 60) * 60000 };
}

// Posted comments are cached locally so they survive reloads while the
// prototype has no database. // [BACKEND]
const CKEY = 'fng_comments';
export function loadCommentCache() {
  try {
    return JSON.parse(localStorage.getItem(CKEY) || '{}');
  } catch {
    return {};
  }
}
export function cacheComment(c) {
  try {
    const all = loadCommentCache();
    const list = all[c.formId] || [];
    if (!list.some((x) => x.id === c.id)) list.push(c);
    all[c.formId] = list.slice(-50);
    localStorage.setItem(CKEY, JSON.stringify(all));
  } catch {}
}

export function hydrate(f) {
  return { hype: 0, viewers: 0, ...f, img: f.img || IMGP(f.seed || 'fng-default', 800, 600) };
}

const KEY = 'fng_v1';
export function loadState() {
  try {
    const s = Object.assign(
      { user: null, saves: [], joins: [], hypes: [], ob: false },
      JSON.parse(localStorage.getItem(KEY) || '{}')
    );
    if (!Array.isArray(s.hypes)) s.hypes = [];
    return s;
  } catch {
    return { user: null, saves: [], joins: [], hypes: [], ob: false };
  }
}
export function persistState(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
