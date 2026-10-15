create function private.invoice_receipt(p_invoice uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then return null;end if;
 return(select to_jsonb(p)||jsonb_build_object('actor_name',coalesce(s.full_name,'Registro anterior; autor não verificado')) from public.invoice_payments p left join public.staff_profiles s on s.id=p.actor_id where p.invoice_id=p_invoice and not exists(select 1 from public.payment_reversals r where r.payment_id=p.id) order by p.recorded_at desc limit 1);
end;$$;
revoke all on function private.invoice_receipt(uuid) from public,anon;
grant execute on function private.invoice_receipt(uuid) to authenticated;
create or replace view public.finance_invoices with(security_invoker=true) as select i.*,private.billing_student(i.student_id) as student,private.invoice_receipt(i.id) as receipt from public.invoices i;
revoke all on public.finance_invoices from public,anon;
grant select on public.finance_invoices to authenticated;

create function public.remove_student_guardian(p_guardian uuid,p_student uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Alteração não autorizada.';end if;
 perform 1 from public.students where id=p_student for update;if not found then raise exception 'Atleta não encontrado.';end if;
 if(select count(*) from public.guardians where student_id=p_student)<=1 then raise exception 'Mantenha ao menos um responsável no cadastro.';end if;
 delete from public.guardians where id=p_guardian and student_id=p_student;
 return found;
end;$$;
revoke all on function public.remove_student_guardian(uuid,uuid) from public,anon;
grant execute on function public.remove_student_guardian(uuid,uuid) to authenticated;
revoke delete on public.guardians from authenticated;
