-- Bio, statuses (user stories), and public rsvp visibility for profile tabs.
alter table profiles add column if not exists bio text not null default '';

-- Attending is social proof: profiles show events a person attended.
drop policy if exists "public read rsvps" on rsvps;
create policy "public read rsvps" on rsvps for select to anon, authenticated using (true);

-- User statuses: text + optional music track. Expire after 24h (client filters).
create table if not exists statuses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','music')),
  body text not null default '',
  track_name text,
  track_url text,
  bg text not null default '#A21CAF',
  created_at timestamptz not null default now()
);
create index if not exists statuses_created_idx on statuses (created_at desc);

alter table statuses enable row level security;
create policy "public read statuses" on statuses for select to anon, authenticated using (true);
create policy "own insert statuses" on statuses for insert to authenticated with check (profile_id = auth.uid());
create policy "own delete statuses" on statuses for delete to authenticated using (profile_id = auth.uid());

alter publication supabase_realtime add table statuses;
