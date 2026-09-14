'use client';

// Memory provider: talks to the local Next.js API routes (/api/*).
// Used for offline frontend work and as the fallback when Supabase
// env is missing. Same interface as supabase.js so the swap is one flag.
import { hydrate } from '@/lib/client-store';

async function json(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'request failed');
  return j;
}

export const memory = {
  name: 'memory',
  async feed() {
    const j = await json('/api/forms', { cache: 'no-store' });
    return { forms: (j.forms || []).map(hydrate), meta: { notifs: j.notifs, taken: j.taken, tags: j.tags, recents: j.recents } };
  },
  async hype(id, action) {
    const j = await json('/api/hype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    return j.hype;
  },
  async join(id, action) {
    const j = await json('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    return j.going;
  },
  async createForm(payload) {
    const j = await json('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return hydrate(j.form);
  },
  async comments(formId) {
    const j = await json(`/api/comments?formId=${formId}`, { cache: 'no-store' });
    return j.comments || [];
  },
  async postComment(payload) {
    const j = await json('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return j.comment;
  },
  subscribe() {
    return () => {}; // realtime comes from SSE in memory mode
  },
};
