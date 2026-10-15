-- Preserve legacy invoices; new enrollments start monthly billing in the following month.
alter table public.enrollments add column first_billing_month date,add column registration_fee numeric(12,2) not null default 0 check(registration_fee>=0);
update public.enrollments set first_billing_month=date_trunc('month',start_date)::date;
alter table public.enrollments alter column first_billing_month set not null,alter column first_billing_month set default date_trunc('month',now() at time zone 'America/Recife')::date;
alter table public.enrollments add constraint enrollment_first_billing_month check(extract(day from first_billing_month)=1);
alter table public.invoices add column charge_type text not null default 'monthly' check(charge_type in('monthly','registration'));
drop index public.invoices_student_month_unique;
create unique index invoices_student_month_unique on public.invoices(student_id,reference_month,charge_type) where status is distinct from 'cancelled';
alter table public.invoice_payments add column payment_parts jsonb not null default '[]'::jsonb check(jsonb_typeof(payment_parts)='array' and jsonb_array_length(payment_parts)<=4);
create or replace function public.enroll_student(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s uuid;e uuid;t public.trial_classes%rowtype; c public.classes%rowtype; p public.plans%rowtype; g jsonb; gs jsonb;request uuid;birthday date;day integer;fee numeric;reg_fee numeric;today date:=(now() at time zone 'America/Recife')::date;firstday date;stock uuid;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Matrícula não autorizada.';end if;
 request=(p_payload->>'request_id')::uuid;if request is null then raise exception 'Atualize o formulário de matrícula.';end if;
 perform pg_advisory_xact_lock(hashtext(request::text));
 select id into s from public.students where enrollment_request_id=request;
 if found then return jsonb_build_object('studentId',s,'alreadyRecorded',true);end if;
 if coalesce(p_payload->>'photo_url','') !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' then raise exception 'Anexe uma foto válida do atleta para concluir a matrícula.';end if;
 if length(trim(coalesce(p_payload->>'name','')))<3 or length(p_payload->>'name')>120 then raise exception 'Informe o nome completo do atleta.';end if;
 birthday=(p_payload->>'birth_date')::date;
 if birthday is null or birthday>today or birthday<today-interval '100 years' then raise exception 'Revise a data de nascimento.';end if;
 day=(p_payload->>'due_day')::integer;fee=(p_payload->>'monthly_fee')::numeric;
 if day is null or day<1 or day>31 or fee is null or fee<0 or fee>100000 then raise exception 'Revise mensalidade e vencimento.';end if;
 gs=(p_payload->>'guardians_json')::jsonb;
 if jsonb_typeof(gs) is distinct from 'array' or jsonb_array_length(gs)<1 or jsonb_array_length(gs)>6 then raise exception 'Informe ao menos um responsável.';end if;
 for g in select value from jsonb_array_elements(gs) loop
  if length(trim(coalesce(g->>'name','')))<3 or length(regexp_replace(coalesce(g->>'phone',''),'[^0-9]','','g')) not between 10 and 13 then raise exception 'Revise nome e telefone dos responsáveis.';end if;
 end loop;
 if length(coalesce(p_payload->>'photo_url',''))>1800000 or length(coalesce(p_payload->>'signature_url',''))>500000 then raise exception 'Imagem muito grande.';end if;
 select * into c from public.classes where id=(p_payload->>'class_id')::uuid and is_active for update;
 if not found then raise exception 'Escolha uma turma ativa.';end if;
 select * into p from public.plans where id=(p_payload->>'plan_id')::uuid and is_active;
 if not found then raise exception 'Escolha um plano ativo.';end if;
 reg_fee=coalesce(nullif(p_payload->>'registration_fee','')::numeric,p.registration_fee,0);
 if reg_fee<0 or reg_fee>100000 or reg_fee<>round(reg_fee,2) or fee<>round(fee,2) then raise exception 'Revise os valores acordados de matrícula e mensalidade.';end if;
 if nullif(p_payload->>'trial_id','') is not null then
  select * into t from public.trial_classes where id=(p_payload->>'trial_id')::uuid for update;
  if not found or t.status='enrolled' then raise exception 'Aula experimental já matriculada ou indisponível.';end if;
  s=(t.feedback::jsonb->>'student_id')::uuid;
  perform 1 from public.students where id=s and status='trial' for update;
  if not found then raise exception 'Atleta experimental indisponível.';end if;
 end if;
 if (select count(*) from public.enrollments where class_id=c.id and status='active' and student_id is distinct from s)>=coalesce(c.max_students,20) then raise exception 'Esta turma está sem vagas.';end if;
 if s is null then
  insert into public.students(name,birth_date,cpf,rg,photo_url,preferred_position,dominant_foot,uniform_size,signature_url,status,enrollment_request_id)
  values(trim(p_payload->>'name'),birthday,nullif(p_payload->>'cpf',''),nullif(p_payload->>'rg',''),nullif(p_payload->>'photo_url',''),p_payload->>'preferred_position',p_payload->>'dominant_foot',p_payload->>'uniform_size',nullif(p_payload->>'signature_url',''),'active',request) returning id into s;
 else
  update public.students set name=trim(p_payload->>'name'),birth_date=birthday,birth_date_estimated=false,cpf=nullif(p_payload->>'cpf',''),rg=nullif(p_payload->>'rg',''),photo_url=coalesce(nullif(p_payload->>'photo_url',''),photo_url),preferred_position=p_payload->>'preferred_position',dominant_foot=p_payload->>'dominant_foot',uniform_size=p_payload->>'uniform_size',signature_url=nullif(p_payload->>'signature_url',''),status='active',enrollment_request_id=request,updated_at=now() where id=s;
  delete from public.guardians where student_id=s;
  delete from public.enrollments where student_id=s and status='trial';
  update public.trial_classes set status='enrolled',updated_at=now() where id=t.id;
 end if;
 for g in select value from jsonb_array_elements(gs) loop
  insert into public.guardians(student_id,name,relationship,cpf,phone,email,address,city,state,zip_code,receives_notifications) values(s,trim(g->>'name'),coalesce(nullif(g->>'relationship',''),'Responsável'),nullif(g->>'cpf',''),g->>'phone',nullif(g->>'email',''),nullif(p_payload->>'address',''),coalesce(nullif(p_payload->>'city',''),'Recife'),coalesce(nullif(p_payload->>'state',''),'PE'),nullif(p_payload->>'zip_code',''),coalesce((g->>'receives_notifications')::boolean,true));
 end loop;
 insert into public.medical_records(student_id,blood_type,allergies,continuous_medications,health_insurance,emergency_contact_name,emergency_contact_phone,medical_notes,has_medical_clearance,image_use_authorized,terms_accepted_at)
 values(s,nullif(p_payload->>'blood_type',''),nullif(p_payload->>'allergies',''),nullif(p_payload->>'continuous_medications',''),nullif(p_payload->>'health_insurance',''),nullif(p_payload->>'emergency_contact_name',''),nullif(p_payload->>'emergency_contact_phone',''),nullif(p_payload->>'medical_notes',''),coalesce((p_payload->>'has_medical_clearance')::boolean,false),coalesce((p_payload->>'image_use_authorized')::boolean,false),case when nullif(p_payload->>'signature_url','') is not null then now() else null end);
 insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,first_billing_month,registration_fee) values(s,c.id,p.id,today,day,fee,'active',(date_trunc('month',today)+interval '1 month')::date,reg_fee) returning id into e;
 firstday=(date_trunc('month',today)+interval '1 month')::date;
 insert into public.invoices(enrollment_id,student_id,reference_month,due_date,amount,status,pix_code,charge_type) values(e,s,to_char(firstday,'YYYY-MM'),firstday+least(day,extract(day from(firstday+interval '1 month'-interval '1 day'))::integer)-1,fee,'pending',null,'monthly');
 if reg_fee>0 then insert into public.invoices(enrollment_id,student_id,reference_month,due_date,amount,status,pix_code,charge_type) values(e,s,to_char(today,'YYYY-MM'),today,reg_fee,'pending',null,'registration');end if;
 if p.includes_uniform then
  select id into stock from public.uniform_inventory where item_type='kit_complete' and size=p_payload->>'uniform_size' for update;
  if stock is null then raise exception 'Kit deste tamanho não cadastrado no estoque.';end if;
  update public.uniform_inventory set quantity=quantity-1,updated_at=now() where id=stock and quantity>0;
  if not found then raise exception 'Kit sem estoque. Reponha antes de concluir este plano.';end if;
 end if;
 return jsonb_build_object('success',true,'studentId',s);
