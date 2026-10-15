-- Run as database administrator. Fixtures, invoices, profile changes and run logs all roll back.
begin;
select set_config('request.jwt.claims','{}',true);
create temporary table billing_fixture(kind text primary key,student uuid default gen_random_uuid(),enrollment uuid default gen_random_uuid());
insert into billing_fixture(kind) values('eligible'),('inactive_student'),('trial_student'),('inactive_enrollment'),('future_start'),('cancelled'),('paid');
create temporary table billing_existing as select id,amount,paid_amount,status,notes,due_date from public.invoices;
insert into public.students(id,name,birth_date,status)
select student,'Verificação mensal automática: '||kind,date '2017-01-01',case kind when 'inactive_student' then 'inactive' when 'trial_student' then 'trial' else 'active' end from billing_fixture;
insert into public.enrollments(id,student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,created_at)
select enrollment,student,(select id from public.classes limit 1),(select id from public.plans limit 1),
 case when kind='future_start' then (date_trunc('month',now() at time zone 'America/Recife')+interval '1 month')::date else date '2020-01-01' end,
 31,137.50,case when kind='inactive_enrollment' then 'inactive' else 'active' end,now() from billing_fixture;
-- Two active registrations still produce a single invoice with the latest agreed fee.
insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,created_at)
select student,(select id from public.classes limit 1),(select id from public.plans limit 1),date '2020-01-01',31,149.25,'active',now()+interval '1 second' from billing_fixture where kind='eligible';
insert into public.invoices(student_id,enrollment_id,reference_month,due_date,amount,paid_amount,status,notes)
select student,enrollment,to_char(now() at time zone 'America/Recife','YYYY-MM'),(now() at time zone 'America/Recife')::date,88,
 case when kind='paid' then 85 else null end,case kind when 'paid' then 'paid' else 'cancelled' end,'Preservar decisão financeira'
from billing_fixture where kind in('paid','cancelled');
grant select on billing_fixture to authenticated;

do $$ declare result jsonb;month_ref text:=to_char(now() at time zone 'America/Recife','YYYY-MM');n integer;begin
 -- No user JWT: exercise the worker exactly as the scheduled owner calls it.
 if auth.uid() is not null then raise exception 'Worker test unexpectedly has a user identity';end if;
 result=private.run_monthly_billing();
 if result->>'month'<>month_ref or(result->>'count')::integer<>1 then raise exception 'Worker did not generate exactly the eligible missing invoice: %',result;end if;
 if not exists(select 1 from public.invoices i join billing_fixture f on f.student=i.student_id where f.kind='eligible' and i.reference_month=month_ref and i.amount=149.25 and i.status='pending' and i.due_date=(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month'-interval '1 day')::date) then raise exception 'Wrong fee, status or month-end due date';end if;
 if exists(select 1 from public.invoices i join billing_fixture f on f.student=i.student_id where f.kind in('inactive_student','trial_student','inactive_enrollment','future_start')) then raise exception 'Ineligible or future student was billed';end if;
 result=private.run_monthly_billing();
 if(result->>'count')::integer<>0 then raise exception 'Daily retry duplicated a monthly invoice';end if;
 if(select count(*) from public.invoices i join billing_fixture f on f.student=i.student_id where f.kind='cancelled')<>1 then raise exception 'Cancelled invoice was reissued';end if;
 if not exists(select 1 from public.invoices i join billing_fixture f on f.student=i.student_id where f.kind='paid' and i.amount=88 and i.paid_amount=85 and i.notes='Preservar decisão financeira' and i.status='paid') then raise exception 'Existing payment was changed';end if;
 if exists(select * from billing_existing except select id,amount,paid_amount,status,notes,due_date from public.invoices) then raise exception 'An existing real invoice changed';end if;
 if not exists(select 1 from private.monthly_billing_runs where reference_month=month_ref and generated_count=1) then raise exception 'Worker result was not logged';end if;
 perform private.issue_monthly_invoices('2028-02');
 if not exists(select 1 from public.invoices i join billing_fixture f on f.student=i.student_id where f.kind='eligible' and i.reference_month='2028-02' and i.due_date=date '2028-02-29') then raise exception 'Leap February due date incorrect';end if;
 perform private.issue_monthly_invoices('2027-02');
 if not exists(select 1 from public.invoices i join billing_fixture f on f.student=i.student_id where f.kind='eligible' and i.reference_month='2027-02' and i.due_date=date '2027-02-28') then raise exception 'February due date incorrect';end if;
 perform private.issue_monthly_invoices('2019-12');
 if exists(select 1 from public.invoices i join billing_fixture f on f.student=i.student_id where i.reference_month='2019-12') then raise exception 'Invoice predates enrollment start';end if;
 if has_function_privilege('authenticated','private.run_monthly_billing()','execute') or has_function_privilege('anon','private.issue_monthly_invoices(text)','execute') then raise exception 'Internal billing is exposed to application roles';end if;
 if not exists(select 1 from cron.job where jobname='acadgol-monthly-billing' and active and username='postgres' and schedule='5 3 * * *' and command='select private.run_monthly_billing();') then raise exception 'Daily schedule is missing or changed';end if;
end;$$;

-- Manual fallback uses the same implementation but still enforces financial staff permissions.
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$ begin if auth.uid() is null then raise exception 'A current secretary session is required for the permission checks';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
set local role authenticated;
do $$ declare r jsonb;begin
 r=public.generate_manual_invoices(to_char(now() at time zone 'America/Recife','YYYY-MM'));
 if(r->>'count')::integer<>0 then raise exception 'Manual fallback duplicated invoices';end if;
 begin perform private.run_monthly_billing();raise exception 'A user executed the owner-only worker';exception when insufficient_privilege then null;end;
 begin perform public.generate_manual_invoices('2026-99');raise exception 'Invalid month accepted';exception when raise_exception then if sqlerrm not like 'Mês inválido%' then raise;end if;end;
end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$ begin
 begin perform public.generate_manual_invoices(to_char(now() at time zone 'America/Recife','YYYY-MM'));raise exception 'Trainer generated invoices';exception when raise_exception then if sqlerrm not like 'Geração de mensalidades não autorizada%' then raise;end if;end;
end;$$;
reset role;
rollback;
select 'PASS: automatic issuance without a staff JWT; eligible registrations only; latest agreed fee; retries; cancellation/payment preservation; February; enrollment start; daily schedule; financial fallback and trainer denial. All test changes rolled back.' as verification;
