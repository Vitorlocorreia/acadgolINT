create table private.cash_day_closures(
 id uuid primary key default gen_random_uuid(),business_date date not null,revision integer not null check(revision>0),
 idempotency_key uuid not null unique,request_hash text not null,source_fingerprint text not null,
 opening_cash numeric(14,2) not null check(opening_cash>=0),expected jsonb not null,counted jsonb not null,difference jsonb not null,
 difference_reason text not null,notes text not null,snapshot jsonb not null,
 closed_by uuid not null,actor_snapshot jsonb not null,closed_at timestamptz not null default clock_timestamp(),
 unique(business_date,revision)
);
create table private.cash_day_reopenings(
 id uuid primary key default gen_random_uuid(),closure_id uuid not null unique references private.cash_day_closures(id),
 reason text not null check(length(trim(reason)) between 5 and 500),reopened_by uuid not null,actor_snapshot jsonb not null,
 reopened_at timestamptz not null default clock_timestamp()
);
alter table private.cash_day_closures enable row level security;
alter table private.cash_day_reopenings enable row level security;
revoke all on private.cash_day_closures,private.cash_day_reopenings from public,anon,authenticated,service_role;
create trigger immutable_cash_closures before update or delete on private.cash_day_closures for each row execute function private.reject_ledger_change();
create trigger immutable_cash_reopenings before update or delete on private.cash_day_reopenings for each row execute function private.reject_ledger_change();

-- Owner-only source. No REST row cap, family token, contact information or mutable browser totals.
create function private.cash_day_source(p_date date) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v record;part jsonb;parts jsonb;amount numeric;part_amount numeric;part_sum numeric;method text;
 cash numeric:=0;pix numeric:=0;debit numeric:=0;credit numeric:=0;entries jsonb:='[]';totals jsonb;result jsonb;reversed integer;
 first_moment timestamptz:=(p_date::timestamp at time zone 'America/Recife');
 last_moment timestamptz:=((p_date+1)::timestamp at time zone 'America/Recife');
begin
 for v in
  select i.id,i.reference_month,i.charge_type,i.amount,i.paid_amount,i.paid_at,i.payment_method,s.name student_name,
   p.id payment_id,p.received_amount ledger_amount,p.payment_parts,p.actor_snapshot,p.recorded_at,
   coalesce(p.actor_snapshot->>'name',actor.full_name,'Autor não identificado') actor_name
  from public.invoices i join public.students s on s.id=i.student_id
  left join lateral(select pay.* from public.invoice_payments pay where pay.invoice_id=i.id
   and not exists(select 1 from public.payment_reversals r where r.payment_id=pay.id)
   order by pay.recorded_at desc,pay.id desc limit 1)p on true
  left join public.staff_profiles actor on actor.id=coalesce(p.actor_id,i.received_by)
  where i.status='paid' and not i.settled_before_import and i.paid_at>=first_moment and i.paid_at<last_moment
  order by i.paid_at,i.id
 loop
  amount=coalesce(v.paid_amount,v.amount);
  if amount is null or amount<0 or (v.payment_id is not null and v.ledger_amount<>amount) then raise exception 'Há recebimento inconsistente neste dia. Confira os lançamentos antes de fechar.';end if;
  parts=case when jsonb_typeof(v.payment_parts)='array' and jsonb_array_length(v.payment_parts)>0 then v.payment_parts
   else jsonb_build_array(jsonb_build_object('method',coalesce(v.payment_method,'pix'),'amount',amount)) end;
  part_sum=0;
  for part in select * from jsonb_array_elements(parts) loop
   method=part->>'method';
   if jsonb_typeof(part->'amount') is distinct from 'number' or method is null or method not in('dinheiro','pix','pix_whatsapp','cartao_debito','cartao_credito') then raise exception 'Um recebimento não tem distribuição válida por forma de pagamento.';end if;
   part_amount=(part->>'amount')::numeric;
   if part_amount<0 or part_amount<>round(part_amount,2) then raise exception 'Um recebimento contém valor inválido.';end if;
   part_sum=part_sum+part_amount;
   case method when 'dinheiro' then cash=cash+part_amount;when 'cartao_debito' then debit=debit+part_amount;when 'cartao_credito' then credit=credit+part_amount;else pix=pix+part_amount;end case;
  end loop;
  if part_sum<>amount then raise exception 'As formas de pagamento não conferem com o valor recebido. Revise os lançamentos.';end if;
  entries=entries||jsonb_build_array(jsonb_build_object('invoiceId',v.id,'paymentId',v.payment_id,'studentName',v.student_name,
   'referenceMonth',v.reference_month,'chargeType',v.charge_type,'agreedAmount',v.amount,'receivedAmount',amount,'paidAt',v.paid_at,
   'recordedAt',v.recorded_at,'actorName',v.actor_name,'parts',parts));
 end loop;
 select count(*) into reversed from public.payment_reversals r join public.invoice_payments p on p.id=r.payment_id
  where not p.legacy_import and p.paid_at>=first_moment and p.paid_at<last_moment;
 totals=jsonb_build_object('dinheiro',cash,'pix',pix,'debito',debit,'credito',credit,'total',cash+pix+debit+credit);
 result=jsonb_build_object('date',p_date,'totals',totals,'count',jsonb_array_length(entries),'reversedCount',reversed,'entries',entries);
 return result||jsonb_build_object('fingerprint',md5(result::text));
