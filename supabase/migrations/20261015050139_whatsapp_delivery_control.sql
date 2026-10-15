-- Private outbox. Provider acceptance is not a delivery/read receipt.
create table private.whatsapp_settings (
 id boolean primary key default true check(id), due_enabled boolean not null default false,
 overdue_enabled boolean not null default false, welcome_enabled boolean not null default false,
 receipt_enabled boolean not null default false, send_hour integer not null default 9 check(send_hour between 8 and 18),
 days_before integer not null default 3 check(days_before between 0 and 15),
 updated_at timestamptz not null default clock_timestamp(), updated_by uuid
);
insert into private.whatsapp_settings(id) values(true);
create table private.whatsapp_workers (
 id text primary key, token_hash text not null check(length(token_hash)=64),
 active boolean not null default true, heartbeat_at timestamptz
);
create table private.whatsapp_jobs (
 id uuid primary key default gen_random_uuid(), dedupe_key text not null unique,
 kind text not null check(kind in('attendance','callup','due','overdue','welcome','receipt')),
 entity_id uuid not null, student_id uuid not null, guardian_id uuid not null, destination_hash text not null,
 class_id uuid, training_date date, variant text not null default '',
 message text not null check(length(message) between 1 and 4000),
 state text not null default 'queued' check(state in('queued','sending','accepted','failed','uncertain','cancelled')),
 scheduled_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 created_by uuid, actor_snapshot jsonb not null default '{}', claim uuid, locked_at timestamptz,
 attempt_count integer not null default 0, provider_id text, error text
);
create index whatsapp_jobs_queue on private.whatsapp_jobs(scheduled_at) where state='queued';
create index whatsapp_jobs_history on private.whatsapp_jobs(created_at desc,id desc);
create index whatsapp_jobs_guardian on private.whatsapp_jobs(guardian_id);
create table private.whatsapp_attempts (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references private.whatsapp_jobs(id),
 claim uuid not null unique, started_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 actor_snapshot jsonb not null, result text, provider_id text, error text
);
create index whatsapp_attempts_job on private.whatsapp_attempts(job_id,started_at);
alter table private.whatsapp_settings enable row level security;
alter table private.whatsapp_workers enable row level security;
alter table private.whatsapp_jobs enable row level security;
alter table private.whatsapp_attempts enable row level security;
create policy internal_settings on private.whatsapp_settings to postgres using(true) with check(true);
create policy internal_workers on private.whatsapp_workers to postgres using(true) with check(true);
create policy internal_jobs on private.whatsapp_jobs to postgres using(true) with check(true);
create policy internal_attempts on private.whatsapp_attempts to postgres using(true) with check(true);
revoke all on private.whatsapp_settings,private.whatsapp_workers,private.whatsapp_jobs,private.whatsapp_attempts from public,anon,authenticated;

create function private.whatsapp_actor() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('id',id,'name',full_name,'username',username,'role',role) from public.staff_profiles where id=auth.uid() and private.staff_role() is not null),jsonb_build_object('name','Automação','role','system'));
$$;
create function private.whatsapp_expire() returns void language plpgsql security definer set search_path='' as $$
begin
 update private.whatsapp_attempts a set finished_at=clock_timestamp(),result='uncertain',error='Tentativa interrompida. Confira a conversa antes de reenviar.'
 from private.whatsapp_jobs j where a.claim=j.claim and j.state='sending' and j.locked_at<clock_timestamp()-interval '5 minutes' and a.finished_at is null;
 update private.whatsapp_jobs set state='uncertain',error='Tentativa interrompida. Confira a conversa antes de reenviar.',updated_at=clock_timestamp()
 where state='sending' and locked_at<clock_timestamp()-interval '5 minutes';
 update private.whatsapp_jobs set state='cancelled',error='Prazo do aviso encerrado.',updated_at=clock_timestamp() where state='queued' and expires_at<clock_timestamp();
end;$$;

