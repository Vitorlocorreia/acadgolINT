-- Fixtures, audit events, role changes and all mutations are rolled back.
begin;
do $$declare s uuid;e uuid;g uuid;c uuid;m uuid;begin
 select id into c from public.classes order by id limit 1;
 insert into public.students(name,birth_date,status,portal_access_enabled) values('Verification recoverable deletion','1990-01-01','active',true) returning id into s;
 perform set_config('test.deleted_student',s::text,true);perform set_config('test.deleted_class',c::text,true);
 insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,first_billing_month,registration_fee,import_source)
 values(s,c,null,'1999-12-01',10,100,'active','2000-01-01',0,jsonb_build_object('file_sha256',repeat('0',64),'row',1)) returning id into e;
 insert into public.guardians(student_id,name,relationship,phone,receives_notifications) values(s,'Verification guardian','Responsável','81999990000',false) returning id into g;
 insert into public.invoices(student_id,enrollment_id,reference_month,due_date,amount,status,settled_before_import) values(s,e,'2000-02','2000-02-10',100,'paid',true),(s,e,'2000-03','2000-03-10',100,'unconfirmed',false);
 insert into public.attendance_logs(student_id,class_id,training_date,status) values(s,c,'2000-01-05','present');
 insert into public.matches(title,opponent,match_date,location,status,match_type,unit_id,category_id)
 select 'Verification deletion match','Verification opponent','2099-01-01','Verification field','scheduled','friendly',unit_id,(select id from public.categories limit 1) from public.classes where id=c returning id into m;
 insert into public.match_callups(match_id,student_id,status,access_enabled) values(m,s,'pending',true);
 insert into public.trial_classes(student_name,student_age,guardian_name,guardian_phone,unit_id,category_id,scheduled_date,scheduled_time,status,feedback)
 select 'Verification recoverable deletion',10,'Verification guardian','81999990000',unit_id,(select id from public.categories limit 1),'2099-01-01','14:00','scheduled',jsonb_build_object('student_id',s,'class_id',c)::text from public.classes where id=c;
 insert into private.whatsapp_jobs(dedupe_key,kind,entity_id,student_id,guardian_id,destination_hash,message,expires_at)
 values('verification-delete-'||s,'due',gen_random_uuid(),s,g,md5('verification'),'Verification message',now()+interval '1 day');
 perform set_config('test.deleted_financial_digest',(select md5(string_agg(to_jsonb(i)::text,'|' order by id)) from public.invoices i where student_id=s),true);
 perform set_config('test.deleted_portal_token',(select portal_token::text from public.students where id=s),true);
 perform set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',se.id)::text from public.staff_profiles p join auth.sessions se on se.user_id=p.id where p.role='admin' and p.active and not p.must_change_password order by se.created_at desc limit 1),true);
end;$$;
set local role authenticated;
do $$declare s uuid:=current_setting('test.deleted_student')::uuid;a jsonb;v_date timestamptz;begin
 a=public.change_student_deletion(s,true,'Cadastro de verificação duplicado',null);
 if not (a->>'success')::boolean then raise exception 'Deletion failed';end if;
 select deleted_at into v_date from public.students where id=s;perform set_config('test.deletion_timestamp',v_date::text,true);
 if not exists(select 1 from public.students where id=s and deleted_at is not null and deleted_by=auth.uid() and status='paused' and not portal_access_enabled and portal_token::text<>current_setting('test.deleted_portal_token')) then raise exception 'Deletion operational state or actor incorrect';end if;
 if exists(select 1 from public.enrollments where student_id=s and status in('active','trial')) then raise exception 'Enrollment remains active';end if;
 if (public.student_directory('Verification recoverable deletion','all',1)->>'total')::int<>0 or (public.student_directory('Verification recoverable deletion','paused',1)->>'total')::int<>0 or (public.student_directory('Verification recoverable deletion','deleted',1)->>'total')::int<>1 then raise exception 'Directory exclusion filters incorrect';end if;
 if exists(select 1 from jsonb_array_elements(public.staff_class_roster(current_setting('test.deleted_class')::uuid,current_date))x where x->>'student_id'=s::text) then raise exception 'Deleted student in attendance';end if;
 begin perform public.change_student_status(s,'active');raise exception 'Reactivated without restoring';exception when raise_exception then if sqlerrm not like 'Recupere o cadastro%' then raise;end if;end;
 begin perform public.renew_family_access(s,true);raise exception 'Deleted portal renewed';exception when raise_exception then if sqlerrm not like 'Atleta não encontrado%' then raise;end if;end;
 begin perform public.change_student_deletion(s,false,'',v_date-interval '1 second');raise exception 'Stale restore accepted';exception when raise_exception then if sqlerrm not like 'Este cadastro foi alterado%' then raise;end if;end;
 a=public.change_student_deletion(s,true,'Second request must not overwrite the first reason',null);
 if not (a->>'alreadyDeleted')::boolean then raise exception 'Duplicate exclusion not idempotent';end if;