end;$$;
revoke all on function private.cash_day_source(date) from public,anon,authenticated,service_role;

create function private.assert_cash_days_open(p_days date[]) returns void
language plpgsql security invoker set search_path='' as $$
declare day date;
begin
 for day in select distinct x from unnest(p_days)x where x is not null order by x loop
  perform pg_advisory_xact_lock(hashtext('sport-cash-day-'||day::text));
  if exists(select 1 from private.cash_day_closures c where c.business_date=day and not exists(select 1 from private.cash_day_reopenings r where r.closure_id=c.id)) then
   raise exception 'O caixa de % está fechado. Administrador ou secretaria precisa reabrir esse dia antes de lançar ou estornar recebimentos.',to_char(day,'DD/MM/YYYY');
  end if;
 end loop;
end;$$;
revoke all on function private.assert_cash_days_open(date[]) from public,anon,authenticated,service_role;

-- The same transaction lock serializes closing with every real receipt or reversal, including direct writes.
create function private.guard_closed_cash_day() returns trigger
language plpgsql security definer set search_path='' as $$
declare days date[]:='{}';moment timestamptz;
begin
 if tg_table_name='invoice_payments' then
  if tg_op<>'INSERT' and not old.legacy_import then days=array_append(days,(old.paid_at at time zone 'America/Recife')::date);end if;
  if tg_op<>'DELETE' and not new.legacy_import then days=array_append(days,(new.paid_at at time zone 'America/Recife')::date);end if;
 elsif tg_table_name='payment_reversals' then
  select p.paid_at into moment from public.invoice_payments p where p.id=case when tg_op='DELETE' then old.payment_id else new.payment_id end and not p.legacy_import;
  days=array_append(days,(moment at time zone 'America/Recife')::date);
 elsif tg_table_name='invoices' then
  if tg_op='UPDATE' and row(old.status,old.amount,old.paid_amount,old.paid_at,old.payment_method,old.settled_before_import,old.student_id,old.reference_month,old.charge_type)
   is not distinct from row(new.status,new.amount,new.paid_amount,new.paid_at,new.payment_method,new.settled_before_import,new.student_id,new.reference_month,new.charge_type) then return new;end if;
  if tg_op<>'INSERT' and old.status='paid' and not old.settled_before_import then days=array_append(days,(old.paid_at at time zone 'America/Recife')::date);end if;
  if tg_op<>'DELETE' and new.status='paid' and not new.settled_before_import then days=array_append(days,(new.paid_at at time zone 'America/Recife')::date);end if;
 end if;
 perform private.assert_cash_days_open(days);
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function private.guard_closed_cash_day() from public,anon,authenticated,service_role;
create trigger cash_day_guard before insert or update or delete on public.invoices for each row execute function private.guard_closed_cash_day();
create trigger cash_day_guard before insert or update or delete on public.invoice_payments for each row execute function private.guard_closed_cash_day();
create trigger cash_day_guard before insert or update or delete on public.payment_reversals for each row execute function private.guard_closed_cash_day();

