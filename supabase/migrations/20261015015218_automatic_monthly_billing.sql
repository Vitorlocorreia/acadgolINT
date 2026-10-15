-- Runs inside Postgres; no browser, web server or privileged application key is required.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
create index invoices_student_month_lookup on public.invoices(student_id,reference_month);

create table private.monthly_billing_runs (
 id uuid primary key default gen_random_uuid(),
 reference_month text not null,
 generated_count integer not null check(generated_count>=0),
 completed_at timestamptz not null default now()
);
alter table private.monthly_billing_runs enable row level security;
revoke all on private.monthly_billing_runs from public,anon,authenticated,service_role;

-- Owner-only shared implementation. The public wrapper authenticates staff;
-- the scheduled worker runs as the database owner without a fabricated staff session.
create function private.issue_monthly_invoices(p_month text) returns integer
language plpgsql security invoker set search_path='' as $$
declare first_day date;last_day date;generated integer;
begin
 if p_month is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then raise exception 'Mês inválido.';end if;
 first_day=(p_month||'-01')::date;
 last_day=(first_day+interval '1 month'-interval '1 day')::date;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('acadgol-invoices-'||p_month));
 insert into public.invoices(enrollment_id,student_id,reference_month,due_date,amount,status,pix_code)
 select distinct on(e.student_id)
  e.id,e.student_id,p_month,
  first_day+(least(e.due_day,extract(day from last_day)::integer)-1),
  e.monthly_fee,'pending',null
 from public.enrollments e join public.students s on s.id=e.student_id
 where e.status='active' and s.status='active' and e.start_date<=last_day
  -- Preserve paid invoices, prior agreements and intentional cancellations.
  and not exists(select 1 from public.invoices i where i.student_id=e.student_id and i.reference_month=p_month)
 order by e.student_id,e.created_at desc nulls last,e.id
 on conflict(student_id,reference_month) where status is distinct from 'cancelled' do nothing;
 get diagnostics generated=row_count;
 return generated;
end;$$;
revoke all on function private.issue_monthly_invoices(text) from public,anon,authenticated,service_role;

create or replace function public.generate_manual_invoices(p_month text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare first_day date;school_month date:=date_trunc('month',now() at time zone 'America/Recife')::date;generated integer;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Geração de mensalidades não autorizada.';end if;
 if p_month is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then raise exception 'Mês inválido.';end if;
 first_day=(p_month||'-01')::date;
 if first_day<school_month-interval '36 months' or first_day>school_month+interval '12 months' then raise exception 'Escolha um mês entre os últimos 36 e os próximos 12 meses.';end if;
 generated=private.issue_monthly_invoices(p_month);
 return jsonb_build_object('success',true,'count',generated);
end;$$;
revoke all on function public.generate_manual_invoices(text) from public,anon;
grant execute on function public.generate_manual_invoices(text) to authenticated;

create function private.run_monthly_billing() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare month_ref text:=to_char(now() at time zone 'America/Recife','YYYY-MM');generated integer;
begin
 generated=private.issue_monthly_invoices(month_ref);
 insert into private.monthly_billing_runs(reference_month,generated_count) values(month_ref,generated);
 return jsonb_build_object('success',true,'month',month_ref,'count',generated);
end;$$;
revoke all on function private.run_monthly_billing() from public,anon,authenticated,service_role;

-- pg_cron uses GMT in this project: 03:05 UTC = 00:05 Recife.
-- A daily reconciliation retries missing invoices if the first-day run was interrupted.
select cron.schedule('acadgol-monthly-billing','5 3 * * *','select private.run_monthly_billing();');
select private.run_monthly_billing();
