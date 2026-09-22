alter table public.interclasse_score_entries
 add column if not exists competition_id text,
 add column if not exists match_id text;

alter table public.interclasse_score_entries
 drop constraint if exists interclasse_score_entries_source_check;

alter table public.interclasse_score_entries
 add constraint interclasse_score_entries_source_check
 check(source in ('admin','teacher','competition'));

create unique index if not exists interclasse_score_entries_competition_match_idx
on public.interclasse_score_entries(competition_id,match_id,class_name)
where source='competition';

create or replace function public.interclasse_save_competition_result(
 p_competition_id text,
 p_payload jsonb,
 p_entries jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare item jsonb;
begin
 if p_competition_id is null or char_length(p_competition_id) not between 1 and 180 then
  raise exception 'Competição inválida.';
 end if;
 if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 400000 then
  raise exception 'Resultados inválidos.';
 end if;
 if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 500 then
  raise exception 'Lançamentos inválidos.';
 end if;

 insert into public.interclasse_competition_results(competition_id,payload,updated_at)
 values(p_competition_id,p_payload,now())
 on conflict(competition_id) do update
 set payload=excluded.payload,updated_at=excluded.updated_at;

 delete from public.interclasse_score_entries
 where source='competition' and competition_id=p_competition_id;

 for item in select value from jsonb_array_elements(p_entries)
 loop
  insert into public.interclasse_score_entries(
   class_name,modality_id,entry_type,label,points,wins,draws,losses,source,competition_id,match_id
  ) values (
   item->>'class_name',nullif(item->>'modality_id',''),'resultado',left(item->>'label',120),
   (item->>'points')::integer,(item->>'wins')::integer,(item->>'draws')::integer,(item->>'losses')::integer,
   'competition',p_competition_id,item->>'match_id'
  );
 end loop;
end;
$$;

revoke all on function public.interclasse_save_competition_result(text,jsonb,jsonb) from public;
grant execute on function public.interclasse_save_competition_result(text,jsonb,jsonb) to service_role;
