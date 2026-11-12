-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run
-- Job alerts: the bot messages candidates when a matching vacancy is published.
-- Apply this BEFORE deploying the app version that reads candidates.job_alerts.

-- Candidate can turn alerts off in Profile -> Settings. The alerts route also
-- sets it to false when Telegram says the user blocked the bot (HTTP 403).
alter table public.candidates
  add column if not exists job_alerts boolean not null default true;

-- One row per (vacancy, candidate) alert, so nobody is alerted twice for the same vacancy.
-- Also used to cap alerts per candidate per day (count rows by sent_at).
create table if not exists public.vacancy_alerts (
  vacancy_id   uuid not null references public.vacancies (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  sent_at      timestamptz not null default now(),
  primary key (vacancy_id, candidate_id)
);

-- Daily cap lookup: "how many alerts did this candidate get in the last 24h?"
create index if not exists vacancy_alerts_candidate_sent_idx
  on public.vacancy_alerts (candidate_id, sent_at desc);

-- Same security model as the other tables: RLS on, no policies ->
-- only our server (service role key) can read or write it.
alter table public.vacancy_alerts enable row level security;
