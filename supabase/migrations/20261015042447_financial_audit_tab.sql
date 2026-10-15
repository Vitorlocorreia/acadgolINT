-- The audit tab reads a minimal financial projection; raw audit/staff access stays closed.
create view private.financial_audit_entries with (security_invoker=true) as
select 'created:'||i.id as id,i.id as invoice_id,'created'::text as event_type,
  coalesce(a.occurred_at,i.created_at) as recorded_at,
  coalesce(nullif(a.metadata->'actor_snapshot','null'::jsonb),case when s.id is not null then jsonb_build_object('name',s.full_name,'username',s.username) else '{}'::jsonb end)||
    jsonb_build_object('source',case when a.metadata->>'actor_source'='system' then 'system' when jsonb_typeof(a.metadata->'actor_snapshot')='object' then 'snapshot' when s.id is not null then 'current_profile' else 'unverified' end) as actor,
  st.name as student_name,i.reference_month,i.charge_type,
  coalesce((a.metadata->'financial_after'->>'amount')::numeric,i.amount) as agreed_amount,
  null::numeric as received_amount,0::numeric as discount_amount,
  null::timestamptz as paid_at,null::text as payment_method,'[]'::jsonb as payment_parts,
  null::text as notes,null::text as reason,null::uuid as payment_id,null::text as proof_name,
  false as reversed,false as legacy,
  coalesce((a.metadata->'financial_after'->>'due_date')::date,i.due_date) as due_date,
  case when a.metadata->'financial_after' is not null then 'snapshot' else 'current_invoice' end as details_source
from public.invoices i left join public.students st on st.id=i.student_id
left join lateral (select actor_id,metadata,occurred_at from public.audit_events where entity='invoices' and entity_id=i.id::text and action='INSERT' order by occurred_at,id limit 1) a on true
left join public.staff_profiles s on s.id=a.actor_id
union all
select 'payment:'||p.id,i.id,'payment',p.recorded_at,
  coalesce(p.actor_snapshot,case when s.id is not null then jsonb_build_object('name',s.full_name,'username',s.username) else '{}'::jsonb end)||
    jsonb_build_object('source',case when p.actor_snapshot is not null then 'snapshot' when s.id is not null then 'current_profile' else 'unverified' end),
  st.name,i.reference_month,i.charge_type,p.principal_amount,p.received_amount,p.discount_amount,
  p.paid_at,p.payment_method,case when jsonb_array_length(p.payment_parts)>0 then p.payment_parts else jsonb_build_array(jsonb_build_object('method',p.payment_method,'amount',p.received_amount)) end,
  p.notes,p.negotiation_reason,p.id,case when p.proof_path is not null then p.proof_name end,
  exists(select 1 from public.payment_reversals r where r.payment_id=p.id),p.legacy_import,i.due_date,null
from public.invoice_payments p join public.invoices i on i.id=p.invoice_id
left join public.students st on st.id=i.student_id left join public.staff_profiles s on s.id=p.actor_id
union all
select 'reversal:'||r.id,i.id,'reversal',r.created_at,
  coalesce(r.actor_snapshot,case when s.id is not null then jsonb_build_object('name',s.full_name,'username',s.username) else '{}'::jsonb end)||
    jsonb_build_object('source',case when r.actor_snapshot is not null then 'snapshot' when s.id is not null then 'current_profile' else 'unverified' end),
  st.name,i.reference_month,i.charge_type,p.principal_amount,p.received_amount,0,
  p.paid_at,p.payment_method,case when jsonb_array_length(p.payment_parts)>0 then p.payment_parts else jsonb_build_array(jsonb_build_object('method',p.payment_method,'amount',p.received_amount)) end,
  null,r.reason,p.id,case when p.proof_path is not null then p.proof_name end,true,false,i.due_date,null
from public.payment_reversals r join public.invoice_payments p on p.id=r.payment_id
join public.invoices i on i.id=p.invoice_id left join public.students st on st.id=i.student_id
left join public.staff_profiles s on s.id=r.actor_id;
revoke all on private.financial_audit_entries from public,anon,authenticated;

create index payments_recorded_at_idx on public.invoice_payments(recorded_at desc,id desc);
create index reversals_recorded_at_idx on public.payment_reversals(created_at desc,id desc);

create function private.financial_audit_log(p_start date default null,p_end date default null,p_action text default 'all',p_student text default '',p_actor text default '',p_offset integer default 0,p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_start timestamptz;v_end timestamptz;v_total integer;v_rows jsonb;
begin
  if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Seu perfil não pode consultar a auditoria financeira.';end if;
  if p_action is null or p_action not in('all','created','payment','reversal','discount') or p_offset is null or p_offset<0 or p_offset>100000 or p_limit is null or p_limit<1 or p_limit>50 or length(coalesce(p_student,''))>120 or length(coalesce(p_actor,''))>120 or(p_start is not null and p_end is not null and p_start>p_end) then raise exception 'Filtros de auditoria inválidos.';end if;
  v_start=p_start::timestamp at time zone 'America/Recife';
  v_end=(p_end+1)::timestamp at time zone 'America/Recife';
  with filtered as (
    select * from private.financial_audit_entries e
    where (v_start is null or e.recorded_at>=v_start) and(v_end is null or e.recorded_at<v_end)
      and(p_action='all' or e.event_type=p_action or(p_action='discount' and e.event_type='payment' and e.discount_amount>0))
      and(coalesce(trim(p_student),'')='' or position(lower(trim(p_student)) in lower(coalesce(e.student_name,'')))>0)
      and(coalesce(trim(p_actor),'')='' or position(lower(trim(p_actor)) in lower(coalesce(e.actor->>'name','')||' '||coalesce(e.actor->>'username','')||case when e.actor->>'source'='system' then ' sistema' when e.actor->>'source'='unverified' then ' autor não verificado' else '' end))>0)
  ), page as (
    select * from filtered order by recorded_at desc,id desc offset p_offset limit p_limit
  )
  select (select count(*) from filtered),coalesce((select jsonb_agg(to_jsonb(page) order by recorded_at desc,id desc) from page),'[]'::jsonb)
  into v_total,v_rows;
  return jsonb_build_object('entries',v_rows,'total',v_total,'nextOffset',case when p_offset+jsonb_array_length(v_rows)<v_total then p_offset+jsonb_array_length(v_rows) else null end);
end;$$;
revoke all on function private.financial_audit_log(date,date,text,text,text,integer,integer) from public,anon;
grant execute on function private.financial_audit_log(date,date,text,text,text,integer,integer) to authenticated;

create function public.financial_audit_log(p_start date default null,p_end date default null,p_action text default 'all',p_student text default '',p_actor text default '',p_offset integer default 0,p_limit integer default 30)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.financial_audit_log(p_start,p_end,p_action,p_student,p_actor,p_offset,p_limit);
$$;
revoke all on function public.financial_audit_log(date,date,text,text,text,integer,integer) from public,anon;
grant execute on function public.financial_audit_log(date,date,text,text,text,integer,integer) to authenticated;
