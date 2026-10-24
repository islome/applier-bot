-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run

create table if not exists public.vacancies (
  id               uuid primary key default gen_random_uuid(),

  title            text not null check (char_length(title) between 2 and 120),
  company          text not null,
  city             text not null,

  -- Same values as MAJORS in lib/constants.ts, so matching candidates is easy later
  major            text not null,

  employment_type  text not null default 'full_time'
                   check (employment_type in ('full_time', 'part_time', 'remote', 'internship')),

  salary_min       integer check (salary_min >= 0),
  salary_max       integer check (salary_max >= 0),
  salary_currency  text not null default 'UZS' check (salary_currency in ('UZS', 'USD')),

  description      text not null,
  requirements     text,

  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  check (salary_max is null or salary_min is null or salary_max >= salary_min)
);

create index if not exists vacancies_active_created_idx
  on public.vacancies (is_active, created_at desc);
create index if not exists vacancies_major_idx on public.vacancies (major);

-- set_updated_at() was created in 001_candidates.sql
drop trigger if exists vacancies_set_updated_at on public.vacancies;
create trigger vacancies_set_updated_at
  before update on public.vacancies
  for each row execute function public.set_updated_at();

-- Same security model as candidates: RLS on, no policies -> only our server (service role) can touch it.
alter table public.vacancies enable row level security;

-- ---------- DEMO DATA (fictional companies, delete before real launch) ----------
-- delete from public.vacancies where company like '%(demo)';
insert into public.vacancies
  (title, company, city, major, employment_type, salary_min, salary_max, salary_currency, description, requirements)
values
  ('Frontend Developer (React / Next.js)', 'TechNova (demo)', 'Tashkent', 'IT / Software', 'full_time',
   8000000, 14000000, 'UZS',
   'Build and maintain customer-facing web apps with Next.js and TypeScript. Work closely with designers and backend engineers.',
   '1+ year with React, TypeScript, Tailwind. Git. Basic REST/Supabase knowledge is a plus.'),

  ('UI/UX Designer', 'PixelHub (demo)', 'Tashkent', 'Design', 'full_time',
   6000000, 10000000, 'UZS',
   'Design mobile and web interfaces from research to handoff. You will own the design system.',
   'Figma, portfolio with 3+ projects, understanding of mobile-first design.'),

  ('SMM Manager', 'BrandWave (demo)', 'Samarkand', 'Marketing / SMM', 'part_time',
   5000000, 8000000, 'UZS',
   'Plan and run content for Instagram and Telegram channels, work with the targeting specialist, report weekly.',
   'Experience with content planning, basic video editing, Uzbek and Russian.'),

  ('Sales Manager', 'SavdoPlus (demo)', 'Tashkent', 'Sales', 'full_time',
   4000000, 9000000, 'UZS',
   'Work with inbound leads, close deals with B2B clients, keep the CRM up to date. Salary plus commission.',
   'Communication skills, 1+ year in sales preferred, Uzbek and Russian.'),

  ('Junior Accountant', 'Hisob Group (demo)', 'Tashkent', 'Finance / Accounting', 'full_time',
   4500000, 6500000, 'UZS',
   'Primary documents, bank statements, monthly reports for small business clients.',
   'Finance or accounting degree, 1C or similar, attention to detail.'),

  ('Customer Support Agent', 'CallDesk (demo)', 'Remote', 'Customer Support', 'remote',
   3500000, 5000000, 'UZS',
   'Answer customer chats and calls, solve issues, escalate complex cases. Flexible shifts.',
   'Fluent Uzbek and Russian, polite communication, stable internet.'),

  ('Logistics Coordinator', 'CargoLine (demo)', 'Tashkent', 'Logistics / Transport', 'full_time',
   6000000, 9000000, 'UZS',
   'Coordinate shipments with drivers and clients, track deliveries, prepare transport documents.',
   'Organized, calm under pressure, Excel. Experience in logistics is a plus.'),

  ('Backend Intern (Node.js)', 'TechNova (demo)', 'Tashkent', 'IT / Software', 'internship',
   null, null, 'UZS',
   '3-month paid internship. You will build small API features with a mentor and ship them to production.',
   'Basic JavaScript or TypeScript, willingness to learn, 20+ hours per week.');