end; $$;


revoke all on function public.enroll_student(jsonb) from public,anon;
grant execute on function public.enroll_student(jsonb) to authenticated;
create or replace function private.issue_monthly_invoices(p_month text) returns integer
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
 where e.status='active' and s.status='active' and e.start_date<=last_day and e.first_billing_month<=first_day
  -- Preserve paid invoices, prior agreements and intentional cancellations.
  and not exists(select 1 from public.invoices i where i.student_id=e.student_id and i.reference_month=p_month and i.charge_type='monthly')
 order by e.student_id,e.created_at desc nulls last,e.id
 on conflict(student_id,reference_month,charge_type) where status is distinct from 'cancelled' do nothing;
 get diagnostics generated=row_count;
 return generated;
end;$$;
revoke all on function private.issue_monthly_invoices(text) from public,anon,authenticated,service_role;

create or replace function public.record_manual_payment(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_invoice public.invoices%rowtype;v_key uuid;v_payment public.invoice_payments%rowtype;v_method text;v_mode text;v_received numeric;v_fine numeric:=0;v_interest numeric:=0;v_discount numeric:=0;v_paid_at timestamptz;v_days integer;v_note text;v_reason text;v_proof_path text;v_proof_name text;v_proof_mime text;v_proof_size integer;v_parts jsonb;v_part jsonb;v_sum numeric:=0;v_part_amount numeric;v_part_method text;v_methods text[]:=array[]::text[];v_discount_marked boolean;
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
 if v_method not in ('dinheiro','pix','pix_whatsapp','cartao_debito','cartao_credito','misto') or v_method is null then raise exception 'Forma de pagamento inválida.'; end if;
 v_paid_at=coalesce(nullif(p_payload->>'paidAt','')::timestamptz,now());
 if v_paid_at>now()+interval '5 minutes' or v_paid_at<coalesce(v_invoice.created_at,now())-interval '1 day' then raise exception 'Revise a data do recebimento.'; end if;
 v_days=greatest(0,(v_paid_at at time zone 'America/Recife')::date-v_invoice.due_date);
 v_mode=coalesce(p_payload->>'overdueOption','waive');
 v_note=nullif(trim(p_payload->>'notes'),'');v_reason=nullif(trim(p_payload->>'negotiationReason'),'');
 if length(coalesce(v_note,''))>2000 or length(coalesce(v_reason,''))>500 then raise exception 'Observação muito longa.'; end if;
 v_discount_marked=coalesce((p_payload->>'hasDiscount')::boolean,false);
 if v_discount_marked then
   v_received=(p_payload->>'receivedAmount')::numeric;
   if v_received is null or v_received<=0 or v_received>=v_invoice.amount or v_received<>round(v_received,2) then raise exception 'O valor com desconto deve ser positivo e menor que o valor acordado.';end if;
   v_discount=v_invoice.amount-v_received;
   v_reason=nullif(trim(coalesce(p_payload->>'discountReason',p_payload->>'negotiationReason')),'');
   if length(coalesce(v_reason,''))>500 then raise exception 'Justificativa muito longa.';end if;
 elsif v_mode='standard' then
   if v_days>0 then v_fine=round(v_invoice.amount*0.02,2);v_interest=round(v_invoice.amount*0.000333*v_days,2); end if;
   v_received=v_invoice.amount+v_fine+v_interest;
 elsif v_mode='waive' then v_received=v_invoice.amount;
 elsif v_mode='negotiated' then

   v_received=round((p_payload->>'receivedAmount')::numeric,2);
   if v_received<v_invoice.amount then v_discount=v_invoice.amount-v_received; else v_fine=v_received-v_invoice.amount; end if;
 else raise exception 'Condição de recebimento inválida.'; end if;
 if v_received is null or v_received<=0 or v_received>1000000 then raise exception 'Valor de recebimento inválido.'; end if;
 if v_received is distinct from (p_payload->>'receivedAmount')::numeric then raise exception 'O valor foi atualizado. Revise a data e os encargos antes de confirmar.'; end if;
 v_parts=coalesce(p_payload->'paymentParts',jsonb_build_array(jsonb_build_object('method',v_method,'amount',v_received)));
 if jsonb_typeof(v_parts) is distinct from 'array' then raise exception 'Revise as formas de pagamento.';end if;
 if jsonb_array_length(v_parts) not between 1 and 4 then raise exception 'Informe de uma a quatro formas de pagamento.';end if;
 for v_part in select value from jsonb_array_elements(v_parts) loop
  v_part_method=v_part->>'method';
  if jsonb_typeof(v_part) is distinct from 'object' or v_part_method is null or v_part_method not in('dinheiro','pix','pix_whatsapp','cartao_debito','cartao_credito') or jsonb_typeof(v_part->'amount') is distinct from 'number' then raise exception 'Forma de pagamento inválida.';end if;
  v_part_amount=(v_part->>'amount')::numeric;
  if v_part_amount<=0 or v_part_amount>1000000 or v_part_amount<>round(v_part_amount,2) then raise exception 'Informe valores positivos com até duas casas decimais.';end if;
  if v_part_method=any(v_methods) or(v_part_method='pix' and 'pix_whatsapp'=any(v_methods)) or(v_part_method='pix_whatsapp' and 'pix'=any(v_methods)) then raise exception 'Use cada forma de pagamento uma única vez.';end if;
  v_methods=array_append(v_methods,v_part_method);v_sum=v_sum+v_part_amount;
 end loop;
 if v_sum<>v_received then raise exception 'A soma das formas de pagamento deve ser igual ao valor recebido.';end if;
 v_method=case when jsonb_array_length(v_parts)>1 then 'misto' else v_parts->0->>'method' end;
 v_proof_path=nullif(p_payload->>'proofPath','');v_proof_name=nullif(p_payload->>'proofName','');v_proof_mime=nullif(p_payload->>'proofMime','');v_proof_size=nullif(p_payload->>'proofSize','')::integer;
 if v_proof_path is not null then
  if v_proof_name is null or length(v_proof_name)>180 or v_proof_name ~ '[[:cntrl:]]' or v_proof_mime is null or v_proof_mime not in('application/pdf','image/jpeg','image/png','image/webp') or v_proof_size is null or v_proof_size not between 1 and 3145728 then raise exception 'Revise o arquivo do comprovante.';end if;
  if v_proof_path !~ ('^'||auth.uid()::text||'/'||v_invoice.id::text||'/'||v_key::text||'/[a-f0-9]{64}\.'||case v_proof_mime when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end||'$') then raise exception 'O comprovante não pertence a este recebimento.';end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='payment-proofs' and o.name=v_proof_path and (o.metadata->>'size')::bigint=v_proof_size and o.metadata->>'mimetype'=v_proof_mime) then raise exception 'O envio do comprovante não foi concluído. Tente novamente.';end if;
 elsif v_proof_name is not null or v_proof_mime is not null or v_proof_size is not null then raise exception 'Revise o comprovante selecionado.';
 end if;
 insert into public.invoice_payments(invoice_id,idempotency_key,principal_amount,received_amount,fine_amount,interest_amount,discount_amount,payment_method,actor_id,paid_at,notes,negotiation_reason,proof_path,proof_name,proof_mime,proof_size,payment_parts)
 values(v_invoice.id,v_key,v_invoice.amount,v_received,v_fine,v_interest,v_discount,v_method,auth.uid(),v_paid_at,v_note,v_reason,v_proof_path,v_proof_name,v_proof_mime,v_proof_size,v_parts) returning * into v_payment;
 update public.invoices set status='paid',paid_amount=v_received,paid_at=v_paid_at,payment_method=v_method,received_by=auth.uid(),updated_at=now() where id=v_invoice.id;
 return jsonb_build_object('success',true,'paymentId',v_payment.id,'receivedAmount',v_received);
end; $$;

revoke all on function public.record_manual_payment(jsonb) from public,anon;
grant execute on function public.record_manual_payment(jsonb) to authenticated;

-- Append the new view field without moving existing projection columns.
create or replace view public.finance_invoices with(security_invoker=true) as
 select i.id,i.enrollment_id,i.student_id,i.reference_month,i.due_date,i.amount,i.status,i.payment_method,i.paid_at,i.pix_code,i.notes,i.created_at,i.updated_at,i.paid_amount,i.received_by,private.billing_student(i.student_id) as student,private.invoice_receipt(i.id) as receipt,private.invoice_proof_count(i.id) as proof_count,i.charge_type from public.invoices i;
revoke all on public.finance_invoices from public,anon;
grant select on public.finance_invoices to authenticated;