create function private.whatsapp_reserve(p_kind text,p_entity uuid,p_guardian uuid,p_class uuid,p_date date,p_variant text,p_message text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.guardians%rowtype;j private.whatsapp_jobs%rowtype;v_student uuid;v_key text;v_match public.matches%rowtype;v_phone text;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) then raise exception 'Acesso restrito.';end if;
 if p_message is null or length(p_message) not between 1 and 4000 then raise exception 'Mensagem inválida.';end if;
 if p_kind='attendance' then
  v_student=p_entity;
  if p_class is null or p_date is null or not private.can_class(p_class) or not private.can_student(v_student)
   or not exists(select 1 from public.attendance_logs where class_id=p_class and student_id=v_student and training_date=p_date and status=p_variant)
   then raise exception 'Chamada não autorizada.';end if;
  v_key='attendance:'||p_class||':'||p_date||':'||p_entity||':'||p_variant;
 elsif p_kind='callup' then
  select s.student_id into v_student from public.match_callups s where s.id=p_entity;
  select m.* into v_match from public.matches m join public.match_callups s on s.match_id=m.id where s.id=p_entity;
  if v_student is null or not private.can_match(v_match.id) or v_match.status<>'scheduled' or v_match.match_date<(clock_timestamp() at time zone 'America/Recife')::date then raise exception 'Convocação não autorizada ou encerrada.';end if;
  v_key='callup:'||p_entity||':'||md5(jsonb_build_array(v_match.title,v_match.opponent,v_match.match_date,v_match.match_time,v_match.location,v_match.category_id,v_match.notes)::text);
 else raise exception 'Tipo de aviso inválido.';end if;
 select * into g from public.guardians where id=p_guardian and student_id=v_student and receives_notifications is distinct from false;
 if g.id is null or coalesce(g.phone,'')='' then return jsonb_build_object('state','cancelled','error','Responsável sem notificações habilitadas.');end if;
 v_phone=regexp_replace(g.phone,'\D','','g');if length(v_phone) in(10,11) then v_phone='55'||v_phone;end if;
 if length(v_phone) not between 12 and 15 then return jsonb_build_object('state','failed','error','Telefone do responsável inválido.');end if;
 -- Dedupe by actual destination as well as event: two guardian records can share one phone.
 v_key=v_key||':'||v_phone;
 perform private.whatsapp_expire();
 insert into private.whatsapp_jobs(dedupe_key,kind,entity_id,student_id,guardian_id,destination_hash,class_id,training_date,variant,message,expires_at,created_by,actor_snapshot)
 values(v_key,p_kind,p_entity,v_student,g.id,md5(v_phone),p_class,p_date,p_variant,p_message,
 case when p_kind='callup' then (v_match.match_date+1)::timestamp at time zone 'America/Recife' else clock_timestamp()+interval '2 days' end,auth.uid(),private.whatsapp_actor()) on conflict(dedupe_key) do nothing;
 select * into j from private.whatsapp_jobs where dedupe_key=v_key for update;
 if j.state<>'queued' then return jsonb_build_object('id',j.id,'state',j.state);end if;
 update private.whatsapp_jobs set state='sending',claim=gen_random_uuid(),locked_at=clock_timestamp(),attempt_count=attempt_count+1,updated_at=clock_timestamp() where id=j.id returning * into j;
 insert into private.whatsapp_attempts(job_id,claim,actor_snapshot) values(j.id,j.claim,private.whatsapp_actor());
 return jsonb_build_object('id',j.id,'state',j.state,'claim',j.claim,'phone',g.phone);
end;$$;

