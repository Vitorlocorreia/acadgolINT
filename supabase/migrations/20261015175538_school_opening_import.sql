-- Imported students retain their agreements while real classes/plans are completed.
alter table public.enrollments add column import_source jsonb;
alter table public.enrollments alter column class_id drop not null;
alter table public.enrollments alter column plan_id drop not null;
alter table public.enrollments add constraint enrollment_class_plan_or_import check (
 (class_id is not null and plan_id is not null) or
 (import_source is not null and jsonb_typeof(import_source)='object' and import_source ? 'file_sha256' and import_source ? 'row')
);

alter table public.invoices add column settled_before_import boolean not null default false;
alter table public.invoices add constraint imported_settlement_without_receipt check (
 not settled_before_import or (status='paid' and paid_at is null and payment_method is null and received_by is null)
);

create or replace view public.finance_invoices with(security_invoker=true) as
 select i.id,i.enrollment_id,i.student_id,i.reference_month,i.due_date,i.amount,i.status,i.payment_method,i.paid_at,i.pix_code,i.notes,i.created_at,i.updated_at,i.paid_amount,i.received_by,private.billing_student(i.student_id) as student,private.invoice_receipt(i.id) as receipt,private.invoice_proof_count(i.id) as proof_count,i.charge_type,i.settled_before_import from public.invoices i;
revoke all on public.finance_invoices from public,anon;
grant select on public.finance_invoices to authenticated;

create function public.complete_imported_enrollment(p_enrollment uuid,p_class uuid,p_plan uuid,p_fee numeric,p_due_day integer)
returns void language plpgsql security definer set search_path='' as $$
declare e public.enrollments%rowtype;c public.classes%rowtype;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Atualização de matrícula não autorizada.';end if;
 if p_fee is null or p_fee<0 or p_fee>100000 or p_fee<>round(p_fee,2) or p_due_day is null or p_due_day not between 1 and 31 then raise exception 'Revise o valor e o vencimento.';end if;
 select * into e from public.enrollments where id=p_enrollment and import_source is not null for update;
 if not found then raise exception 'Matrícula importada não encontrada.';end if;
 select * into c from public.classes where id=p_class and is_active for update;
 if not found then raise exception 'Escolha uma turma ativa.';end if;
 if (select count(*) from public.enrollments where class_id=c.id and status='active' and id<>e.id)>=coalesce(c.max_students,20) then raise exception 'Esta turma está sem vagas.';end if;
 if p_plan is not null and not exists(select 1 from public.plans where id=p_plan and is_active) then raise exception 'Escolha um plano ativo.';end if;
 update public.enrollments set class_id=c.id,plan_id=p_plan,monthly_fee=p_fee,due_day=p_due_day,updated_at=now(),import_source=import_source||jsonb_build_object('reviewed_at',now(),'reviewed_by',auth.uid()) where id=e.id;
end;$$;
revoke all on function public.complete_imported_enrollment(uuid,uuid,uuid,numeric,integer) from public,anon;
grant execute on function public.complete_imported_enrollment(uuid,uuid,uuid,numeric,integer) to authenticated;

comment on column public.invoices.settled_before_import is 'Quitação declarada na planilha na implantação; não é uma entrada de caixa nem um recebimento registrado no sistema.';
comment on column public.enrollments.import_source is 'Origem e pendências da importação; a criação comum de matrículas continua exigindo turma, plano e foto.';
