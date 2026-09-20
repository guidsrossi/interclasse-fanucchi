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
 class_name text not null check(class_name ~ '^[123]º [A-Z]$'),
 event_name text,
 division text,
 created_at timestamptz not null default now()
);
create unique index if not exists interclasse_unique_student on public.interclasse_registrations(modality_id,class_name,lower(regexp_replace(btrim(student_name),'\s+',' ','g')));
alter table public.interclasse_modalities enable row level security;
alter table public.interclasse_registrations enable row level security;
revoke all on public.interclasse_modalities,public.interclasse_registrations from anon,authenticated;
create or replace function public.interclasse_counts()
returns table(modality_id text,class_name text,total bigint)
language sql security definer set search_path = '' as $$
 select r.modality_id,r.class_name,count(*) from public.interclasse_registrations r group by r.modality_id,r.class_name;
$$;
create or replace function public.interclasse_register(p_modality text,p_name text,p_class text,p_event text default null,p_division text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare maximum integer; current_count bigint; registration_id uuid; clean_name text;
begin
 clean_name := regexp_replace(btrim(p_name),'\s+',' ','g');
 if clean_name is null or char_length(clean_name) not between 3 and 100 then raise exception 'Digite um nome entre 3 e 100 caracteres.'; end if;
 if p_class is null or p_class !~ '^[123]º [A-Z]$' then raise exception 'Informe a turma no formato 3º A.'; end if;
 select capacity into maximum from public.interclasse_modalities where id=p_modality for update;
 if not found then raise exception 'Modalidade inválida.'; end if;
 if p_modality='atletismo' then
  if p_event is null or p_event not in ('100 m rasos','Salto em distância','Salto em altura','Arremesso de peso') then raise exception 'Escolha uma prova válida.'; end if;
  if p_division is null or p_division not in ('Masculino','Feminino') then raise exception 'Escolha a categoria.'; end if;
 elsif p_event is not null or p_division is not null then raise exception 'Esta modalidade não possui provas.';
 end if;
 if exists(select 1 from public.interclasse_registrations where modality_id=p_modality and class_name=p_class and lower(student_name)=lower(clean_name)) then raise exception 'Este aluno já está inscrito nesta modalidade e turma.'; end if;
 select count(*) into current_count from public.interclasse_registrations where modality_id=p_modality and class_name=p_class;
 if maximum is not null and current_count >= maximum then raise exception 'As vagas desta modalidade para sua turma foram preenchidas.'; end if;
 insert into public.interclasse_registrations(modality_id,student_name,class_name,event_name,division) values(p_modality,clean_name,p_class,p_event,p_division) returning id into registration_id;
 return registration_id;
end;
$$;
revoke all on function public.interclasse_counts() from public;
revoke all on function public.interclasse_register(text,text,text,text,text) from public;
grant execute on function public.interclasse_counts() to anon,authenticated;
grant execute on function public.interclasse_register(text,text,text,text,text) to anon,authenticated;
