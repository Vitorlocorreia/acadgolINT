-- Run as database owner. All fixtures, staff changes, invoices and audit events roll back.
begin;
select set_config('request.jwt.claims','{}',true);
create temporary table advance_fixture(kind text primary key,student uuid default gen_random_uuid(),enrollment uuid default gen_random_uuid());
insert into advance_fixture(kind) values('eligible'),('other'),('inactive'),('deleted'),('future_billing'),('future_start'),('inactive_enrollment'),('paid'),('cancelled'),('existing');
create temporary table advance_existing as select id,to_jsonb(i) snapshot from public.invoices i;
create temporary table advance_payment_count as select count(*) n from public.invoice_payments;
insert into public.students(id,name,birth_date,status,portal_access_enabled)
select student,'Teste antecipação: '||kind,date '2017-01-01',case when kind='inactive' then 'inactive' else 'active' end,false from advance_fixture;
insert into public.enrollments(id,student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,first_billing_month,created_at)
select enrollment,student,(select id from public.classes limit 1),(select id from public.plans limit 1),
 case when kind='future_start' then (date_trunc('month',now() at time zone 'America/Recife')+interval '3 months')::date else date '2020-01-01' end,
 31,137.50,case when kind='inactive_enrollment' then 'inactive' else 'active' end,
 case when kind='future_billing' then (date_trunc('month',now() at time zone 'America/Recife')+interval '3 months')::date else date '2020-01-01' end,now()
from advance_fixture;
update public.students set status='paused',deleted_at=now(),deletion_reason='Exclusão fictícia para teste'
 where id=(select student from advance_fixture where kind='deleted');
-- Latest eligible enrollment determines an unissued month's agreed value.
insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,first_billing_month,created_at)
select student,(select id from public.classes limit 1),(select id from public.plans limit 1),date '2020-01-01',31,149.25,'active',date '2020-01-01',now()+interval '1 second' from advance_fixture where kind='eligible';
insert into public.invoices(student_id,enrollment_id,reference_month,due_date,amount,paid_amount,status,charge_type,notes)
select student,enrollment,to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month','YYYY-MM'),
 (date_trunc('month',now() at time zone 'America/Recife')+interval '2 months - 1 day')::date,88,
 case when kind='paid' then 85 end,case kind when 'paid' then 'paid' when 'cancelled' then 'cancelled' else 'unconfirmed' end,'monthly','Preservar decisão financeira'
from advance_fixture where kind in('paid','cancelled','existing');
-- A paid current month must not be changed by receipt preparation for the following month.
insert into public.invoices(student_id,enrollment_id,reference_month,due_date,amount,paid_amount,status,charge_type,settled_before_import)
select student,enrollment,to_char(now() at time zone 'America/Recife','YYYY-MM'),(now() at time zone 'America/Recife')::date,120,120,'paid','monthly',true from advance_fixture where kind='eligible';
grant select on advance_fixture to authenticated;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$begin if auth.uid() is null then raise exception 'A current secretary session is required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
set local role authenticated;
do $$declare r jsonb;r2 jsonb;f record;ref text:=to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month','YYYY-MM');begin
 r=public.finance_advance_students('teste antecipacao:');
 if jsonb_array_length(r)<>7 then raise exception 'Lookup must exclude inactive/deleted athletes and inactive enrollments: %',jsonb_array_length(r);end if;
 if exists(select 1 from jsonb_array_elements(r)x where x ? 'portal_token' or x ? 'phone' or x ? 'birth_date') then raise exception 'Lookup leaked unrelated personal data';end if;
 r=public.prepare_advance_monthly_invoice((select student from advance_fixture where kind='eligible'),ref);
 if r->>'created'<>'true' or r->'invoice'->>'status'<>'pending' or (r->'invoice'->>'amount')::numeric<>149.25
  or (r->'invoice'->>'due_date')::date<>(date_trunc('month',now() at time zone 'America/Recife')+interval '2 months - 1 day')::date then raise exception 'Wrong individual invoice: %',r;end if;
 r2=public.prepare_advance_monthly_invoice((select student from advance_fixture where kind='eligible'),ref);
 if r2->>'created'<>'false' or r2->'invoice'->>'id'<>r->'invoice'->>'id' then raise exception 'Retry did not reuse the invoice';end if;
 r=public.prepare_advance_monthly_invoice((select student from advance_fixture where kind='existing'),ref);
 if r->>'created'<>'false' or r->'invoice'->>'status'<>'unconfirmed' or (r->'invoice'->>'amount')::numeric<>88 then raise exception 'Existing invoice was changed';end if;
 for f in select * from advance_fixture where kind in('inactive','deleted','future_billing','future_start','inactive_enrollment','paid','cancelled') loop
  begin
   perform public.prepare_advance_monthly_invoice(f.student,ref);raise exception 'TEST: ineligible invoice accepted: %',f.kind;
  exception when raise_exception then
   if sqlerrm like 'TEST:%' then raise;end if;
   if f.kind in('inactive','deleted') and sqlerrm not like 'O atleta precisa estar ativo%' then raise;end if;
   if f.kind in('future_billing','future_start','inactive_enrollment') and sqlerrm not like 'Não há matrícula ativa%' then raise;end if;
   if f.kind='paid' and sqlerrm not like '%já está quitada%' then raise;end if;
   if f.kind='cancelled' and sqlerrm not like '%foi cancelada%' then raise;end if;
  end;
 end loop;
 begin perform public.prepare_advance_monthly_invoice((select student from advance_fixture where kind='eligible'),'2026-13');raise exception 'TEST: bad month accepted';exception when raise_exception then if sqlerrm not like 'Informe um atleta%' then raise;end if;end;
 begin perform public.prepare_advance_monthly_invoice((select student from advance_fixture where kind='eligible'),to_char(date_trunc('month',now())-interval '1 month','YYYY-MM'));raise exception 'TEST: past month accepted';exception when raise_exception then if sqlerrm not like 'Escolha o mês atual%' then raise;end if;end;
 begin perform public.prepare_advance_monthly_invoice((select student from advance_fixture where kind='eligible'),to_char(date_trunc('month',now())+interval '13 months','YYYY-MM'));raise exception 'TEST: out-of-range month accepted';exception when raise_exception then if sqlerrm not like 'Escolha o mês atual%' then raise;end if;end;
 -- Next February is always in the allowed twelve-month window; due day 31 must clamp to its final day.
 ref=to_char(case when extract(month from now() at time zone 'America/Recife')<2 then make_date(extract(year from now() at time zone 'America/Recife')::integer,2,1) else make_date(extract(year from now() at time zone 'America/Recife')::integer+1,2,1) end,'YYYY-MM');
 r=public.prepare_advance_monthly_invoice((select student from advance_fixture where kind='eligible'),ref);
 if (r->'invoice'->>'due_date')::date<>((ref||'-01')::date+interval '1 month - 1 day')::date then raise exception 'February due day was not clamped';end if;
