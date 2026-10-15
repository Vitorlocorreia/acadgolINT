-- Isolated fixtures only. No requests to a provider, no messages, all changes rolled back.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$begin if auth.uid() is null then raise exception 'Secretary session required for rollback test';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
create temporary table whatsapp_fixture(student uuid default gen_random_uuid(),guardian uuid default gen_random_uuid(),guardian_duplicate uuid default gen_random_uuid(),class uuid default gen_random_uuid(),match uuid default gen_random_uuid(),callup uuid default gen_random_uuid(),invoice uuid default gen_random_uuid(),job uuid,claim uuid,claims text);
insert into whatsapp_fixture(claims) values(current_setting('request.jwt.claims'));
grant select,update on whatsapp_fixture to authenticated;
insert into public.students(id,name,birth_date,status) select student,'Verificação de comunicação','2017-01-01','active' from whatsapp_fixture;
insert into public.guardians(id,student_id,name,phone,receives_notifications) select guardian,student,'Responsável de verificação','81900000000',true from whatsapp_fixture union all select guardian_duplicate,student,'Mesmo telefone','(81) 90000-0000',true from whatsapp_fixture;
insert into public.classes(id,name,unit_id,category_id,start_time,end_time) select class,'Turma de verificação',(select id from public.units limit 1),(select id from public.categories limit 1),'08:00','09:00' from whatsapp_fixture;
insert into public.attendance_logs(class_id,student_id,training_date,status) select class,student,current_date,'present' from whatsapp_fixture;
insert into public.matches(id,title,opponent,location,match_date,status) select match,'Verificação','Visitante','Campo de verificação',current_date+10,'scheduled' from whatsapp_fixture;
insert into public.match_callups(id,match_id,student_id,status) select callup,match,student,'pending' from whatsapp_fixture;
set local role authenticated;
do $$declare f whatsapp_fixture%rowtype;r jsonb;again jsonb;begin
 select * into f from whatsapp_fixture;
 r=public.whatsapp_reserve('attendance',f.student,f.guardian,f.class,current_date,'present','Mensagem de verificação');
 if r->>'claim' is null then raise exception 'First send not reserved';end if;
 update whatsapp_fixture set job=(r->>'id')::uuid,claim=(r->>'claim')::uuid;
 again=public.whatsapp_reserve('attendance',f.student,f.guardian_duplicate,f.class,current_date,'present','Mensagem repetida');
 if again->>'claim' is not null or again->>'state'<>'sending' then raise exception 'Concurrent/duplicate recipient was not blocked';end if;
 begin perform public.whatsapp_finish((r->>'id')::uuid,gen_random_uuid(),'accepted','forged',null);raise exception 'Wrong claim was accepted';exception when raise_exception then if sqlerrm<>'Acesso restrito.' then raise;end if;end;
end;$$;
do $$declare f whatsapp_fixture%rowtype;r jsonb;begin
 select * into f from whatsapp_fixture;
 if not public.whatsapp_finish(f.job,f.claim,'accepted','fixture-provider-id',null) then raise exception 'Valid result rejected';end if;
 r=public.whatsapp_reserve('attendance',f.student,f.guardian,f.class,current_date,'present','Repeated save');
 if r->>'state'<>'accepted' or r->>'claim' is not null then raise exception 'Accepted event repeated';end if;
 r=public.whatsapp_console();
 if not exists(select 1 from jsonb_array_elements(r->'entries')e where e->>'id'=f.job::text and e->'actor'->>'username'='secretaria' and e->>'attempts'='1') then raise exception 'Operator or attempts missing from console';end if;
 if r::text like '%81900000000%' or r::text like '%fixture-provider-id%' then raise exception 'Sensitive recipient/provider fields exposed in console';end if;
 begin perform 1 from private.whatsapp_jobs;raise exception 'Raw queue exposed';exception when insufficient_privilege then null;end;
 begin perform public.whatsapp_reserve('callup',gen_random_uuid(),f.guardian,null,null,'','Forged');raise exception 'Unknown callup authorized';exception when raise_exception then if sqlerrm not like 'Convocação não autorizada%' then raise;end if;end;
 r=public.whatsapp_reserve('callup',f.callup,f.guardian,null,null,'','Convocação de verificação');
 if r->>'claim' is null then raise exception 'Callup not reserved';end if;
 perform public.whatsapp_finish((r->>'id')::uuid,(r->>'claim')::uuid,'uncertain',null,'Interrupção simulada');
 begin perform public.whatsapp_retry((r->>'id')::uuid,false);raise exception 'Unknown outcome retried without review';exception when raise_exception then if sqlerrm not like 'Confira a conversa%' then raise;end if;end;
 perform public.whatsapp_retry((r->>'id')::uuid,true);
 r=public.whatsapp_reserve('callup',f.callup,f.guardian,null,null,'','Convocação de verificação');
 perform public.whatsapp_finish((r->>'id')::uuid,(r->>'claim')::uuid,'accepted','fixture-image',null);
