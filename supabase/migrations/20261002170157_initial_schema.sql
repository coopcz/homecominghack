-- Northstar initial schema
-- Public content is readable; every user-owned row is protected by ownership RLS.

create schema if not exists private;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  account_type text not null default 'student' check (account_type in ('student', 'employer')),
  university text,
  major text,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  target_companies text[] not null default '{}',
  github_username text,
  employer_company text,
  discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.missions (
  id text primary key,
  company text not null unique,
  headline text not null,
  mission text not null,
  founder_story text not null,
  long_description text not null,
  location text not null,
  website text not null,
  themes text[] not null default '{}',
  accent text not null default '#c8ff4d',
  image_url text,
  role_archetypes text[] not null default '{}',
  project_seeds text[] not null default '{}',
  created_by uuid references public.users(id) on delete set null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Roles represent public job listings. Intentionally left empty for the hackathon team to source.
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  mission_id text not null references public.missions(id) on delete cascade,
  title text not null,
  description text not null,
  location text,
  employment_type text,
  source_url text,
  is_current boolean not null default true,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Structured course catalog. Intentionally left empty; generated roadmaps may suggest categories.
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  provider text not null,
  url text,
  description text,
  skills text[] not null default '{}',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- People records are never AI-invented. Add only sourced, public professional information.
create table public.people (
  id uuid primary key default gen_random_uuid(),
  mission_id text not null references public.missions(id) on delete cascade,
  full_name text not null,
  title text,
  linkedin_url text,
  source_url text not null,
  connection_context text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Events/news are intentionally empty and require source URLs and a future event time when applicable.
create table public.feed_items (
  id uuid primary key default gen_random_uuid(),
  mission_id text references public.missions(id) on delete cascade,
  item_type text not null check (item_type in ('announcement', 'event', 'conference', 'article')),
  title text not null,
  summary text,
  source_url text not null,
  published_at timestamptz,
  starts_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mission_id text not null references public.missions(id) on delete cascade,
  why text not null check (char_length(why) between 20 and 2000),
  selected_role_title text,
  question_answers jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('saved', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mission_id text not null references public.missions(id) on delete cascade,
  role_title text not null,
  thesis text not null,
  content jsonb not null,
  generated_by text not null check (generated_by in ('openai', 'anthropic', 'curated')),
  prompt_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create table public.progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mission_id text references public.missions(id) on delete set null,
  type text not null check (type in ('github_commit', 'course_completed', 'outreach', 'project_milestone')),
  label text not null,
  points smallint not null default 10 check (points between 0 and 100),
  verified boolean not null default false,
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.github_connections (
  user_id uuid primary key references public.users(id) on delete cascade,
  github_username text not null,
  repository text,
  last_commit_sha text,
  last_checked_at timestamptz,
  cached_response jsonb,
  updated_at timestamptz not null default now()
);

create index missions_created_by_idx on public.missions(created_by);
create index roles_mission_id_idx on public.roles(mission_id);
create index people_mission_id_idx on public.people(mission_id);
create index feed_items_mission_id_starts_at_idx on public.feed_items(mission_id, starts_at);
create index selections_user_id_idx on public.selections(user_id);
create index selections_mission_id_idx on public.selections(mission_id);
create index roadmaps_user_id_idx on public.roadmaps(user_id);
create index roadmaps_mission_id_idx on public.roadmaps(mission_id);
create index progress_events_user_id_occurred_at_idx on public.progress_events(user_id, occurred_at desc);
create index progress_events_mission_id_idx on public.progress_events(mission_id);
create unique index progress_events_external_id_unique_idx
on public.progress_events(user_id, type, external_id)
where external_id is not null;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at before update on public.users
for each row execute function private.set_updated_at();
create trigger missions_set_updated_at before update on public.missions
for each row execute function private.set_updated_at();
create trigger selections_set_updated_at before update on public.selections
for each row execute function private.set_updated_at();
create trigger roadmaps_set_updated_at before update on public.roadmaps
for each row execute function private.set_updated_at();
create trigger github_connections_set_updated_at before update on public.github_connections
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, account_type)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'account_type' = 'employer' then 'employer' else 'student' end
  );
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.missions enable row level security;
alter table public.roles enable row level security;
alter table public.courses enable row level security;
alter table public.people enable row level security;
alter table public.feed_items enable row level security;
alter table public.selections enable row level security;
alter table public.roadmaps enable row level security;
alter table public.progress_events enable row level security;
alter table public.github_connections enable row level security;

create policy "users read own profile" on public.users for select to authenticated
using ((select auth.uid()) = id);
create policy "users update own profile" on public.users for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "published missions are readable" on public.missions for select to anon, authenticated
using (is_published = true);
create policy "employers create missions" on public.missions for insert to authenticated
with check ((select auth.uid()) = created_by);
create policy "mission owners update missions" on public.missions for update to authenticated
using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);

create policy "roles are readable" on public.roles for select to anon, authenticated using (true);
create policy "courses are readable" on public.courses for select to anon, authenticated using (true);
create policy "people are readable" on public.people for select to anon, authenticated using (true);
create policy "feed is readable" on public.feed_items for select to anon, authenticated using (true);

create policy "users read own selections" on public.selections for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users create own selections" on public.selections for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "users update own selections" on public.selections for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own selections" on public.selections for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "users read own roadmaps" on public.roadmaps for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users create own roadmaps" on public.roadmaps for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "users update own roadmaps" on public.roadmaps for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "users read own progress" on public.progress_events for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users create own progress" on public.progress_events for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "users update own progress" on public.progress_events for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own progress" on public.progress_events for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "users read own github connection" on public.github_connections for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users create own github connection" on public.github_connections for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "users update own github connection" on public.github_connections for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own github connection" on public.github_connections for delete to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.missions, public.roles, public.courses, public.people, public.feed_items to anon, authenticated;
grant select, update on public.users to authenticated;
grant insert, select, update, delete on public.selections to authenticated;
grant insert, select, update on public.roadmaps to authenticated;
grant insert, select, update, delete on public.progress_events to authenticated;
grant insert, select, update, delete on public.github_connections to authenticated;
grant insert, update on public.missions to authenticated;

insert into public.missions (
  id, company, headline, mission, founder_story, long_description, location, website,
  themes, accent, image_url, role_archetypes, project_seeds
) values
  ('neighbor', 'Neighbor', 'Turn every empty space into useful storage.',
   'Give people affordable storage by unlocking the unused space already around them.',
   'The idea started when a student needed storage, could not find a good option, and saw unused basements everywhere.',
   'Neighbor builds a peer-to-peer storage marketplace that makes existing real estate more useful and gives hosts a new income stream.',
   'Lehi, Utah', 'https://www.neighbor.com',
   array['marketplaces','consumer','real estate','logistics','trust'], '#c8ff4d',
   'https://images.unsplash.com/photo-1570086625846-f33f679eb4f5?auto=format&fit=crop&w=1600&q=85',
   array['Marketplace Product Engineer','Trust & Safety Data Analyst','Growth Product Manager'],
   array['marketplace liquidity','trust scoring','space utilization']),
  ('redo', 'Redo', 'Make every return feel as good as the purchase.',
   'Turn ecommerce returns from a cost center into a customer-retention engine.',
   'Built by ecommerce operators who watched returns erode margins and customer trust—and decided the workflow deserved a reset.',
   'Redo helps merchants offer flexible return coverage while automating the operational decisions behind returns and exchanges.',
   'Draper, Utah', 'https://www.getredo.com',
   array['ecommerce','fintech','operations','customer experience','automation'], '#ff7657',
   'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1600&q=85',
   array['Commerce Platform Engineer','Merchant Data Analyst','Lifecycle Product Designer'],
   array['return prediction','merchant analytics','exchange optimization']),
  ('waystar', 'Waystar', 'Take the friction out of getting healthcare paid for.',
   'Simplify healthcare payments so providers can focus more energy on patient care.',
   'A Utah-born healthcare technology story shaped by the belief that billing complexity should not stand between care and payment.',
   'Waystar connects the healthcare revenue cycle with software that helps providers manage claims, payments, and financial experiences.',
   'Lehi, Utah', 'https://www.waystar.com',
   array['healthtech','payments','data','enterprise software','automation'], '#74d6ff',
   'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=85',
   array['Healthcare Data Engineer','Revenue Cycle Product Analyst','Applied AI Engineer'],
   array['claims intelligence','payment transparency','denial prevention']),
  ('weave', 'Weave', 'Make the small healthcare practice feel brilliantly connected.',
   'Help local healthcare businesses communicate, collect, and grow through one connected platform.',
   'Started in Utah after seeing how often dental practices lost time and relationships to disconnected front-office tools.',
   'Weave combines patient communications, scheduling, payments, and operational tools for small healthcare practices.',
   'Lehi, Utah', 'https://www.getweave.com',
   array['healthtech','communications','small business','payments','product'], '#d7b7ff',
   'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=85',
   array['Full-stack Product Engineer','Customer Insights Analyst','Product Designer'],
   array['patient communication','practice operations','appointment retention']),
  ('podium', 'Podium', 'Help every local business win the next customer.',
   'Give local businesses the communication and AI tools once reserved for massive companies.',
   'Founded in Utah after seeing a tire shop with great service lose business because its online reputation told the wrong story.',
   'Podium brings messaging, reviews, payments, and AI-powered lead conversion into one operating layer for local businesses.',
   'Lehi, Utah', 'https://www.podium.com',
   array['AI','local business','communications','payments','growth'], '#ffe060',
   'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1600&q=85',
   array['AI Product Engineer','Growth Data Scientist','Conversation Designer'],
   array['lead conversion','reputation intelligence','AI messaging']);

alter publication supabase_realtime add table public.progress_events;
