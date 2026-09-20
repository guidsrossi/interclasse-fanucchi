create table if not exists public.interclasse_draws (
 id text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);

alter table public.interclasse_draws enable row level security;
revoke all on public.interclasse_draws from anon,authenticated;
