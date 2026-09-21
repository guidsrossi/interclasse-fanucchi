alter table public.interclasse_registrations
 add constraint interclasse_registrations_existing_class_check
 check(class_name <> '2º E');

alter table public.interclasse_score_entries
 add constraint interclasse_score_entries_existing_class_check
 check(class_name <> '2º E');

alter table public.interclasse_students
 add constraint interclasse_students_existing_class_check
 check(class_name <> '2º E');
