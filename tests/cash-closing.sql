-- All receipts, closures, reopenings, staff changes and audit events are rolled back.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$begin if auth.uid() is null then raise exception 'A current secretary session is required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
create temporary table cash_fixture(kind text primary key,student uuid default gen_random_uuid(),invoice uuid default gen_random_uuid(),key uuid default gen_random_uuid());
insert into cash_fixture(kind) values('mixed'),('pix'),('debit'),('credit'),('legacy'),('imported'),('reversed'),('stale'),('blocked'),('other_day'),('boundary_before'),('boundary_last'),('boundary_after');
create temporary table cash_before_invoices as select id,to_jsonb(i) snapshot from public.invoices i;
create temporary table cash_before_payments as select id,to_jsonb(p) snapshot from public.invoice_payments p;
create temporary table cash_results(name text primary key,value jsonb);
grant select on cash_fixture to authenticated;
grant select,insert,update on cash_results to authenticated;
insert into public.students(id,name,birth_date,status,portal_access_enabled)
select student,'Teste fechamento: '||kind,date '1990-01-01','active',false from cash_fixture;
insert into public.invoices(id,student_id,reference_month,due_date,amount,status,created_at)
select invoice,student,'2001-02',date '2001-02-10',case kind when 'mixed' then 120 when 'pix' then 50 when 'debit' then 30 when 'credit' then 20 when 'reversed' then 40 when 'stale' then 7 when 'other_day' then 5 when 'legacy' then 10 else 1 end,'pending','2001-02-01 12:00+00' from cash_fixture;
update public.invoices set status='paid',paid_amount=10,paid_at='2001-02-03 15:00+00',payment_method='dinheiro' where id=(select invoice from cash_fixture where kind='legacy');
update public.invoices set status='paid',amount=9999,paid_amount=9999,paid_at=null,settled_before_import=true where id=(select invoice from cash_fixture where kind='imported');
set local role authenticated;
do $$declare f record;r jsonb;parts jsonb;value numeric;method text;paid_at text;begin
 for f in select * from cash_fixture where kind in('mixed','pix','debit','credit','reversed','other_day','boundary_before','boundary_last','boundary_after') loop
  value=case f.kind when 'mixed' then 100 when 'pix' then 50 when 'debit' then 30 when 'credit' then 20 when 'reversed' then 40 when 'other_day' then 5 else 1 end;
  method=case f.kind when 'mixed' then 'misto' when 'debit' then 'cartao_debito' when 'credit' then 'cartao_credito' else 'pix' end;
  parts=case f.kind when 'mixed' then '[{"method":"dinheiro","amount":60},{"method":"pix","amount":40}]'::jsonb else jsonb_build_array(jsonb_build_object('method',method,'amount',value)) end;
  paid_at=case f.kind when 'other_day' then '2001-02-04T15:00:00Z' when 'boundary_before' then '2001-02-06T02:59:59Z' when 'boundary_last' then '2001-02-07T02:59:59Z' when 'boundary_after' then '2001-02-07T03:00:00Z' else '2001-02-03T15:00:00Z' end;
  perform public.record_manual_payment(jsonb_build_object('invoiceId',f.invoice,'idempotencyKey',f.key,'paymentMethod',method,'receivedAmount',value,'hasDiscount',f.kind='mixed','overdueOption','waive','paidAt',paid_at,'paymentParts',parts));
 end loop;
 perform public.reverse_manual_payment((select invoice from cash_fixture where kind='reversed'),'Teste de estorno anterior ao fechamento');
 r=public.cash_day_report('2001-02-03');
 if r->>'state'<>'open' or (r->'live'->>'count')::integer<>5 or (r->'live'->'totals'->>'total')::numeric<>210
  or (r->'live'->'totals'->>'dinheiro')::numeric<>70 or (r->'live'->'totals'->>'pix')::numeric<>90 or (r->'live'->>'reversedCount')::integer<>1 then raise exception 'Mixed payment/discount/import/reversal totals incorrect: %',r->'live';end if;
 if r::text like '%portal_token%' or r::text like '%proof_path%' then raise exception 'Cash snapshot leaked unrelated sensitive fields';end if;
 insert into cash_results values('preview',r);
 r=public.cash_day_report('2001-02-06');if (r->'live'->>'count')::integer<>1 or (r->'live'->'totals'->>'total')::numeric<>1 then raise exception 'Recife inclusive/exclusive day boundaries failed';end if;
 perform public.record_manual_payment(jsonb_build_object('invoiceId',(select invoice from cash_fixture where kind='stale'),'idempotencyKey',gen_random_uuid(),'paymentMethod','dinheiro','receivedAmount',7,'overdueOption','waive','paidAt','2001-02-03T16:00:00Z'));
