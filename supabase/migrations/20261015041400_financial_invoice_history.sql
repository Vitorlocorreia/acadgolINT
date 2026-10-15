-- Preserve the verified identity at the moment of each new financial operation.
-- Historical ledgers are deliberately not rewritten or assigned a guessed identity.
alter table public.invoice_payments alter column recorded_at set default clock_timestamp();
alter table public.payment_reversals alter column created_at set default clock_timestamp();
alter table public.audit_events alter column occurred_at set default clock_timestamp();
alter table public.invoice_payments add column actor_snapshot jsonb
  check (actor_snapshot is null or jsonb_typeof(actor_snapshot)='object');
alter table public.payment_reversals add column actor_snapshot jsonb
  check (actor_snapshot is null or jsonb_typeof(actor_snapshot)='object');

create function private.capture_payment_actor() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.actor_snapshot=null;
  if new.actor_id is not null then
    select jsonb_build_object('name',p.full_name,'username',p.username,'role',p.role)
    into new.actor_snapshot from public.staff_profiles p where p.id=new.actor_id;
  end if;
  return new;
end;$$;
revoke all on function private.capture_payment_actor() from public,anon,authenticated;
create trigger capture_payment_actor before insert on public.invoice_payments
for each row execute function private.capture_payment_actor();
create trigger capture_reversal_actor before insert on public.payment_reversals
for each row execute function private.capture_payment_actor();

-- Keep the general audit format, adding only a small financial snapshot for invoices.
create or replace function private.audit_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_row jsonb;v_previous jsonb;v_actor uuid;v_metadata jsonb;v_identity jsonb;
begin
  v_row=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_previous=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_actor=auth.uid();
  if tg_table_name='staff_profiles' and v_actor is null then v_actor=coalesce((v_row->>'updated_by')::uuid,(v_row->>'created_by')::uuid);end if;
  v_metadata=jsonb_build_object('changed_fields',(select coalesce(jsonb_agg(key),'[]') from jsonb_each(v_row) where value is distinct from v_previous->key));
  if tg_table_name='invoices' then
    select jsonb_build_object('name',p.full_name,'username',p.username,'role',p.role)
      into v_identity from public.staff_profiles p where p.id=v_actor;
    v_metadata=v_metadata||jsonb_build_object(
      'actor_snapshot',v_identity,'actor_source',case when v_actor is null then 'system' when v_identity is not null then 'snapshot' else 'unverified' end,
      'financial_before',case when tg_op='INSERT' then null else
        jsonb_build_object('amount',v_previous->'amount','status',v_previous->'status','due_date',v_previous->'due_date','reference_month',v_previous->'reference_month','charge_type',v_previous->'charge_type') end,
      'financial_after',case when tg_op='DELETE' then null else
        jsonb_build_object('amount',v_row->'amount','status',v_row->'status','due_date',v_row->'due_date','reference_month',v_row->'reference_month','charge_type',v_row->'charge_type') end);
  end if;
  insert into public.audit_events(actor_id,entity,entity_id,action,metadata)
    values(v_actor,tg_table_name,v_row->>'id',tg_op,v_metadata);
  if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function private.audit_change() from public,anon,authenticated;

