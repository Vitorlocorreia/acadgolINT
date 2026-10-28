-- Fixtures, staff changes and audit events roll back. No real enrollment is changed.
begin;
select set_config('request.jwt.claims','{}',true);
create temporary table class_filter_classes(kind text primary key,id uuid default gen_random_uuid());
insert into class_filter_classes(kind) values('a'),('b');
insert into public.classes(id,name,unit_id,days_of_week,is_active,category_id,start_time,end_time,max_students)
select id,'Turma fictícia de conferência '||kind,(select id from public.units limit 1),'[1,3]'::jsonb,true,(select id from public.categories limit 1),time '08:00',time '09:00',1000 from class_filter_classes;
create temporary table class_filter_students(kind text,student uuid default gen_random_uuid());
insert into class_filter_students(kind) select 'a-'||lpad(n::text,2,'0') from generate_series(1,51)n;
insert into class_filter_students(kind) values('b-1'),('b-2'),('b-3'),('paused'),('deleted'),('unassigned'),('no_enrollment'),('switched'),('two_active');
insert into public.students(id,name,birth_date,status,portal_access_enabled)
select student,'Teste filtro de turma: '||kind,date '2017-01-01',case when kind='paused' then 'paused' else 'active' end,false from class_filter_students;
insert into public.enrollments(student_id,class_id,start_date,due_day,monthly_fee,status,first_billing_month,created_at,import_source)
select student,case when kind='unassigned' then null when kind like 'b-%' then (select id from class_filter_classes where kind='b') else (select id from class_filter_classes where kind='a') end,
 date '2020-01-01',5,120,case when kind='paused' then 'paused' when kind='switched' then 'inactive' else 'active' end,date '2020-01-01',now()-interval '1 day',jsonb_build_object('file_sha256',repeat('0',64),'row',1)
from class_filter_students where kind<>'no_enrollment';
insert into public.enrollments(student_id,class_id,start_date,due_day,monthly_fee,status,first_billing_month,created_at,import_source)
select student,(select id from class_filter_classes where kind='b'),date '2020-01-01',5,120,'active',date '2020-01-01',now(),jsonb_build_object('file_sha256',repeat('0',64),'row',1)
from class_filter_students where kind in('switched','two_active');
insert into public.guardians(student_id,name,relationship,phone,receives_notifications)
select student,'Responsável filtro fictício','Responsável','81999990000',false from class_filter_students where kind='a-01';
update public.students set status='paused',deleted_at=now(),deletion_reason='Exclusão fictícia de conferência' where id=(select student from class_filter_students where kind='deleted');
grant select on class_filter_students,class_filter_classes to authenticated;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$begin if auth.uid() is null then raise exception 'A current secretary session is required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
set local role authenticated;
do $$declare a text:=(select id::text from class_filter_classes where kind='a');b text:=(select id::text from class_filter_classes where kind='b');r jsonb;r2 jsonb;begin
 r=public.student_directory('Teste filtro de turma:','active',1,a);
 r2=public.student_directory('Teste filtro de turma:','active',2,a);
 if (r->>'total')::integer<>51 or (r->>'pages')::integer<>2 or jsonb_array_length(r->'students')<>50 or jsonb_array_length(r2->'students')<>1 then raise exception 'Class filtering must precede counts and pagination: %',r->>'total';end if;
 if exists(select 1 from jsonb_array_elements(r->'students')x join jsonb_array_elements(r2->'students')y on x->>'id'=y->>'id') then raise exception 'Class pages overlap';end if;
 if exists(select 1 from jsonb_array_elements(r->'students')x where x->'enrollment'->0->'class'->>'id'<>a) then raise exception 'Displayed class does not match filter';end if;
 r=public.student_directory('Teste filtro de turma:','all',999,a);
 if (r->>'total')::integer<>52 or (r->>'page')::integer<>2 then raise exception 'Paused/excluded rules or page clamp failed';end if;
 r=public.student_directory('Teste filtro de turma:','paused',1,a);if (r->>'total')::integer<>1 then raise exception 'Paused+class combination failed';end if;
 r=public.student_directory('Teste filtro de turma:','deleted',1,a);if (r->>'total')::integer<>1 then raise exception 'Deleted+class combination failed';end if;
 r=public.student_directory('Teste filtro de turma:','active',1,b);if (r->>'total')::integer<>5 then raise exception 'Transfer/latest active enrollment filtering failed';end if;
 if exists(select 1 from jsonb_array_elements(r->'students')x where x->'enrollment'->0->'class'->>'id'<>b) then raise exception 'Old enrollment leaked into the class filter';end if;
 r=public.student_directory('Teste filtro de turma:','active',1,'unassigned');if (r->>'total')::integer<>2 then raise exception 'Unassigned must include null class and no enrollment';end if;
 r=public.student_directory('Responsável filtro fictício','active',1,a);if (r->>'total')::integer<>1 then raise exception 'Guardian search lost class filter';end if;
 r=public.student_directory('81999990000','active',1,b);if (r->>'total')::integer<>0 then raise exception 'Phone search bypassed class';end if;
 if jsonb_array_length(r->'classes')<2 then raise exception 'Empty result hid class options';end if;
 r=public.student_directory('Teste filtro de turma:','all',1);r2=public.student_directory('Teste filtro de turma:','all',1,'all');
 if r<>r2 then raise exception 'Legacy three-argument RPC no longer matches all classes';end if;
 if r::text like '%portal_token%' or r::text like '%medical_record%' then raise exception 'Directory exposed unrelated personal data';end if;
 begin perform public.student_directory('','all',1,'invalid');raise exception 'TEST: invalid class allowed';exception when raise_exception then if sqlerrm not like 'Revise os filtros de atletas%' then raise;end if;end;
end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$begin
 begin perform public.student_directory('','active',1,'all');raise exception 'TEST: trainer read the student directory';exception when raise_exception then if sqlerrm not like 'Consulta de atletas não autorizada%' then raise;end if;end;
end;$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.student_directory(text,text,integer,text)','execute') then raise exception 'Anonymous class filtering is exposed';end if;
 if (select prosecdef from pg_proc where oid='public.student_directory(text,text,integer,text)'::regprocedure) then raise exception 'Class filtering bypasses RLS';end if;
end;$$;
rollback;
select 'PASS: class/search/status before pagination; latest enrollment; unassigned; paused/excluded preservation; class options on empty results; legacy RPC compatibility; staff and RLS restrictions. All fixtures rolled back.' verification;
