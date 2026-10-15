-- Run with a database administrator in a verification environment with an active is_test staff login.
-- All fixture rows, receipts, access changes and audit entries roll back together.
begin;
do $$ begin
 if not exists(select 1 from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.is_test and p.active and not p.must_change_password) then raise exception 'An authenticated verification account is required.';end if;
end $$;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.is_test and p.active and not p.must_change_password order by s.created_at desc limit 1),true);
create temporary table verification_state(student uuid,invoice uuid,request uuid,class uuid,plan uuid,stock uuid,coach uuid);
insert into verification_state values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),(select id from public.classes where is_active limit 1),(select id from public.plans where is_active limit 1),(select id from public.uniform_inventory where quantity>0 limit 1),(select coach_id from public.classes where is_active limit 1));
insert into public.students(id,name,birth_date,status) select student,'Verificação transacional',current_date-interval '9 years','active' from verification_state;
insert into public.invoices(id,student_id,reference_month,due_date,amount,status,notes) select invoice,student,to_char(current_date,'YYYY-MM'),current_date,100,'pending','Observação original preservada' from verification_state;
insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status) select student,class,plan,current_date,31,100,'active' from verification_state;
grant select on verification_state to authenticated;
set local role authenticated;
do $$ declare v verification_state%rowtype;r jsonb;n integer;begin
 select * into v from verification_state;
 if not private.has_role(array['admin']) then raise exception 'Admin session rejected';end if;
 r=public.record_manual_payment(jsonb_build_object('invoiceId',v.invoice,'idempotencyKey',v.request,'paymentMethod','dinheiro','receivedAmount',90,'overdueOption','negotiated','negotiationReason','Acordo de verificação'));
 r=public.record_manual_payment(jsonb_build_object('invoiceId',v.invoice,'idempotencyKey',v.request,'paymentMethod','dinheiro','receivedAmount',90,'overdueOption','negotiated','negotiationReason','Acordo de verificação'));
 if (select count(*) from public.invoice_payments where invoice_id=v.invoice)<>1 then raise exception 'Duplicate receipt';end if;
 if not exists(select 1 from public.invoices where id=v.invoice and amount=100 and paid_amount=90 and notes='Observação original preservada') then raise exception 'Principal or notes changed';end if;
 perform public.reverse_manual_payment(v.invoice,'Estorno de verificação');
 perform public.reverse_manual_payment(v.invoice,'Estorno de verificação');
 if not exists(select 1 from public.invoices where id=v.invoice and amount=100 and status='pending' and paid_amount is null and notes='Observação original preservada') then raise exception 'Reversal lost original amount';end if;
 if (select count(*) from public.payment_reversals where payment_id in(select id from public.invoice_payments where invoice_id=v.invoice))<>1 then raise exception 'Duplicate reversal';end if;
 begin update public.invoices set amount=1 where id=v.invoice;raise exception 'Direct invoice update allowed';exception when insufficient_privilege then null;end;
 begin delete from public.invoice_payments where invoice_id=v.invoice;raise exception 'Ledger delete allowed';exception when insufficient_privilege then null;end;
 perform public.adjust_uniform_stock(v.stock,-1);perform public.adjust_uniform_stock(v.stock,1);
 perform public.staff_matches();perform public.staff_class_catalog(null);perform public.staff_class_roster(v.class,current_date);perform public.staff_attendance_history(null,5000);
 select count(*) into n from public.students;
 begin perform public.enroll_student(jsonb_build_object('request_id',gen_random_uuid(),'name','Cadastro inválido','photo_url','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','birth_date',current_date-interval '8 years','due_day',10,'monthly_fee',100,'guardians_json','[]','class_id',v.class,'plan_id',v.plan));raise exception 'Invalid guardian accepted';exception when raise_exception then if sqlerrm='Invalid guardian accepted' then raise;end if;end;
 if (select count(*) from public.students)<>n then raise exception 'Partial enrollment persisted';end if;
 declare enrolled jsonb;again jsonb;payload jsonb;trial jsonb;trial_student uuid;trial_payload jsonb;request2 uuid:=gen_random_uuid();begin
  payload=jsonb_build_object('request_id',gen_random_uuid(),'name','Matrícula transacional válida','registration_fee',0,'photo_url','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','birth_date',(current_date-interval '8 years')::date,'due_day',31,'monthly_fee',120,'guardians_json','[{"name":"Responsável de verificação","phone":"81900000000"}]','class_id',v.class,'plan_id',(select id from public.plans where is_active and not includes_uniform limit 1),'uniform_size','10');
  enrolled=public.enroll_student(payload);again=public.enroll_student(payload);
  if enrolled->>'studentId' is distinct from again->>'studentId' then raise exception 'Enrollment retry duplicated student';end if;
  if not exists(select 1 from public.medical_records where student_id=(enrolled->>'studentId')::uuid and not has_medical_clearance and not image_use_authorized) then raise exception 'Medical clearance was invented';end if;
  if(select count(*) from public.invoices where student_id=(enrolled->>'studentId')::uuid)<>1 then raise exception 'Enrollment first invoice missing or duplicated';end if;
  if(select due_date from public.invoices where student_id=(enrolled->>'studentId')::uuid) is null then raise exception 'Month end due date invalid';end if;
  begin perform public.remove_student_guardian((select id from public.guardians where student_id=(enrolled->>'studentId')::uuid limit 1),(enrolled->>'studentId')::uuid);raise exception 'Last guardian removed';exception when raise_exception then if sqlerrm='Last guardian removed' then raise;end if;end;
  trial=public.schedule_trial(jsonb_build_object('request_id',request2,'student_name','Experimental de verificação','student_age',8,'guardian_name','Responsável de verificação','guardian_phone','81900000000','class_id',v.class,'scheduled_date',current_date+1));
  trial_payload=(select feedback::jsonb from public.trial_classes where id=(trial->>'trialId')::uuid);trial_student=(trial_payload->>'student_id')::uuid;
  payload=payload||jsonb_build_object('request_id',gen_random_uuid(),'trial_id',trial->>'trialId','name','Experimental matriculado');
  enrolled=public.enroll_student(payload);
  if(enrolled->>'studentId')::uuid<>trial_student then raise exception 'Trial conversion duplicated athlete';end if;
  if not exists(select 1 from public.trial_classes where id=(trial->>'trialId')::uuid and status='enrolled') then raise exception 'Trial conversion not completed';end if;
  perform public.save_match(null,jsonb_build_object('title','Partida de verificação','opponent','Adversário teste','match_type','friendly','unit_id',(select unit_id from public.classes where id=v.class),'coach_id',v.coach,'match_date',current_date+1,'match_time','10:00','registration_fee',0),array[v.student]);
 end;