create function private.cash_day_report(p_date date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare latest jsonb;history jsonb;live jsonb;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Consulta de caixa não autorizada.';end if;
 if p_date is null or not isfinite(p_date) or p_date<date '2000-01-01' then raise exception 'Informe uma data válida para o caixa.';end if;
 live=private.cash_day_source(p_date);
 select coalesce(jsonb_agg((to_jsonb(c)-'snapshot'-'request_hash'-'idempotency_key'-'closed_by')||jsonb_build_object('reopening',
  case when r.id is null then null else jsonb_build_object('reason',r.reason,'actor',r.actor_snapshot,'at',r.reopened_at) end) order by c.revision desc),'[]') into history
 from private.cash_day_closures c left join private.cash_day_reopenings r on r.closure_id=c.id where c.business_date=p_date;
 latest=history->0;
 return jsonb_build_object('date',p_date,'state',case when latest is not null and latest->'reopening'='null'::jsonb then 'closed' else 'open' end,
  'live',live,'latest',latest,'history',history,'canReopen',private.has_role(array['admin','secretaria']));
end;$$;
revoke all on function private.cash_day_report(date) from public,anon;
grant execute on function private.cash_day_report(date) to authenticated;
create function public.cash_day_report(p_date date) returns jsonb language sql stable security invoker set search_path='' as $$select private.cash_day_report(p_date);$$;
revoke all on function public.cash_day_report(date) from public,anon;
grant execute on function public.cash_day_report(date) to authenticated;

create function private.close_cash_day(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare day date;key uuid;opening numeric;counted jsonb;expected jsonb;difference jsonb;reason text;note text;request_hash text;
 source jsonb;actor jsonb;existing private.cash_day_closures%rowtype;closure uuid;revision integer;method text;value numeric;diff numeric;different boolean:=false;total numeric:=0;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Fechamento de caixa não autorizado.';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Revise os dados do fechamento.';end if;
 day=(p_payload->>'date')::date;key=(p_payload->>'key')::uuid;
 if day is null or not isfinite(day) or day<date '2000-01-01' or day>(now() at time zone 'America/Recife')::date or key is null then raise exception 'Escolha uma data até hoje e confira o fechamento.';end if;
 if jsonb_typeof(p_payload->'openingCash') is distinct from 'number' then raise exception 'Informe o fundo de troco inicial.';end if;
 opening=(p_payload->>'openingCash')::numeric;
 if opening<0 or opening>1000000 or opening<>round(opening,2) then raise exception 'Revise o fundo de troco inicial.';end if;
 counted=p_payload->'counted';
 if jsonb_typeof(counted) is distinct from 'object' then raise exception 'Informe os valores conferidos nas quatro formas de pagamento.';end if;
 foreach method in array array['dinheiro','pix','debito','credito'] loop
  if jsonb_typeof(counted->method) is distinct from 'number' then raise exception 'Informe os valores conferidos nas quatro formas de pagamento.';end if;
  value=(counted->>method)::numeric;
  if value<0 or value>1000000000 or value<>round(value,2) then raise exception 'Informe valores conferidos válidos, com até duas casas decimais.';end if;
  total=total+value;
 end loop;
 counted=jsonb_build_object('dinheiro',counted->'dinheiro','pix',counted->'pix','debito',counted->'debito','credito',counted->'credito','total',total);
 reason=trim(coalesce(p_payload->>'differenceReason',''));note=trim(coalesce(p_payload->>'notes',''));
 if length(reason)>500 or length(note)>1000 then raise exception 'Revise a justificativa e a observação.';end if;
 request_hash=md5(jsonb_build_object('date',day,'opening',opening,'counted',counted,'reason',reason,'notes',note,'fingerprint',p_payload->>'fingerprint')::text);
 perform pg_advisory_xact_lock(hashtext('sport-cash-day-'||day::text));
 select * into existing from private.cash_day_closures c where c.idempotency_key=key;
 if found then
  if existing.closed_by<>auth.uid() or existing.request_hash<>request_hash then raise exception 'Esta tentativa de fechamento já foi usada com outros dados. Atualize a conferência.';end if;
  return jsonb_build_object('success',true,'closureId',existing.id,'revision',existing.revision,'alreadyProcessed',true);
 end if;
 perform private.assert_cash_days_open(array[day]);
 source=private.cash_day_source(day);
 if p_payload->>'fingerprint' is distinct from source->>'fingerprint' then raise exception 'Os recebimentos deste dia mudaram durante a conferência. Atualize os valores antes de fechar.';end if;
 expected=(source->'totals')||jsonb_build_object('dinheiro',(source->'totals'->>'dinheiro')::numeric+opening,'total',(source->'totals'->>'total')::numeric+opening);
 difference='{}';
 foreach method in array array['dinheiro','pix','debito','credito','total'] loop
  diff=(counted->>method)::numeric-(expected->>method)::numeric;difference=difference||jsonb_build_object(method,diff);
  if method<>'total' and diff<>0 then different=true;end if;
 end loop;
 if different and length(reason)<5 then raise exception 'Justifique a diferença encontrada, mesmo que as diferenças entre formas se compensem.';end if;
 select jsonb_build_object('name',full_name,'username',username,'role',role) into actor from public.staff_profiles where id=auth.uid();
 select coalesce(max(c.revision),0)+1 into revision from private.cash_day_closures c where c.business_date=day;
 insert into private.cash_day_closures(business_date,revision,idempotency_key,request_hash,source_fingerprint,opening_cash,expected,counted,difference,difference_reason,notes,snapshot,closed_by,actor_snapshot)
 values(day,revision,key,request_hash,source->>'fingerprint',opening,expected,counted,difference,reason,note,source,auth.uid(),actor) returning id into closure;
 insert into public.audit_events(actor_id,entity,entity_id,action,metadata) values(auth.uid(),'cash_day_closures',closure::text,'CLOSE_CASH_DAY',jsonb_build_object('date',day,'revision',revision,'actor_snapshot',actor,'expected',expected,'counted',counted,'difference',difference,'reason',reason));
 return jsonb_build_object('success',true,'closureId',closure,'revision',revision,'alreadyProcessed',false);
end;$$;
revoke all on function private.close_cash_day(jsonb) from public,anon;
grant execute on function private.close_cash_day(jsonb) to authenticated;
create function public.close_cash_day(p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.close_cash_day(p_payload);$$;
revoke all on function public.close_cash_day(jsonb) from public,anon;
grant execute on function public.close_cash_day(jsonb) to authenticated;

create function private.reopen_cash_day(p_closure uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.cash_day_closures%rowtype;latest uuid;actor jsonb;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Somente administrador ou secretaria pode reabrir o caixa.';end if;
 if p_closure is null or length(trim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'Informe o fechamento e o motivo da reabertura, com 5 a 500 caracteres.';end if;
 select * into c from private.cash_day_closures where id=p_closure;
 if not found then raise exception 'Fechamento não encontrado.';end if;
 perform pg_advisory_xact_lock(hashtext('sport-cash-day-'||c.business_date::text));
 select id into latest from private.cash_day_closures where business_date=c.business_date order by revision desc limit 1;
 if latest<>p_closure then raise exception 'Existe um fechamento mais recente para esse dia. Atualize a consulta.';end if;
 if exists(select 1 from private.cash_day_reopenings where closure_id=p_closure) then return jsonb_build_object('success',true,'alreadyReopened',true);end if;
 select jsonb_build_object('name',full_name,'username',username,'role',role) into actor from public.staff_profiles where id=auth.uid();
 insert into private.cash_day_reopenings(closure_id,reason,reopened_by,actor_snapshot) values(p_closure,trim(p_reason),auth.uid(),actor);
 insert into public.audit_events(actor_id,entity,entity_id,action,metadata) values(auth.uid(),'cash_day_closures',p_closure::text,'REOPEN_CASH_DAY',jsonb_build_object('date',c.business_date,'revision',c.revision,'actor_snapshot',actor,'reason',trim(p_reason)));
 return jsonb_build_object('success',true,'alreadyReopened',false);
end;$$;
revoke all on function private.reopen_cash_day(uuid,text) from public,anon;
grant execute on function private.reopen_cash_day(uuid,text) to authenticated;
create function public.reopen_cash_day(p_closure uuid,p_reason text) returns jsonb language sql security invoker set search_path='' as $$select private.reopen_cash_day(p_closure,p_reason);$$;
revoke all on function public.reopen_cash_day(uuid,text) from public,anon;
grant execute on function public.reopen_cash_day(uuid,text) to authenticated;

create function private.cash_closure_document(p_closure uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Consulta de caixa não autorizada.';end if;
 select (to_jsonb(c)-'request_hash'-'idempotency_key'-'closed_by')||jsonb_build_object('reopening',case when r.id is null then null else jsonb_build_object('reason',r.reason,'actor',r.actor_snapshot,'at',r.reopened_at) end)
 into result from private.cash_day_closures c left join private.cash_day_reopenings r on r.closure_id=c.id where c.id=p_closure;
 if result is null then raise exception 'Fechamento não encontrado.';end if;
 return result;
end;$$;
revoke all on function private.cash_closure_document(uuid) from public,anon;
grant execute on function private.cash_closure_document(uuid) to authenticated;
create function public.cash_closure_document(p_closure uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.cash_closure_document(p_closure);$$;
revoke all on function public.cash_closure_document(uuid) from public,anon;
grant execute on function public.cash_closure_document(uuid) to authenticated;
