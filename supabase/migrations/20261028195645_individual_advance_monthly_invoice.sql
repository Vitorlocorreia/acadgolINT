-- Advance one athlete's monthly invoice without issuing the entire future month.
create function private.finance_advance_students(p_search text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_search text; v_result jsonb;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then
  raise exception 'Consulta financeira não autorizada.';
 end if;
 v_search=private.finance_search_fold(trim(coalesce(p_search,'')));
 if length(v_search) not between 2 and 120 then raise exception 'Digite pelo menos dois caracteres do nome.';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.sort_name,r.id),'[]'::jsonb) into v_result from (
  select s.id,s.name,private.finance_search_fold(s.name) sort_name,e.monthly_fee,e.due_day,
   coalesce((select string_agg(g.name,' / ' order by g.name) from public.guardians g where g.student_id=s.id),'') guardian_name
  from public.students s
  join lateral (select en.monthly_fee,en.due_day from public.enrollments en
   where en.student_id=s.id and en.status='active'
   order by en.created_at desc nulls last,en.id limit 1)e on true
  where s.status='active' and s.deleted_at is null
   and (position(v_search in private.finance_search_fold(s.name))>0 or exists(
    select 1 from public.guardians g where g.student_id=s.id and position(v_search in private.finance_search_fold(g.name))>0))
  order by private.finance_search_fold(s.name),s.id limit 20
 )r;
 return v_result;
end;$$;
revoke all on function private.finance_advance_students(text) from public,anon;
grant execute on function private.finance_advance_students(text) to authenticated;

create function public.finance_advance_students(p_search text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.finance_advance_students(p_search);
$$;
revoke all on function public.finance_advance_students(text) from public,anon;
grant execute on function public.finance_advance_students(text) to authenticated;

create function private.prepare_advance_monthly_invoice(p_student uuid,p_month text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_first date;v_last date;v_school_month date:=date_trunc('month',now() at time zone 'America/Recife')::date;
 v_enrollment public.enrollments%rowtype;v_invoice public.invoices%rowtype;v_name text;v_created boolean:=false;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then
  raise exception 'Emissão de mensalidade não autorizada.';
 end if;
 if p_month is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' or p_student is null then
  raise exception 'Informe um atleta e um mês válido.';
 end if;
 v_first=(p_month||'-01')::date;v_last=(v_first+interval '1 month - 1 day')::date;
 if v_first<v_school_month or v_first>(v_school_month+interval '12 months')::date then
  raise exception 'Escolha o mês atual ou um dos próximos 12 meses.';
 end if;
 -- Same lock as the scheduled issuer: retries and concurrent automatic issuance cannot duplicate the charge.
 perform pg_advisory_xact_lock(hashtext('acadgol-invoices-'||p_month));
 select s.name into v_name from public.students s
  where s.id=p_student and s.status='active' and s.deleted_at is null for share;
 if not found then raise exception 'O atleta precisa estar ativo para antecipar uma mensalidade.';end if;
 select i.* into v_invoice from public.invoices i where i.student_id=p_student
  and i.reference_month=p_month and i.charge_type='monthly'
  order by (i.status='cancelled'),i.created_at desc,i.id limit 1 for update;
 if found then
  if v_invoice.status='paid' then raise exception 'A mensalidade deste atleta já está quitada nesse mês.';end if;
  if v_invoice.status='cancelled' then raise exception 'A mensalidade desse mês foi cancelada. Revise o histórico antes de emitir outra cobrança.';end if;
  if v_invoice.status not in('pending','overdue','unconfirmed') or v_invoice.status is null then
   raise exception 'Revise a situação desta cobrança antes de registrar o recebimento.';
  end if;
 else
  select e.* into v_enrollment from public.enrollments e where e.student_id=p_student and e.status='active'
   and e.start_date<=v_last and e.first_billing_month<=v_first
   order by e.created_at desc nulls last,e.id limit 1 for share;
  if not found then raise exception 'Não há matrícula ativa com mensalidade prevista para esse mês.';end if;
  if v_enrollment.monthly_fee is null or v_enrollment.monthly_fee<=0 or v_enrollment.due_day is null or v_enrollment.due_day not between 1 and 31 then
   raise exception 'Revise o valor e o vencimento da mensalidade na matrícula do atleta.';
  end if;
  insert into public.invoices(enrollment_id,student_id,reference_month,due_date,amount,status,charge_type)
  values(v_enrollment.id,p_student,p_month,v_first+(least(v_enrollment.due_day,extract(day from v_last)::integer)-1),v_enrollment.monthly_fee,'pending','monthly')
  returning * into v_invoice;
  v_created=true;
 end if;
 return jsonb_build_object('success',true,'created',v_created,'invoice',jsonb_build_object(
  'id',v_invoice.id,'reference_month',v_invoice.reference_month,'due_date',v_invoice.due_date,
  'amount',v_invoice.amount,'status',v_invoice.status,'charge_type',v_invoice.charge_type,
  'student',jsonb_build_object('id',p_student,'name',v_name)));
end;$$;
revoke all on function private.prepare_advance_monthly_invoice(uuid,text) from public,anon;
grant execute on function private.prepare_advance_monthly_invoice(uuid,text) to authenticated;

create function public.prepare_advance_monthly_invoice(p_student uuid,p_month text)
returns jsonb language sql security invoker set search_path='' as $$
 select private.prepare_advance_monthly_invoice(p_student,p_month);
$$;
revoke all on function public.prepare_advance_monthly_invoice(uuid,text) from public,anon;
grant execute on function public.prepare_advance_monthly_invoice(uuid,text) to authenticated;
