alter table public.interclasse_score_entries
 add column if not exists responsible_student text check(responsible_student is null or char_length(responsible_student) between 3 and 100),
 add column if not exists source text not null default 'admin' check(source in ('admin','teacher'));

create index if not exists interclasse_score_entries_teacher_idx
on public.interclasse_score_entries(source,created_at desc);
