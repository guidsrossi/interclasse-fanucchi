drop function if exists public.interclasse_counts();

create function public.interclasse_counts()
returns table(modality_id text,class_name text,division text,total bigint)
language sql security definer set search_path = '' as $$
 select r.modality_id,r.class_name,r.division,count(*)
 from public.interclasse_registrations r
 group by r.modality_id,r.class_name,r.division;
$$;

revoke all on function public.interclasse_counts() from public;
grant execute on function public.interclasse_counts() to anon,authenticated;