end;$$;
reset role;
do $$declare s uuid:=current_setting('test.deleted_student')::uuid;c uuid:=current_setting('test.deleted_class')::uuid;begin
 if exists(select 1 from private.whatsapp_jobs where student_id=s and state='queued') or exists(select 1 from public.match_callups where student_id=s and access_enabled) or exists(select 1 from public.trial_classes where private.whatsapp_trial_student(feedback)=s and status='scheduled') then raise exception 'Operational communications remain enabled';end if;
 if private.issue_monthly_invoices('2000-01')<>0 then raise exception 'Deleted student was billed';end if;
 if current_setting('test.deleted_financial_digest')<>(select md5(string_agg(to_jsonb(i)::text,'|' order by id)) from public.invoices i where student_id=s) then raise exception 'Financial history changed';end if;
 if (select count(*) from public.attendance_logs where student_id=s)<>1 then raise exception 'Attendance history lost';end if;
 if (select count(*) from public.audit_events where entity_id=s::text and action='SOFT_DELETE_STUDENT' and metadata->'actor_snapshot'->>'username' is not null)<>1 then raise exception 'Audit identity or idempotency failed';end if;
 begin update public.enrollments set status='active' where student_id=s;raise exception 'Enrollment bypassed deletion';exception when raise_exception then if sqlerrm not like 'Atleta excluído%' then raise;end if;end;
 begin insert into public.attendance_logs(student_id,class_id,training_date,status) values(s,c,'2000-01-06','present');raise exception 'New attendance accepted';exception when raise_exception then if sqlerrm not like 'Atleta excluído%' then raise;end if;end;
 begin update private.whatsapp_jobs set state='queued' where student_id=s;raise exception 'Deleted notification retried';exception when raise_exception then if sqlerrm not like 'Atleta excluído%' then raise;end if;end;
 begin update public.match_callups set access_enabled=true where student_id=s;raise exception 'Callup link reenabled';exception when raise_exception then if sqlerrm not like 'Atleta excluído%' then raise;end if;end;
end;$$;
set local role authenticated;
do $$declare s uuid:=current_setting('test.deleted_student')::uuid;begin
 perform public.change_student_deletion(s,false,'',current_setting('test.deletion_timestamp')::timestamptz);
 if not exists(select 1 from public.students where id=s and deleted_at is null and status='paused' and not portal_access_enabled) or (public.student_directory('Verification recoverable deletion','paused',1)->>'total')::int<>1 then raise exception 'Restoration did not return paused';end if;
end;$$;
reset role;
do $$declare s uuid;begin
 insert into public.students(name,birth_date,status,archive_note,portal_access_enabled) values('Verification archived deletion',null,'paused','Historical student without birth date',false) returning id into s;
 perform public.change_student_deletion(s,true,'Verificação de cadastro histórico',null);
 perform public.change_student_deletion(s,false,'',(select deleted_at from public.students where id=s));
 if not exists(select 1 from public.students where id=s and birth_date is null and status='paused' and deleted_at is null) then raise exception 'Historical date guard broken';end if;
end;$$;
-- Trainers and finance-only profiles cannot delete or restore students.
update public.staff_profiles set role='financeiro' where id=auth.uid();
set local role authenticated;
do $$begin begin perform public.change_student_deletion(current_setting('test.deleted_student')::uuid,true,'Unauthorized deletion',null);raise exception 'Finance-only deletion allowed';exception when raise_exception then if sqlerrm not like 'Seu perfil não pode%' then raise;end if;end;end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$begin begin perform public.change_student_deletion(current_setting('test.deleted_student')::uuid,true,'Unauthorized deletion',null);raise exception 'Trainer deletion allowed';exception when raise_exception then if sqlerrm not like 'Seu perfil não pode%' then raise;end if;end;end;$$;
reset role;
set local role anon;
do $$begin begin perform public.change_student_deletion(current_setting('test.deleted_student')::uuid,true,'Unauthorized deletion',null);raise exception 'Anonymous deletion allowed';exception when insufficient_privilege then null;end;end;$$;
reset role;
rollback;
select 'PASS: deletion/recovery, stable financial/attendance history, audit actor, source directory, billing exclusion, communication revocation, stale/idempotent requests, archived birth dates and role denial' verification;