end $$;
reset role;
update public.staff_profiles set role='financeiro' where id=auth.uid();
set local role authenticated;
do $$ begin
 if exists(select 1 from public.students) or exists(select 1 from public.guardians) or exists(select 1 from public.medical_records) then raise exception 'Finance can read private student records';end if;
 if not exists(select 1 from public.finance_invoices where student->>'name'='Verificação transacional') then raise exception 'Finance billing projection unavailable';end if;
 if exists(select 1 from public.finance_invoices where student::text like '%cpf%' or student::text like '%signature_url%') then raise exception 'Finance projection leaked private fields';end if;
 if exists(select 1 from public.finance_invoices where student->>'portal_token' is not null) then raise exception 'Finance projection leaked family access';end if;
 begin perform public.staff_student_roster();raise exception 'Finance roster allowed';exception when raise_exception then if sqlerrm='Finance roster allowed' then raise;end if;end;
end $$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select coach from verification_state) where id=auth.uid();
set local role authenticated;
do $$ declare c uuid;begin
 if exists(select 1 from public.invoices) or exists(select 1 from public.students) or exists(select 1 from public.guardians) or exists(select 1 from public.medical_records) then raise exception 'Coach can read protected records';end if;
 if jsonb_array_length(public.staff_student_roster())<1 then raise exception 'Assigned coach roster unavailable';end if;
 if public.staff_student_roster()::text like '%signature_url%' or public.staff_student_roster()::text like '%cpf%' then raise exception 'Coach projection leaked private fields';end if;
 begin perform public.reverse_manual_payment((select invoice from verification_state),'Unauthorized test');raise exception 'Coach reversal allowed';exception when raise_exception then if sqlerrm='Coach reversal allowed' then raise;end if;end;
end $$;
reset role;
update public.staff_profiles set must_change_password=true where id=auth.uid();
set local role authenticated;
do $$ begin
 if private.staff_role() is not null then raise exception 'Pending password has a business role';end if;
 if exists(select 1 from public.classes) then raise exception 'Pending password can read classes';end if;
 begin perform public.complete_password_change();raise exception 'Password change bypass allowed';exception when raise_exception then if sqlerrm='Password change bypass allowed' then raise;end if;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.students;raise exception 'Anonymous students read allowed';exception when insufficient_privilege then null;end;
 begin perform public.staff_matches();raise exception 'Anonymous RPC allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: receipts, idempotency, reversals, immutable history, role isolation, forced password and anonymous access; all fixtures rolled back' as verification;
