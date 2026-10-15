-- Explicit, minimal projections for billing and the coach's assigned roster.
create or replace function private.billing_student(p_student uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then return null; end if;
 return (select jsonb_build_object('id',s.id,'name',s.name,'status',s.status,'portal_token',s.portal_token,'guardian',coalesce((select jsonb_agg(jsonb_build_object('name',g.name,'phone',g.phone,'email',g.email)) from public.guardians g where g.student_id=s.id),'[]')) from public.students s where s.id=p_student);
end; $$;
revoke all on function private.billing_student(uuid) from public,anon;
grant execute on function private.billing_student(uuid) to authenticated;
create view public.finance_invoices with(security_invoker=true) as select i.*, private.billing_student(i.student_id) as student from public.invoices i;
grant select on public.finance_invoices to authenticated;
revoke all on public.finance_invoices from anon;

create or replace function private.roster_student(p_student uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.can_student(p_student) then return null; end if;
 return (select jsonb_build_object('id',s.id,'name',s.name,'birth_date',s.birth_date,'birth_date_estimated',s.birth_date_estimated,'photo_url',s.photo_url,'preferred_position',s.preferred_position,'dominant_foot',s.dominant_foot,'uniform_size',s.uniform_size,'status',s.status,'category_id',(select c.category_id from public.enrollments e join public.classes c on c.id=e.class_id where e.student_id=s.id and e.status in ('active','trial') and private.can_class(c.id) order by e.created_at desc limit 1)) from public.students s where s.id=p_student);
end; $$;
revoke all on function private.roster_student(uuid) from public,anon;
grant execute on function private.roster_student(uuid) to authenticated;

create or replace function public.staff_student_roster() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) then raise exception 'Acesso restrito.'; end if;
 return (select coalesce(jsonb_agg(private.roster_student(s.id) order by s.name),'[]') from public.students s where private.can_student(s.id) and s.status in ('active','trial'));
end; $$;
create or replace function public.staff_class_catalog(p_unit uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) then raise exception 'Acesso restrito.'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('unit',jsonb_build_object('name',u.name),'category',jsonb_build_object('name',ca.name),'coach',jsonb_build_object('name',co.name),'active_students_count',(select count(*) from public.enrollments e join public.students s on s.id=e.student_id where e.class_id=c.id and e.status='active' and s.status='active')) order by c.start_time),'[]') from public.classes c left join public.units u on u.id=c.unit_id left join public.categories ca on ca.id=c.category_id left join public.coaches co on co.id=c.coach_id where private.can_class(c.id) and (p_unit is null or c.unit_id=p_unit));
end; $$;
create or replace function public.staff_class_roster(p_class uuid,p_date date) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.can_class(p_class) then raise exception 'Turma não autorizada.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'student_id',e.student_id,'status',e.status,'notes',case when private.staff_role()='treinador' then null else e.notes end,'student',private.roster_student(e.student_id)) order by s.name),'[]') from public.enrollments e join public.students s on s.id=e.student_id where e.class_id=p_class and (e.status='active' or (e.status='trial' and e.start_date=p_date)) and s.status in ('active','trial'));
end; $$;
create or replace function public.attendance_notification_targets(p_students uuid[],p_class uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) or cardinality(p_students)>100 then raise exception 'Solicitação não autorizada.'; end if;
 if p_class is not null and not private.can_class(p_class) then raise exception 'Turma não autorizada.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'guardian',coalesce((select jsonb_agg(jsonb_build_object('name',g.name,'phone',g.phone,'receives_notifications',g.receives_notifications)) from public.guardians g where g.student_id=s.id),'[]'))),'[]') from public.students s where s.id=any(p_students) and private.can_student(s.id) and (p_class is null or exists(select 1 from public.enrollments e where e.student_id=s.id and e.class_id=p_class and e.status in ('active','trial'))));
