-- Check inclusive Recife date boundaries and pagination without retaining fixtures.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$ begin if auth.uid() is null then raise exception 'Current secretary session required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
do $$ declare s uuid;i uuid;moment timestamptz;n integer:=0;begin
 for moment in select unnest(array['2026-10-15 02:59:59+00','2026-10-15 03:00:00+00','2026-10-16 02:59:59+00','2026-10-16 03:00:00+00']::timestamptz[]) loop
  n=n+1;
  insert into public.students(name,birth_date,status) values('Verificação do período da auditoria','2017-01-01','active') returning id into s;
  insert into public.invoices(student_id,reference_month,due_date,amount,status,paid_amount) values(s,'2026-10','2026-10-15',100,'paid',100) returning id into i;
  insert into public.invoice_payments(invoice_id,idempotency_key,principal_amount,received_amount,payment_method,actor_id,paid_at,recorded_at) values(i,gen_random_uuid(),100,100,'pix',auth.uid(),moment,moment);
 end loop;
end;$$;
set local role authenticated;
do $$ declare page jsonb;first_id text;begin
 page=public.financial_audit_log('2026-10-15','2026-10-15','payment','Verificação do período da auditoria');
 if(page->>'total')::integer<>2 then raise exception 'Recife start/end boundaries are incorrect';end if;
 if(page->'entries'->0->>'recorded_at')::timestamptz<>'2026-10-16 02:59:59+00'::timestamptz then raise exception 'Audit is not sorted by newest system record';end if;
 page=public.financial_audit_log(p_action=>'payment',p_student=>'Verificação do período da auditoria',p_limit=>2);
 if(page->>'total')::integer<>4 or jsonb_array_length(page->'entries')<>2 or(page->>'nextOffset')::integer<>2 then raise exception 'Audit first page incorrect';end if;
 first_id=page->'entries'->0->>'id';
 page=public.financial_audit_log(p_action=>'payment',p_student=>'Verificação do período da auditoria',p_offset=>2,p_limit=>2);
 if page->>'nextOffset' is not null or page->'entries'->0->>'id'=first_id then raise exception 'Audit pagination duplicates records';end if;
 page=public.financial_audit_log(p_action=>'reversal',p_student=>'Verificação do período da auditoria');
 if(page->>'total')::integer<>0 then raise exception 'Audit operation filter ignored';end if;
 begin perform public.financial_audit_log('2026-10-16','2026-10-15');raise exception 'Reversed date range accepted';exception when raise_exception then if sqlerrm<>'Filtros de auditoria inválidos.' then raise;end if;end;
end;$$;
reset role;
rollback;
select 'PASS: audit date range uses inclusive Recife days, newest-first order, bounded pagination, empty state and operation filter. All changes rolled back.' as verification;
