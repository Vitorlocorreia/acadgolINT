-- Synthetic financial operations and profile edits are fully rolled back.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$ begin if auth.uid() is null then raise exception 'Current secretary session required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
create temporary table history_fixture(student uuid default gen_random_uuid(),invoice uuid default gen_random_uuid(),legacy_invoice uuid default gen_random_uuid(),key uuid default gen_random_uuid(),claims text,original_name text,original_username text,path text);
insert into history_fixture(claims,original_name,original_username) select current_setting('request.jwt.claims'),full_name,username from public.staff_profiles where id=auth.uid();
update history_fixture set path=auth.uid()::text||'/'||invoice::text||'/'||key::text||'/'||repeat('a',64)||'.pdf';
grant select on history_fixture to authenticated;
insert into public.students(id,name,birth_date,status) select student,'Verificação do histórico financeiro','2017-01-01','active' from history_fixture;
insert into public.invoices(id,student_id,reference_month,due_date,amount,status) select invoice,student,to_char(current_date,'YYYY-MM'),current_date,120,'pending' from history_fixture;
-- System-created/imported rows must not be assigned a human operator.
select set_config('request.jwt.claims','{}',true);
insert into public.invoices(id,student_id,reference_month,due_date,amount,status,paid_amount,charge_type) select legacy_invoice,student,to_char(current_date,'YYYY-MM'),current_date,50,'paid',50,'registration' from history_fixture;
insert into public.invoice_payments(invoice_id,idempotency_key,principal_amount,received_amount,payment_method,paid_at,legacy_import) select legacy_invoice,gen_random_uuid(),50,50,'legacy',now(),true from history_fixture;
select set_config('request.jwt.claims',(select claims from history_fixture),true);
set local role authenticated;
insert into storage.objects(bucket_id,name,metadata) select 'payment-proofs',path,'{"size":24,"mimetype":"application/pdf"}'::jsonb from history_fixture;
do $$ declare f history_fixture%rowtype;h jsonb;payload jsonb;begin
 select * into f from history_fixture;
 payload=jsonb_build_object('invoiceId',f.invoice,'idempotencyKey',f.key,'paymentMethod','misto','receivedAmount',100,'hasDiscount',true,'discountReason','','overdueOption','waive','paidAt',now()-interval '1 hour','paymentParts',jsonb_build_array(jsonb_build_object('method','dinheiro','amount',80),jsonb_build_object('method','pix','amount',20)),'proofPath',f.path,'proofName','Recibo.pdf','proofMime','application/pdf','proofSize',24,'actor_snapshot',jsonb_build_object('name','Forged operator'));
 perform public.record_manual_payment(payload);
 perform public.record_manual_payment(payload);
 h=public.invoice_financial_history(f.invoice);
 if(h->>'total')::integer<>2 or h->'events'->0->>'type'<>'created' or h->'events'->1->>'type'<>'payment' then raise exception 'Missing or duplicate creation/payment event';end if;
 if h->'events'->1->'actor'->>'name'<>f.original_name or h->'events'->1->'actor'->>'username'<>f.original_username or h->'events'->1->'actor'->>'role'<>'secretaria' or h->'events'->1->'actor'->>'source'<>'snapshot' then raise exception 'Payment identity not captured from verified profile';end if;
 if h->'events'->0->'actor'->>'source'<>'snapshot' then raise exception 'Creation identity not captured';end if;
 if(h->'events'->1->>'discountAmount')::numeric<>20 or jsonb_array_length(h->'events'->1->'parts')<>2 then raise exception 'Discount or split missing';end if;
 if(h->'events'->1->>'paidAt')::timestamptz>=(h->'events'->1->>'recordedAt')::timestamptz then raise exception 'Effective payment time confused with system recording';end if;
 if position(f.path in h::text)>0 or h::text like '%proof_path%' or h::text like '%"email"%' then raise exception 'Private storage or account metadata leaked';end if;
 if exists(select 1 from public.audit_events) then raise exception 'Financial projection broadened raw audit access';end if;
 h=public.invoice_financial_history(f.legacy_invoice);
 if h->'events'->0->'actor'->>'source'<>'system' or jsonb_typeof(h->'events'->0->'actor')<>'object' then raise exception 'System actor is malformed or attributed to a user';end if;
 if h->'events'->1->'actor'->>'source'<>'unverified' or h->'events'->1->>'legacy'<>'true' then raise exception 'Imported operator invented';end if;
 begin perform public.invoice_financial_history(f.invoice,-1,30);raise exception 'Invalid pagination accepted';exception when raise_exception then if sqlerrm<>'Página de histórico inválida.' then raise;end if;end;