-- The summary uses the historical identity when captured, and labels old records.
create or replace function private.invoice_receipt(p_invoice uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then return null;end if;
  return(select to_jsonb(p)||jsonb_build_object(
    'actor_name',coalesce(p.actor_snapshot->>'name',s.full_name,'Registro anterior; autor não verificado'),
    'actor_username',coalesce(p.actor_snapshot->>'username',s.username),
    'actor_role',p.actor_snapshot->>'role',
    'actor_identity_source',case when p.actor_snapshot is not null then 'snapshot' when s.id is not null then 'current_profile' else 'unverified' end)
    from public.invoice_payments p left join public.staff_profiles s on s.id=p.actor_id
    where p.invoice_id=p_invoice and not exists(select 1 from public.payment_reversals r where r.payment_id=p.id)
    order by p.recorded_at desc,p.id desc limit 1);
end;$$;
revoke all on function private.invoice_receipt(uuid) from public,anon;
grant execute on function private.invoice_receipt(uuid) to authenticated;

-- This guarded projection can read operator names without granting broad staff/audit access.
create function private.invoice_financial_history(p_invoice uuid,p_offset integer default 0,p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_invoice public.invoices%rowtype;v_created public.audit_events%rowtype;v_events jsonb;v_total integer;v_student text;
begin
  if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Seu perfil não pode consultar o histórico financeiro.';end if;
  if p_offset is null or p_offset<0 or p_offset>100000 or p_limit is null or p_limit<1 or p_limit>50 then raise exception 'Página de histórico inválida.';end if;
  select * into v_invoice from public.invoices where id=p_invoice;
  if not found then raise exception 'Cobrança não encontrada.';end if;
  select name into v_student from public.students where id=v_invoice.student_id;
  select * into v_created from public.audit_events
    where entity='invoices' and entity_id=p_invoice::text and action='INSERT'
    order by occurred_at,id limit 1;

  with events as (
    select coalesce(v_created.occurred_at,v_invoice.created_at) as event_time,0 as event_order,'created:'||v_invoice.id as event_id,
      jsonb_build_object('id','created:'||v_invoice.id,'type','created','recordedAt',coalesce(v_created.occurred_at,v_invoice.created_at),
        'actor',coalesce(nullif(v_created.metadata->'actor_snapshot','null'::jsonb),case when s.id is not null then jsonb_build_object('name',s.full_name,'username',s.username) else '{}'::jsonb end)||
          jsonb_build_object('source',case when v_created.metadata->>'actor_source'='system' then 'system' when jsonb_typeof(v_created.metadata->'actor_snapshot')='object' then 'snapshot' when s.id is not null then 'current_profile' else 'unverified' end),
        'originalAmount',coalesce((v_created.metadata->'financial_after'->>'amount')::numeric,v_invoice.amount),
        'dueDate',coalesce(v_created.metadata->'financial_after'->>'due_date',v_invoice.due_date::text),
        'detailsSource',case when v_created.metadata->'financial_after' is not null then 'snapshot' else 'current_invoice' end) as body
    from (values(1)) seed(n) left join public.staff_profiles s on s.id=v_created.actor_id
    union all
    select p.recorded_at,1,'payment:'||p.id,
      jsonb_build_object('id','payment:'||p.id,'type','payment','paymentId',p.id,'recordedAt',p.recorded_at,'paidAt',p.paid_at,
        'actor',coalesce(p.actor_snapshot,case when s.id is not null then jsonb_build_object('name',s.full_name,'username',s.username) else '{}'::jsonb end)||
          jsonb_build_object('source',case when p.actor_snapshot is not null then 'snapshot' when s.id is not null then 'current_profile' else 'unverified' end),
        'legacy',p.legacy_import,'originalAmount',p.principal_amount,'receivedAmount',p.received_amount,'discountAmount',p.discount_amount,
        'fineAmount',p.fine_amount,'interestAmount',p.interest_amount,'method',p.payment_method,
        'parts',case when jsonb_array_length(p.payment_parts)>0 then p.payment_parts else jsonb_build_array(jsonb_build_object('method',p.payment_method,'amount',p.received_amount)) end,
        'notes',p.notes,'reason',p.negotiation_reason,'reversed',exists(select 1 from public.payment_reversals r where r.payment_id=p.id),
        'proof',case when p.proof_path is not null then jsonb_build_object('paymentId',p.id,'name',p.proof_name,'mime',p.proof_mime,'size',p.proof_size) else null end)
    from public.invoice_payments p left join public.staff_profiles s on s.id=p.actor_id where p.invoice_id=p_invoice
    union all
    select r.created_at,2,'reversal:'||r.id,
      jsonb_build_object('id','reversal:'||r.id,'type','reversal','paymentId',p.id,'recordedAt',r.created_at,'receivedAmount',p.received_amount,'reason',r.reason,
        'actor',coalesce(r.actor_snapshot,case when s.id is not null then jsonb_build_object('name',s.full_name,'username',s.username) else '{}'::jsonb end)||
          jsonb_build_object('source',case when r.actor_snapshot is not null then 'snapshot' when s.id is not null then 'current_profile' else 'unverified' end))
    from public.payment_reversals r join public.invoice_payments p on p.id=r.payment_id
    left join public.staff_profiles s on s.id=r.actor_id where p.invoice_id=p_invoice
  ), page as (
    select * from events order by event_time,event_order,event_id offset p_offset limit p_limit
  )
  select (select count(*) from events),coalesce((select jsonb_agg(body order by event_time,event_order,event_id) from page),'[]'::jsonb)
  into v_total,v_events;

  return jsonb_build_object('invoice',jsonb_build_object('id',v_invoice.id,'studentName',v_student,'referenceMonth',v_invoice.reference_month,
      'chargeType',v_invoice.charge_type,'status',v_invoice.status,'amount',v_invoice.amount,'paidAmount',v_invoice.paid_amount),
    'events',v_events,'total',v_total,'nextOffset',case when p_offset+jsonb_array_length(v_events)<v_total then p_offset+jsonb_array_length(v_events) else null end);
end;$$;
revoke all on function private.invoice_financial_history(uuid,integer,integer) from public,anon;
grant execute on function private.invoice_financial_history(uuid,integer,integer) to authenticated;

create function public.invoice_financial_history(p_invoice uuid,p_offset integer default 0,p_limit integer default 30)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.invoice_financial_history(p_invoice,p_offset,p_limit);
$$;
revoke all on function public.invoice_financial_history(uuid,integer,integer) from public,anon;
grant execute on function public.invoice_financial_history(uuid,integer,integer) to authenticated;
