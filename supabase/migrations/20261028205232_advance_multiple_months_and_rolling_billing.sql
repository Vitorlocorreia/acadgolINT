-- Keep the current and following reference months issued, independently of the web application.
create or replace function private.run_monthly_billing() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 school_month date:=date_trunc('month',now() at time zone 'America/Recife')::date;
 month_ref text:=to_char(school_month,'YYYY-MM');next_ref text:=to_char(school_month+interval '1 month','YYYY-MM');
 generated integer;next_generated integer;
begin
 generated=private.issue_monthly_invoices(month_ref);
 next_generated=private.issue_monthly_invoices(next_ref);
 insert into private.monthly_billing_runs(reference_month,generated_count) values(month_ref,generated),(next_ref,next_generated);
 return jsonb_build_object('success',true,'month',month_ref,'count',generated,'nextMonth',next_ref,'nextCount',next_generated,'totalCount',generated+next_generated);
end;$$;
revoke all on function private.run_monthly_billing() from public,anon,authenticated,service_role;

-- One atomic selection can span several months and athletes. Locks are acquired in month order.
create function private.prepare_advance_monthly_periods(p_students uuid[],p_months text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_month text;v_result jsonb;v_invoices jsonb:='[]';v_created integer:=0;
 school_month date:=date_trunc('month',now() at time zone 'America/Recife')::date;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Emissão de mensalidade não autorizada.';end if;
 if p_students is null or coalesce(array_ndims(p_students),0)<>1 or coalesce(cardinality(p_students),0) not between 1 and 50
  or p_months is null or coalesce(array_ndims(p_months),0)<>1 or coalesce(cardinality(p_months),0) not between 1 and 12 then
  raise exception 'Selecione de 1 a 50 atletas e de 1 a 12 meses.';
 end if;
 if array_position(p_students,null) is not null or array_position(p_months,null) is not null
  or (select count(distinct x) from unnest(p_students)x)<>cardinality(p_students)
  or (select count(distinct x) from unnest(p_months)x)<>cardinality(p_months)
  or cardinality(p_students)*cardinality(p_months)>120 then
  raise exception 'Revise a seleção: não repita atletas ou meses e prepare até 120 mensalidades por vez.';
 end if;
 foreach v_month in array p_months loop
  if v_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then raise exception 'Informe meses válidos para a antecipação.';end if;
  if (v_month||'-01')::date<school_month or (v_month||'-01')::date>(school_month+interval '12 months')::date then
   raise exception 'Escolha o mês atual ou um dos próximos 12 meses.';
  end if;
 end loop;
 for v_month in select x from unnest(p_months)x order by x loop
  -- All nested calls share this transaction: a later failure also rolls back the earlier months.
  v_result=private.prepare_advance_monthly_invoices(p_students,v_month);
  v_created=v_created+(v_result->>'createdCount')::integer;
  v_invoices=v_invoices||(v_result->'invoices');
 end loop;
 return jsonb_build_object('success',true,'createdCount',v_created,'invoices',v_invoices);
end;$$;
revoke all on function private.prepare_advance_monthly_periods(uuid[],text[]) from public,anon;
grant execute on function private.prepare_advance_monthly_periods(uuid[],text[]) to authenticated;
create function public.prepare_advance_monthly_periods(p_students uuid[],p_months text[])
returns jsonb language sql security invoker set search_path='' as $$
 select private.prepare_advance_monthly_periods(p_students,p_months);
$$;
revoke all on function public.prepare_advance_monthly_periods(uuid[],text[]) from public,anon;
grant execute on function public.prepare_advance_monthly_periods(uuid[],text[]) to authenticated;
