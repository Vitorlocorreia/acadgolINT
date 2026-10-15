alter table private.whatsapp_settings add column trial_confirmation_enabled boolean not null default false, add column trial_reminder_enabled boolean not null default false;
alter table private.whatsapp_jobs drop constraint whatsapp_jobs_kind_check;
alter table private.whatsapp_jobs add constraint whatsapp_jobs_kind_check check(kind in('attendance','callup','due','overdue','welcome','receipt','trial_confirmation','trial_reminder'));

create function private.whatsapp_trial_student(p_feedback text) returns uuid language plpgsql immutable set search_path='' as $$
begin return (p_feedback::jsonb->>'student_id')::uuid;exception when others then return null;end;$$;

create function private.whatsapp_queue_trial(p_trial uuid,p_kind text) returns void language plpgsql security definer set search_path='' as $$
declare t public.trial_classes%rowtype;v_student uuid;v_version text;v_message text;v_class text;
begin
 if p_kind not in('trial_confirmation','trial_reminder') then raise exception 'Tipo de aviso inválido.';end if;
 select * into t from public.trial_classes where id=p_trial and status='scheduled';
 if t.id is null or t.scheduled_time is null or (t.scheduled_date+t.scheduled_time) at time zone 'America/Recife'<=clock_timestamp() then return;end if;
 v_student=private.whatsapp_trial_student(t.feedback);if v_student is null then return;end if;
 select name into v_class from public.classes where id=private.trial_class_id(t.feedback);
 v_version=md5(jsonb_build_array(t.scheduled_date,t.scheduled_time,private.trial_class_id(t.feedback))::text);
 v_message='⚽ Escolinha do Sport — '||case when p_kind='trial_confirmation' then 'Aula experimental confirmada' else 'Lembrete de aula experimental' end||E'\n\nAtleta: '||t.student_name||E'\nData: '||to_char(t.scheduled_date,'DD/MM/YYYY')||E'\nHorário: '||to_char(t.scheduled_time,'HH24:MI')||case when v_class is not null then E'\nTurma: '||v_class else '' end||E'\n\nEsperamos vocês! Se precisar cancelar ou confirmar orientações de chegada, fale com a secretaria.';
 insert into private.whatsapp_jobs(dedupe_key,kind,entity_id,student_id,guardian_id,destination_hash,variant,message,expires_at,actor_snapshot)
 select p_kind||':'||t.id||':'||v_version||':'||case when length(regexp_replace(g.phone,'\D','','g')) in(10,11) then '55' else '' end||regexp_replace(g.phone,'\D','','g'),p_kind,t.id,v_student,g.id,md5(case when length(regexp_replace(g.phone,'\D','','g')) in(10,11) then '55' else '' end||regexp_replace(g.phone,'\D','','g')),v_version,v_message,(t.scheduled_date+t.scheduled_time) at time zone 'America/Recife',jsonb_build_object('name','Automação','role','system')
 from public.guardians g where g.student_id=v_student and g.receives_notifications is distinct from false and length(regexp_replace(g.phone,'\D','','g')) between 10 and 15 on conflict(dedupe_key) do nothing;
end;$$;
create function private.whatsapp_trial_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status<>'scheduled' or not (select trial_confirmation_enabled from private.whatsapp_settings) then return new;end if;
 if tg_op='UPDATE' then
  if new.scheduled_date is not distinct from old.scheduled_date and new.scheduled_time is not distinct from old.scheduled_time and private.trial_class_id(new.feedback) is not distinct from private.trial_class_id(old.feedback) then return new;end if;
 end if;
 perform private.whatsapp_queue_trial(new.id,'trial_confirmation');return new;
end;$$;
create trigger whatsapp_trial_confirmation after insert or update of scheduled_date,scheduled_time,feedback on public.trial_classes for each row execute function private.whatsapp_trial_created();
revoke all on function private.whatsapp_trial_student(text),private.whatsapp_queue_trial(uuid,text),private.whatsapp_trial_created() from public,anon,authenticated;

