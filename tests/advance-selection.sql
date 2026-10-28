-- Every fixture, invoice, audit event and staff change is rolled back.
begin;
select set_config('request.jwt.claims','{}',true);
create temporary table advance_selection_fixture(kind text primary key,student uuid default gen_random_uuid(),enrollment uuid default gen_random_uuid());
insert into advance_selection_fixture(kind) select 'ok-'||lpad(n::text,2,'0') from generate_series(1,60)n;
insert into advance_selection_fixture(kind) values('other'),('paid'),('cancelled'),('inactive'),('deleted'),('no_enrollment'),('inactive_enrollment');
create temporary table advance_selection_existing as select id,to_jsonb(i) snapshot from public.invoices i;
create temporary table advance_selection_payments as select count(*) n from public.invoice_payments;
insert into public.students(id,name,birth_date,status,portal_access_enabled)
select student,'Teste seleção: '||kind,date '2017-01-01',case when kind='inactive' then 'inactive' else 'active' end,false from advance_selection_fixture;
insert into public.enrollments(id,student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,first_billing_month)
select enrollment,student,(select id from public.classes limit 1),(select id from public.plans limit 1),date '2020-01-01',31,137.50,
 case when kind='inactive_enrollment' then 'inactive' else 'active' end,date '2020-01-01' from advance_selection_fixture where kind<>'no_enrollment';
update public.students set status='paused',deleted_at=now(),deletion_reason='Exclusão fictícia de teste' where id=(select student from advance_selection_fixture where kind='deleted');
insert into public.guardians(student_id,name,relationship,phone,receives_notifications)
select student,'Responsável seleção fictícia','Responsável','81999990000',false from advance_selection_fixture where kind='ok-01';
insert into public.invoices(student_id,enrollment_id,reference_month,due_date,amount,status,charge_type,paid_amount,notes)
select student,enrollment,to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month','YYYY-MM'),
 (date_trunc('month',now() at time zone 'America/Recife')+interval '2 months - 1 day')::date,99,
 case kind when 'paid' then 'paid' when 'cancelled' then 'cancelled' else 'pending' end,'monthly',case when kind='paid' then 99 end,'Preservar valor existente'
from advance_selection_fixture where kind in('paid','cancelled','ok-02');
grant select on advance_selection_fixture to authenticated;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$begin if auth.uid() is null then raise exception 'A current secretary session is required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
set local role authenticated;
do $$declare r jsonb;r2 jsonb;ids uuid[];ref text:=to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month','YYYY-MM');f record;begin
 r=public.finance_advance_student_directory('',1);
 if (r->>'total')::integer<63 or jsonb_array_length(r->'students')<>25 then raise exception 'Initial empty search did not load a bounded athlete list';end if;
 r=public.finance_advance_student_directory('teste selecao:',1);r2=public.finance_advance_student_directory('teste selecao:',2);
 if (r->>'total')::integer<>63 or (r->>'pages')::integer<>3 or jsonb_array_length(r2->'students')<>25 then raise exception 'Search/pagination/eligibility failed: %',r->>'total';end if;
 if exists(select 1 from jsonb_array_elements(r->'students')x join jsonb_array_elements(r2->'students')y on x->>'id'=y->>'id') then raise exception 'Directory pages overlap';end if;
 if r::text like '%portal_token%' or r::text like '%birth_date%' or r::text like '%phone%' then raise exception 'Search leaked unrelated personal data';end if;
 r=public.finance_advance_student_directory('teste selecao:',999);if (r->>'page')::integer<>3 or jsonb_array_length(r->'students')<>13 then raise exception 'Page clamp failed';end if;
 r=public.finance_advance_student_directory('t',1);if (r->>'total')::integer<63 then raise exception 'One-character automatic search failed';end if;
 r=public.finance_advance_student_directory('responsavel selecao ficticia',1);if (r->>'total')::integer<>1 then raise exception 'Guardian/accent search failed';end if;
 r=public.finance_advance_student_directory('NoSuchAthleteForSelectionZZZZ',1);if (r->>'total')::integer<>0 or (r->>'pages')::integer<>1 then raise exception 'Empty result failed';end if;
 select array_agg(student order by kind) into ids from advance_selection_fixture where kind in('ok-01','ok-02');
 r=public.prepare_advance_monthly_invoices(ids,ref);
 if jsonb_array_length(r->'invoices')<>2 or (r->>'createdCount')::integer<>1 then raise exception 'Selected batch did not reuse an existing invoice';end if;
 if r->'invoices'->0->'student'->>'id'<>ids[1]::text or (r->'invoices'->1->>'amount')::numeric<>99 then raise exception 'Order or existing agreed value changed';end if;
 r2=public.prepare_advance_monthly_invoices(ids,ref);
 if (r2->>'createdCount')::integer<>0 or r2->'invoices'<>r->'invoices' then raise exception 'Retry duplicated or changed charges';end if;
 for f in select * from advance_selection_fixture where kind in('paid','cancelled','inactive','deleted','no_enrollment','inactive_enrollment') loop
  begin
   perform public.prepare_advance_monthly_invoices(array[(select student from advance_selection_fixture where kind='ok-03'),f.student],ref);
   raise exception 'TEST: invalid selection accepted';
  exception when raise_exception then if sqlerrm not like 'Não foi possível preparar a seleção.%' then raise;end if;end;
  if exists(select 1 from public.invoices where student_id=(select student from advance_selection_fixture where kind='ok-03')) then raise exception 'Invalid selection left a partial new charge';end if;
 end loop;
 begin perform public.prepare_advance_monthly_invoices(array[ids[1],ids[1]],ref);raise exception 'TEST: duplicate allowed';exception when raise_exception then if sqlerrm not like 'Selecione de 1 a 50%' then raise;end if;end;
 begin perform public.prepare_advance_monthly_invoices('{}'::uuid[],ref);raise exception 'TEST: empty selection allowed';exception when raise_exception then if sqlerrm not like 'Selecione de 1 a 50%' then raise;end if;end;
 select array_agg(student order by kind) into ids from (select student,kind from advance_selection_fixture where kind like 'ok-%' order by kind limit 51)x;
 begin perform public.prepare_advance_monthly_invoices(ids,ref);raise exception 'TEST: excessive selection allowed';exception when raise_exception then if sqlerrm not like 'Selecione de 1 a 50%' then raise;end if;end;
 r=public.prepare_advance_monthly_invoices(ids[1:50],ref);
 if jsonb_array_length(r->'invoices')<>50 or (r->>'createdCount')::integer<>48 then raise exception '50-athlete boundary or retry reuse failed';end if;
