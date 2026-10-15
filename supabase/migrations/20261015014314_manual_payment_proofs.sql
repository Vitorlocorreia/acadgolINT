-- Private, immutable payment evidence. Actual file bytes are uploaded using the Storage API.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-proofs','payment-proofs',false,3145728,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
alter table public.invoice_payments add column proof_path text,add column proof_name text,add column proof_mime text,add column proof_size integer;
alter table public.invoice_payments add constraint payment_proof_complete check((proof_path is null and proof_name is null and proof_mime is null and proof_size is null) or(proof_path is not null and length(proof_path)<=400 and proof_name is not null and length(proof_name) between 1 and 180 and proof_mime is not null and proof_mime in('application/pdf','image/jpeg','image/png','image/webp') and proof_size is not null and proof_size between 1 and 3145728));
create unique index invoice_payment_proof_unique on public.invoice_payments(proof_path) where proof_path is not null;

create policy proof_anon_guard on storage.objects as restrictive for all to anon using(bucket_id<>'payment-proofs') with check(bucket_id<>'payment-proofs');
create policy proof_insert on storage.objects for insert to authenticated with check(bucket_id='payment-proofs');
create policy proof_insert_guard on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'payment-proofs' or(private.has_role(array['admin','secretaria','financeiro']) and (storage.foldername(name))[1]=(select auth.uid())::text and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9]{64}\.(pdf|jpg|png|webp)$' and exists(select 1 from public.invoices i where i.id::text=(storage.foldername(name))[2] and i.status in('pending','overdue'))));
create policy proof_read on storage.objects for select to authenticated using(bucket_id='payment-proofs');
create policy proof_read_guard on storage.objects as restrictive for select to authenticated using(bucket_id<>'payment-proofs' or(private.has_role(array['admin','secretaria','financeiro']) and((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.invoice_payments p where p.proof_path=name))));
create policy proof_update_guard on storage.objects as restrictive for update to authenticated using(bucket_id<>'payment-proofs') with check(bucket_id<>'payment-proofs');
create policy proof_delete_guard on storage.objects as restrictive for delete to authenticated using(bucket_id<>'payment-proofs');