create function private.whatsapp_complete(p_job uuid,p_claim uuid,p_result text,p_provider_id text,p_error text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_result not in('accepted','failed','uncertain') then raise exception 'Resultado inválido.';end if;
 update private.whatsapp_jobs set state=p_result,provider_id=left(p_provider_id,200),error=case when p_result='accepted' then null else left(coalesce(p_error,'Falha sem confirmação do serviço.'),500) end,updated_at=clock_timestamp()
 where id=p_job and claim=p_claim and state in('sending','uncertain');
 if not found then return false;end if;
 update private.whatsapp_attempts set result=p_result,provider_id=left(p_provider_id,200),error=case when p_result='accepted' then null else left(p_error,500) end,finished_at=clock_timestamp() where job_id=p_job and claim=p_claim;
 return true;
end;$$;
create function private.whatsapp_finish(p_job uuid,p_claim uuid,p_result text,p_provider_id text,p_error text) returns boolean language plpgsql security definer set search_path='' as $$
declare j private.whatsapp_jobs%rowtype;
begin
 select * into j from private.whatsapp_jobs where id=p_job;
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) or not exists(select 1 from private.whatsapp_attempts where job_id=p_job and claim=p_claim and actor_snapshot->>'id'=auth.uid()::text)
 then raise exception 'Acesso restrito.';end if;
 return private.whatsapp_complete(p_job,p_claim,p_result,p_provider_id,p_error);
end;$$;

