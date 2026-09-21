alter table public.interclasse_score_entries
 add column if not exists attendance_week date,
 add column if not exists attendance_rate numeric(5,2)
  check(attendance_rate is null or attendance_rate between 0 and 100);

create unique index if not exists interclasse_score_entries_weekly_attendance_idx
on public.interclasse_score_entries(class_name,entry_type,attendance_week);

create or replace function public.interclasse_import_weekly_attendance(
 p_week_start date,
 p_entries jsonb
)
returns setof public.interclasse_score_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
 item jsonb;
 imported_class text;
 imported_rate numeric(5,2);
 imported_points integer;
begin
 if p_week_start is null or extract(isodow from p_week_start) <> 1 then
  raise exception 'A semana deve começar em uma segunda-feira.';
 end if;
 if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) not between 1 and 30 then
  raise exception 'Envie entre 1 e 30 turmas.';
 end if;

 for item in select value from jsonb_array_elements(p_entries)
 loop
  imported_class := upper(btrim(item->>'class_name'));
  imported_rate := (item->>'attendance_rate')::numeric(5,2);
  if imported_class is null or imported_class !~ '^[123]º [A-Z]$' then
   raise exception 'Turma inválida no relatório.';
  end if;
  if imported_rate is null or imported_rate < 0 or imported_rate > 100 then
   raise exception 'Percentual de presença inválido para a turma %.', imported_class;
  end if;
 end loop;

 delete from public.interclasse_score_entries
 where entry_type = 'frequencia' and attendance_week = p_week_start;

 for item in select value from jsonb_array_elements(p_entries)
 loop
  imported_class := upper(btrim(item->>'class_name'));
  imported_rate := (item->>'attendance_rate')::numeric(5,2);
  imported_points := case
   when imported_rate >= 100 then 25
   when imported_rate >= 95 then 20
   when imported_rate >= 90 then 15
   when imported_rate >= 85 then 10
   else 0
  end;
  insert into public.interclasse_score_entries(
   class_name,entry_type,label,points,wins,draws,losses,attendance_week,attendance_rate,source
  ) values (
   imported_class,
   'frequencia',
   'Frequência semanal · ' || to_char(p_week_start,'DD/MM/YYYY') || ' · ' || replace(to_char(imported_rate,'FM990D00'),'.',',') || '%',
   imported_points,0,0,0,p_week_start,imported_rate,'admin'
  );
 end loop;

 return query
 select entry.*
 from public.interclasse_score_entries entry
 where entry.entry_type = 'frequencia' and entry.attendance_week = p_week_start
 order by entry.class_name;
end;
$$;

revoke all on function public.interclasse_import_weekly_attendance(date,jsonb) from public;
grant execute on function public.interclasse_import_weekly_attendance(date,jsonb) to service_role;
