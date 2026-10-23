-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Run

create table if not exists public.candidates (
  id               uuid primary key default gen_random_uuid(),

  -- Telegram identity (comes from verified initData, never from the client body)
  telegram_id      bigint not null unique,
  username         text,
  language_code    text,
  photo_url        text,

  -- Profile the candidate fills in
  full_name        text not null check (char_length(full_name) between 2 and 100),
  phone            text not null check (phone ~ '^\+998[0-9]{9}$'),
  age              smallint check (age between 16 and 70),
  major            text not null,
  experience_years smallint not null default 0 check (experience_years between 0 and 50),
  experience_text  text check (char_length(experience_text) <= 1000),

  -- HR workflow (used later by the admin side)
  status           text not null default 'new'
                   check (status in ('new', 'reviewed', 'shortlisted', 'rejected')),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- HR will filter by major and status a lot
create index if not exists candidates_major_idx  on public.candidates (major);
create index if not exists candidates_status_idx on public.candidates (status);

-- Keep updated_at fresh on every update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists candidates_set_updated_at on public.candidates;
create trigger candidates_set_updated_at
  before update on public.candidates
  for each row execute function public.set_updated_at();

-- Security: RLS ON and NO policies = the anon key can't read or write anything.
-- Only our server (service role key) touches this table.
alter table public.candidates enable row level security;
