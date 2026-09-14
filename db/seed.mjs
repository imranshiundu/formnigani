// Seeds the Supabase backend: demo profiles, forms, comments, test users.
// NOTHING is hardcoded in the app — every screen reads from these tables.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TEST_PASSWORD=... npm run db:seed
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'FormTest123!';
if (!SB_URL || !SERVICE) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
const seed = JSON.parse(readFileSync(new URL('../lib/seed.json', import.meta.url)));

const DEMO_IDS = {
  '@nia': '11111111-1111-4111-8111-111111111111',
  '@kev': '22222222-2222-4222-8222-222222222222',
  '@dennis': '33333333-3333-4333-8333-333333333333',
  '@achi': '44444444-4444-4444-8444-444444444444',
  '@sharon': '55555555-5555-4555-8555-555555555555',
  '@mike': '66666666-6666-4666-8666-666666666666',
};

const fail = [];
const ok = (label) => console.log('ok:', label);

async function main() {
  // areas
  const areas = [...new Set(seed.forms.map((f) => f.area))].map((name) => ({ name, city: 'Nairobi' }));
  const { error: aErr } = await sb.from('areas').upsert(areas, { onConflict: 'name' });
  if (aErr) fail.push('areas: ' + aErr.message); else ok(`${areas.length} areas`);

  // demo profiles
  const hosts = {};
  seed.forms.forEach((f) => { if (f.host) hosts[f.host.handle] = f.host; });
  seed.comments.forEach((c) => { hosts[c.user.handle] = c.user; });
  for (const [handle, h] of Object.entries(hosts)) {
    const { error } = await sb.from('profiles').upsert({
      id: DEMO_IDS[handle] || `00000000-0000-4000-8000-${Buffer.from(handle).toString('hex').padEnd(12, '0').slice(0, 12)}`,
      handle, name: h.name, ava: h.ava ?? null,
    }, { onConflict: 'id' });
    if (error) fail.push(`profile ${handle}: ` + error.message);
  }
  ok(`${Object.keys(hosts).length} demo profiles`);

  // forms
  for (const f of seed.forms) {
    const { error } = await sb.from('forms').upsert({
      id: f.id,
      host_id: DEMO_IDS[f.host.handle],
      host_name: f.host.name, host_handle: f.host.handle, host_ava: f.host.ava,
      title: f.title, description: f.desc, area: f.area,
      km: f.km, eta: f.eta, ends: f.ends, starts_short: f.startsShort,
      live: f.live, viewers: f.viewers || 0, going: f.going, hype: f.hype,
      tonight: f.tonight, free: f.free, capacity: f.capacity,
      starts_in_h: f.startsInH ?? 99,
      posted_at: new Date(Date.now() - (f.postedH || 0) * 3600000).toISOString(),
      tags: f.tags || [], img: null, seed: f.seed, avs: f.avs || [],
    }, { onConflict: 'id' });
    if (error) fail.push(`form ${f.id}: ` + error.message);
  }
  ok(`${seed.forms.length} forms`);

  // comments
  for (const c of seed.comments) {
    const { error } = await sb.from('comments').upsert({
      id: c.id, form_id: c.formId,
      profile_id: DEMO_IDS[c.user.handle] || null,
      author_name: c.user.name, author_handle: c.user.handle, author_ava: c.user.ava ?? null,
      body: c.body, parent_id: c.parentId,
      created_at: new Date(Date.now() - (c.minAgo || 60) * 60000).toISOString(),
    }, { onConflict: 'id' });
    if (error) fail.push(`comment ${c.id}: ` + error.message);
  }
  ok(`${seed.comments.length} comments`);

  // test users (throwaway passwords — change after first login)
  for (const h of ['@nia', '@kev']) {
    const email = `${h.slice(1)}@test.formnigani.app`;
    const { data, error } = await sb.auth.admin.createUser({
      email, password: TEST_PASSWORD, email_confirm: true,
      user_metadata: { name: h.slice(1) },
    });
    if (error && !String(error.message).includes('already')) { fail.push(`user ${email}: ` + error.message); continue; }
    const uid = data?.user?.id || (await sb.auth.admin.listUsers()).data.users.find((u) => u.email === email)?.id;
    if (uid) {
      await sb.from('profiles').upsert({ id: uid, handle: h, name: h.slice(1) }, { onConflict: 'id' });
    }
    ok(`test user ${email}`);
  }

  if (fail.length) { console.error('FAILURES:\n- ' + fail.join('\n- ')); process.exit(2); }
  console.log('seed complete');
}
main();
