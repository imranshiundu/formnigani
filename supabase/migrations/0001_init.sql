-- FormNiGani initial schema. Supabase is the hosted backend for now;
-- every table here maps 1:1 to the future self-hosted Postgres in fng.txt §11.
-- Run: supabase db push  (or psql < this file with the pooler URL)

-- ---------- profiles ----------
create table if not exists profiles (
  id uuid primary key,
  handle text unique not null,
  name text not null default 'Someone',
  avatar_url text,
  ava int,
  vibes text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- areas ----------
create table if not exists areas (
  id serial primary key,
  name text unique not null,
  city text not null default 'Nairobi'
);

-- ---------- forms ----------
create table if not exists forms (
  id text primary key,
  host_id uuid references profiles(id) on delete set null,
  host_name text not null default 'Someone',
  host_handle text not null default '@someone',
  host_ava int,
  host_avatar_url text,
  title text not null,
  description text not null default '',
  area text not null default 'Near you',
  km numeric not null default 1,
  eta text not null default '10 min',
  ends text not null default 'Ending soon',
  starts_short text not null default 'Starting soon',
  live boolean not null default false,
  viewers int not null default 0,
  going int not null default 0,
  hype int not null default 0,
  tonight boolean not null default false,
  free boolean not null default true,
  capacity int,
  posted_at timestamptz not null default now(),
  tags text[] not null default '{}',
  img text,
  seed text,
  avs int[] not null default '{}'
);
create index if not exists forms_live_idx on forms (live) where live;
create index if not exists forms_posted_idx on forms (posted_at desc);

-- ---------- rsvps (going / maybe ladder) ----------
create table if not exists rsvps (
  form_id text references forms(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  status text not null check (status in ('going','maybe')),
  created_at timestamptz not null default now(),
  primary key (form_id, profile_id)
);

-- ---------- hypes ----------
create table if not exists hypes (
  form_id text references forms(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (form_id, profile_id)
);

-- ---------- saves ----------
create table if not exists saves (
  form_id text references forms(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (form_id, profile_id)
);

-- ---------- comments ----------
create table if not exists comments (
  id text primary key,
  form_id text references forms(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  author_name text not null default 'Someone',
  author_handle text not null default '@someone',
  author_ava int,
  author_avatar_url text,
  body text not null,
  parent_id text references comments(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists comments_form_idx on comments (form_id, created_at);

-- ---------- notifications ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  form_id text references forms(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_profile_idx on notifications (profile_id, created_at desc);

-- ---------- auto-profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, name)
  values (new.id, '@user_' || substr(new.id::text, 1, 8), coalesce(new.raw_user_meta_data->>'name', 'Someone'))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table areas enable row level security;
alter table forms enable row level security;
alter table rsvps enable row level security;
alter table hypes enable row level security;
alter table saves enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;

-- public read (fast anonymous discovery)
create policy "public read profiles" on profiles for select to anon, authenticated using (true);
create policy "public read areas" on areas for select to anon, authenticated using (true);
create policy "public read forms" on forms for select to anon, authenticated using (true);
create policy "public read comments" on comments for select to anon, authenticated using (true);

-- owner write
create policy "owner update profile" on profiles for update to authenticated using (auth.uid() = id);
create policy "auth insert forms" on forms for insert to authenticated with check (true);
create policy "host update forms" on forms for update to authenticated using (host_id = auth.uid());

create policy "own rsvps" on rsvps for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "own hypes" on hypes for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "own saves" on saves for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "auth insert comments" on comments for insert to authenticated with check (true);
create policy "own notifications" on notifications for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------- realtime ----------
alter publication supabase_realtime add table forms;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table hypes;
alter publication supabase_realtime add table rsvps;
alter publication supabase_realtime add table notifications;