end;$$;
reset role;
-- Change the account's current identity and role; the old ledger must stay unchanged.
update public.staff_profiles set full_name='Operador após alteração',username='auditoria.verificacao',role='financeiro' where id=auth.uid();
set local role authenticated;
do $$ declare f history_fixture%rowtype;h jsonb;page jsonb;begin
 select * into f from history_fixture;
 perform public.reverse_manual_payment(f.invoice,'Recebimento no atleta errado, verificação');
 perform public.record_manual_payment(jsonb_build_object('invoiceId',f.invoice,'idempotencyKey',gen_random_uuid(),'paymentMethod','pix','receivedAmount',120,'overdueOption','waive'));
 h=public.invoice_financial_history(f.invoice);
 if(h->>'total')::integer<>4 then raise exception 'Receipt/reversal/new receipt history incomplete';end if;
 if h->'events'->1->>'type'<>'payment' or h->'events'->2->>'type'<>'reversal' or h->'events'->3->>'type'<>'payment' then raise exception 'Events out of recording order';end if;
 if h->'events'->1->'actor'->>'name'<>f.original_name or h->'events'->1->'actor'->>'role'<>'secretaria' then raise exception 'Historical identity changed with current account';end if;
 if h->'events'->2->'actor'->>'name'<>'Operador após alteração' or h->'events'->2->'actor'->>'role'<>'financeiro' then raise exception 'Reversal operator missing';end if;
 if h->'events'->1->>'reversed'<>'true' or h->'events'->1->'proof'->>'name'<>'Recibo.pdf' then raise exception 'Reversal lost original proof/history';end if;
 if (h->'events'->2->>'receivedAmount')::numeric<>100 or(h->'events'->3->>'receivedAmount')::numeric<>120 then raise exception 'Wrong amounts across financial cycles';end if;
 page=public.invoice_financial_history(f.invoice,0,2);
 if jsonb_array_length(page->'events')<>2 or(page->>'nextOffset')::integer<>2 then raise exception 'First history page incorrect';end if;
 page=public.invoice_financial_history(f.invoice,2,2);
 if jsonb_array_length(page->'events')<>2 or page->>'nextOffset' is not null then raise exception 'Last history page incorrect';end if;
 if (select receipt->>'actor_name' from public.finance_invoices where id=f.invoice)<>'Operador após alteração' then raise exception 'Active receipt summary lost operator snapshot';end if;
 page=public.financial_audit_log(p_student=>'Verificação do histórico financeiro');
 if(page->>'total')::integer<>6 then raise exception 'Central audit did not combine creations, payments and reversal';end if;
 if position(f.path in page::text)>0 or page::text like '%proof_path%' then raise exception 'Audit leaked private storage path';end if;
 page=public.financial_audit_log(p_student=>'Verificação do histórico financeiro',p_actor=>f.original_username);
 if(page->>'total')::integer<>2 then raise exception 'Audit actor search lost historical identity';end if;
 page=public.financial_audit_log(p_student=>'Verificação do histórico financeiro',p_action=>'discount');
 if(page->>'total')::integer<>1 or(page->'entries'->0->>'discount_amount')::numeric<>20 or page->'entries'->0->>'proof_name'<>'Recibo.pdf' then raise exception 'Audit discount/proof filter incorrect';end if;
 begin perform 1 from private.financial_audit_entries;raise exception 'Raw audit projection exposed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
do $$ begin
 begin update public.invoice_payments set actor_snapshot='{}' where invoice_id=(select invoice from history_fixture);raise exception 'Immutable snapshot changed';exception when raise_exception then if sqlerrm not like 'Histórico permanente%' then raise;end if;end;
 begin delete from public.payment_reversals where payment_id in(select id from public.invoice_payments where invoice_id=(select invoice from history_fixture));raise exception 'Reversal history deleted';exception when raise_exception then if sqlerrm not like 'Histórico permanente%' then raise;end if;end;
end;$$;
update public.staff_profiles set role='admin' where id=auth.uid();
set local role authenticated;
do $$ begin perform public.invoice_financial_history((select invoice from history_fixture));end;$$;
do $$ begin perform public.financial_audit_log(p_student=>'Verificação do histórico financeiro');end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$ begin
 begin perform public.invoice_financial_history((select invoice from history_fixture));raise exception 'Trainer can read financial history';exception when raise_exception then if sqlerrm<>'Seu perfil não pode consultar o histórico financeiro.' then raise;end if;end;
 begin perform public.financial_audit_log();raise exception 'Trainer can read financial audit';exception when raise_exception then if sqlerrm<>'Seu perfil não pode consultar a auditoria financeira.' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
do $$ begin
 begin perform public.invoice_financial_history(gen_random_uuid());raise exception 'Invalid session can read financial history';exception when raise_exception then if sqlerrm<>'Seu perfil não pode consultar o histórico financeiro.' then raise;end if;end;
 begin perform public.financial_audit_log();raise exception 'Invalid session can read audit';exception when raise_exception then if sqlerrm<>'Seu perfil não pode consultar a auditoria financeira.' then raise;end if;end;
end;$$;
reset role;
set local role anon;
do $$ begin
 begin perform public.invoice_financial_history(gen_random_uuid());raise exception 'Anonymous history access allowed';exception when insufficient_privilege then null;end;
 begin perform public.financial_audit_log();raise exception 'Anonymous audit access allowed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: creation, verified identity snapshots, effective/recorded dates, discount, split, preserved proof, reversal/new receipt, pagination, all financial roles, blocked coaching/anonymous access, immutable history and unidentified imports. All changes rolled back.' as verification;
