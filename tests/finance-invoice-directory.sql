-- Isolated fixtures: all data, role changes and receipts roll back.
begin;
do $$declare n integer;s uuid;e uuid;v_class uuid;begin
 select id into v_class from public.classes order by id limit 1;
 perform set_config('test.finance_class',v_class::text,true);
 for n in 1..61 loop
  insert into public.students(name,birth_date,status,portal_access_enabled) values(case n when 1 then 'Ágata Verification' when 2 then 'Bruno Verification' else 'Carlos Verification' end,'2015-01-01','active',false) returning id into s;
  insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,first_billing_month,registration_fee,import_source)
  values(s,case when n=1 then v_class else null end,null,'2099-11-01',15,100,'active','2099-12-01',0,jsonb_build_object('file_sha256',repeat('0',64),'row',n)) returning id into e;
  if n=1 then
   perform set_config('test.finance_invoice_student',s::text,true);
   insert into public.guardians(student_id,name,relationship,phone,receives_notifications) values(s,'Mãe Verification','Mãe','81999990000',false);
  end if;
  insert into public.invoices(student_id,enrollment_id,reference_month,due_date,amount,status,charge_type)
  values(s,e,'2099-11',case when n=1 then '2099-11-05'::date else '2099-11-25'::date end,100+n,case n when 1 then 'paid' when 2 then 'pending' when 3 then 'overdue' else 'unconfirmed' end,case when n=1 then 'registration' else 'monthly' end);
 end loop;
 perform set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.role='admin' and p.active and not p.must_change_password order by s.created_at desc limit 1),true);
end;$$;
set local role authenticated;
do $$declare a jsonb;b jsonb;c jsonb;v_id uuid;begin
 a=public.finance_invoice_directory('2099-11','{}',1);b=public.finance_invoice_directory('2099-11','{}',2);
 if (a->'pagination'->>'total')::int<>61 or jsonb_array_length(a->'invoices')<>50 or jsonb_array_length(b->'invoices')<>11 then raise exception 'Directory pagination mismatch';end if;
 if a->'invoices'->0->'student'->>'name'<>'Ágata Verification' then raise exception 'Accent-aware alphabetical order failed';end if;
 if exists(select 1 from jsonb_array_elements(a->'invoices')x join jsonb_array_elements(b->'invoices')y on x->>'id'=y->>'id') then raise exception 'Stable pages overlap';end if;
 c=public.finance_invoice_directory('2099-11','{"q":"agata"}');
 if (c->'pagination'->>'total')::int<>1 then raise exception 'Unaccented athlete search failed';end if;
 c=public.finance_invoice_directory('2099-11','{"q":"mae"}');
 if (c->'pagination'->>'total')::int<>1 then raise exception 'Unaccented guardian search failed';end if;
 c=public.finance_invoice_directory('2099-11','{"q":"%_"}');
 if (c->'pagination'->>'total')::int<>0 then raise exception 'Search wildcards were interpreted';end if;
 c=public.finance_invoice_directory('2099-11',jsonb_build_object('classId',current_setting('test.finance_class'),'charge','registration','due','first','status','paid'));
 if (c->'pagination'->>'total')::int<>1 or (c->'counts'->>'paid')::int<>1 or (c->'counts'->>'pending')::int<>0 then raise exception 'Combined filters or contextual counts failed';end if;
 c=public.finance_invoice_directory('2099-11','{"classId":"unassigned","due":"last","charge":"monthly","status":"pending"}');
 if (c->'pagination'->>'total')::int<>60 then raise exception 'Pending omitted unconfirmed or overdue invoices';end if;
 c=public.finance_invoice_directory('2099-11','{"sort":"amount_desc"}');
 if (c->'invoices'->0->>'amount')::numeric<>161 then raise exception 'Amount ordering failed';end if;
 c=public.finance_invoice_directory('2099-11','{"due":"middle"}');
 if (c->'pagination'->>'total')::int<>0 then raise exception 'Due-day boundaries failed';end if;
 c=public.finance_invoice_directory('2099-11','{"status":"paid"}',1000);
 if (c->'pagination'->>'page')::int<>1 then raise exception 'Empty final page not clamped';end if;
end;$$;
reset role;
-- Simulate a confirmed settlement: the same query must move it between filters immediately.
update public.invoices set status='paid' where reference_month='2099-11' and status='pending';
set local role authenticated;
do $$declare a jsonb;begin
 a=public.finance_invoice_directory('2099-11','{"status":"pending"}');
 if (a->'pagination'->>'total')::int<>59 or (a->'counts'->>'paid')::int<>2 then raise exception 'Settlement did not update pending/paid counts';end if;
end;$$;
reset role;
-- Finance-only profiles retain billing access without receiving family portal capabilities.
update public.staff_profiles set role='financeiro' where id=auth.uid();
set local role authenticated;
do $$declare a jsonb;begin
 a=public.finance_invoice_directory('2099-11','{"q":"mae"}');
 if (a->'pagination'->>'total')::int<>1 or a->'invoices'->0->'student'->>'portal_token' is not null then raise exception 'Finance-only projection failed';end if;
end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$begin
 begin perform public.finance_invoice_directory('2099-11');raise exception 'Trainer read financial directory';exception when raise_exception then if sqlerrm not like 'Consulta financeira não autorizada%' then raise;end if;end;
end;$$;
reset role;
set local role anon;
do $$begin
 begin perform public.finance_invoice_directory('2099-11');raise exception 'Anonymous directory access';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: alphabetical pages, literal/accent-free name and guardian search, combined filters, contextual counts, settlement refresh, finance-only access, trainer and anonymous denial' verification;