end;$$;
do $$declare r jsonb;payload jsonb;closed jsonb;repeat_result jsonb;original jsonb;begin
 select value into r from cash_results where name='preview';
 payload=jsonb_build_object('date','2001-02-03','key',gen_random_uuid(),'fingerprint',r->'live'->>'fingerprint','openingCash',20,'counted',jsonb_build_object('dinheiro',90,'pix',90,'debito',30,'credito',20),'notes','','differenceReason','');
 begin perform public.close_cash_day(payload);raise exception 'TEST: stale conference accepted';exception when raise_exception then if sqlerrm not like 'Os recebimentos deste dia mudaram%' then raise;end if;end;
 r=public.cash_day_report('2001-02-03');payload=payload||jsonb_build_object('fingerprint',r->'live'->>'fingerprint','counted',jsonb_build_object('dinheiro',97,'pix',90,'debito',30,'credito',20));
 closed=public.close_cash_day(payload);repeat_result=public.close_cash_day(payload);
 if closed->>'closureId'<>repeat_result->>'closureId' or repeat_result->>'alreadyProcessed'<>'true' then raise exception 'Closing retry duplicated a version';end if;
 original=public.cash_closure_document((closed->>'closureId')::uuid);
 if original->>'revision'<>'1' or (original->'expected'->>'dinheiro')::numeric<>97 or (original->'expected'->>'total')::numeric<>237 or original->'actor_snapshot'->>'role'<>'secretaria' then raise exception 'Opening fund or actor snapshot failed';end if;
 insert into cash_results values('first',original),('firstPayload',payload);
 begin perform public.close_cash_day(payload||jsonb_build_object('key',gen_random_uuid()));raise exception 'TEST: second close accepted';exception when raise_exception then if sqlerrm not like 'O caixa de %está fechado.%' then raise;end if;end;
 begin perform public.close_cash_day(payload||jsonb_build_object('openingCash',21));raise exception 'TEST: retry with other values accepted';exception when raise_exception then if sqlerrm not like 'Esta tentativa de fechamento já foi usada%' then raise;end if;end;
 begin perform public.reverse_manual_payment((select invoice from cash_fixture where kind='mixed'),'Teste de estorno bloqueado');raise exception 'TEST: reversal of a closed day accepted';exception when raise_exception then if sqlerrm not like 'O caixa de %está fechado.%' then raise;end if;end;
 begin perform public.record_manual_payment(jsonb_build_object('invoiceId',(select invoice from cash_fixture where kind='blocked'),'idempotencyKey',gen_random_uuid(),'paymentMethod','pix','receivedAmount',1,'overdueOption','waive','paidAt','2001-02-03T18:00:00Z'));raise exception 'TEST: backdated receipt accepted';exception when raise_exception then if sqlerrm not like 'O caixa de %está fechado.%' then raise;end if;end;
 begin update public.invoices set paid_amount=999 where id=(select invoice from cash_fixture where kind='mixed');raise exception 'TEST: direct financial update accepted';exception when insufficient_privilege then null;when raise_exception then if sqlerrm not like 'O caixa de %está fechado.%' then raise;end if;end;
 r=public.cash_day_report('2001-02-04');
 perform public.close_cash_day(jsonb_build_object('date','2001-02-04','key',gen_random_uuid(),'fingerprint',r->'live'->>'fingerprint','openingCash',0,'counted',jsonb_build_object('dinheiro',0,'pix',5,'debito',0,'credito',0),'notes','','differenceReason',''));
 perform public.reopen_cash_day((original->>'id')::uuid,'Conferir lançamento anterior, preservando outro dia');
 perform public.reverse_manual_payment((select invoice from cash_fixture where kind='mixed'),'Correção após reabertura autorizada');
 r=public.cash_day_report('2001-02-03');
 if r->>'state'<>'open' or (r->'live'->'totals'->>'total')::numeric<>117 then raise exception 'Reopened correction did not update the live day';end if;
 if (public.cash_day_report('2001-02-04'))->>'state'<>'closed' then raise exception 'Reopening an earlier day changed the later closed day';end if;
 payload=jsonb_build_object('date','2001-02-03','key',gen_random_uuid(),'fingerprint',r->'live'->>'fingerprint','openingCash',20,'counted',jsonb_build_object('dinheiro',47,'pix',40,'debito',30,'credito',20),'notes','Versão corrigida','differenceReason','');
 begin perform public.close_cash_day(payload);raise exception 'TEST: offsetting differences without reason accepted';exception when raise_exception then if sqlerrm not like 'Justifique a diferença encontrada%' then raise;end if;end;
 closed=public.close_cash_day(payload||jsonb_build_object('differenceReason','Sobra de dinheiro e diferença identificada no PIX'));
 if closed->>'revision'<>'2' then raise exception 'Reclosing overwrote revision 1';end if;
 insert into cash_results values('second',public.cash_closure_document((closed->>'closureId')::uuid));
 if (select value->'difference'->>'total' from cash_results where name='second')<>'0.00' and (select (value->'difference'->>'total')::numeric from cash_results where name='second')<>0 then raise exception 'Offsetting differences calculated incorrectly';end if;
 if (public.cash_closure_document((original->>'id')::uuid))->'snapshot'<>original->'snapshot' then raise exception 'Reopening changed the original document';end if;
 begin perform public.reopen_cash_day((original->>'id')::uuid,'Janela antiga deve ser bloqueada');raise exception 'TEST: stale reopening accepted';exception when raise_exception then if sqlerrm not like 'Existe um fechamento mais recente%' then raise;end if;end;
 begin perform public.close_cash_day(payload||jsonb_build_object('date',((now() at time zone 'America/Recife')::date+1)::text));raise exception 'TEST: future closing accepted';exception when raise_exception then if sqlerrm not like 'Escolha uma data até hoje%' then raise;end if;end;
