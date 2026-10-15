create function public.finance_month_summary(p_month text) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_today date:=(now() at time zone 'America/Recife')::date;v_summary jsonb;v_methods jsonb;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Consulta financeira não autorizada.';end if;
 if p_month is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then raise exception 'Mês inválido.';end if;
 select jsonb_build_object('stats',jsonb_build_object(
  'total',coalesce(sum(amount),0),
  'collected',coalesce(sum(coalesce(paid_amount,amount))filter(where status='paid' and not settled_before_import),0),
  'pending',coalesce(sum(amount)filter(where status='pending' and due_date>=v_today),0),
  'overdue',coalesce(sum(amount)filter(where status='overdue' or(status='pending' and due_date<v_today)),0),
  'openingPaid',coalesce(sum(amount)filter(where status='paid' and settled_before_import),0),
  'openingPaidCount',count(*)filter(where status='paid' and settled_before_import),
  'unconfirmed',coalesce(sum(amount)filter(where status='unconfirmed'),0),
  'unconfirmedCount',count(*)filter(where status='unconfirmed')),
  'counts',jsonb_build_object('all',count(*),'paid',count(*)filter(where status='paid'),'pending',count(*)filter(where status in('pending','overdue','unconfirmed')),'unconfirmed',count(*)filter(where status='unconfirmed'),'overdue',count(*)filter(where status='overdue')))
 into v_summary from public.invoices where reference_month=p_month and status is distinct from 'cancelled';
 with parts as (
  select part->>'method' as method,(part->>'amount')::numeric as amount
  from public.invoices i left join lateral(select p.payment_parts from public.invoice_payments p where p.invoice_id=i.id and not exists(select 1 from public.payment_reversals r where r.payment_id=p.id) order by p.recorded_at desc,p.id limit 1)p on true
  cross join lateral jsonb_array_elements(case when jsonb_array_length(coalesce(p.payment_parts,'[]'))>0 then p.payment_parts else jsonb_build_array(jsonb_build_object('method',i.payment_method,'amount',coalesce(i.paid_amount,i.amount))) end)part
  where i.reference_month=p_month and i.status='paid' and not i.settled_before_import
 ) select jsonb_build_object('dinheiro',coalesce(sum(amount)filter(where method='dinheiro'),0),'pix',coalesce(sum(amount)filter(where method in('pix','pix_whatsapp')),0),'debito',coalesce(sum(amount)filter(where method='cartao_debito'),0),'credito',coalesce(sum(amount)filter(where method='cartao_credito'),0)) into v_methods from parts;
 return v_summary||jsonb_build_object('methods',v_methods);
end;$$;
revoke all on function public.finance_month_summary(text) from public,anon;
grant execute on function public.finance_month_summary(text) to authenticated;
