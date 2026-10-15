create or replace function public.reverse_manual_payment(p_invoice uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_invoice public.invoices%rowtype;v_payment uuid;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Seu perfil não pode estornar recebimentos.'; end if;
 if length(trim(coalesce(p_reason,'')))<5 or length(p_reason)>500 then raise exception 'Informe um motivo de 5 a 500 caracteres.'; end if;
 select * into v_invoice from public.invoices where id=p_invoice for update;
 if not found then raise exception 'Cobrança não encontrada.'; end if;
 if v_invoice.status is distinct from 'paid' then
   if exists(select 1 from public.payment_reversals r join public.invoice_payments p on p.id=r.payment_id where p.invoice_id=p_invoice) then return jsonb_build_object('success',true,'alreadyReversed',true); end if;
   raise exception 'Esta cobrança não possui recebimento para estornar.';
 end if;
 select p.id into v_payment from public.invoice_payments p where p.invoice_id=p_invoice and not exists(select 1 from public.payment_reversals r where r.payment_id=p.id) order by p.recorded_at desc limit 1;
 if v_payment is null then raise exception 'Recebimento anterior precisa de conferência pelo administrador.'; end if;
 insert into public.payment_reversals(payment_id,actor_id,reason) values(v_payment,auth.uid(),trim(p_reason));
 update public.invoices set status='pending',paid_amount=null,paid_at=null,payment_method=null,received_by=null,updated_at=now() where id=p_invoice;
 return jsonb_build_object('success',true);
end; $$;

-- The secretary sees coach access records, but never edits roles directly in the database.
drop policy staff_read_self on public.staff_profiles;
create policy staff_read_self on public.staff_profiles for select to authenticated using(id=(select auth.uid()) or private.has_role(array['admin']) or (private.staff_role()='secretaria' and role='treinador'));

-- Called only from the authenticated staff Edge Function after creating the Auth identity.
-- Coach and access profile are inserted in one transaction; a failure leaves neither row behind.
create function public.create_coach_access_profile(p_staff jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare c uuid;
begin
 if not exists(select 1 from public.staff_profiles where id=(p_staff->>'created_by')::uuid and active and not must_change_password and role in('admin','secretaria')) then raise exception 'Criação de treinador não autorizada.';end if;
 insert into public.coaches(name,is_active) values(trim(p_staff->>'full_name'),true) returning id into c;
 insert into public.staff_profiles(id,full_name,username,email,role,coach_id,active,must_change_password,created_by)
 values((p_staff->>'id')::uuid,trim(p_staff->>'full_name'),p_staff->>'username',p_staff->>'email','treinador',c,true,true,(p_staff->>'created_by')::uuid);
 return c;
end;$$;
revoke all on function public.create_coach_access_profile(jsonb) from public,anon,authenticated;
grant execute on function public.create_coach_access_profile(jsonb) to service_role;
revoke all on function public.reverse_manual_payment(uuid,text) from public,anon;
grant execute on function public.reverse_manual_payment(uuid,text) to authenticated;