end; $$;
create or replace function public.staff_attendance_history(p_class uuid default null,p_limit integer default 1500) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) then raise exception 'Acesso restrito.'; end if;
 return (select coalesce(jsonb_agg(x.row order by x.training_date desc),'[]') from (select l.training_date,to_jsonb(l)||jsonb_build_object('student',private.roster_student(l.student_id),'class',jsonb_build_object('id',c.id,'name',c.name,'unit',jsonb_build_object('name',u.name),'category',jsonb_build_object('name',ca.name),'coach',jsonb_build_object('name',co.name))) as row from public.attendance_logs l join public.classes c on c.id=l.class_id left join public.units u on u.id=c.unit_id left join public.categories ca on ca.id=c.category_id left join public.coaches co on co.id=c.coach_id where private.can_class(l.class_id) and (p_class is null or l.class_id=p_class) order by l.training_date desc limit greatest(1,least(p_limit,5000)))x);
end; $$;
create or replace function public.staff_matches() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) then raise exception 'Acesso restrito.'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('unit',jsonb_build_object('name',u.name),'category',jsonb_build_object('name',ca.name),'coach',jsonb_build_object('name',co.name),'callups',coalesce((select jsonb_agg(to_jsonb(mc)||jsonb_build_object('student',private.roster_student(mc.student_id)||jsonb_build_object('guardian',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'phone',g.phone,'receives_notifications',g.receives_notifications)) from public.guardians g where g.student_id=mc.student_id),'[]')))) from public.match_callups mc where mc.match_id=m.id),'[]')) order by m.match_date desc),'[]') from public.matches m left join public.units u on u.id=m.unit_id left join public.categories ca on ca.id=m.category_id left join public.coaches co on co.id=m.coach_id where private.can_match(m.id));
end; $$;
create or replace function public.staff_callup(p_callup uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_match jsonb;v_callup jsonb;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) then raise exception 'Acesso restrito.'; end if;
 select m into v_match from jsonb_array_elements(public.staff_matches()) m where exists(select 1 from jsonb_array_elements(m->'callups')c where c->>'id'=p_callup::text);
 if v_match is null then return null; end if;
 select c into v_callup from jsonb_array_elements(v_match->'callups') c where c->>'id'=p_callup::text;
 return v_callup||jsonb_build_object('match',v_match-'callups');
end; $$;
revoke all on function public.staff_student_roster(),public.staff_class_catalog(uuid),public.staff_class_roster(uuid,date),public.attendance_notification_targets(uuid[],uuid),public.staff_attendance_history(uuid,integer),public.staff_matches(),public.staff_callup(uuid) from public,anon;
grant execute on function public.staff_student_roster(),public.staff_class_catalog(uuid),public.staff_class_roster(uuid,date),public.attendance_notification_targets(uuid[],uuid),public.staff_attendance_history(uuid,integer),public.staff_matches(),public.staff_callup(uuid) to authenticated;