end;$$;
reset role;
-- Disabled recipients do not get a reservation; changed attendance cannot be retried into the old status.
update public.guardians set receives_notifications=false where id=(select guardian from whatsapp_fixture);
update public.attendance_logs set status='absent' where class_id=(select class from whatsapp_fixture);
set local role authenticated;
do $$declare f whatsapp_fixture%rowtype;r jsonb;begin
 select * into f from whatsapp_fixture;
 r=public.whatsapp_reserve('attendance',f.student,f.guardian,f.class,current_date,'absent','Ausência');
 if r->>'state'<>'cancelled' then raise exception 'Recipient opt-out ignored';end if;
 r=public.whatsapp_reserve('attendance',f.student,f.guardian_duplicate,f.class,current_date,'absent','Ausência');
 perform public.whatsapp_finish((r->>'id')::uuid,(r->>'claim')::uuid,'failed',null,'Recusado');
 update whatsapp_fixture set job=(r->>'id')::uuid;
end;$$;
reset role;
update public.attendance_logs set status='present' where class_id=(select class from whatsapp_fixture);
set local role authenticated;
do $$begin
 begin perform public.whatsapp_retry((select job from whatsapp_fixture),false);raise exception 'Old attendance was retried';exception when raise_exception then if sqlerrm not like 'A chamada foi alterada%' then raise;end if;end;
end;$$;
reset role;
-- Background events are opt-in, including newly recorded manual receipts.
update private.whatsapp_settings set welcome_enabled=true,receipt_enabled=true;
insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status) select student,class,(select id from public.plans limit 1),current_date,10,120,'active' from whatsapp_fixture;
insert into public.invoices(id,student_id,reference_month,due_date,amount,status,charge_type) select invoice,student,to_char(current_date,'YYYY-MM'),current_date,120,'pending','registration' from whatsapp_fixture;
set local role authenticated;
do $$declare f whatsapp_fixture%rowtype;begin
 select * into f from whatsapp_fixture;
 perform public.record_manual_payment(jsonb_build_object('invoiceId',f.invoice,'idempotencyKey',gen_random_uuid(),'paymentMethod','pix','receivedAmount',120,'overdueOption','waive'));
end;$$;
reset role;
do $$begin
 if (select count(*) from private.whatsapp_jobs where student_id=(select student from whatsapp_fixture) and kind='welcome')<>1 then raise exception 'Welcome event/recipient dedup failed';end if;
 if (select count(*) from private.whatsapp_jobs where student_id=(select student from whatsapp_fixture) and kind='receipt')<>1 then raise exception 'Receipt event not queued';end if;
end;$$;
-- Test real scheduler and claiming with an internal test clock; the API never accepts a supplied clock.
update private.whatsapp_settings set due_enabled=true,overdue_enabled=true,welcome_enabled=false,receipt_enabled=false;
insert into public.invoices(enrollment_id,student_id,reference_month,due_date,amount,status,charge_type)
 select (select id from public.enrollments where student_id=f.student limit 1),student,to_char(current_date,'YYYY-MM'),current_date+3,120,'pending','monthly' from whatsapp_fixture f;
