create table if not exists public.interclasse_score_entries (
 id uuid primary key default gen_random_uuid(),
 class_name text not null check(class_name ~ '^[123]º [A-Z]$'),
 modality_id text references public.interclasse_modalities(id),
 entry_type text not null check(entry_type in ('resultado','frequencia','plataforma','bonus','penalidade','ajuste')),
 label text not null check(char_length(label) between 3 and 120),
 points integer not null default 0 check(points between -10000 and 10000),
 wins integer not null default 0 check(wins between 0 and 999),
 draws integer not null default 0 check(draws between 0 and 999),
 losses integer not null default 0 check(losses between 0 and 999),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists interclasse_score_entries_class_idx
on public.interclasse_score_entries(class_name,updated_at desc);

alter table public.interclasse_score_entries enable row level security;
revoke all on public.interclasse_score_entries from anon,authenticated;
