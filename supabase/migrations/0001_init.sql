-- Movie Night Matchmaker — core schema
-- No user accounts: partners are identified by an anonymous localStorage id (viewer_id)
-- scoped per-browser, plus a per-session partner row (role A/B).

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'collecting'
    check (status in ('collecting', 'generating', 'swiping', 'refining', 'final_pick', 'matched', 'completed')),
  round int not null default 1,
  brief jsonb,
  pool jsonb not null default '[]'::jsonb,
  seen_title_ids jsonb not null default '[]'::jsonb,
  title_catalog jsonb not null default '{}'::jsonb, -- accumulates title_id -> Title across all rounds
  final_candidates jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('A', 'B')),
  viewer_id text,
  preferences jsonb,
  submitted_at timestamptz,
  completed_round int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, role)
);

create table if not exists swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  title_id text not null,
  direction text not null check (direction in ('left', 'right')),
  round int not null,
  created_at timestamptz not null default now(),
  unique (session_id, partner_id, title_id, round)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  title_id text not null,
  title jsonb not null,
  platforms jsonb not null default '[]'::jsonb,
  round int not null,
  matched_at timestamptz not null default now()
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  title_id text not null,
  rating int not null check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (session_id, partner_id, title_id)
);

-- viewer history, used to personalise future briefs ("liked together" vs "thought they'd like")
create table if not exists viewer_taste (
  viewer_id text not null,
  title_id text not null,
  title_name text,
  signal text not null check (signal in ('right_swipe', 'left_swipe', 'matched', 'rated')),
  rating int,
  created_at timestamptz not null default now(),
  primary key (viewer_id, title_id, signal)
);

create index if not exists idx_partners_session on partners(session_id);
create index if not exists idx_swipes_session_round_title on swipes(session_id, round, title_id);
create index if not exists idx_viewer_taste_viewer on viewer_taste(viewer_id);

-- keep updated_at fresh
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sessions_touch on sessions;
create trigger trg_sessions_touch before update on sessions
  for each row execute function touch_updated_at();

-- Row Level Security: this app has no login, sessions are the security boundary
-- (a session id + partner id in localStorage). Policies are intentionally open
-- to the anon key scoped to these tables only — do not reuse this DB for
-- anything sensitive without adding real auth.
alter table sessions enable row level security;
alter table partners enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table ratings enable row level security;
alter table viewer_taste enable row level security;

drop policy if exists "sessions anon all" on sessions;
create policy "sessions anon all" on sessions for all using (true) with check (true);

drop policy if exists "partners anon all" on partners;
create policy "partners anon all" on partners for all using (true) with check (true);

drop policy if exists "swipes anon all" on swipes;
create policy "swipes anon all" on swipes for all using (true) with check (true);

drop policy if exists "matches anon all" on matches;
create policy "matches anon all" on matches for all using (true) with check (true);

drop policy if exists "ratings anon all" on ratings;
create policy "ratings anon all" on ratings for all using (true) with check (true);

drop policy if exists "viewer_taste anon all" on viewer_taste;
create policy "viewer_taste anon all" on viewer_taste for all using (true) with check (true);

-- realtime: both partners' screens react live to session/match state changes
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'partners'
  ) then
    alter publication supabase_realtime add table partners;
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;
end $$;
