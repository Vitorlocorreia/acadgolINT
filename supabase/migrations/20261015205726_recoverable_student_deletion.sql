-- Recoverable deletion removes a student from operations without destroying financial records.
alter table public.students add column deleted_at timestamptz,
 add column deleted_by uuid references public.staff_profiles(id) on delete set null,
 add column deletion_reason text;
alter table public.students add constraint student_deleted_operational_guard check (
 deleted_at is null or (status is not distinct from 'paused' and portal_access_enabled is false and nullif(trim(deletion_reason),'') is not null and length(trim(deletion_reason)) between 5 and 500));
create index students_deleted_directory on public.students(deleted_at,name,id) where deleted_at is not null;
comment on column public.students.deleted_at is 'Recoverable operational deletion; invoices, receipts and history remain. Restoration returns the student paused.';

create function private.guard_deleted_student_operations() returns trigger language plpgsql security definer set search_path='' as $$
declare v_deleted timestamptz;
begin
 if tg_table_name='enrollments' then
  if new.status not in('active','trial') then return new;end if;
 elsif tg_table_name='whatsapp_jobs' then
  if new.state not in('queued','sending') then return new;end if;
 elsif tg_table_name='match_callups' then
  if not new.access_enabled then return new;end if;
 end if;
 select deleted_at into v_deleted from public.students where id=new.student_id for share;
 if v_deleted is not null then raise exception 'Atleta excluído. Recupere o cadastro antes de realizar esta operação.';end if;
 return new;
end;$$;
revoke all on function private.guard_deleted_student_operations() from public,anon,authenticated;
create trigger enrollments_deleted_student_guard before insert or update on public.enrollments for each row execute function private.guard_deleted_student_operations();
create trigger attendance_deleted_student_guard before insert or update on public.attendance_logs for each row execute function private.guard_deleted_student_operations();
create trigger callups_deleted_student_guard before insert or update on public.match_callups for each row execute function private.guard_deleted_student_operations();
create trigger whatsapp_deleted_student_guard before insert or update on private.whatsapp_jobs for each row execute function private.guard_deleted_student_operations();

