-- Confirm a closing cannot silently truncate at the REST default row limit. All fixtures roll back.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$begin if auth.uid() is null then raise exception 'A current secretary session is required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
create temporary table cash_capacity(n integer,student uuid default gen_random_uuid(),invoice uuid default gen_random_uuid());
insert into cash_capacity(n) select generate_series(1,1005);
insert into public.students(id,name,birth_date,status,portal_access_enabled) select student,'Teste volume caixa: '||n,date '1990-01-01','active',false from cash_capacity;
insert into public.invoices(id,student_id,reference_month,due_date,amount,status,paid_amount,paid_at,payment_method,created_at,received_by)
select invoice,student,'2001-02',date '2001-02-12',1,'paid',1,'2001-02-12 15:00+00','pix','2001-02-01 12:00+00',auth.uid() from cash_capacity;
insert into public.invoice_payments(invoice_id,idempotency_key,principal_amount,received_amount,payment_method,actor_id,paid_at,payment_parts)
select invoice,gen_random_uuid(),1,1,'pix',auth.uid(),'2001-02-12 15:00+00','[{"method":"pix","amount":1}]'::jsonb from cash_capacity;
set local role authenticated;
do $$declare r jsonb;c jsonb;doc jsonb;begin
 r=public.cash_day_report('2001-02-12');
 if (r->'live'->>'count')::integer<>1005 or jsonb_array_length(r->'live'->'entries')<>1005 or (r->'live'->'totals'->>'pix')::numeric<>1005 then raise exception 'Daily conference was truncated';end if;
 c=public.close_cash_day(jsonb_build_object('date','2001-02-12','key',gen_random_uuid(),'fingerprint',r->'live'->>'fingerprint','openingCash',0,'counted',jsonb_build_object('dinheiro',0,'pix',1005,'debito',0,'credito',0),'notes','','differenceReason',''));
 doc=public.cash_closure_document((c->>'closureId')::uuid);
 if (doc->'snapshot'->>'count')::integer<>1005 or jsonb_array_length(doc->'snapshot'->'entries')<>1005 or (doc->'counted'->>'total')::numeric<>1005 then raise exception 'Stored document omitted receipts';end if;
end;$$;
reset role;
rollback;
select 'PASS: report, totals, persisted snapshot and print document include all 1005 receipts. All fixtures rolled back.' verification;
