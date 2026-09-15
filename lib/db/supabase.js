'use client';

// Supabase provider — same interface as memory.js.
// TEMPORARY hosted backend: when we move to our own servers/VPS, this file
// gets replaced by an api.js hitting our endpoints. Nothing else changes.
import { getBrowser } from './client';
import { AVA, IMGP, hydrate } from '@/lib/client-store';

export function rowToForm(r, host) {
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
    waLink: r.wa_link || null,
    mapLink: r.map_link || null,
    avs: r.avs || [],
    desc: r.description,
    tags: r.tags || [],
    postedH: r.posted_at ? Math.max(0, Math.round((Date.now() - new Date(r.posted_at).getTime()) / 3600000)) : 0,
    startsInH: r.starts_in_h ?? 99,
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
      map_link: payload.mapLink || null,
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

  /* ----- statuses (user stories: text + optional music) ----- */
  async listStatuses(profileId) {
    const sb = getBrowser();
    const since = new Date(Date.now() - 12 * 3600000).toISOString(); // 12-hour status window

    // If user is logged in, only show statuses from hosts of events they attended
    let query = sb.from('statuses').select('*, profiles(handle,name,ava,avatar_url)').gte('created_at', since).order('created_at', { ascending: false }).limit(30);

    if (profileId) {
      // Get form IDs the user RSVP'd to
      const { data: rsvps } = await sb.from('rsvps').select('form_id').eq('profile_id', profileId);
      if (rsvps && rsvps.length > 0) {
        const formIds = rsvps.map((r) => r.form_id);
        // Get hosts of those forms
        const { data: forms } = await sb.from('forms').select('host_handle').in('id', formIds);
        if (forms && forms.length > 0) {
          const hostHandles = [...new Set(forms.map((f) => f.host_handle).filter(Boolean))];
          if (hostHandles.length > 0) {
            // Get profile IDs of those hosts
            const { data: hosts } = await sb.from('profiles').select('id').in('handle', hostHandles);
            if (hosts && hosts.length > 0) {
              query = query.in('profile_id', hosts.map((h) => h.id));
            } else {
              // No hosts found — return empty
              return [];
            }
          } else {
            return [];
          }
        } else {
          return [];
        }
      } else {
        // User hasn't attended any events — show nothing
        return [];
      }
    }

    const { data } = await query;
    // Filter out muted users
    let muted = [];
    try { muted = JSON.parse(localStorage.getItem('fng_muted') || '[]'); } catch {}
    return (data || [])
      .filter((r) => !muted.includes(r.profiles?.handle))
      .map((r) => ({
      id: r.id,
      kind: r.kind,
      body: r.body,
      trackName: r.track_name,
      trackUrl: r.track_url,
      img: r.img || null,
      bg: r.bg,
      ts: new Date(r.created_at).getTime(),
      profile: r.profiles
        ? { handle: r.profiles.handle, name: r.profiles.name, ava: r.profiles.ava, photo: r.profiles.avatar_url }
        : null,
    }));
  },

  async addStatus(payload, profileId) {
    const sb = getBrowser();
    const { data, error } = await sb
      .from('statuses')
      .insert({
        profile_id: profileId,
        kind: payload.trackUrl ? 'music' : payload.img ? 'photo' : 'text',
        body: payload.body || '',
        track_name: payload.trackName || null,
        track_url: payload.trackUrl || null,
        img: payload.img || null,
        sticker: payload.sticker || null,
        bg: payload.bg || '#A21CAF',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  muteUser(handle) {
    try {
      const muted = JSON.parse(localStorage.getItem('fng_muted') || '[]');
      if (!muted.includes(handle)) {
        muted.push(handle);
        localStorage.setItem('fng_muted', JSON.stringify(muted));
      }
    } catch {}
  },

  unmuteUser(handle) {
    try {
      const muted = JSON.parse(localStorage.getItem('fng_muted') || '[]');
      localStorage.setItem('fng_muted', JSON.stringify(muted.filter((h) => h !== handle)));
    } catch {}
  },

  isMuted(handle) {
    try {
      return JSON.parse(localStorage.getItem('fng_muted') || '[]').includes(handle);
    } catch {
      return false;
    }
  },

  /* ----- compressed image upload (client-side canvas, then Storage) ----- */
  async uploadImage(fileOrDataUrl, { max = 800, quality = 0.78 } = {}) {
    const sb = getBrowser();
    let blob = fileOrDataUrl;
    if (typeof fileOrDataUrl === 'string') {
      blob = await (await fetch(fileOrDataUrl)).blob();
    }
    // Downscale + re-encode: big egress/quality win, no visible loss.
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const out = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    const path = `u${Date.now()}-${Math.floor(Math.random() * 9999)}.jpg`;
    const { error } = await sb.storage.from('media').upload(path, out, { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (error) throw new Error(error.message);
    const { data } = sb.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  },

  /* ----- comment hypes (comment section only) ----- */
  async hypeComment(commentId, action, profileId) {
    const sb = getBrowser();
    if (action === 'remove') await sb.from('comment_hypes').delete().match({ comment_id: commentId, profile_id: profileId });
    else await sb.from('comment_hypes').upsert({ comment_id: commentId, profile_id: profileId }, { onConflict: 'comment_id,profile_id' });
    const { count } = await sb.from('comment_hypes').select('*', { count: 'exact', head: true }).eq('comment_id', commentId);
    return count ?? 0;
  },

  async commentHypesFor(formId, profileId) {
    const sb = getBrowser();
    const { data } = await sb.from('comment_hypes').select('comment_id').eq('profile_id', profileId);
    return { mine: (data || []).map((x) => x.comment_id) };
  },

  /* ----- whatsapp group ----- */
  async setWaLink(formId, url) {
    const sb = getBrowser();
    const { error } = await sb.from('forms').update({ wa_link: url }).eq('id', formId);
    if (error) throw new Error(error.message);
  },
  async waJoin(formId, profileId) {
    const sb = getBrowser();
    await sb.from('wa_joins').upsert({ form_id: formId, profile_id: profileId }, { onConflict: 'form_id,profile_id' });
    const { count } = await sb.from('wa_joins').select('*', { count: 'exact', head: true }).eq('form_id', formId);
    return count ?? 0;
  },
  async waJoinedCount(formId) {
    const sb = getBrowser();
    const { count } = await sb.from('wa_joins').select('*', { count: 'exact', head: true }).eq('form_id', formId);
    return count ?? 0;
  },

  /* ----- DMs ----- */
  async conversations(profileId) {
    const sb = getBrowser();
    const { data } = await sb
      .from('messages')
      .select('*')
      .or(`sender.eq.${profileId},recipient.eq.${profileId}`)
      .order('created_at', { ascending: false })
      .limit(200);
    const seen = new Map();
    (data || []).forEach((m) => {
      const otherId = m.sender === profileId ? m.recipient : m.sender;
      if (!otherId || seen.has(otherId)) return;
      seen.set(otherId, { id: otherId, last: m });
    });
    return [...seen.values()];
  },

  async threadWith(profileId, otherId) {
    const sb = getBrowser();
    const { data } = await sb
      .from('messages')
      .select('*')
      .or(`and(sender.eq.${profileId},recipient.eq.${otherId}),and(sender.eq.${otherId},recipient.eq.${profileId})`)
      .order('created_at', { ascending: true })
      .limit(100);
    return data || [];
  },

  async sendMessage({ sender, recipient, body, sticker }) {
    const sb = getBrowser();
    const { data, error } = await sb
      .from('messages')
      .insert({ sender, recipient, body: body || '', sticker: sticker || null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  /* ----- profile events (attended / hosted) ----- */
  async attendedEvents(profileId) {
    const sb = getBrowser();
    const { data } = await sb
      .from('rsvps')
      .select('form_id, forms(*)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(30);
    return (data || []).filter((r) => r.forms).map((r) => rowToForm(r.forms, null));
  },

  async hostedEvents(handle) {
    const sb = getBrowser();
    const { data } = await sb.from('forms').select('*').ilike('host_handle', handle).order('posted_at', { ascending: false }).limit(30);
    return (data || []).map((r) => rowToForm(r, null));
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forms' }, (p) => cb({ kind: 'forms', type: p.eventType, row: p.new || p.old }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (p) => cb({ kind: 'comment', type: p.eventType, row: p.new }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hypes' }, (p) => cb({ kind: 'hype', type: p.eventType, row: p.new || p.old }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, (p) => cb({ kind: 'rsvp', type: p.eventType, row: p.new || p.old }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, (p) => cb({ kind: 'status', type: p.eventType, row: p.new || p.old }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_hypes' }, (p) => cb({ kind: 'comment-hype', type: p.eventType, row: p.new || p.old }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => cb({ kind: 'message', type: p.eventType, row: p.new }))
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  },
};
