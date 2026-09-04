create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create sequence if not exists public.incident_reference_sequence
  start with 2048
  increment by 1;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique default (
    'SAUTI-' || lpad(nextval('public.incident_reference_sequence')::text, 4, '0')
  ),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 5000),
  category text not null check (category in (
    'WATER', 'ROADS', 'ELECTRICITY', 'SANITATION', 'HEALTH', 'SECURITY',
    'FIRE', 'FLOODING', 'EDUCATION', 'ENVIRONMENT', 'PUBLIC_SERVICES', 'OTHER'
  )),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  location_name text check (char_length(location_name) <= 240),
  language text not null default 'en' check (language in ('en', 'sw')),
  transcript text check (char_length(transcript) <= 12000),
  status text not null default 'NEW' check (status in (
    'NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'
  )),
  reported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incidents_reported_at_idx on public.incidents (reported_at desc);
create index if not exists incidents_status_idx on public.incidents (status);
create index if not exists incidents_category_severity_idx on public.incidents (category, severity);
create index if not exists incidents_location_name_trgm_idx on public.incidents using gin (location_name gin_trgm_ops);
create index if not exists incidents_search_idx on public.incidents using gin (
  to_tsvector('simple', title || ' ' || description || ' ' || coalesce(location_name, ''))
);

create table if not exists public.incident_status_history (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  previous_status text check (previous_status in (
    'NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'
  )),
  new_status text not null check (new_status in (
    'NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'
  )),
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null,
  note text check (char_length(note) <= 2000)
);

create index if not exists incident_status_history_incident_idx
  on public.incident_status_history (incident_id, changed_at desc);

create table if not exists public.incident_updates (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists incident_updates_incident_idx
  on public.incident_updates (incident_id, created_at desc);

create or replace function public.set_incidents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_incident_status_change()
returns trigger
language plpgsql
security invoker
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.incident_status_history (incident_id, previous_status, new_status)
    values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists incidents_set_updated_at on public.incidents;
create trigger incidents_set_updated_at
before update on public.incidents
for each row execute function public.set_incidents_updated_at();

drop trigger if exists incidents_record_status_change on public.incidents;
create trigger incidents_record_status_change
after insert or update of status on public.incidents
for each row execute function public.record_incident_status_change();

alter table public.incidents enable row level security;
alter table public.incident_status_history enable row level security;
alter table public.incident_updates enable row level security;

revoke all on public.incidents from anon, authenticated;
revoke all on public.incident_status_history from anon, authenticated;
revoke all on public.incident_updates from anon, authenticated;
