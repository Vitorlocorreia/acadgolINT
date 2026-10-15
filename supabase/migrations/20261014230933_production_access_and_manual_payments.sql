-- Access foundation. Legacy table policies are replaced by the following hardening migration.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check(length(trim(full_name)) between 2 and 120),
  email text not null unique,
  role text not null check(role in ('admin','secretaria','financeiro','treinador')),
  coach_id uuid references public.coaches(id) on delete restrict,
  active boolean not null default true,
  must_change_password boolean not null default true,
  sessions_valid_after timestamptz not null default now(),
  is_test boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(role <> 'treinador' or coach_id is not null)
);
alter table public.staff_profiles enable row level security;
grant select on public.staff_profiles to authenticated;
revoke insert,update,delete on public.staff_profiles from anon,authenticated;
grant all on public.staff_profiles to service_role;

create table public.app_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon,authenticated;
grant all on public.app_settings to service_role;

create table private.pending_password_changes (user_id uuid primary key references public.staff_profiles(id) on delete cascade, password_hash text not null);
revoke all on private.pending_password_changes from public,anon,authenticated;
grant all on private.pending_password_changes to service_role;

create or replace function private.valid_session(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and p_user=auth.uid() and exists (
    select 1 from auth.sessions s join public.staff_profiles p on p.id=s.user_id
    where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid()
      and s.created_at >= p.sessions_valid_after and (s.not_after is null or s.not_after>now())
  );
$$;
create or replace function private.staff_role() returns text language sql stable security definer set search_path='' as $$
  select p.role from public.staff_profiles p where p.id=(select auth.uid()) and p.active and not p.must_change_password and private.valid_session(p.id);
$$;
create or replace function private.staff_coach() returns uuid language sql stable security definer set search_path='' as $$
  select p.coach_id from public.staff_profiles p where p.id=(select auth.uid()) and p.active and not p.must_change_password and private.valid_session(p.id);
$$;
create or replace function private.has_role(p_roles text[]) returns boolean language sql stable security invoker set search_path='' as $$ select coalesce(private.staff_role()=any(p_roles),false); $$;
create or replace function private.can_class(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (private.has_role(array['admin','secretaria']) or (private.staff_role()='treinador' and exists(select 1 from public.classes c where c.id=p_id and c.coach_id=private.staff_coach())));
$$;
create or replace function private.can_student(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (private.has_role(array['admin','secretaria']) or (private.staff_role()='treinador' and exists(select 1 from public.enrollments e where e.student_id=p_id and e.status in ('active','trial') and private.can_class(e.class_id))));
$$;
create or replace function private.can_match(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (private.has_role(array['admin','secretaria']) or (private.staff_role()='treinador' and exists(select 1 from public.matches m where m.id=p_id and m.coach_id=private.staff_coach())));
$$;
create or replace function private.trial_class_id(p_feedback text) returns uuid language plpgsql immutable set search_path='' as $$
begin return (p_feedback::jsonb->>'class_id')::uuid; exception when others then return null; end;
$$;
revoke all on all functions in schema private from public,anon;
grant execute on function private.valid_session(uuid), private.staff_role(),private.staff_coach(),private.has_role(text[]),private.can_class(uuid),private.can_student(uuid),private.can_match(uuid),private.trial_class_id(text) to authenticated;
create policy staff_read_self on public.staff_profiles for select to authenticated using (id=(select auth.uid()) or private.has_role(array['admin']));

create or replace function public.current_staff_profile() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then return null; end if;
  return (select to_jsonb(p) - 'is_test' - 'sessions_valid_after' || jsonb_build_object('session_valid',private.valid_session(p.id)) from public.staff_profiles p where p.id=auth.uid());
end;
$$;
revoke all on function public.current_staff_profile() from public,anon;
grant execute on function public.current_staff_profile() to authenticated;

create or replace function private.capture_pending_password() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.must_change_password then
    insert into private.pending_password_changes(user_id,password_hash) select new.id,u.encrypted_password from auth.users u where u.id=new.id
    on conflict(user_id) do update set password_hash=excluded.password_hash;
  else delete from private.pending_password_changes where user_id=new.id; end if;
  return new;
end;
$$;
revoke all on function private.capture_pending_password() from public,anon,authenticated;
create trigger staff_password_pending after insert or update of must_change_password on public.staff_profiles for each row execute function private.capture_pending_password();

create or replace function private.protect_last_admin() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtext('acadgol-last-admin'));
  if old.role='admin' and old.active and not old.is_test and (tg_op='DELETE' or new.role<>'admin' or not new.active) then
    if not exists(select 1 from public.staff_profiles where id<>old.id and role='admin' and active and not is_test) then raise exception 'O último administrador ativo não pode ser removido ou bloqueado.'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  new.updated_at=now(); return new;
end;
$$;
revoke all on function private.protect_last_admin() from public,anon,authenticated;
create trigger protect_last_admin before update or delete on public.staff_profiles for each row execute function private.protect_last_admin();

create or replace function public.complete_password_change() returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.valid_session(auth.uid()) then raise exception 'Sessão inválida.'; end if;
  if not exists(select 1 from auth.users u join private.pending_password_changes p on p.user_id=u.id where u.id=auth.uid() and u.encrypted_password is distinct from p.password_hash) then raise exception 'Altere a senha antes de continuar.'; end if;
  update public.staff_profiles set must_change_password=false,updated_at=now() where id=auth.uid() and active;
  return found;
end;
$$;
revoke all on function public.complete_password_change() from public,anon;
grant execute on function public.complete_password_change() to authenticated;

create table public.audit_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid, entity text not null, entity_id text,
 action text not null, metadata jsonb not null default '{}', occurred_at timestamptz not null default now()
);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon,authenticated;
grant select on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
create policy audit_admin_read on public.audit_events for select to authenticated using(private.has_role(array['admin']));
create index audit_events_entity_date on public.audit_events(entity,entity_id,occurred_at desc);
create index audit_events_actor_date on public.audit_events(actor_id,occurred_at desc);

create or replace function private.reject_ledger_change() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Histórico permanente: registre um estorno, sem apagar o lançamento.'; end; $$;
revoke all on function private.reject_ledger_change() from public,anon,authenticated;
create trigger immutable_audit before update or delete on public.audit_events for each row execute function private.reject_ledger_change();
create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare v_row jsonb; v_previous jsonb; v_actor uuid;
begin
  v_row=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_previous=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_actor=auth.uid();
  if tg_table_name='staff_profiles' and v_actor is null then v_actor=coalesce((v_row->>'updated_by')::uuid,(v_row->>'created_by')::uuid); end if;
  insert into public.audit_events(actor_id,entity,entity_id,action,metadata) values(v_actor,tg_table_name,v_row->>'id',tg_op,jsonb_build_object('changed_fields',(select coalesce(jsonb_agg(key),'[]') from jsonb_each(v_row) where value is distinct from v_previous->key)));
  if tg_op='DELETE' then return old; end if; return new;
end;
$$;
revoke all on function private.audit_change() from public,anon,authenticated;

alter table public.students add column portal_access_enabled boolean not null default true, add column portal_token_expires_at timestamptz not null default (now()+interval '90 days'), add column birth_date_estimated boolean not null default false;
create unique index students_portal_token_unique on public.students(portal_token);
alter table public.match_callups add column access_token uuid not null default gen_random_uuid(),add column access_enabled boolean not null default true,add column access_expires_at timestamptz not null default(now()+interval '90 days');
create unique index match_callups_access_token_unique on public.match_callups(access_token);
alter table public.medical_records alter column has_medical_clearance set default false, alter column image_use_authorized set default false;
alter table public.guardians alter column cpf drop not null;

alter table public.invoices add column paid_amount numeric(12,2),add column received_by uuid references auth.users(id) on delete set null;
update public.invoices set paid_amount=amount where status='paid';
create unique index invoices_student_month_unique on public.invoices(student_id,reference_month) where status is distinct from 'cancelled';
alter table public.invoices add constraint invoice_nonnegative check(amount>=0),add constraint invoice_month_format check(reference_month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$');
alter table public.enrollments add constraint enrollment_due_day check(due_day between 1 and 31),add constraint enrollment_fee_nonnegative check(monthly_fee>=0);
alter table public.uniform_inventory add constraint uniform_nonnegative check(quantity>=0 and min_threshold>=0 and unit_price>=0);
create unique index uniform_item_size_unique on public.uniform_inventory(item_type,size);
create index guardians_student_idx on public.guardians(student_id);
create index enrollment_class_status_idx on public.enrollments(class_id,status);
create index enrollment_student_status_idx on public.enrollments(student_id,status);
create index invoice_status_due_idx on public.invoices(status,due_date);
create index callup_student_idx on public.match_callups(student_id);

create table public.invoice_payments (
 id uuid primary key default gen_random_uuid(),invoice_id uuid not null references public.invoices(id) on delete restrict,
 idempotency_key uuid not null unique,principal_amount numeric(12,2) not null check(principal_amount>=0),
 received_amount numeric(12,2) not null check(received_amount>0),fine_amount numeric(12,2) not null default 0 check(fine_amount>=0),interest_amount numeric(12,2) not null default 0 check(interest_amount>=0),discount_amount numeric(12,2) not null default 0 check(discount_amount>=0),
 payment_method text not null,actor_id uuid,paid_at timestamptz not null,recorded_at timestamptz not null default now(),
 notes text,negotiation_reason text,legacy_import boolean not null default false
);
create table public.payment_reversals (
 id uuid primary key default gen_random_uuid(),payment_id uuid not null unique references public.invoice_payments(id) on delete restrict,
 actor_id uuid not null,reason text not null check(length(trim(reason))>=5),created_at timestamptz not null default now()
);
alter table public.invoice_payments enable row level security;
alter table public.payment_reversals enable row level security;
revoke all on public.invoice_payments,public.payment_reversals from anon,authenticated;
grant select on public.invoice_payments,public.payment_reversals to authenticated;
grant all on public.invoice_payments,public.payment_reversals to service_role;
create policy payments_finance_read on public.invoice_payments for select to authenticated using(private.has_role(array['admin','secretaria','financeiro']));
create policy reversals_finance_read on public.payment_reversals for select to authenticated using(private.has_role(array['admin','secretaria','financeiro']));
insert into public.invoice_payments(invoice_id,idempotency_key,principal_amount,received_amount,payment_method,paid_at,notes,legacy_import) select id,gen_random_uuid(),amount,amount,coalesce(payment_method,'legacy'),coalesce(paid_at,created_at,now()),'Importado do cadastro anterior; autor original não verificado.',true from public.invoices where status='paid' and amount>0;
create trigger immutable_payments before update or delete on public.invoice_payments for each row execute function private.reject_ledger_change();
create trigger immutable_reversals before update or delete on public.payment_reversals for each row execute function private.reject_ledger_change();
create index payments_invoice_date_idx on public.invoice_payments(invoice_id,recorded_at desc);

create or replace function public.claim_staff_bootstrap(p_hash text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update public.app_settings set value=value||jsonb_build_object('used',true),updated_at=now() where key='staff_bootstrap' and value->>'hash'=p_hash and coalesce((value->>'used')::boolean,false)=false and (value->>'expires_at')::timestamptz>now() and not exists(select 1 from public.staff_profiles where role='admin' and active);
  return found;
end;
$$;
revoke all on function public.claim_staff_bootstrap(text) from public,anon,authenticated;
grant execute on function public.claim_staff_bootstrap(text) to service_role;

-- Only trusted functions and triggers write the permanent history.
do $$ declare r record; begin
 for r in select tablename from pg_tables where schemaname='public' and tablename not in ('audit_events','app_settings') loop
   execute format('create trigger audit_row_change after insert or update or delete on public.%I for each row execute function private.audit_change()',r.tablename);
 end loop;
end $$;
