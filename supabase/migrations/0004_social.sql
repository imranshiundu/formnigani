-- WhatsApp links, comment hypes, DMs, media storage.
alter table forms add column if not exists wa_link text;

-- Who actually clicked and joined the WhatsApp group (per user per form).
create table if not exists wa_joins (
  form_id text references forms(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (form_id, profile_id)
);

-- Comment hypes: live in the comment section only, never on profiles.
create table if not exists comment_hypes (
  comment_id text references comments(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, profile_id)
);

-- DMs: the follow-up chatbox. WhatsApp stays for groups.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid references profiles(id) on delete cascade,
  recipient uuid references profiles(id) on delete cascade,
  body text not null default '',
  sticker text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_pair_idx on messages (sender, recipient, created_at);

-- Media storage: compressed images, served cached.
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

alter table wa_joins enable row level security;
alter table comment_hypes enable row level security;
alter table messages enable row level security;

create policy "public read wa_joins" on wa_joins for select to anon, authenticated using (true);
create policy "own wa_joins" on wa_joins for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "public read comment_hypes" on comment_hypes for select to anon, authenticated using (true);
create policy "own comment_hypes" on comment_hypes for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "participants read messages" on messages for select to authenticated using (sender = auth.uid() or recipient = auth.uid());
create policy "sender insert messages" on messages for insert to authenticated with check (sender = auth.uid());
create policy "participants mark read" on messages for update to authenticated using (recipient = auth.uid() or sender = auth.uid());

-- Storage policies
create policy "public read media" on storage.objects for select to anon, authenticated using (bucket_id = 'media');
create policy "auth upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media');

alter publication supabase_realtime add table wa_joins;
alter publication supabase_realtime add table comment_hypes;
alter publication supabase_realtime add table messages;