create or replace function private.whatsapp_save_settings(p_settings jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Acesso restrito.';end if;
 update private.whatsapp_settings set trial_confirmation_enabled=coalesce((p_settings->>'trial_confirmation_enabled')::boolean,trial_confirmation_enabled),trial_reminder_enabled=coalesce((p_settings->>'trial_reminder_enabled')::boolean,trial_reminder_enabled),due_enabled=(p_settings->>'due_enabled')::boolean,overdue_enabled=(p_settings->>'overdue_enabled')::boolean,welcome_enabled=(p_settings->>'welcome_enabled')::boolean,receipt_enabled=(p_settings->>'receipt_enabled')::boolean,send_hour=(p_settings->>'send_hour')::integer,days_before=(p_settings->>'days_before')::integer,updated_at=clock_timestamp(),updated_by=auth.uid();
 insert into public.audit_events(actor_id,entity,entity_id,action,metadata) values(auth.uid(),'whatsapp_settings','school','UPDATE',jsonb_build_object('settings',p_settings,'actor',private.whatsapp_actor()));
end;$$;

create or replace function private.whatsapp_enqueue_scheduled(p_now timestamptz default clock_timestamp()) returns void language plpgsql security definer set search_path='' as $$
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
 if c.trial_reminder_enabled then
  for r in select t.id from public.trial_classes t where t.status='scheduled' and t.scheduled_date=v_today+1 loop
   perform private.whatsapp_queue_trial(r.id,'trial_reminder');
  end loop;
 end if;
end;$$;

create or replace function private.whatsapp_claim_scheduled(p_now timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.whatsapp_jobs%rowtype;g public.guardians%rowtype;c private.whatsapp_settings%rowtype;v_enabled boolean;
begin
 perform private.whatsapp_expire();perform private.whatsapp_enqueue_scheduled(p_now);
 select * into c from private.whatsapp_settings;
 -- All scheduled messages respect the configured Recife window, including receipts and welcome messages.
 if extract(hour from p_now at time zone 'America/Recife')<c.send_hour or extract(hour from p_now at time zone 'America/Recife')>=20 then return null;end if;
 for j in select * from private.whatsapp_jobs where state='queued' and kind in('due','overdue','welcome','receipt','trial_confirmation','trial_reminder') and scheduled_at<=p_now and expires_at>p_now order by scheduled_at,id for update skip locked limit 20 loop
  v_enabled=case j.kind when 'due' then c.due_enabled when 'overdue' then c.overdue_enabled when 'welcome' then c.welcome_enabled when 'receipt' then c.receipt_enabled when 'trial_confirmation' then c.trial_confirmation_enabled when 'trial_reminder' then c.trial_reminder_enabled else false end;
  select * into g from public.guardians where id=j.guardian_id and student_id=j.student_id and receives_notifications is distinct from false;
  if not v_enabled or g.id is null or coalesce(g.phone,'')='' or j.destination_hash<>md5(case when length(regexp_replace(g.phone,'\D','','g')) in(10,11) then '55' else '' end||regexp_replace(g.phone,'\D','','g')) or not exists(select 1 from public.students where id=j.student_id and (status='active' or (j.kind in('trial_confirmation','trial_reminder') and status='trial')))
   or (j.kind in('due','overdue') and not exists(select 1 from public.invoices i join public.enrollments e on e.id=i.enrollment_id where i.id=j.entity_id and i.status in('pending','overdue') and e.status='active'))
   or (j.kind='receipt' and exists(select 1 from public.payment_reversals where payment_id=j.entity_id))
   or (j.kind in('trial_confirmation','trial_reminder') and not exists(select 1 from public.trial_classes t where t.id=j.entity_id and t.status='scheduled' and private.whatsapp_trial_student(t.feedback)=j.student_id and (t.scheduled_date+t.scheduled_time) at time zone 'America/Recife'>p_now and j.variant=md5(jsonb_build_array(t.scheduled_date,t.scheduled_time,private.trial_class_id(t.feedback))::text)))
   or (j.kind='welcome' and not exists(select 1 from public.enrollments where id=j.entity_id and status='active')) then
    update private.whatsapp_jobs set state='cancelled',error='Aviso suspenso: confira a autorização, matrícula ou situação financeira atual.',updated_at=clock_timestamp() where id=j.id;continue;
  end if;
  update private.whatsapp_jobs set state='sending',claim=gen_random_uuid(),locked_at=clock_timestamp(),attempt_count=attempt_count+1,updated_at=clock_timestamp() where id=j.id returning * into j;
  insert into private.whatsapp_attempts(job_id,claim,actor_snapshot) values(j.id,j.claim,jsonb_build_object('name','Automação','role','system'));
  return jsonb_build_object('id',j.id,'claim',j.claim,'phone',g.phone,'message',j.message);
 end loop;return null;
end;$$;



create or replace function public.schedule_trial(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s uuid;t uuid;c public.classes%rowtype;p uuid;age integer;d date;request uuid;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Agendamento não autorizado.';end if;
 request=(p_payload->>'request_id')::uuid;if request is null then raise exception 'Atualize o formulário.';end if;
 perform pg_advisory_xact_lock(hashtext(request::text));
 select id into t from public.trial_classes where request_id=request;if found then return jsonb_build_object('success',true,'trialId',t);end if;
 if length(trim(coalesce(p_payload->>'student_name','')))<3 or length(trim(coalesce(p_payload->>'guardian_name','')))<3 or length(regexp_replace(coalesce(p_payload->>'guardian_phone',''),'[^0-9]','','g')) not between 10 and 13 then raise exception 'Revise os nomes e telefone do responsável.';end if;
 age=(p_payload->>'student_age')::integer;d=(p_payload->>'scheduled_date')::date;
 if age is null or age<2 or age>25 or d is null or d<(now() at time zone 'America/Recife')::date then raise exception 'Revise a idade e a data da aula.';end if;
 select * into c from public.classes where id=nullif(p_payload->>'class_id','')::uuid and is_active for update;
 if not found then raise exception 'Selecione uma turma ativa para a aula.';end if;
 select id into p from public.plans where is_active order by price limit 1;if p is null then raise exception 'Cadastre um plano ativo antes de agendar.';end if;
 insert into public.students(name,birth_date,birth_date_estimated,status,preferred_position) values(trim(p_payload->>'student_name'),make_date(extract(year from current_date)::integer-age,1,1),true,'trial','A definir') returning id into s;
 insert into public.guardians(student_id,name,relationship,phone,email,receives_notifications) values(s,trim(p_payload->>'guardian_name'),'Responsável',p_payload->>'guardian_phone',nullif(p_payload->>'guardian_email',''),coalesce((p_payload->>'notifications_enabled')::boolean,false));
 insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,notes) values(s,c.id,p,d,10,0,'trial','Aula experimental');
 insert into public.trial_classes(student_name,student_age,guardian_name,guardian_phone,guardian_email,unit_id,category_id,scheduled_date,scheduled_time,status,feedback,request_id) values(trim(p_payload->>'student_name'),age,trim(p_payload->>'guardian_name'),p_payload->>'guardian_phone',nullif(p_payload->>'guardian_email',''),c.unit_id,c.category_id,d,c.start_time,'scheduled',jsonb_build_object('class_id',c.id,'student_id',s,'userNotes',p_payload->>'feedback')::text,request) returning id into t;
 return jsonb_build_object('success',true,'trialId',t);
end; $$;
