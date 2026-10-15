-- Read-only role checks and isolated fixtures; everything rolls back.
begin;
do $$begin
 perform set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.role='admin' and p.active and not p.must_change_password order by s.created_at desc limit 1),true);
end;$$;
set local role authenticated;
do $$declare a jsonb;b jsonb;c jsonb;begin
 a=public.student_directory('','all',1);b=public.student_directory('','all',2);c=public.student_directory('','all',100000);
 if jsonb_array_length(a->'students')<>50 or jsonb_array_length(b->'students')<>50 then raise exception 'Directory page bounds failed';end if;
 if exists(select 1 from jsonb_array_elements(a->'students')x join jsonb_array_elements(b->'students')y on x->>'id'=y->>'id') then raise exception 'Directory pages overlap';end if;
 if a::text like '%data:image%' or a::text like '%portal_token%' or a::text like '%medical_record%' then raise exception 'List exposed unnecessary full records';end if;
 if c->>'page'<>c->>'pages' then raise exception 'Page clamp failed';end if;
 a=public.student_directory('ImpossibleNameForPaginationVerificationZZZZ','all',1);
 if (a->>'total')::integer<>0 or jsonb_array_length(a->'students')<>0 then raise exception 'Empty search failed';end if;
 a=public.finance_month_summary('2026-10');
 if (a->'counts'->>'paid')::integer<>(select count(*) from public.invoices where reference_month='2026-10' and status='paid') then raise exception 'Paid count inconsistent';end if;
 if (a->'counts'->>'pending')::integer<>(select count(*) from public.invoices where reference_month='2026-10' and status in('pending','overdue','unconfirmed')) then raise exception 'Pending count inconsistent';end if;
end;$$;
reset role;
with added as (
 insert into public.students(name,birth_date,status,portal_access_enabled) select 'Verification summary capacity '||n,'2015-01-01','active',false from generate_series(1,1005)n returning id
)
insert into public.invoices(student_id,reference_month,due_date,amount,status) select id,'2099-12','2099-12-10',150,'pending' from added;
do $$declare first_invoice uuid;second_invoice uuid;begin
 select id into first_invoice from public.invoices where reference_month='2099-12' order by id limit 1;
 select id into second_invoice from public.invoices where reference_month='2099-12' order by id offset 1 limit 1;
 insert into public.invoice_payments(invoice_id,idempotency_key,principal_amount,received_amount,payment_method,actor_id,paid_at,payment_parts)
 values(first_invoice,gen_random_uuid(),150,150,'misto',auth.uid(),now(),'[{"method":"dinheiro","amount":100},{"method":"pix","amount":50}]');
 update public.invoices set status='paid',paid_amount=150,payment_method='misto',paid_at=now(),received_by=auth.uid() where id=first_invoice;
 update public.invoices set status='paid',paid_amount=150,settled_before_import=true where id=second_invoice;
end;$$;
set local role authenticated;
do $$declare r jsonb;begin
 r=public.finance_month_summary('2099-12');
 if (r->'counts'->>'all')::integer<>1005 or (r->'stats'->>'total')::numeric<>150750 then raise exception 'Summary truncated at the REST row limit';end if;
 if (r->'stats'->>'collected')::numeric<>150 or (r->'stats'->>'openingPaid')::numeric<>150 or (r->'methods'->>'dinheiro')::numeric<>100 or (r->'methods'->>'pix')::numeric<>50 then raise exception 'Cash totals confused mixed payments with imported settlements';end if;
end;$$;
reset role;
do $$begin
 begin
  insert into public.students(name,status,birth_date,archive_note) values('Verification invalid active archive','active',null,'Unknown date');
  raise exception 'Active student without birth date accepted';
 exception when check_violation then null;end;
end;$$;
set local role anon;
do $$begin
 begin perform public.student_directory();raise exception 'Anonymous directory allowed';exception when insufficient_privilege then null;end;
 begin perform public.finance_month_summary('2026-10');raise exception 'Anonymous finance allowed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: directory pages, stable ordering, empty search, full financial totals over 1000 rows, archived date guard and anonymous denial' as verification;
