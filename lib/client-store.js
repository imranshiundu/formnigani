'use client';

// Local persistence + seed fallback for the client.
import seed from './seed.json';

export const IMGP = (s, w, h) => `https://picsum.photos/seed/${s}/${w}/${h}`;
export const AVA = (n) => `https://i.pravatar.cc/64?img=${n}`;
export const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n ?? 0));
export function hostPhoto(host) {
  if (!host) return AVA(12);
  if (host.photo) return host.photo;
  return AVA(host.ava ?? 12);
}

export function hydrate(f) {
  return { hype: 0, viewers: 0, ...f, img: f.img || IMGP(f.seed || 'fng-default', 800, 600) };
}

export function seedForms() {
  return seed.forms.map(hydrate);
}
export function seedMeta() {
  return { notifs: seed.notifs, taken: seed.taken, tags: seed.tags, recents: seed.recents };
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
