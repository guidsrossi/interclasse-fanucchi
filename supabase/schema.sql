-- Execute no SQL Editor de um projeto Supabase. Os nomes dos alunos não são públicos.
create table if not exists public.interclasse_modalities (
 id text primary key,
 capacity integer check (capacity > 0)
);
insert into public.interclasse_modalities(id,capacity) values
 ('futebol',10),('futsal',10),('volei',10),('basquete',10),('handebol',10),('queimada',10),
 ('atletismo',4),('tenis',4),('volei_mesa',6),('domino',4),('truco',4),('xadrez',4),('damas',4),('fifa',2),('jenga',2),('repassa',4)
on conflict(id) do update set capacity=excluded.capacity;
create table if not exists public.interclasse_registrations (
 id uuid primary key default gen_random_uuid(),
 modality_id text not null references public.interclasse_modalities(id),
 student_name text not null check(char_length(student_name) between 3 and 100),
 class_name text not null check(class_name ~ '^[123]º [A-Z]$' and class_name <> '2º E'),
 event_name text,
 division text,
 created_at timestamptz not null default now()
);
create unique index if not exists interclasse_unique_student on public.interclasse_registrations(modality_id,class_name,lower(regexp_replace(btrim(student_name),'\s+',' ','g')),coalesce(event_name,''),coalesce(division,''));
alter table public.interclasse_modalities enable row level security;
alter table public.interclasse_registrations enable row level security;
revoke all on public.interclasse_modalities,public.interclasse_registrations from anon,authenticated;
create or replace function public.interclasse_counts()
returns table(modality_id text,class_name text,total bigint)
language sql security definer set search_path = '' as $$
 select r.modality_id,r.class_name,count(*) from public.interclasse_registrations r group by r.modality_id,r.class_name;
