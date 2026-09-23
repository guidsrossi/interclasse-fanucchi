update public.interclasse_score_entries
set points = wins * 300 + draws * 100
where source = 'competition';