end;$$;
reset role;
-- Even a privileged write must respect the date lock; normal staff cannot bypass it through another endpoint.
do $$begin
 begin update public.invoices set paid_amount=999 where id=(select invoice from cash_fixture where kind='pix');raise exception 'TEST: privileged update bypassed closing';exception when raise_exception then if sqlerrm not like 'O caixa de %está fechado.%' then raise;end if;end;
 begin insert into public.invoice_payments(invoice_id,idempotency_key,principal_amount,received_amount,payment_method,actor_id,paid_at,payment_parts)
  select invoice,gen_random_uuid(),1,1,'pix',auth.uid(),'2001-02-03 18:00+00','[{"method":"pix","amount":1}]'::jsonb from cash_fixture where kind='blocked';raise exception 'TEST: direct payment bypassed closing';
 exception when raise_exception then if sqlerrm not like 'O caixa de %está fechado.%' then raise;end if;end;
 begin update private.cash_day_closures set notes='alterado' where id=(select (value->>'id')::uuid from cash_results where name='first');raise exception 'TEST: closure snapshot was mutable';exception when raise_exception then if sqlerrm like 'TEST:%' then raise;end if;end;
 begin delete from private.cash_day_reopenings where closure_id=(select (value->>'id')::uuid from cash_results where name='first');raise exception 'TEST: reopening history was mutable';exception when raise_exception then if sqlerrm like 'TEST:%' then raise;end if;end;
end;$$;
update public.staff_profiles set role='financeiro',coach_id=null where id=auth.uid();
set local role authenticated;
do $$declare r jsonb;begin
 r=public.cash_day_report('2001-02-03');if r->>'canReopen'<>'false' then raise exception 'Finance-only user can reopen';end if;
 begin perform public.reopen_cash_day((select (value->>'id')::uuid from cash_results where name='second'),'Financeiro não deve reabrir');raise exception 'TEST: finance-only reopening accepted';exception when raise_exception then if sqlerrm not like 'Somente administrador ou secretaria%' then raise;end if;end;
 r=public.cash_day_report('2001-02-10');
 perform public.close_cash_day(jsonb_build_object('date','2001-02-10','key',gen_random_uuid(),'fingerprint',r->'live'->>'fingerprint','openingCash',0,'counted',jsonb_build_object('dinheiro',0,'pix',0,'debito',0,'credito',0),'notes','','differenceReason',''));
end;$$;
reset role;
update public.staff_profiles set role='treinador',coach_id=(select id from public.coaches limit 1) where id=auth.uid();
set local role authenticated;
do $$begin
 begin perform public.cash_day_report('2001-02-03');raise exception 'TEST: trainer read cash';exception when raise_exception then if sqlerrm not like 'Consulta de caixa não autorizada%' then raise;end if;end;
 begin perform public.close_cash_day((select value from cash_results where name='firstPayload'));raise exception 'TEST: trainer closed cash';exception when raise_exception then if sqlerrm not like 'Fechamento de caixa não autorizado%' then raise;end if;end;
end;$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.cash_day_report(date)','execute') or has_function_privilege('anon','public.close_cash_day(jsonb)','execute') or has_function_privilege('anon','public.reopen_cash_day(uuid,text)','execute') or has_function_privilege('anon','public.cash_closure_document(uuid)','execute') then raise exception 'Anonymous cash operations exposed';end if;
 if has_function_privilege('authenticated','private.cash_day_source(date)','execute') or has_function_privilege('authenticated','private.assert_cash_days_open(date[])','execute') then raise exception 'Internal cash helpers exposed';end if;
 if exists(select 1 from cash_before_invoices b left join public.invoices i on i.id=b.id where i.id is null or to_jsonb(i)<>b.snapshot) then raise exception 'A real invoice changed';end if;
 if exists(select 1 from cash_before_payments b left join public.invoice_payments p on p.id=b.id where p.id is null or to_jsonb(p)<>b.snapshot) then raise exception 'A real receipt changed';end if;
 if (select count(*) from public.audit_events where entity='cash_day_closures' and action='CLOSE_CASH_DAY' and actor_id=auth.uid())<>4 then raise exception 'Missing closing audit identity';end if;
 if not exists(select 1 from public.audit_events where entity='cash_day_closures' and action='REOPEN_CASH_DAY' and actor_id=auth.uid()) then raise exception 'Missing reopening audit';end if;
end;$$;
rollback;
select 'PASS: mixed/discounted/legacy/import/reversal totals; Recife dates; initial cash; stale preview; retry keys; immutable snapshots; backdated/direct receipt and reversal locks; independent days; versioned reopening/reclosing; offsetting differences; finance/trainer/anonymous permissions; audit; no real data changed. All fixtures rolled back.' verification;