end;$$;
reset role;
update public.staff_profiles set role='financeiro',coach_id=null where id=auth.uid();
set local role authenticated;
do $$begin
 perform public.finance_advance_student_directory('',1);
 perform public.prepare_advance_monthly_invoices(array[(select student from advance_selection_fixture where kind='ok-01')],to_char(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month','YYYY-MM'));
end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$begin
 begin perform public.finance_advance_student_directory('',1);raise exception 'TEST: trainer listed billing';exception when raise_exception then if sqlerrm not like 'Consulta financeira não autorizada%' then raise;end if;end;
 begin perform public.prepare_advance_monthly_invoices(array[(select student from advance_selection_fixture where kind='ok-01')],to_char(now(),'YYYY-MM'));raise exception 'TEST: trainer prepared billing';exception when raise_exception then if sqlerrm not like 'Emissão de mensalidade não autorizada%' then raise;end if;end;
end;$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.finance_advance_student_directory(text,integer)','execute') or has_function_privilege('anon','public.prepare_advance_monthly_invoices(uuid[],text)','execute') then raise exception 'Anonymous access was enabled';end if;
 if exists(select 1 from advance_selection_existing b left join public.invoices i on i.id=b.id where i.id is null or to_jsonb(i)<>b.snapshot) then raise exception 'A real invoice changed';end if;
 if (select count(*) from public.invoice_payments)<>(select n from advance_selection_payments) then raise exception 'Preparation recorded a payment';end if;
 if exists(select 1 from public.invoices i join advance_selection_fixture f on f.student=i.student_id where f.kind='other' or f.kind in('ok-51','ok-52','ok-53','ok-54','ok-55','ok-56','ok-57','ok-58','ok-59','ok-60')) then raise exception 'An unselected athlete was charged';end if;
 if (select count(*) from public.audit_events a join public.invoices i on a.entity_id=i.id::text join advance_selection_fixture f on f.student=i.student_id where f.kind like 'ok-%' and a.entity='invoices' and a.action='INSERT' and a.actor_id=auth.uid())<>49 then raise exception 'New charges lost staff audit identity';end if;
end;$$;
rollback;
select 'PASS: initial directory, automatic/one-character/accent search, bounded pagination, multiple athletes, 50-selection limit, retry reuse, existing values, atomic failure, staff audit, role/anonymous restrictions, no receipt or real invoice changes. All fixtures rolled back.' verification;
