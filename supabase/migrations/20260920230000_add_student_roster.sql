create table if not exists public.interclasse_students (
 id uuid primary key default gen_random_uuid(),
 class_name text not null check(class_name ~ '^[123]º [A-Z]$'),
 student_name text not null check(char_length(student_name) between 3 and 100),
 created_at timestamptz not null default now()
);

create unique index if not exists interclasse_students_unique_name
on public.interclasse_students(class_name,lower(regexp_replace(btrim(student_name),'\s+',' ','g')));

create index if not exists interclasse_students_class_idx
on public.interclasse_students(class_name,student_name);

alter table public.interclasse_students enable row level security;
revoke all on public.interclasse_students from anon,authenticated;