create function private.whatsapp_console(p_state text default '',p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_rows jsonb;v_total bigint;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Acesso restrito.';end if;
 if p_offset<0 or p_offset>100000 or p_state not in('','queued','sending','accepted','failed','uncertain','cancelled') then raise exception 'Filtro inválido.';end if;
 perform private.whatsapp_expire();
 select count(*) into v_total from private.whatsapp_jobs where p_state='' or state=p_state;
 select coalesce(jsonb_agg(x.row order by x.created_at desc,x.id desc),'[]') into v_rows from (
 select j.id,j.created_at,jsonb_build_object('id',j.id,'kind',j.kind,'state',j.state,'createdAt',j.created_at,'updatedAt',j.updated_at,'student',s.name,'guardian',g.name,
 'phone',case when g.phone is null then null else '•••• '||right(regexp_replace(g.phone,'\D','','g'),4) end,
 'message',j.message,'actor',j.actor_snapshot,'attempts',j.attempt_count,'error',j.error,
 'history',(select coalesce(jsonb_agg(jsonb_build_object('at',a.started_at,'finishedAt',a.finished_at,'result',a.result,'actor',a.actor_snapshot,'error',a.error) order by a.started_at),'[]') from private.whatsapp_attempts a where a.job_id=j.id)) as row
 from private.whatsapp_jobs j left join public.students s on s.id=j.student_id left join public.guardians g on g.id=j.guardian_id where p_state='' or j.state=p_state order by j.created_at desc,j.id desc limit 25 offset p_offset)x;
 return jsonb_build_object('entries',v_rows,'total',v_total,'settings',(select to_jsonb(c)-'id'-'updated_by' from private.whatsapp_settings c),'workerLastSeen',(select max(heartbeat_at) from private.whatsapp_workers where active));
end;$$;
create function private.whatsapp_save_settings(p_settings jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Acesso restrito.';end if;
 update private.whatsapp_settings set due_enabled=(p_settings->>'due_enabled')::boolean,overdue_enabled=(p_settings->>'overdue_enabled')::boolean,welcome_enabled=(p_settings->>'welcome_enabled')::boolean,receipt_enabled=(p_settings->>'receipt_enabled')::boolean,send_hour=(p_settings->>'send_hour')::integer,days_before=(p_settings->>'days_before')::integer,updated_at=clock_timestamp(),updated_by=auth.uid();
 insert into public.audit_events(actor_id,entity,entity_id,action,metadata) values(auth.uid(),'whatsapp_settings','school','UPDATE',jsonb_build_object('settings',p_settings,'actor',private.whatsapp_actor()));
end;$$;
create function private.whatsapp_retry(p_job uuid,p_confirm_uncertain boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.whatsapp_jobs%rowtype;v_key text;v_phone text;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Acesso restrito.';end if;
 perform private.whatsapp_expire();select * into j from private.whatsapp_jobs where id=p_job for update;
 if j.id is null or j.state not in('failed','uncertain') or (j.state='uncertain' and not p_confirm_uncertain) then raise exception 'Confira a conversa antes de autorizar uma nova tentativa.';end if;
 if j.kind='attendance' and not exists(select 1 from public.attendance_logs where class_id=j.class_id and student_id=j.student_id and training_date=j.training_date and status=j.variant) then raise exception 'A chamada foi alterada. Use a marcação atual na tela de chamada.';end if;
 if not exists(select 1 from public.guardians where id=j.guardian_id and student_id=j.student_id and receives_notifications is distinct from false and coalesce(phone,'')<>'') then raise exception 'O responsável não está habilitado para receber avisos.';end if;
 select regexp_replace(phone,'\D','','g') into v_phone from public.guardians where id=j.guardian_id;
 if length(v_phone) in(10,11) then v_phone='55'||v_phone;end if;
 if md5(v_phone)<>j.destination_hash then raise exception 'O telefone foi alterado. Gere um aviso atualizado na tela de origem.';end if;
 if j.kind='callup' then
  select 'callup:'||s.id||':'||md5(jsonb_build_array(m.title,m.opponent,m.match_date,m.match_time,m.location,m.category_id,m.notes)::text),regexp_replace(g.phone,'\D','','g') into v_key,v_phone
  from public.match_callups s join public.matches m on m.id=s.match_id join public.guardians g on g.id=j.guardian_id where s.id=j.entity_id and m.status='scheduled' and m.match_date>=(clock_timestamp() at time zone 'America/Recife')::date;
  if length(v_phone) in(10,11) then v_phone='55'||v_phone;end if;
  if v_key is null or j.dedupe_key<>v_key||':'||v_phone then raise exception 'A convocação ou o contato foi alterado. Envie a versão atual na tela de jogos.';end if;
 end if;
 if j.expires_at<clock_timestamp() then raise exception 'Este aviso expirou. Gere um aviso atualizado na tela de origem.';end if;
 update private.whatsapp_jobs set state='queued',claim=null,error=null,updated_at=clock_timestamp() where id=p_job;
 -- Durable operator record also covers the decision to retry an uncertain attempt.
 insert into public.audit_events(actor_id,action,entity,entity_id,metadata)
 values(auth.uid(),'whatsapp.retry','whatsapp_jobs',p_job::text,jsonb_build_object('previous_state',j.state,'confirmed_conversation',p_confirm_uncertain,'actor',private.whatsapp_actor()));
 return jsonb_build_object('kind',j.kind,'entityId',j.entity_id,'classId',j.class_id,'date',j.training_date,'variant',j.variant);
end;$$;

-- Enqueue financial reminders once per event and recipient. No discounts or PIX settlement is invented.
create function private.whatsapp_enqueue(p_kind text,p_entity uuid,p_student uuid,p_message text,p_expires timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into private.whatsapp_jobs(dedupe_key,kind,entity_id,student_id,guardian_id,destination_hash,message,expires_at,actor_snapshot)
 select p_kind||':'||p_entity||':'||case when length(regexp_replace(g.phone,'\D','','g')) in(10,11) then '55' else '' end||regexp_replace(g.phone,'\D','','g'),p_kind,p_entity,p_student,g.id,md5(case when length(regexp_replace(g.phone,'\D','','g')) in(10,11) then '55' else '' end||regexp_replace(g.phone,'\D','','g')),p_message,p_expires,jsonb_build_object('name','Automação','role','system')
 from public.guardians g where g.student_id=p_student and g.receives_notifications is distinct from false and length(regexp_replace(g.phone,'\D','','g')) between 10 and 15 on conflict(dedupe_key) do nothing;
end;$$;
create function private.whatsapp_enqueue_scheduled(p_now timestamptz default clock_timestamp()) returns void language plpgsql security definer set search_path='' as $$
declare c private.whatsapp_settings%rowtype;r record;v_today date=(p_now at time zone 'America/Recife')::date;
begin
 select * into c from private.whatsapp_settings;
 if extract(hour from p_now at time zone 'America/Recife')<c.send_hour or extract(hour from p_now at time zone 'America/Recife')>=20 then return;end if;
 if not pg_try_advisory_xact_lock(hashtext('sport-whatsapp-reminders')) then return;end if;
 for r in select i.*,s.name from public.invoices i join public.students s on s.id=i.student_id join public.enrollments e on e.id=i.enrollment_id
 where i.charge_type='monthly' and i.status in('pending','overdue') and s.status='active' and e.status='active'
 and ((c.due_enabled and i.due_date=v_today+c.days_before) or (c.overdue_enabled and (date_trunc('month',i.due_date::timestamp)+interval '1 month')::date=v_today)) loop
  if c.due_enabled and r.due_date=v_today+c.days_before then
   perform private.whatsapp_enqueue('due',r.id,r.student_id,'⚽ Escolinha do Sport — Lembrete de mensalidade'||E'\n\nAtleta: '||r.name||E'\nReferência: '||r.reference_month||E'\nValor acordado: R$ '||replace(to_char(r.amount,'FM999999990.00'),'.',',')||E'\nVencimento: '||to_char(r.due_date,'DD/MM/YYYY')||E'\n\nPara descontos e formas de pagamento, fale com a secretaria. Se já pagou, envie o comprovante para conferência.',(v_today+1)::timestamp at time zone 'America/Recife');
  end if;
  if c.overdue_enabled and (date_trunc('month',r.due_date::timestamp)+interval '1 month')::date=v_today then
   perform private.whatsapp_enqueue('overdue',r.id,r.student_id,'⚽ Escolinha do Sport — Mensalidade em aberto'||E'\n\nAtleta: '||r.name||E'\nReferência: '||r.reference_month||E'\nValor acordado: R$ '||replace(to_char(r.amount,'FM999999990.00'),'.',',')||E'\n\nAinda não identificamos a baixa desta mensalidade. Fale com a secretaria para conferir ou regularizar. Se já pagou, envie o comprovante.',(v_today+1)::timestamp at time zone 'America/Recife');
  end if;
 end loop;
end;$$;
create function private.whatsapp_event_enqueue() returns trigger language plpgsql security definer set search_path='' as $$
declare c private.whatsapp_settings%rowtype;v_student uuid;v_name text;v_reference text;
begin
 select * into c from private.whatsapp_settings;
 if tg_table_name='enrollments' and c.welcome_enabled then
  if new.status<>'active' then return new;end if;v_student=new.student_id;
  select name into v_name from public.students where id=v_student;
  perform private.whatsapp_enqueue('welcome',new.id,v_student,'⚽ Bem-vindo à Escolinha do Sport!'||E'\n\nA matrícula de '||v_name||E' foi registrada. Nossa secretaria está à disposição para orientar sobre os treinos e o plano contratado.\n\nPelo Sport tudo! 🔴⚫',clock_timestamp()+interval '2 days');
 elsif tg_table_name='invoice_payments' and c.receipt_enabled then
  if new.legacy_import then return new;end if;
  select i.student_id,s.name,i.reference_month into v_student,v_name,v_reference from public.invoices i join public.students s on s.id=i.student_id where i.id=new.invoice_id;
  perform private.whatsapp_enqueue('receipt',new.id,v_student,'⚽ Escolinha do Sport — Recebimento registrado'||E'\n\nAtleta: '||v_name||E'\nReferência: '||v_reference||E'\nValor recebido: R$ '||replace(to_char(new.received_amount,'FM999999990.00'),'.',',')||E'\n\nO recebimento foi registrado pela equipe. Solicite o recibo detalhado à secretaria.',clock_timestamp()+interval '2 days');
 end if;return new;
end;$$;
create trigger whatsapp_enrollment_event after insert on public.enrollments for each row execute function private.whatsapp_event_enqueue();
create trigger whatsapp_payment_event after insert on public.invoice_payments for each row execute function private.whatsapp_event_enqueue();

-- Dedicated high-entropy capability for the backend worker; never a staff JWT or service-role key.
create function private.whatsapp_claim_scheduled(p_now timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.whatsapp_jobs%rowtype;g public.guardians%rowtype;c private.whatsapp_settings%rowtype;v_enabled boolean;
begin
 perform private.whatsapp_expire();perform private.whatsapp_enqueue_scheduled(p_now);
 select * into c from private.whatsapp_settings;
 -- All scheduled messages respect the configured Recife window, including receipts and welcome messages.
 if extract(hour from p_now at time zone 'America/Recife')<c.send_hour or extract(hour from p_now at time zone 'America/Recife')>=20 then return null;end if;
 for j in select * from private.whatsapp_jobs where state='queued' and kind in('due','overdue','welcome','receipt') and scheduled_at<=p_now and expires_at>p_now order by scheduled_at,id for update skip locked limit 20 loop
  v_enabled=case j.kind when 'due' then c.due_enabled when 'overdue' then c.overdue_enabled when 'welcome' then c.welcome_enabled when 'receipt' then c.receipt_enabled else false end;
  select * into g from public.guardians where id=j.guardian_id and student_id=j.student_id and receives_notifications is distinct from false;
  if not v_enabled or g.id is null or coalesce(g.phone,'')='' or j.destination_hash<>md5(case when length(regexp_replace(g.phone,'\D','','g')) in(10,11) then '55' else '' end||regexp_replace(g.phone,'\D','','g')) or not exists(select 1 from public.students where id=j.student_id and status='active')
   or (j.kind in('due','overdue') and not exists(select 1 from public.invoices i join public.enrollments e on e.id=i.enrollment_id where i.id=j.entity_id and i.status in('pending','overdue') and e.status='active'))
   or (j.kind='receipt' and exists(select 1 from public.payment_reversals where payment_id=j.entity_id))
   or (j.kind='welcome' and not exists(select 1 from public.enrollments where id=j.entity_id and status='active')) then
    update private.whatsapp_jobs set state='cancelled',error='Aviso suspenso: confira a autorização, matrícula ou situação financeira atual.',updated_at=clock_timestamp() where id=j.id;continue;
  end if;
  update private.whatsapp_jobs set state='sending',claim=gen_random_uuid(),locked_at=clock_timestamp(),attempt_count=attempt_count+1,updated_at=clock_timestamp() where id=j.id returning * into j;
  insert into private.whatsapp_attempts(job_id,claim,actor_snapshot) values(j.id,j.claim,jsonb_build_object('name','Automação','role','system'));
  return jsonb_build_object('id',j.id,'claim',j.claim,'phone',g.phone,'message',j.message);
 end loop;return null;
end;$$;

create function private.whatsapp_worker(p_token text,p_operation text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.whatsapp_jobs%rowtype;g public.guardians%rowtype;c private.whatsapp_settings%rowtype;v_enabled boolean;
begin
 if length(coalesce(p_token,''))<40 or not exists(select 1 from private.whatsapp_workers where active and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then raise exception 'Worker não autorizado.' using errcode='42501';end if;
 update private.whatsapp_workers set heartbeat_at=clock_timestamp() where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
 if p_operation='finish' then
  if not exists(select 1 from private.whatsapp_attempts where job_id=(p_payload->>'id')::uuid and claim=(p_payload->>'claim')::uuid and actor_snapshot->>'role'='system') then raise exception 'Tentativa não autorizada.';end if;
  return to_jsonb(private.whatsapp_complete((p_payload->>'id')::uuid,(p_payload->>'claim')::uuid,p_payload->>'result',p_payload->>'providerId',p_payload->>'error'));
 elsif p_operation<>'claim' then raise exception 'Operação inválida.';end if;
 return private.whatsapp_claim_scheduled(clock_timestamp());
end;$$;

create function public.whatsapp_reserve(p_kind text,p_entity uuid,p_guardian uuid,p_class uuid,p_date date,p_variant text,p_message text) returns jsonb language sql security invoker set search_path='' as $$select private.whatsapp_reserve(p_kind,p_entity,p_guardian,p_class,p_date,p_variant,p_message);$$;
create function public.whatsapp_finish(p_job uuid,p_claim uuid,p_result text,p_provider_id text,p_error text) returns boolean language sql security invoker set search_path='' as $$select private.whatsapp_finish(p_job,p_claim,p_result,p_provider_id,p_error);$$;
create function public.whatsapp_console(p_state text default '',p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select private.whatsapp_console(p_state,p_offset);$$;
create function public.whatsapp_save_settings(p_settings jsonb) returns void language sql security invoker set search_path='' as $$select private.whatsapp_save_settings(p_settings);$$;
create function public.whatsapp_retry(p_job uuid,p_confirm_uncertain boolean default false) returns jsonb language sql security invoker set search_path='' as $$select private.whatsapp_retry(p_job,p_confirm_uncertain);$$;
create function public.whatsapp_worker(p_token text,p_operation text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.whatsapp_worker(p_token,p_operation,p_payload);$$;
revoke all on function private.whatsapp_actor(),private.whatsapp_expire(),private.whatsapp_reserve(text,uuid,uuid,uuid,date,text,text),private.whatsapp_complete(uuid,uuid,text,text,text),private.whatsapp_finish(uuid,uuid,text,text,text),private.whatsapp_console(text,integer),private.whatsapp_save_settings(jsonb),private.whatsapp_retry(uuid,boolean),private.whatsapp_enqueue(text,uuid,uuid,text,timestamptz),private.whatsapp_enqueue_scheduled(timestamptz),private.whatsapp_claim_scheduled(timestamptz),private.whatsapp_event_enqueue(),private.whatsapp_worker(text,text,jsonb) from public,anon,authenticated;
revoke all on function public.whatsapp_reserve(text,uuid,uuid,uuid,date,text,text),public.whatsapp_finish(uuid,uuid,text,text,text),public.whatsapp_console(text,integer),public.whatsapp_save_settings(jsonb),public.whatsapp_retry(uuid,boolean),public.whatsapp_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function private.whatsapp_reserve(text,uuid,uuid,uuid,date,text,text),private.whatsapp_finish(uuid,uuid,text,text,text),private.whatsapp_console(text,integer),private.whatsapp_save_settings(jsonb),private.whatsapp_retry(uuid,boolean),public.whatsapp_reserve(text,uuid,uuid,uuid,date,text,text),public.whatsapp_finish(uuid,uuid,text,text,text),public.whatsapp_console(text,integer),public.whatsapp_save_settings(jsonb),public.whatsapp_retry(uuid,boolean) to authenticated;
grant usage on schema private to anon;
grant execute on function private.whatsapp_worker(text,text,jsonb),public.whatsapp_worker(text,text,jsonb) to anon;

-- Include the guardian identifier so attendance dispatch never trusts a client-supplied destination.
create or replace function public.attendance_notification_targets(p_students uuid[],p_class uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) or cardinality(p_students)>100 then raise exception 'Solicitação não autorizada.';end if;
 if p_class is not null and not private.can_class(p_class) then raise exception 'Turma não autorizada.';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'guardian',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'phone',g.phone,'receives_notifications',g.receives_notifications)) from public.guardians g where g.student_id=s.id),'[]'))),'[]') from public.students s where s.id=any(p_students) and private.can_student(s.id) and (p_class is null or exists(select 1 from public.enrollments e where e.student_id=s.id and e.class_id=p_class and e.status in('active','trial'))));
end;$$;
