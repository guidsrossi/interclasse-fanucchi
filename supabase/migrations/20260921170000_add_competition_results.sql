create table if not exists public.interclasse_competition_results (
 competition_id text primary key check(char_length(competition_id) between 1 and 180),
 payload jsonb not null default '{"version":1,"matches":{}}'::jsonb,
 updated_at timestamptz not null default now()
);

alter table public.interclasse_competition_results enable row level security;
revoke all on public.interclasse_competition_results from anon,authenticated;
