-- Runs with the current office session, and rolls back every fixture and edit.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$ begin if auth.uid() is null then raise exception 'Current secretary session required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
create temporary table plan_verification(plan uuid,student uuid,invoice uuid,old_plan uuid,agreements jsonb,billing jsonb);
insert into plan_verification(old_plan,agreements,billing) select
  (select plan_id from public.enrollments where status='active' limit 1),
  (select jsonb_agg(jsonb_build_object('id',id,'monthly_fee',monthly_fee,'registration_fee',registration_fee)) from public.enrollments),
  (select jsonb_agg(jsonb_build_object('id',id,'amount',amount,'paid_amount',paid_amount,'due_date',due_date)) from public.invoices);
grant select,update on plan_verification to authenticated;
set local role authenticated;
do $$ declare p uuid;result jsonb;s uuid;d integer;firstday date:=(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month')::date;begin
 if not private.has_role(array['secretaria']) then raise exception 'Secretary session rejected';end if;
 insert into public.plans(name,price,registration_fee,frequency_per_week,duration_months,sibling_discount_percent,includes_uniform,is_active)
 values('Plano de verificação',180.50,50,2,3,10,false,true) returning id into p;
 update plan_verification set plan=p;
 update public.plans set price=200,registration_fee=60,is_active=false where id=p;
 if not exists(select 1 from public.plans where id=p and price=200 and registration_fee=60 and not is_active) then raise exception 'Plan edit failed';end if;
 begin update public.plans set price=-1 where id=p;raise exception 'Negative plan price accepted';exception when check_violation then null;end;
 begin update public.plans set frequency_per_week=8 where id=p;raise exception 'Invalid frequency accepted';exception when check_violation then null;end;
 begin update public.plans set sibling_discount_percent=101 where id=p;raise exception 'Invalid discount accepted';exception when check_violation then null;end;
 begin update public.plans set id=gen_random_uuid() where id=p;raise exception 'Plan identity edit allowed';exception when insufficient_privilege then null;end;
 begin delete from public.plans where id=p;raise exception 'Plan deletion allowed';exception when insufficient_privilege then null;end;
 -- Editing the catalog cannot silently rewrite agreed fees or financial history.
 update public.plans set price=price+1 where id=(select old_plan from plan_verification);
 if (select agreements from plan_verification) is distinct from (select jsonb_agg(jsonb_build_object('id',id,'monthly_fee',monthly_fee,'registration_fee',registration_fee)) from public.enrollments) then raise exception 'Existing enrollment agreements changed';end if;
 if (select billing from plan_verification) is distinct from (select jsonb_agg(jsonb_build_object('id',id,'amount',amount,'paid_amount',paid_amount,'due_date',due_date)) from public.invoices) then raise exception 'Existing invoices changed';end if;
 -- Both a previously unavailable due day and the final day work through real enrollment.
 for d in select unnest(array[1,2,3,31]) loop
  begin
   result=public.enroll_student(jsonb_build_object('request_id',gen_random_uuid(),'name','Atleta de verificação dos planos','birth_date','2017-01-01','due_day',d,'monthly_fee',200,'guardians_json','[{"name":"Responsável de verificação","phone":"81900000000"}]','class_id',(select id from public.classes where is_active limit 1),'plan_id',p,'photo_url','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='));
   raise exception 'Inactive plan accepted';
  exception when raise_exception then if sqlerrm not like 'Escolha um plano ativo%' then raise;end if;end;
  update public.plans set is_active=true where id=p;
  result=public.enroll_student(jsonb_build_object('request_id',gen_random_uuid(),'name','Atleta de verificação dos planos','birth_date','2017-01-01','due_day',d,'monthly_fee',200,'guardians_json','[{"name":"Responsável de verificação","phone":"81900000000"}]','class_id',(select id from public.classes where is_active order by max_students desc limit 1),'plan_id',p,'photo_url','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII='));
  s=(result->>'studentId')::uuid;
  if not exists(select 1 from public.enrollments where student_id=s and due_day=d and registration_fee=60 and monthly_fee=200) then raise exception 'Catalog registration fee or chosen due day not saved';end if;
  if not exists(select 1 from public.invoices where student_id=s and charge_type='monthly' and amount=200 and due_date=firstday+least(d,extract(day from(firstday+interval '1 month'-interval '1 day'))::integer)-1) then raise exception 'Wrong due date or month-end handling';end if;
  update public.plans set is_active=false where id=p;
 end loop;
end;$$;
reset role;
-- A signed-in identity without a valid office session cannot read or mutate plans.
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare count_updated integer;begin
 if exists(select 1 from public.plans) then raise exception 'Plans leaked without office access';end if;
 begin insert into public.plans(name,price) values('Plano não autorizado',100);raise exception 'Unauthorized plan creation accepted';exception when insufficient_privilege then null;end;
 update public.plans set price=1;get diagnostics count_updated=row_count;
 if count_updated<>0 then raise exception 'Unauthorized plan update accepted';end if;
end;$$;
reset role;
rollback;
select 'PASS: office plan creation, editing, activation, validation, immutable identity/history, blocked deletion, denied unauthorized access, new catalog defaults and due days 1,2,3,31. All changes rolled back.' as verification;
