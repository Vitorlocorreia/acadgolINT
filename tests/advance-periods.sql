-- Multiple reference months, all-or-nothing issuance and permissions; every change rolls back.
begin;
select set_config('request.jwt.claims','{}',true);
create temporary table period_fixture(kind text primary key,student uuid default gen_random_uuid(),enrollment uuid default gen_random_uuid());
insert into period_fixture(kind) select 'ok-'||lpad(n::text,2,'0') from generate_series(1,10)n;
insert into period_fixture(kind) values('blocked');
create temporary table period_existing as select id,to_jsonb(i) snapshot from public.invoices i;
create temporary table period_payments as select count(*) n from public.invoice_payments;
insert into public.students(id,name,birth_date,status,portal_access_enabled)
select student,'Teste períodos: '||kind,date '2017-01-01','active',false from period_fixture;
insert into public.enrollments(id,student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,first_billing_month)
select enrollment,student,(select id from public.classes limit 1),(select id from public.plans limit 1),date '2020-01-01',31,137.50,'active',date '2020-01-01' from period_fixture;
insert into public.invoices(student_id,enrollment_id,reference_month,due_date,amount,status,charge_type,paid_amount,notes)
select student,enrollment,to_char(date_trunc('month',now() at time zone 'America/Recife')+case when kind='blocked' then interval '2 months' else interval '1 month' end,'YYYY-MM'),
 (date_trunc('month',now() at time zone 'America/Recife')+case when kind='blocked' then interval '3 months - 1 day' else interval '2 months - 1 day' end)::date,
 99,case when kind='blocked' then 'paid' else 'pending' end,'monthly',case when kind='blocked' then 99 end,'Preservar valor existente'
from period_fixture where kind in('ok-01','blocked');
grant select on period_fixture to authenticated;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$begin if auth.uid() is null then raise exception 'A current secretary session is required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
set local role authenticated;
do $$declare r jsonb;r2 jsonb;ids uuid[];months text[];
 first_ref text:=to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month','YYYY-MM');
 second_ref text:=to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '2 months','YYYY-MM');
begin
 select array_agg(student order by kind) into ids from period_fixture where kind in('ok-01','ok-02');
 r=public.prepare_advance_monthly_periods(ids,array[second_ref,first_ref]);
 if jsonb_array_length(r->'invoices')<>4 or (r->>'createdCount')::integer<>3 then raise exception 'Two athletes x two months failed: %',r;end if;
 if r->'invoices'->0->>'reference_month'<>first_ref or r->'invoices'->2->>'reference_month'<>second_ref then raise exception 'Months were not processed chronologically';end if;
 if (r->'invoices'->0->>'amount')::numeric<>99 then raise exception 'Automatically existing invoice amount was replaced';end if;
 if (select count(*) from jsonb_array_elements(r->'invoices')x where x->'student'->>'id'=ids[1]::text)<>2 then raise exception 'Same athlete did not get both reference months';end if;
 r2=public.prepare_advance_monthly_periods(ids,array[first_ref,second_ref]);
 if (r2->>'createdCount')::integer<>0 or r2->'invoices'<>r->'invoices' then raise exception 'Retry changed or duplicated reference months';end if;
 begin
  perform public.prepare_advance_monthly_periods(array[(select student from period_fixture where kind='blocked')],array[first_ref,second_ref]);
  raise exception 'TEST: paid later month accepted';
 exception when raise_exception then if sqlerrm not like 'Não foi possível preparar a seleção.%' then raise;end if;end;
 if exists(select 1 from public.invoices where student_id=(select student from period_fixture where kind='blocked') and reference_month=first_ref) then raise exception 'Failure in later month left an earlier charge behind';end if;
 begin perform public.prepare_advance_monthly_periods(ids,array[first_ref,first_ref]);raise exception 'TEST: repeated month accepted';exception when raise_exception then if sqlerrm not like 'Revise a seleção:%' then raise;end if;end;
 begin perform public.prepare_advance_monthly_periods(ids,array['2026-13']);raise exception 'TEST: invalid month accepted';exception when raise_exception then if sqlerrm not like 'Informe meses válidos%' then raise;end if;end;
 begin perform public.prepare_advance_monthly_periods(ids,array[to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '13 months','YYYY-MM')]);raise exception 'TEST: out of range accepted';exception when raise_exception then if sqlerrm not like 'Escolha o mês atual%' then raise;end if;end;
 select array_agg(to_char(date_trunc('month',now() at time zone 'America/Recife')+n*interval '1 month','YYYY-MM') order by n) into months from generate_series(1,12)n;
 select array_agg(student order by kind) into ids from period_fixture;
 begin perform public.prepare_advance_monthly_periods(ids,months);raise exception 'TEST: excessive cross product accepted';exception when raise_exception then if sqlerrm not like 'Revise a seleção:%' then raise;end if;end;
 select array_agg(student order by kind) into ids from period_fixture where kind like 'ok-%';
 r=public.prepare_advance_monthly_periods(ids,months);
 if jsonb_array_length(r->'invoices')<>120 or (r->>'createdCount')::integer<>116 then raise exception '120-charge boundary or existing invoice reuse failed';end if;
end;$$;
reset role;
update public.staff_profiles set role='financeiro',coach_id=null where id=auth.uid();
set local role authenticated;
do $$begin
 perform public.prepare_advance_monthly_periods(array[(select student from period_fixture where kind='ok-01')],array[to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month','YYYY-MM')]);
end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$begin
 begin perform public.prepare_advance_monthly_periods(array[(select student from period_fixture where kind='ok-01')],array[to_char(now(),'YYYY-MM')]);raise exception 'TEST: trainer prepared reference months';exception when raise_exception then if sqlerrm not like 'Emissão de mensalidade não autorizada%' then raise;end if;end;
end;$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.prepare_advance_monthly_periods(uuid[],text[])','execute') or has_function_privilege('authenticated','private.run_monthly_billing()','execute') then raise exception 'Anonymous access or owner-only worker was exposed';end if;
 if exists(select 1 from period_existing b left join public.invoices i on i.id=b.id where i.id is null or to_jsonb(i)<>b.snapshot) then raise exception 'A real invoice changed';end if;
 if (select count(*) from public.invoice_payments)<>(select n from period_payments) then raise exception 'Preparation recorded a receipt';end if;
 if not exists(select 1 from public.invoices i join period_fixture f on f.student=i.student_id where f.kind='blocked' and i.status='paid' and i.amount=99 and i.paid_amount=99) then raise exception 'Previously paid later month was changed';end if;
 if (select count(*) from public.audit_events a join public.invoices i on a.entity_id=i.id::text join period_fixture f on f.student=i.student_id where f.kind like 'ok-%' and a.entity='invoices' and a.action='INSERT' and a.actor_id=auth.uid())<>119 then raise exception 'Multi-month invoice creation lost staff identity';end if;
end;$$;
rollback;
select 'PASS: same athlete across months, multi-athlete/month selection, sorted locks, automatic invoice reuse, full rollback on later-month failure, 120-charge boundary, permissions, audit, no real payment changes. All fixtures rolled back.' verification;