end;$$;
reset role;
-- A financial-only staff member can use the restricted lookup without broad student access.
update public.staff_profiles set role='financeiro',coach_id=null where id=auth.uid();
set local role authenticated;
do $$declare r jsonb;begin
 r=public.finance_advance_students('teste antecipacao:');if jsonb_array_length(r)=0 then raise exception 'Financial staff cannot search';end if;
 perform public.prepare_advance_monthly_invoice((select student from advance_fixture where kind='eligible'),to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month','YYYY-MM'));
end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$begin
 begin perform public.finance_advance_students('teste');raise exception 'TEST: trainer lookup accepted';exception when raise_exception then if sqlerrm not like 'Consulta financeira não autorizada%' then raise;end if;end;
 begin perform public.prepare_advance_monthly_invoice((select student from advance_fixture where kind='eligible'),to_char(now(),'YYYY-MM'));raise exception 'TEST: trainer issued invoice';exception when raise_exception then if sqlerrm not like 'Emissão de mensalidade não autorizada%' then raise;end if;end;
end;$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.finance_advance_students(text)','execute') or has_function_privilege('anon','public.prepare_advance_monthly_invoice(uuid,text)','execute') then raise exception 'Anonymous access is enabled';end if;
 if exists(select 1 from advance_existing b left join public.invoices i on i.id=b.id where i.id is null or to_jsonb(i)<>b.snapshot) then raise exception 'A real invoice changed';end if;
 if (select count(*) from public.invoice_payments)<>(select n from advance_payment_count) then raise exception 'Preparing an invoice recorded a payment';end if;
 if exists(select 1 from public.invoices i join advance_fixture f on f.student=i.student_id where f.kind='other') then raise exception 'Another athlete was invoiced';end if;
 if not exists(select 1 from public.invoices i join advance_fixture f on f.student=i.student_id where f.kind='eligible' and i.status='paid' and i.amount=120 and i.paid_amount=120 and i.settled_before_import) then raise exception 'Current paid month changed';end if;
 if not exists(select 1 from public.audit_events a join public.invoices i on a.entity_id=i.id::text join advance_fixture f on f.student=i.student_id where f.kind='eligible' and a.entity='invoices' and a.action='INSERT' and a.actor_id=auth.uid()) then raise exception 'Individual issuance has no staff audit identity';end if;
end;$$;
rollback;
select 'PASS: individual advance, eligible month, agreed fee, month-end due date, retries, existing/paid/cancelled preservation, finance-only access, trainer/anonymous denial, staff audit, no real payment changes. All fixtures rolled back.' verification;