create function private.change_student_deletion(p_student uuid,p_deleted boolean,p_reason text,p_expected_deleted_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.students%rowtype;v_actor jsonb;v_previous_reason text;v_paused integer;v_cancelled integer;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Seu perfil não pode excluir ou recuperar atletas.';end if;
 if p_deleted is null or p_student is null then raise exception 'Atleta inválido.';end if;
 if p_deleted and (p_reason is null or length(trim(p_reason)) not between 5 and 500) then raise exception 'Informe o motivo da exclusão, entre 5 e 500 caracteres.';end if;
 select * into s from public.students where id=p_student for update;
 if not found then raise exception 'Atleta não encontrado.';end if;
 select jsonb_build_object('name',full_name,'username',username,'role',role) into v_actor from public.staff_profiles where id=auth.uid();
 if p_deleted then
  if s.deleted_at is not null then return jsonb_build_object('success',true,'alreadyDeleted',true);end if;
  update public.students set deleted_at=clock_timestamp(),deleted_by=auth.uid(),deletion_reason=trim(p_reason),
   status='paused',portal_access_enabled=false,portal_token=gen_random_uuid(),portal_token_expires_at=clock_timestamp(),updated_at=now() where id=s.id;
  update public.enrollments set status='paused',updated_at=now() where student_id=s.id and status in('active','trial');
  get diagnostics v_paused=row_count;
  update public.match_callups set access_enabled=false where student_id=s.id and access_enabled;
  update public.trial_classes set status='cancelled',updated_at=now()
   where status='scheduled' and private.whatsapp_trial_student(feedback)=s.id;
  update private.whatsapp_jobs set state='cancelled',error='Aviso suspenso: cadastro do atleta excluído.',updated_at=clock_timestamp()
   where student_id=s.id and state='queued';
  get diagnostics v_cancelled=row_count;
  insert into public.audit_events(actor_id,entity,entity_id,action,metadata) values(auth.uid(),'students',s.id::text,'SOFT_DELETE_STUDENT',
   jsonb_build_object('actor_snapshot',v_actor,'reason',trim(p_reason),'previous_status',s.status,'enrollments_paused',v_paused,'queued_notices_cancelled',v_cancelled,'financial_history_preserved',true));
 else
  if s.deleted_at is null then return jsonb_build_object('success',true,'alreadyRestored',true);end if;
  if p_expected_deleted_at is null or p_expected_deleted_at is distinct from s.deleted_at then raise exception 'Este cadastro foi alterado. Atualize a página antes de recuperar.';end if;
  update public.students set deleted_at=null,deleted_by=null,deletion_reason=null,status='paused',portal_access_enabled=false,updated_at=now() where id=s.id;
  insert into public.audit_events(actor_id,entity,entity_id,action,metadata) values(auth.uid(),'students',s.id::text,'RESTORE_STUDENT',
   jsonb_build_object('actor_snapshot',v_actor,'deletion_reason',s.deletion_reason,'deleted_at',s.deleted_at,'restored_status','paused','financial_history_preserved',true));
 end if;
 return jsonb_build_object('success',true,'deleted',p_deleted);
end;$$;
revoke all on function private.change_student_deletion(uuid,boolean,text,timestamptz) from public,anon;
grant execute on function private.change_student_deletion(uuid,boolean,text,timestamptz) to authenticated;
create function public.change_student_deletion(p_student uuid,p_deleted boolean,p_reason text default '',p_expected_deleted_at timestamptz default null)
returns jsonb language sql security invoker set search_path='' as $$
 select private.change_student_deletion(p_student,p_deleted,p_reason,p_expected_deleted_at);
$$;
revoke all on function public.change_student_deletion(uuid,boolean,text,timestamptz) from public,anon;
grant execute on function public.change_student_deletion(uuid,boolean,text,timestamptz) to authenticated;

CREATE OR REPLACE FUNCTION public.student_directory(p_search text DEFAULT ''::text, p_status text DEFAULT 'all'::text, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v_total integer;v_page integer;v_students jsonb;v_pattern text;v_digits text;v_today date:=(now() at time zone 'America/Recife')::date;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Consulta de atletas não autorizada.';end if;
 if p_search is null or length(p_search)>120 or p_status is null or p_status not in('all','active','paused','trial','overdue','deleted') or p_page is null or p_page<1 or p_page>100000 then raise exception 'Revise os filtros de atletas.';end if;
 v_pattern='%'||replace(replace(replace(trim(p_search),E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%';
 v_digits=regexp_replace(p_search,'[^0-9]','','g');
 with filtered as materialized (
  select s.id,s.name,s.birth_date,s.status,s.preferred_position,s.deleted_at,
   case when s.photo_url like 'data:%' then null else s.photo_url end as photo_url
  from public.students s
  where ((p_status='deleted' and s.deleted_at is not null) or (p_status<>'deleted' and s.deleted_at is null and (p_status in('all','overdue') or s.status=p_status)))
   and (p_status<>'overdue' or exists(select 1 from public.invoices i where i.student_id=s.id and (i.status='overdue' or (i.status='pending' and i.due_date<v_today))))
   and (trim(p_search)='' or s.name ilike v_pattern or exists(select 1 from public.guardians g where g.student_id=s.id and (g.name ilike v_pattern or (v_digits<>'' and regexp_replace(g.phone,'[^0-9]','','g') like '%'||v_digits||'%'))))
 ), totals as (select count(*)::integer as n from filtered), selected as (
  select * from filtered order by name,id limit 50 offset ((least(p_page,greatest(1,(select ceil(n/50.0)::integer from totals)))-1)*50)
 )
 select t.n,least(p_page,greatest(1,ceil(t.n/50.0)::integer)),
  coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object(
   'guardian',coalesce((select jsonb_agg(jsonb_build_object('name',g.name,'phone',g.phone) order by g.created_at,g.id) from public.guardians g where g.student_id=s.id),'[]'),
   'enrollment',coalesce((select jsonb_agg(e.row) from (select jsonb_build_object('status',e.status,'class',case when c.id is null then null else jsonb_build_object('name',c.name,'unit',jsonb_build_object('name',u.name)) end) as row from public.enrollments e left join public.classes c on c.id=e.class_id left join public.units u on u.id=c.unit_id where e.student_id=s.id order by (e.status in('active','trial')) desc,e.created_at desc,e.id limit 1)e),'[]'),
   'overdue_count',(select count(*) from public.invoices i where i.student_id=s.id and (i.status='overdue' or (i.status='pending' and i.due_date<v_today)))
  ) order by s.name,s.id) from selected s),'[]') into v_total,v_page,v_students from totals t;
 return jsonb_build_object('students',v_students,'total',v_total,'page',v_page,'pageSize',50,'pages',greatest(1,ceil(v_total/50.0)::integer));
end;$function$;

CREATE OR REPLACE FUNCTION public.change_student_status(p_student uuid, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Alteração não autorizada.';end if;
 if exists(select 1 from public.students where id=p_student and deleted_at is not null) then raise exception 'Recupere o cadastro excluído antes de alterar a matrícula.';end if;
 if p_status not in('active','paused') then raise exception 'Situação inválida.';end if;
 perform 1 from public.students where id=p_student and status in('active','paused') for update;
 if not found then raise exception 'Atleta não encontrado ou matrícula ainda experimental.';end if;
 if p_status='active' and exists(select 1 from public.students where id=p_student and birth_date is null) then raise exception 'Complete a data de nascimento deste cadastro histórico antes de reativar a matrícula.';end if;
 update public.students set status=p_status,updated_at=now() where id=p_student;
 update public.enrollments set status=p_status,updated_at=now() where student_id=p_student and status in('active','paused');
 return true;
end;$function$;

CREATE OR REPLACE FUNCTION public.renew_family_access(p_student uuid, p_enabled boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_token uuid;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Alteração não autorizada.'; end if;
 update public.students set portal_token=gen_random_uuid(),portal_access_enabled=p_enabled,portal_token_expires_at=now()+interval '90 days',updated_at=now() where id=p_student and deleted_at is null returning portal_token into v_token;
 if not found then raise exception 'Atleta não encontrado.'; end if;
 return jsonb_build_object('token',case when p_enabled then v_token else null end,'enabled',p_enabled);
end; $function$;

CREATE OR REPLACE FUNCTION public.complete_imported_enrollment(p_enrollment uuid, p_class uuid, p_plan uuid, p_fee numeric, p_due_day integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.enrollments%rowtype;c public.classes%rowtype;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Atualização de matrícula não autorizada.';end if;
 if p_fee is null or p_fee<0 or p_fee>100000 or p_fee<>round(p_fee,2) or p_due_day is null or p_due_day not between 1 and 31 then raise exception 'Revise o valor e o vencimento.';end if;
 select * into e from public.enrollments where id=p_enrollment and import_source is not null for update;
 if not found then raise exception 'Matrícula importada não encontrada.';end if;
 if exists(select 1 from public.students where id=e.student_id and deleted_at is not null) then raise exception 'Recupere o cadastro excluído antes de editar a matrícula.';end if;
 select * into c from public.classes where id=p_class and is_active for update;
 if not found then raise exception 'Escolha uma turma ativa.';end if;
 if c.max_students is not null and (select count(*) from public.enrollments ee join public.students ss on ss.id=ee.student_id where ee.class_id=c.id and ee.status='active' and ss.status='active' and ee.id<>e.id)>=c.max_students then raise exception 'Esta turma está sem vagas.';end if;
 if p_plan is not null and not exists(select 1 from public.plans where id=p_plan and is_active) then raise exception 'Escolha um plano ativo.';end if;
 update public.enrollments set class_id=c.id,plan_id=p_plan,monthly_fee=p_fee,due_day=p_due_day,updated_at=now(),import_source=import_source||jsonb_build_object('reviewed_at',now(),'reviewed_by',auth.uid()) where id=e.id;
end;$function$;

CREATE OR REPLACE FUNCTION public.save_match(p_match uuid, p_payload jsonb, p_students uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m uuid;coach uuid;sid uuid;fee numeric;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) then raise exception 'Partida não autorizada.';end if;
 if p_match is not null then
  if not private.can_match(p_match) then raise exception 'Partida não autorizada.';end if;
  perform 1 from public.matches where id=p_match for update;if not found then raise exception 'Partida não encontrada.';end if;
 end if;
 if cardinality(p_students)>100 or length(trim(coalesce(p_payload->>'title','')))<3 or length(trim(coalesce(p_payload->>'opponent','')))<2 or (p_payload->>'match_date')::date is null then raise exception 'Revise a partida e os atletas.';end if;
 coach=case when private.staff_role()='treinador' then private.staff_coach() else nullif(p_payload->>'coach_id','')::uuid end;
 foreach sid in array p_students loop
  if not private.can_student(sid) or exists(select 1 from public.students where id=sid and deleted_at is not null) then raise exception 'Atleta fora das turmas autorizadas.';end if;
 end loop;
 fee=coalesce((p_payload->>'registration_fee')::numeric,0);if fee<0 or fee>100000 then raise exception 'Taxa inválida.';end if;
 if p_match is null then
  insert into public.matches(title,opponent,match_type,unit_id,category_id,coach_id,match_date,match_time,location,status,notes) values(trim(p_payload->>'title'),trim(p_payload->>'opponent'),coalesce(p_payload->>'match_type','friendly'),nullif(p_payload->>'unit_id','')::uuid,nullif(p_payload->>'category_id','')::uuid,coach,(p_payload->>'match_date')::date,nullif(p_payload->>'match_time','')::time,coalesce(nullif(p_payload->>'location',''),'A definir'),'scheduled',jsonb_build_object('fee',fee,'userNotes',coalesce(p_payload->>'user_notes',p_payload->>'notes',''))::text) returning id into m;
 else
  m=p_match;
  update public.matches set title=trim(p_payload->>'title'),opponent=trim(p_payload->>'opponent'),match_type=p_payload->>'match_type',category_id=nullif(p_payload->>'category_id','')::uuid,coach_id=coach,match_date=(p_payload->>'match_date')::date,match_time=nullif(p_payload->>'match_time','')::time,location=p_payload->>'location',notes=jsonb_build_object('fee',fee,'userNotes',coalesce(p_payload->>'user_notes',''))::text where id=m;
 end if;
 delete from public.match_callups where match_id=m and not(student_id=any(p_students));
 insert into public.match_callups(match_id,student_id,status,goals,assists) select m,x,'pending',0,0 from unnest(p_students)x on conflict(match_id,student_id) do nothing;
 return m;
end; $function$;
