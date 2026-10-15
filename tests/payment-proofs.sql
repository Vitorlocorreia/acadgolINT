-- Transactional verification only: synthetic object metadata, no real uploads or persistent fixtures.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$ begin if auth.uid() is null then raise exception 'A current secretary session is required.';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
create temporary table proof_verification(student uuid,invoice uuid,key uuid,path text,unlinked text);
insert into proof_verification(student,invoice,key) values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
update proof_verification set path=auth.uid()::text||'/'||invoice::text||'/'||key::text||'/'||repeat('a',64)||'.pdf',unlinked=auth.uid()::text||'/'||invoice::text||'/'||gen_random_uuid()::text||'/'||repeat('b',64)||'.pdf';
grant select on proof_verification to authenticated;
insert into public.students(id,name,birth_date,status) select student,'Verificação de comprovante',(current_date-interval '9 years')::date,'active' from proof_verification;
insert into public.invoices(id,student_id,reference_month,due_date,amount,status) select invoice,student,to_char(current_date,'YYYY-MM'),current_date,100,'pending' from proof_verification;
set local role authenticated;
insert into storage.objects(bucket_id,name,metadata) select 'payment-proofs',path,'{"size":24,"mimetype":"application/pdf"}'::jsonb from proof_verification;
insert into storage.objects(bucket_id,name,metadata) select 'payment-proofs',unlinked,'{"size":24,"mimetype":"application/pdf"}'::jsonb from proof_verification;
do $$ declare v proof_verification%rowtype;r jsonb;payload jsonb;affected integer;begin
 select * into v from proof_verification;
 payload=jsonb_build_object('invoiceId',v.invoice,'idempotencyKey',v.key,'paymentMethod','pix','receivedAmount',100,'overdueOption','waive','proofPath',v.path,'proofName','Recibo.pdf','proofMime','application/pdf','proofSize',24);
 begin perform public.record_manual_payment(payload||jsonb_build_object('proofPath',replace(v.path,auth.uid()::text,gen_random_uuid()::text)));raise exception 'A foreign proof was accepted';exception when raise_exception then if sqlerrm not like 'O comprovante não pertence%' then raise;end if;end;
 begin perform public.record_manual_payment(payload||jsonb_build_object('proofSize',25));raise exception 'Wrong file size was accepted';exception when raise_exception then if sqlerrm not like 'O envio do comprovante não foi concluído%' then raise;end if;end;
 perform public.record_manual_payment(payload);
 r=public.record_manual_payment(payload);
 if r->>'alreadyRecorded'<>'true' or(select count(*) from public.invoice_payments where invoice_id=v.invoice)<>1 then raise exception 'Proof retry duplicated a receipt';end if;
 if (select proof_count from public.finance_invoices where id=v.invoice)<>1 then raise exception 'Proof not projected in finance view';end if;
 if not exists(select 1 from public.invoice_payments where invoice_id=v.invoice and proof_path=v.path and proof_size=24) then raise exception 'Proof metadata missing';end if;
 -- Storage has its own statement-level SQL deletion guard. Do not bypass it.
 begin
  delete from storage.objects where bucket_id='payment-proofs' and name=v.path;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Linked proof deletion was allowed';end if;
 exception when insufficient_privilege then null;end;
 -- A storage read policy must not accidentally grant immutable proof updates.
 update storage.objects set name=name||'.changed' where bucket_id='payment-proofs' and name=v.path;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Linked proof overwrite was allowed';end if;
 perform public.reverse_manual_payment(v.invoice,'Estorno para conferir preservação do comprovante');
 if (select proof_count from public.finance_invoices where id=v.invoice)<>1 or not exists(select 1 from storage.objects where bucket_id='payment-proofs' and name=v.path) then raise exception 'Reversal lost the proof';end if;
 if not exists(select 1 from public.payment_reversals r join public.invoice_payments p on p.id=r.payment_id where p.invoice_id=v.invoice and p.proof_path=v.path) then raise exception 'Proof reversal history missing';end if;
end;$$;
reset role;
-- Reuse the current session only inside this rollback to verify financial and coaching scope.
update public.staff_profiles set role='financeiro' where id=auth.uid();
set local role authenticated;
do $$ declare v proof_verification%rowtype;begin
 select * into v from proof_verification;
 if (select proof_count from public.finance_invoices where id=v.invoice)<>1 then raise exception 'Financial staff cannot see evidence history';end if;
end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$ declare v proof_verification%rowtype;begin
 select * into v from proof_verification;
 if exists(select 1 from storage.objects where bucket_id='payment-proofs') then raise exception 'Trainer can read financial evidence';end if;
 if exists(select 1 from public.invoice_payments where invoice_id=v.invoice) then raise exception 'Trainer can read receipt metadata';end if;
 begin insert into storage.objects(bucket_id,name,metadata) values('payment-proofs',v.unlinked||'.other','{}');raise exception 'Trainer uploaded financial proof';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: private proof upload policy, metadata validation, retry, immutable evidence, reversal history, financial access and trainer isolation; all synthetic fixtures rolled back' as verification;