create or replace function public.record_manual_payment(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_invoice public.invoices%rowtype;v_key uuid;v_payment public.invoice_payments%rowtype;v_method text;v_mode text;v_received numeric;v_fine numeric:=0;v_interest numeric:=0;v_discount numeric:=0;v_paid_at timestamptz;v_days integer;v_note text;v_reason text;v_proof_path text;v_proof_name text;v_proof_mime text;v_proof_size integer;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Recebimento não autorizado.'; end if;
 v_key=(p_payload->>'idempotencyKey')::uuid;
 if v_key is null then raise exception 'Identificador do recebimento obrigatório.'; end if;
 select * into v_invoice from public.invoices where id=(p_payload->>'invoiceId')::uuid for update;
 if not found then raise exception 'Cobrança não encontrada.'; end if;
 select * into v_payment from public.invoice_payments where idempotency_key=v_key;
 if found then
   if v_payment.invoice_id<>v_invoice.id or v_payment.actor_id<>auth.uid() then raise exception 'Identificador de recebimento inválido.'; end if;
   if nullif(p_payload->>'proofPath','') is not null and v_payment.proof_path is distinct from p_payload->>'proofPath' then raise exception 'Este recebimento já foi registrado com outro comprovante. Consulte o histórico.';end if;
   return jsonb_build_object('success',true,'paymentId',v_payment.id,'receivedAmount',v_payment.received_amount,'alreadyRecorded',true);
 end if;
 if v_invoice.status='paid' then raise exception 'Esta cobrança já foi recebida. Atualize a página.'; end if;
 if v_invoice.status='cancelled' then raise exception 'Cobrança cancelada.'; end if;
 v_method=p_payload->>'paymentMethod';
 if v_method not in ('dinheiro','pix','pix_whatsapp','cartao_debito','cartao_credito') or v_method is null then raise exception 'Forma de pagamento inválida.'; end if;
 v_paid_at=coalesce(nullif(p_payload->>'paidAt','')::timestamptz,now());
 if v_paid_at>now()+interval '5 minutes' or v_paid_at<coalesce(v_invoice.created_at,now())-interval '1 day' then raise exception 'Revise a data do recebimento.'; end if;
 v_days=greatest(0,(v_paid_at at time zone 'America/Recife')::date-v_invoice.due_date);
 v_mode=coalesce(p_payload->>'overdueOption','waive');
 v_note=nullif(trim(p_payload->>'notes'),'');v_reason=nullif(trim(p_payload->>'negotiationReason'),'');
 if length(coalesce(v_note,''))>2000 or length(coalesce(v_reason,''))>500 then raise exception 'Observação muito longa.'; end if;
 if v_mode='standard' then
   if v_days>0 then v_fine=round(v_invoice.amount*0.02,2);v_interest=round(v_invoice.amount*0.000333*v_days,2); end if;
   v_received=v_invoice.amount+v_fine+v_interest;
 elsif v_mode='waive' then v_received=v_invoice.amount;
 elsif v_mode='negotiated' then
   if length(coalesce(v_reason,''))<5 then raise exception 'Informe o motivo do acordo (pelo menos 5 caracteres).'; end if;
   v_received=round((p_payload->>'receivedAmount')::numeric,2);
   if v_received<v_invoice.amount then v_discount=v_invoice.amount-v_received; else v_fine=v_received-v_invoice.amount; end if;
 else raise exception 'Condição de recebimento inválida.'; end if;
 if v_received is null or v_received<=0 or v_received>1000000 then raise exception 'Valor de recebimento inválido.'; end if;
 if abs(v_received-round((p_payload->>'receivedAmount')::numeric,2))>0.01 then raise exception 'O valor foi atualizado. Revise a data e os encargos antes de confirmar.'; end if;
 v_proof_path=nullif(p_payload->>'proofPath','');v_proof_name=nullif(p_payload->>'proofName','');v_proof_mime=nullif(p_payload->>'proofMime','');v_proof_size=nullif(p_payload->>'proofSize','')::integer;
 if v_proof_path is not null then
  if v_proof_name is null or length(v_proof_name)>180 or v_proof_name ~ '[[:cntrl:]]' or v_proof_mime is null or v_proof_mime not in('application/pdf','image/jpeg','image/png','image/webp') or v_proof_size is null or v_proof_size not between 1 and 3145728 then raise exception 'Revise o arquivo do comprovante.';end if;
  if v_proof_path !~ ('^'||auth.uid()::text||'/'||v_invoice.id::text||'/'||v_key::text||'/[a-f0-9]{64}\.'||case v_proof_mime when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end||'$') then raise exception 'O comprovante não pertence a este recebimento.';end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='payment-proofs' and o.name=v_proof_path and (o.metadata->>'size')::bigint=v_proof_size and o.metadata->>'mimetype'=v_proof_mime) then raise exception 'O envio do comprovante não foi concluído. Tente novamente.';end if;
 elsif v_proof_name is not null or v_proof_mime is not null or v_proof_size is not null then raise exception 'Revise o comprovante selecionado.';
 end if;
 insert into public.invoice_payments(invoice_id,idempotency_key,principal_amount,received_amount,fine_amount,interest_amount,discount_amount,payment_method,actor_id,paid_at,notes,negotiation_reason,proof_path,proof_name,proof_mime,proof_size)
 values(v_invoice.id,v_key,v_invoice.amount,v_received,v_fine,v_interest,v_discount,v_method,auth.uid(),v_paid_at,v_note,v_reason,v_proof_path,v_proof_name,v_proof_mime,v_proof_size) returning * into v_payment;
 update public.invoices set status='paid',paid_amount=v_received,paid_at=v_paid_at,payment_method=v_method,received_by=auth.uid(),updated_at=now() where id=v_invoice.id;
 return jsonb_build_object('success',true,'paymentId',v_payment.id,'receivedAmount',v_received);
end; $$;

revoke all on function public.record_manual_payment(jsonb) from public,anon;
grant execute on function public.record_manual_payment(jsonb) to authenticated;
create function private.invoice_proof_count(p_invoice uuid) returns bigint language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then return 0;end if;
 return(select count(*) from public.invoice_payments where invoice_id=p_invoice and proof_path is not null);
end;$$;
revoke all on function private.invoice_proof_count(uuid) from public,anon;
grant execute on function private.invoice_proof_count(uuid) to authenticated;
create or replace view public.finance_invoices with(security_invoker=true) as select i.*,private.billing_student(i.student_id) as student,private.invoice_receipt(i.id) as receipt,private.invoice_proof_count(i.id) as proof_count from public.invoices i;
revoke all on public.finance_invoices from public,anon;
grant select on public.finance_invoices to authenticated;
