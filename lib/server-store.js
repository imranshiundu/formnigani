import seed from './seed.json';

// In-memory live store. One instance per server process — perfect for the
// prototype's realtime feel. (For multi-instance production realtime we would
// back this with Upstash Redis; the API shape already supports that swap.)
const forms = seed.forms.map((f) => ({ ...f }));
const bootTime = Date.now();

// Comments live here until the real backend lands. // [BACKEND]
const comments = (seed.comments || []).map((c) => ({ ...c }));
let commentSeq = 100;

function commentTs(c) {
  return c.ts || Date.now() - (c.minAgo || 60) * 60000;
}
export function getComments(formId) {
  return comments
    .filter((c) => c.formId === formId)
    .map((c) => ({ ...c, ts: commentTs(c) }))
    .sort((a, b) => a.ts - b.ts);
}
export function addComment({ formId, body, parentId, user }) {
  const c = {
    id: 'c' + Date.now() + (commentSeq++),
    formId,
    user,
    body: body.slice(0, 280),
    parentId: parentId || null,
    ts: Date.now(),
  };
  comments.push(c);
  return { ...c };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Viewers drift with time so every read feels live, even with no timers.
export function getForms() {
  const t = Math.floor((Date.now() - bootTime) / 4000);
  return forms.map((f) => {
    const base = { ...f, commentCount: comments.filter((c) => c.formId === f.id).length };
    if (!f.live) return base;
    const wobble = Math.round(
      7 * Math.sin(t / 3 + hashStr(f.id)) + (Math.random() * 8 - 4)
    );
    return { ...base, viewers: Math.max(24, (f.baseViewers ?? f.viewers) + wobble) };
  });
}

export function getMeta() {
  return { notifs: seed.notifs, taken: seed.taken, tags: seed.tags, recents: seed.recents };
}

export function findForm(id) {
  return forms.find((f) => f.id === id);
}

export function addForm(data) {
  const f = {
    id: 'u' + Date.now(),
    live: false,
    hype: 0,
    viewers: 0,
    startsShort: 'Just now',
    km: (Math.random() * 3 + 0.3).toFixed(1),
    eta: '5 min',
    ends: 'Ending soon',
    going: 1,
    tonight: true,
    free: true,
    avs: [],
    ...data,
  };
  forms.unshift(f);
  return { ...f };
}

const listeners = new Set();
export function publish(msg) {
  const line = `data: ${JSON.stringify(msg)}\n\n`;
  listeners.forEach((send) => {
    try {
      send(line);
    } catch {
      /* drop dead clients */
    }
  });
}
export function subscribe(send) {
  listeners.add(send);
  return () => listeners.delete(send);
}

const NAMES = ['Nia', 'Otis', 'Wanjiku', 'Kevin', 'Achieng', 'Zawadi', 'Mike', 'Faith', 'Dennis', 'Sharon'];
export function randomSimEvent() {
  const pool = forms.filter((f) => f.live || Math.random() < 0.4);
  const f = pool[Math.floor(Math.random() * pool.length)] ?? forms[0];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const roll = Math.random();
  if (roll < 0.45) {
    f.going += 1;
    return { type: 'sim-join', id: f.id, going: f.going, name, title: f.title };
  }
  f.hype += 1;
  return { type: 'sim-hype', id: f.id, hype: f.hype, name, title: f.title };
}
