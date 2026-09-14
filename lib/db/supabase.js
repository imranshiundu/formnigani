'use client';

// Supabase provider — same interface as memory.js.
// TEMPORARY hosted backend: when we move to our own servers/VPS, this file
// gets replaced by an api.js hitting our endpoints. Nothing else changes.
import { getBrowser } from './client';
import { AVA, IMGP, hydrate } from '@/lib/client-store';

function rowToForm(r, host) {
  return hydrate({
    id: r.id,
    title: r.title,
    area: r.area,
    seed: r.seed,
    img: r.img,
    live: r.live,
    km: Number(r.km),
    eta: r.eta,
    ends: r.ends,
    startsShort: r.starts_short,
    going: r.going,
    hype: r.hype,
    viewers: r.viewers,
    tonight: r.tonight,
    free: r.free,
    capacity: r.capacity,
    avs: r.avs || [],
    desc: r.description,
    tags: r.tags || [],
    postedH: r.posted_at ? Math.max(0, Math.round((Date.now() - new Date(r.posted_at).getTime()) / 3600000)) : 0,
    host: host
      ? { name: host.name, handle: host.handle, ava: host.ava, photo: host.avatar_url }
      : { name: r.host_name, handle: r.host_handle, ava: r.host_ava, photo: r.host_avatar_url },
  });
}

export function toComment(r) {
  return {
    id: r.id,
    formId: r.form_id,
    user: { name: r.author_name, handle: r.author_handle, ava: r.author_ava, photo: r.author_avatar_url },
    body: r.body,
    parentId: r.parent_id,
    ts: new Date(r.created_at).getTime(),
  };
}

function rowToComment(r) {
  return toComment(r);
}

export const supabaseDb = {
  name: 'supabase',

  async feed() {
    const sb = getBrowser();
    const [{ data: forms }, { data: profiles }] = await Promise.all([
      sb.from('forms').select('*').order('posted_at', { ascending: false }).limit(60),
      sb.from('profiles').select('*'),
    ]);
    const byId = new Map((profiles || []).map((p) => [p.id, p]));
    const list = (forms || []).map((r) => rowToForm(r, r.host_id ? byId.get(r.host_id) : null));
    const taken = (profiles || []).map((p) => String(p.handle).replace(/^@/, '').toLowerCase());
    const tagSet = [];
    list.forEach((f) => (f.tags || []).forEach((t) => { if (!tagSet.includes(t)) tagSet.push(t); }));
    return { forms: list, meta: { notifs: null, taken, tags: tagSet, recents: tagSet.slice(0, 4) } };
  },

  async myState(profileId) {
    const sb = getBrowser();
    const [h, j, s] = await Promise.all([
      sb.from('hypes').select('form_id').eq('profile_id', profileId),
      sb.from('rsvps').select('form_id,status').eq('profile_id', profileId),
      sb.from('saves').select('form_id').eq('profile_id', profileId),
    ]);
    return {
      hypes: (h.data || []).map((x) => x.form_id),
      joins: (j.data || []).filter((x) => x.status === 'going').map((x) => x.form_id),
      maybes: (j.data || []).filter((x) => x.status === 'maybe').map((x) => x.form_id),
      saves: (s.data || []).map((x) => x.form_id),
    };
  },

  async hype(id, action, profileId) {
    const sb = getBrowser();
    if (action === 'remove') await sb.from('hypes').delete().match({ form_id: id, profile_id: profileId });
    else await sb.from('hypes').upsert({ form_id: id, profile_id: profileId }, { onConflict: 'form_id,profile_id' });
    const { count } = await sb.from('hypes').select('*', { count: 'exact', head: true }).eq('form_id', id);
    await sb.from('forms').update({ hype: count ?? 0 }).eq('id', id);
    return count ?? 0;
  },

  async join(id, action, profileId) {
    const sb = getBrowser();
    if (action === 'leave') await sb.from('rsvps').delete().match({ form_id: id, profile_id: profileId });
    else
      await sb.from('rsvps').upsert({ form_id: id, profile_id: profileId, status: 'going' }, { onConflict: 'form_id,profile_id' });
    const { count } = await sb.from('rsvps').select('*', { count: 'exact', head: true }).eq('form_id', id).eq('status', 'going');
    await sb.from('forms').update({ going: count ?? 0 }).eq('id', id);
    return count ?? 0;
  },

  async save(id, on, profileId) {
    const sb = getBrowser();
    if (on) await sb.from('saves').upsert({ form_id: id, profile_id: profileId }, { onConflict: 'form_id,profile_id' });
    else await sb.from('saves').delete().match({ form_id: id, profile_id: profileId });
  },

  async createForm(payload, profile) {
    const sb = getBrowser();
    const row = {
      id: 'u' + Date.now(),
      host_id: profile?.id || null,
      host_name: profile?.name || payload.host?.name || 'Someone',
      host_handle: profile?.handle || payload.host?.handle || '@someone',
      host_avatar_url: profile?.avatar_url || payload.host?.photo || null,
      title: payload.title,
      description: payload.desc || '',
      area: payload.area || 'Near you',
      km: 1.5,
      eta: '5 min',
      ends: 'Ending soon',
      starts_short: 'Just now',
      going: 1,
      tonight: true,
      free: true,
      img: payload.img || IMGP('fng-default' + (Date.now() % 7), 800, 600),
      tags: [],
    };
    const { data, error } = await sb.from('forms').insert(row).select().single();
    if (error) throw new Error(error.message);
    if (profile?.id) {
      await sb.from('rsvps').upsert({ form_id: data.id, profile_id: profile.id, status: 'going' }, { onConflict: 'form_id,profile_id' });
    }
    return rowToForm(data, profile ? { name: profile.name, handle: profile.handle, avatar_url: profile.avatar_url } : null);
  },

  async comments(formId) {
    const sb = getBrowser();
    const { data } = await sb.from('comments').select('*').eq('form_id', formId).order('created_at').limit(100);
    return (data || []).map(rowToComment);
  },

  async postComment({ formId, body, parentId, profile }) {
    const sb = getBrowser();
    const row = {
      id: 'c' + Date.now() + Math.floor(Math.random() * 1000),
      form_id: formId,
      profile_id: profile?.id || null,
      author_name: profile?.name || 'Someone',
      author_handle: profile?.handle || '@someone',
      author_avatar_url: profile?.avatar_url || null,
      body,
      parent_id: parentId,
    };
    const { data, error } = await sb.from('comments').insert(row).select().single();
    if (error) throw new Error(error.message);
    return rowToComment(data);
  },

  async profileByHandle(handle) {
    const sb = getBrowser();
    const { data } = await sb.from('profiles').select('*').ilike('handle', handle).single();
    return data || null;
  },

  async updateProfile(id, patch) {
    const sb = getBrowser();
    const { data, error } = await sb.from('profiles').update(patch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  profilePhoto(p) {
    if (!p) return AVA(12);
    return p.avatar_url || AVA(p.ava ?? 12);
  },

  subscribe(cb) {
    const sb = getBrowser();
    if (!sb) return () => {};
    const ch = sb
      .channel('fng-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forms' }, () => cb({ kind: 'forms' }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (p) => cb({ kind: 'comment', row: p.new }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hypes' }, (p) => cb({ kind: 'hype', row: p.new || p.old }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, (p) => cb({ kind: 'rsvp', row: p.new || p.old }))
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  },
};