$$;
create table if not exists public.interclasse_settings (
 id text primary key,
 registrations_open boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.interclasse_settings(id,registrations_open) values ('official',false) on conflict(id) do nothing;
alter table public.interclasse_settings enable row level security;
revoke all on public.interclasse_settings from anon,authenticated;
create or replace function public.interclasse_register(p_modality text,p_name text,p_class text,p_event text default null,p_division text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare maximum integer; current_count bigint; registration_id uuid; clean_name text; registrations_are_open boolean;
begin
 select registrations_open into registrations_are_open from public.interclasse_settings where id='official';
 if coalesce(registrations_are_open,false)=false then raise exception 'As inscrições estão temporariamente fechadas.'; end if;
 clean_name := regexp_replace(btrim(p_name),'\s+',' ','g');
 if clean_name is null or char_length(clean_name) not between 3 and 100 then raise exception 'Digite um nome entre 3 e 100 caracteres.'; end if;
 if p_class is null or p_class !~ '^[123]º [A-Z]$' or p_class='2º E' then raise exception 'Selecione uma turma existente.'; end if;
 select capacity into maximum from public.interclasse_modalities where id=p_modality for update;
 if not found then raise exception 'Modalidade inválida.'; end if;
 if p_modality='atletismo' then
  if p_event is null or p_event not in ('100 m rasos','Salto em distância','Salto em altura','Arremesso de peso') then raise exception 'Escolha uma prova válida.'; end if;
  if p_division is null or p_division not in ('Masculino','Feminino') then raise exception 'Escolha a categoria.'; end if;
 elsif p_event is not null or p_division is not null then raise exception 'Esta modalidade não possui provas.';
 end if;
 if exists(select 1 from public.interclasse_registrations where modality_id=p_modality and class_name=p_class and lower(regexp_replace(btrim(student_name),'\s+',' ','g'))=lower(clean_name) and event_name is not distinct from case when p_modality='atletismo' then p_event else null end and division is not distinct from case when p_modality='atletismo' then p_division else null end) then
  if p_modality='atletismo' then raise exception 'Este aluno já está inscrito nesta prova e categoria.'; end if;
  raise exception 'Este aluno já está inscrito nesta modalidade e turma.';
 end if;
 if p_modality='atletismo' then
  select count(*) into current_count from public.interclasse_registrations where modality_id=p_modality and class_name=p_class and event_name=p_event and division=p_division;
 else
  select count(*) into current_count from public.interclasse_registrations where modality_id=p_modality and class_name=p_class;
 end if;
 if maximum is not null and current_count >= maximum then
  if p_modality='atletismo' then raise exception 'As vagas desta prova e categoria para sua turma foram preenchidas.'; end if;
  raise exception 'As vagas desta modalidade para sua turma foram preenchidas.';
 end if;
 insert into public.interclasse_registrations(modality_id,student_name,class_name,event_name,division) values(p_modality,clean_name,p_class,p_event,p_division) returning id into registration_id;
 return registration_id;
end;
$$;
revoke all on function public.interclasse_counts() from public;
revoke all on function public.interclasse_register(text,text,text,text,text) from public;
grant execute on function public.interclasse_counts() to anon,authenticated;
grant execute on function public.interclasse_register(text,text,text,text,text) to anon,authenticated;

-- O resultado oficial é publicado somente pela API administrativa. A API pública
-- devolve apenas turmas e chaveamentos; nomes de alunos continuam protegidos.
create table if not exists public.interclasse_draws (
 id text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.interclasse_draws enable row level security;
revoke all on public.interclasse_draws from anon,authenticated;

create table if not exists public.interclasse_competition_results (
 competition_id text primary key check(char_length(competition_id) between 1 and 180),
 payload jsonb not null default '{"version":1,"matches":{}}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.interclasse_competition_results enable row level security;
revoke all on public.interclasse_competition_results from anon,authenticated;

create table if not exists public.interclasse_score_entries (
 id uuid primary key default gen_random_uuid(),
 class_name text not null check(class_name ~ '^[123]º [A-Z]$' and class_name <> '2º E'),
 modality_id text references public.interclasse_modalities(id),
 entry_type text not null check(entry_type in ('resultado','frequencia','plataforma','bonus','penalidade','ajuste')),
 label text not null check(char_length(label) between 3 and 120),
 points integer not null default 0 check(points between -10000 and 10000),
 wins integer not null default 0 check(wins between 0 and 999),
 draws integer not null default 0 check(draws between 0 and 999),
 losses integer not null default 0 check(losses between 0 and 999),
 responsible_student text check(responsible_student is null or char_length(responsible_student) between 3 and 100),
 source text not null default 'admin' check(source in ('admin','teacher','competition')),
 competition_id text,
 match_id text,
 attendance_week date,
 attendance_rate numeric(5,2) check(attendance_rate is null or attendance_rate between 0 and 100),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists interclasse_score_entries_class_idx on public.interclasse_score_entries(class_name,updated_at desc);
create index if not exists interclasse_score_entries_teacher_idx on public.interclasse_score_entries(source,created_at desc);
create unique index if not exists interclasse_score_entries_weekly_attendance_idx on public.interclasse_score_entries(class_name,entry_type,attendance_week);
create unique index if not exists interclasse_score_entries_competition_match_idx on public.interclasse_score_entries(competition_id,match_id,class_name) where source='competition';
alter table public.interclasse_score_entries enable row level security;
revoke all on public.interclasse_score_entries from anon,authenticated;

create or replace function public.interclasse_import_weekly_attendance(p_week_start date,p_entries jsonb)
returns setof public.interclasse_score_entries language plpgsql security definer set search_path = '' as $$
declare item jsonb; imported_class text; imported_rate numeric(5,2); imported_points integer;
begin
 if p_week_start is null or extract(isodow from p_week_start) <> 1 then raise exception 'A semana deve começar em uma segunda-feira.'; end if;
 if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) not between 1 and 30 then raise exception 'Envie entre 1 e 30 turmas.'; end if;
 for item in select value from jsonb_array_elements(p_entries) loop
  imported_class := upper(btrim(item->>'class_name')); imported_rate := (item->>'attendance_rate')::numeric(5,2);
  if imported_class is null or imported_class !~ '^[123]º [A-Z]$' or imported_class='2º E' then raise exception 'Turma inexistente no relatório.'; end if;
  if imported_rate is null or imported_rate < 0 or imported_rate > 100 then raise exception 'Percentual de presença inválido para a turma %.',imported_class; end if;
 end loop;
 delete from public.interclasse_score_entries where entry_type='frequencia' and attendance_week=p_week_start;
 for item in select value from jsonb_array_elements(p_entries) loop
  imported_class := upper(btrim(item->>'class_name')); imported_rate := (item->>'attendance_rate')::numeric(5,2);
  imported_points := case when imported_rate>=100 then 25 when imported_rate>=95 then 20 when imported_rate>=90 then 15 when imported_rate>=85 then 10 else 0 end;
  insert into public.interclasse_score_entries(class_name,entry_type,label,points,wins,draws,losses,attendance_week,attendance_rate,source)
  values(imported_class,'frequencia','Frequência semanal · '||to_char(p_week_start,'DD/MM/YYYY')||' · '||replace(to_char(imported_rate,'FM990D00'),'.',',')||'%',imported_points,0,0,0,p_week_start,imported_rate,'admin');
 end loop;
 return query select entry.* from public.interclasse_score_entries entry where entry.entry_type='frequencia' and entry.attendance_week=p_week_start order by entry.class_name;
end;
$$;
revoke all on function public.interclasse_import_weekly_attendance(date,jsonb) from public;
grant execute on function public.interclasse_import_weekly_attendance(date,jsonb) to service_role;

create or replace function public.interclasse_save_competition_result(p_competition_id text,p_payload jsonb,p_entries jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare item jsonb;
begin
 if p_competition_id is null or char_length(p_competition_id) not between 1 and 180 then raise exception 'Competição inválida.'; end if;
 if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 400000 then raise exception 'Resultados inválidos.'; end if;
 if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 500 then raise exception 'Lançamentos inválidos.'; end if;
 insert into public.interclasse_competition_results(competition_id,payload,updated_at)
 values(p_competition_id,p_payload,now())
 on conflict(competition_id) do update set payload=excluded.payload,updated_at=excluded.updated_at;
 delete from public.interclasse_score_entries where source='competition' and competition_id=p_competition_id;
 for item in select value from jsonb_array_elements(p_entries) loop
  insert into public.interclasse_score_entries(class_name,modality_id,entry_type,label,points,wins,draws,losses,source,competition_id,match_id)
  values(item->>'class_name',nullif(item->>'modality_id',''), 'resultado',left(item->>'label',120),(item->>'points')::integer,(item->>'wins')::integer,(item->>'draws')::integer,(item->>'losses')::integer,'competition',p_competition_id,item->>'match_id');
 end loop;
end;
$$;
revoke all on function public.interclasse_save_competition_result(text,jsonb,jsonb) from public;
grant execute on function public.interclasse_save_competition_result(text,jsonb,jsonb) to service_role;

create table if not exists public.interclasse_students (
 id uuid primary key default gen_random_uuid(),
 class_name text not null check(class_name ~ '^[123]º [A-Z]$' and class_name <> '2º E'),
 student_name text not null check(char_length(student_name) between 3 and 100),
 created_at timestamptz not null default now()
);
create unique index if not exists interclasse_students_unique_name on public.interclasse_students(class_name,lower(regexp_replace(btrim(student_name),'\s+',' ','g')));
create index if not exists interclasse_students_class_idx on public.interclasse_students(class_name,student_name);
alter table public.interclasse_students enable row level security;
revoke all on public.interclasse_students from anon,authenticated;
