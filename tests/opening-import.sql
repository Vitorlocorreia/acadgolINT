begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();e uuid;f uuid;i uuid;v integer;
begin
 insert into public.students(id,name,birth_date,portal_access_enabled) values(a,'Verificação importação A','2015-01-01',false),(b,'Verificação importação B','2014-01-01',false);
 begin
  insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,first_billing_month) values(a,null,null,current_date,10,150,'2026-11-01');
  raise exception 'Missing ordinary enrollment constraints';
 exception when check_violation then null;end;
 insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,first_billing_month,import_source) values(a,null,null,'2026-09-01',31,150,'2026-11-01','{"file_sha256":"verification","row":1}') returning id into e;
 insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,first_billing_month,import_source) values(b,null,null,'2026-09-01',10,200,'2026-11-01','{"file_sha256":"verification","row":2}') returning id into f;
 insert into public.invoices(enrollment_id,student_id,reference_month,due_date,amount,status,settled_before_import,paid_amount) values(e,a,'2026-10','2026-10-31',150,'paid',true,150) returning id into i;
 begin
  update public.invoices set payment_method='pix',paid_at=now() where id=i;
  raise exception 'Opening settlement allowed invented payment details';
 exception when check_violation then null;end;
 insert into public.invoices(enrollment_id,student_id,reference_month,due_date,amount,status) values(f,b,'2026-10','2026-10-10',200,'unconfirmed');
 if exists(select 1 from public.invoice_payments where invoice_id=i) then raise exception 'Opening settlement created a receipt';end if;
 v=private.issue_monthly_invoices('2026-10');
 if (select count(*) from public.invoices where student_id in(a,b) and reference_month='2026-10')<>2 then raise exception 'October duplicated';end if;
 perform private.issue_monthly_invoices('2026-11');
 perform private.issue_monthly_invoices('2026-11');
 if (select count(*) from public.invoices where student_id in(a,b) and reference_month='2026-11')<>2 then raise exception 'Future billing missing or duplicated';end if;
 if not exists(select 1 from public.invoices where student_id=a and reference_month='2026-11' and due_date='2026-11-30' and amount=150) then raise exception 'Day 31 not clamped to month end';end if;
end;$$;
set local role anon;
do $$begin
 begin
  perform public.complete_imported_enrollment(gen_random_uuid(),gen_random_uuid(),null,150,10);
  raise exception 'Anonymous management allowed';
 exception when insufficient_privilege then null;end;
end;$$;
reset role;
select 'Import constraints, no October duplicates, November billing, month-end clamp and anonymous denial passed' as verification;
rollback;
