-- Run as database administrator. All fixtures and business operations roll back.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$ begin if auth.uid() is null then raise exception 'A current secretary session is required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
create temporary table billing_payment_fixture(plan uuid default gen_random_uuid(),request uuid default gen_random_uuid(),class uuid);
insert into billing_payment_fixture(class) select id from public.classes where is_active limit 1;
insert into public.plans(id,name,price,registration_fee,includes_uniform,is_active) select plan,'Verificação matrícula e pagamentos',120,50,false,true from billing_payment_fixture;
grant select on billing_payment_fixture to authenticated;
set local role authenticated;
do $$ declare f billing_payment_fixture%rowtype;payload jsonb;result jsonb;s uuid;e uuid;monthly uuid;registration uuid;key uuid:=gen_random_uuid();today date:=(now() at time zone 'America/Recife')::date;firstday date:=(date_trunc('month',now() at time zone 'America/Recife')+interval '1 month')::date;begin
 select * into f from billing_payment_fixture;
 payload=jsonb_build_object('request_id',f.request,'name','Verificação nova matrícula financeira','birth_date','2017-01-01','due_day',31,'monthly_fee',120,'registration_fee',50,'guardians_json','[{"name":"Responsável de teste","phone":"81900000000"}]','class_id',f.class,'plan_id',f.plan,'preferred_position','Meia','dominant_foot','Destro','uniform_size','M','photo_url','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=');
 result=public.enroll_student(payload);s=(result->>'studentId')::uuid;
 select id into e from public.enrollments where student_id=s;
 if not exists(select 1 from public.enrollments where id=e and registration_fee=50 and first_billing_month=firstday) then raise exception 'Enrollment financial agreement not saved';end if;
 if(select count(*) from public.invoices where student_id=s)<>2 then raise exception 'Expected one registration and one first monthly invoice';end if;
 if exists(select 1 from public.invoices where student_id=s and charge_type='monthly' and reference_month=to_char(today,'YYYY-MM')) then raise exception 'Monthly fee charged in enrollment month';end if;
 select id into monthly from public.invoices where student_id=s and charge_type='monthly' and amount=120 and reference_month=to_char(firstday,'YYYY-MM') and due_date=(firstday+interval '1 month'-interval '1 day')::date;
 select id into registration from public.invoices where student_id=s and charge_type='registration' and amount=50 and reference_month=to_char(today,'YYYY-MM') and due_date=today;
 if monthly is null or registration is null then raise exception 'Wrong enrollment invoice types, amounts or dates';end if;
 result=public.enroll_student(payload);
 if result->>'alreadyRecorded'<>'true' or(select count(*) from public.invoices where student_id=s)<>2 then raise exception 'Enrollment retry duplicated charges';end if;
 perform public.generate_manual_invoices(to_char(today,'YYYY-MM'));
 if exists(select 1 from public.invoices where student_id=s and charge_type='monthly' and reference_month=to_char(today,'YYYY-MM')) then raise exception 'Generator ignored first billing month';end if;
 perform public.generate_manual_invoices(to_char(firstday,'YYYY-MM'));
 if(select count(*) from public.invoices where student_id=s)<>2 then raise exception 'Generator duplicated the future first invoice';end if;
 -- Validation must reject underpayment without the discount option and inconsistent split amounts.
 payload=jsonb_build_object('invoiceId',monthly,'idempotencyKey',key,'paymentMethod','misto','receivedAmount',120,'overdueOption','waive','paymentParts',jsonb_build_array(jsonb_build_object('method','dinheiro','amount',80),jsonb_build_object('method','pix','amount',39)));
 begin perform public.record_manual_payment(payload);raise exception 'Mismatched payment amounts accepted';exception when raise_exception then if sqlerrm not like 'A soma das formas de pagamento%' then raise;end if;end;
 begin perform public.record_manual_payment(payload||jsonb_build_object('receivedAmount',100,'paymentParts',jsonb_build_array(jsonb_build_object('method','dinheiro','amount',100))));raise exception 'Unmarked discount accepted';exception when raise_exception then if sqlerrm not like 'O valor foi atualizado%' then raise;end if;end;
 begin perform public.record_manual_payment(payload||jsonb_build_object('paymentParts',jsonb_build_array(jsonb_build_object('method','pix','amount',60),jsonb_build_object('method','pix','amount',60))));raise exception 'Duplicate methods accepted';exception when raise_exception then if sqlerrm not like 'Use cada forma%' then raise;end if;end;
 begin perform public.record_manual_payment(payload||jsonb_build_object('paymentParts',jsonb_build_array(jsonb_build_object('method','dinheiro','amount',0.001),jsonb_build_object('method','pix','amount',119.999))));raise exception 'Fractional cents accepted';exception when raise_exception then if sqlerrm not like 'Informe valores positivos%' then raise;end if;end;
 -- Discount with optional empty justification, paid early, split into cash and PIX.
 payload=payload||jsonb_build_object('hasDiscount',true,'receivedAmount',100,'discountReason','','paymentParts',jsonb_build_array(jsonb_build_object('method','dinheiro','amount',80),jsonb_build_object('method','pix','amount',20)));
 perform public.record_manual_payment(payload);perform public.record_manual_payment(payload);
 if(select count(*) from public.invoice_payments where invoice_id=monthly)<>1 then raise exception 'Retry duplicated split receipt';end if;
 if not exists(select 1 from public.invoices where id=monthly and amount=120 and paid_amount=100 and status='paid' and payment_method='misto') then raise exception 'Agreed value or paid value lost';end if;
 if not exists(select 1 from public.invoice_payments where invoice_id=monthly and principal_amount=120 and received_amount=100 and discount_amount=20 and negotiation_reason is null and jsonb_array_length(payment_parts)=2) then raise exception 'Split or optional discount justification lost';end if;
 if not exists(select 1 from public.finance_invoices where id=monthly and(receipt->>'discount_amount')::numeric=20 and jsonb_array_length(receipt->'payment_parts')=2 and charge_type='monthly') then raise exception 'Finance projection lost payment detail';end if;
 perform public.reverse_manual_payment(monthly,'Estorno de verificação do recebimento dividido');
 if not exists(select 1 from public.invoices where id=monthly and amount=120 and status='pending' and paid_amount is null and payment_method is null) then raise exception 'Split reversal did not restore the original balance';end if;
 if not exists(select 1 from public.invoice_payments where invoice_id=monthly and jsonb_array_length(payment_parts)=2 and discount_amount=20) then raise exception 'Reversal erased payment evidence';end if;
 perform public.record_manual_payment(jsonb_build_object('invoiceId',registration,'idempotencyKey',gen_random_uuid(),'paymentMethod','pix','receivedAmount',50,'overdueOption','waive'));
 if not exists(select 1 from public.invoices where id=registration and charge_type='registration' and status='paid' and paid_amount=50) then raise exception 'Registration payment failed';end if;
end;$$;
reset role;
rollback;
select 'PASS: registration charge in enrollment month, first monthly fee next month, no duplicates, mixed cash/PIX, explicit discount with optional reason, validation, early payment, permanent evidence and reversal. All changes rolled back.' as verification;