do $$declare f whatsapp_fixture%rowtype;r jsonb;v_at timestamptz;v_invoice uuid;v_job uuid;begin
 select * into f from whatsapp_fixture;v_at=current_date::timestamp at time zone 'America/Recife';
 perform private.whatsapp_enqueue_scheduled(v_at+interval '7 hours');
 if exists(select 1 from private.whatsapp_jobs where student_id=f.student and kind='due') then raise exception 'Scheduled messages escaped quiet hours';end if;
 perform private.whatsapp_enqueue_scheduled(v_at+interval '9 hours');perform private.whatsapp_enqueue_scheduled(v_at+interval '9 hours');
 if (select count(*) from private.whatsapp_jobs where student_id=f.student and kind='due')<>1 then raise exception 'Scheduler duplicate or missing reminder';end if;
 select id into v_invoice from public.invoices where student_id=f.student and status='pending';
 perform public.record_manual_payment(jsonb_build_object('invoiceId',v_invoice,'idempotencyKey',gen_random_uuid(),'paymentMethod','dinheiro','receivedAmount',120,'overdueOption','waive'));
 update private.whatsapp_jobs set state='cancelled' where student_id<>f.student and state='queued';
 r=private.whatsapp_claim_scheduled(v_at+interval '9 hours');
 if r is not null then raise exception 'Paid invoice or disabled event was dispatched';end if;
 if not exists(select 1 from private.whatsapp_jobs where entity_id=v_invoice and kind='due' and state='cancelled') then raise exception 'Paid reminder not cancelled';end if;
 perform public.reverse_manual_payment(v_invoice,'Verificação da fila e reabertura da cobrança');
 perform private.whatsapp_enqueue_scheduled(v_at+interval '9 hours');
 if exists(select 1 from private.whatsapp_jobs where entity_id=v_invoice and kind='overdue') then raise exception 'Overdue notice sent before the following month';end if;
 v_at=(date_trunc('month',current_date::timestamp)+interval '1 month 9 hours') at time zone 'America/Recife';
 perform private.whatsapp_enqueue_scheduled(v_at);
 update private.whatsapp_jobs set state='cancelled' where student_id<>f.student and state='queued';
 if (select count(*) from private.whatsapp_jobs where entity_id=v_invoice and kind='overdue')<>1 then raise exception 'Following-month notice missing';end if;
 r=private.whatsapp_claim_scheduled(v_at);
 if r->>'claim' is null then raise exception 'Worker did not claim an eligible scheduled message';end if;
 v_job=(r->>'id')::uuid;
 if not private.whatsapp_complete(v_job,(r->>'claim')::uuid,'accepted','fixture-only',null) then raise exception 'Worker result was not recorded';end if;
 r=private.whatsapp_claim_scheduled(v_at);
 if r is not null then raise exception 'Accepted scheduled message was claimed twice';end if;
end;$$;
insert into private.whatsapp_workers(id,token_hash) values('rollback-fixture',encode(extensions.digest(repeat('w',64),'sha256'),'hex'));
set local role anon;
do $$begin perform public.whatsapp_worker(repeat('w',64),'claim');end;$$;
reset role;
do $$begin if not exists(select 1 from private.whatsapp_workers where id='rollback-fixture' and heartbeat_at is not null) then raise exception 'Authenticated worker heartbeat missing';end if;end;$$;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$declare f whatsapp_fixture%rowtype;begin
 select * into f from whatsapp_fixture;
 begin perform public.whatsapp_reserve('attendance',f.student,f.guardian,f.class,current_date,'present','Unauthorized class');raise exception 'Coach accessed another class';exception when raise_exception then if sqlerrm<>'Chamada não autorizada.' then raise;end if;end;
 begin perform public.whatsapp_reserve('callup',f.callup,f.guardian,null,null,'','Unauthorized match');raise exception 'Coach accessed another match';exception when raise_exception then if sqlerrm not like 'Convocação não autorizada%' then raise;end if;end;
end;$$;
reset role;
update public.staff_profiles set role='financeiro' where id=auth.uid();
set local role authenticated;
do $$begin
 begin perform public.whatsapp_console();raise exception 'Finance-only role read communications';exception when raise_exception then if sqlerrm<>'Acesso restrito.' then raise;end if;end;
end;$$;
reset role;
set local role anon;
do $$begin
 begin perform public.whatsapp_worker(repeat('x',64),'claim');raise exception 'Unregistered worker accepted';exception when insufficient_privilege then null;end;
 begin perform public.whatsapp_console();raise exception 'Anonymous history exposed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