-- Manual receipts keep the original invoice value and a permanent payment record.
create or replace function public.record_manual_payment(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_invoice public.invoices%rowtype;v_key uuid;v_payment public.invoice_payments%rowtype;v_method text;v_mode text;v_received numeric;v_fine numeric:=0;v_interest numeric:=0;v_discount numeric:=0;v_paid_at timestamptz;v_days integer;v_note text;v_reason text;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Recebimento não autorizado.'; end if;
 v_key=(p_payload->>'idempotencyKey')::uuid;
 if v_key is null then raise exception 'Identificador do recebimento obrigatório.'; end if;
 select * into v_invoice from public.invoices where id=(p_payload->>'invoiceId')::uuid for update;
 if not found then raise exception 'Cobrança não encontrada.'; end if;
 select * into v_payment from public.invoice_payments where idempotency_key=v_key;
 if found then
   if v_payment.invoice_id<>v_invoice.id or v_payment.actor_id<>auth.uid() then raise exception 'Identificador de recebimento inválido.'; end if;
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
 insert into public.invoice_payments(invoice_id,idempotency_key,principal_amount,received_amount,fine_amount,interest_amount,discount_amount,payment_method,actor_id,paid_at,notes,negotiation_reason)
 values(v_invoice.id,v_key,v_invoice.amount,v_received,v_fine,v_interest,v_discount,v_method,auth.uid(),v_paid_at,v_note,v_reason) returning * into v_payment;
 update public.invoices set status='paid',paid_amount=v_received,paid_at=v_paid_at,payment_method=v_method,received_by=auth.uid(),updated_at=now() where id=v_invoice.id;
 return jsonb_build_object('success',true,'paymentId',v_payment.id,'receivedAmount',v_received);
end; $$;
create or replace function public.reverse_manual_payment(p_invoice uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_invoice public.invoices%rowtype;v_payment uuid;
begin
 if auth.uid() is null or not private.has_role(array['admin','financeiro']) then raise exception 'Somente administrador ou financeiro pode estornar recebimentos.'; end if;
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
create or replace function public.generate_manual_invoices(p_month text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_first date;v_count integer;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Geração de mensalidades não autorizada.'; end if;
 if p_month is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then raise exception 'Mês inválido.'; end if;
 v_first=(p_month||'-01')::date;
 if v_first<date_trunc('month',now())-interval '36 months' or v_first>date_trunc('month',now())+interval '12 months' then raise exception 'Escolha um mês entre os últimos 36 e os próximos 12 meses.'; end if;
 perform pg_advisory_xact_lock(hashtext('acadgol-invoices-'||p_month));
 insert into public.invoices(enrollment_id,student_id,reference_month,due_date,amount,status,pix_code)
 select distinct on(e.student_id) e.id,e.student_id,p_month,v_first+(least(e.due_day,extract(day from (v_first+interval '1 month'-interval '1 day'))::integer)-1),e.monthly_fee,'pending',null from public.enrollments e join public.students s on s.id=e.student_id where e.status='active' and s.status='active' order by e.student_id,e.created_at desc
 on conflict(student_id,reference_month) where status is distinct from 'cancelled' do nothing;
 get diagnostics v_count=row_count;
 return jsonb_build_object('success',true,'count',v_count);
end; $$;
create or replace function public.adjust_uniform_stock(p_item uuid,p_delta integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_quantity integer;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Ajuste de estoque não autorizado.'; end if;
 if p_delta not in (-1,1) then raise exception 'Ajuste inválido.'; end if;
 update public.uniform_inventory set quantity=quantity+p_delta,updated_at=now() where id=p_item and quantity+p_delta>=0 returning quantity into v_quantity;
 if not found then raise exception 'Peça indisponível ou estoque insuficiente.'; end if;
 return jsonb_build_object('success',true,'quantity',v_quantity);
end; $$;
create or replace function public.change_student_status(p_student uuid,p_status text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Alteração não autorizada.'; end if;
 if p_status not in ('active','paused') then raise exception 'Situação inválida.'; end if;
 perform 1 from public.students where id=p_student and status in ('active','paused') for update;
 if not found then raise exception 'Atleta não encontrado ou matrícula ainda experimental.'; end if;
 update public.students set status=p_status,updated_at=now() where id=p_student;
 update public.enrollments set status=p_status,updated_at=now() where student_id=p_student and status in ('active','paused');
 return true;
end; $$;
create or replace function public.renew_family_access(p_student uuid,p_enabled boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_token uuid;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Alteração não autorizada.'; end if;
 update public.students set portal_token=gen_random_uuid(),portal_access_enabled=p_enabled,portal_token_expires_at=now()+interval '90 days',updated_at=now() where id=p_student returning portal_token into v_token;
 if not found then raise exception 'Atleta não encontrado.'; end if;
 return jsonb_build_object('token',case when p_enabled then v_token else null end,'enabled',p_enabled);
end; $$;
revoke all on function public.record_manual_payment(jsonb),public.reverse_manual_payment(uuid,text),public.generate_manual_invoices(text),public.adjust_uniform_stock(uuid,integer),public.change_student_status(uuid,text),public.renew_family_access(uuid,boolean) from public,anon;
grant execute on function public.record_manual_payment(jsonb),public.reverse_manual_payment(uuid,text),public.generate_manual_invoices(text),public.adjust_uniform_stock(uuid,integer),public.change_student_status(uuid,text),public.renew_family_access(uuid,boolean) to authenticated;
