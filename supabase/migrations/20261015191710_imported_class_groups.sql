-- Keep shift-only source groups honest: no fabricated age category, exact times or capacity.
alter table public.classes
 add column shift text,
 add column import_source jsonb,
 alter column category_id drop not null,
 alter column start_time drop not null,
 alter column end_time drop not null;
alter table public.classes
 add constraint classes_shift_valid check (shift is null or shift in ('morning','afternoon','evening')),
 add constraint classes_import_source_valid check (import_source is null or (
   jsonb_typeof(import_source)='object' and import_source ? 'file_sha256'
   and length(import_source->>'file_sha256')=64 and import_source ? 'group_key'
   and length(import_source->>'group_key') between 3 and 120)),
 add constraint classes_schedule_pair_valid check (
   (start_time is null and end_time is null) or
   (start_time is not null and end_time is not null and start_time<end_time)),
 add constraint classes_configuration_required check (
   import_source is not null or
   (category_id is not null and start_time is not null and end_time is not null and max_students is not null)),
 add constraint classes_capacity_valid check (max_students is null or max_students between 1 and 1000);
create unique index classes_import_group_unique on public.classes
 ((import_source->>'file_sha256'),(import_source->>'group_key')) where import_source is not null;
-- Only controlled maintenance imports may insert unconfigured source groups.
alter policy classes_office_create on public.classes with check (
 private.has_role(array['admin','secretaria']) and import_source is null and category_id is not null
 and length(trim(name)) between 3 and 120 and max_students between 1 and 100
 and start_time<end_time and jsonb_array_length(days_of_week) between 1 and 7);

create function public.update_class_details(p_class uuid,p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare c public.classes%rowtype; v_name text; v_category uuid; v_coach uuid;
 v_shift text; v_days jsonb; v_start time; v_end time; v_capacity integer;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then
  raise exception 'Seu perfil não pode editar turmas.'; end if;
 if p_details is null or jsonb_typeof(p_details)<>'object' then raise exception 'Dados da turma inválidos.';end if;
 select * into c from public.classes where id=p_class for update;
 if not found then raise exception 'Turma não encontrada.';end if;
 v_name=trim(p_details->>'name');v_category=nullif(p_details->>'category_id','')::uuid;
 v_coach=nullif(p_details->>'coach_id','')::uuid;v_shift=p_details->>'shift';
 v_days=p_details->'days_of_week';v_start=nullif(p_details->>'start_time','')::time;
 v_end=nullif(p_details->>'end_time','')::time;v_capacity=nullif(p_details->>'max_students','')::integer;
 if v_name is null or length(v_name) not between 3 and 120 or v_shift is null or v_shift not in('morning','afternoon','evening') then raise exception 'Revise o nome e o turno da turma.';end if;
 if v_days is null or jsonb_typeof(v_days)<>'array' then raise exception 'Escolha os dias de treino.';end if;
 if jsonb_array_length(v_days) not between 1 and 7 or exists(select 1 from jsonb_array_elements_text(v_days)d where d not in('dom','seg','ter','qua','qui','sex','sab')) or (select count(distinct d) from jsonb_array_elements_text(v_days)d)<>jsonb_array_length(v_days) then raise exception 'Revise os dias de treino.';end if;
 if (v_start is null)<>(v_end is null) or (v_start is not null and v_start>=v_end) then raise exception 'Preencha início e fim; o fim deve ser depois do início.';end if;
 if v_capacity is not null and (v_capacity<1 or v_capacity>1000) then raise exception 'Revise a capacidade da turma.';end if;
 if c.import_source is null and (v_category is null or v_start is null or v_capacity is null) then raise exception 'Preencha categoria, horários e capacidade.';end if;
 if v_category is not null and not exists(select 1 from public.categories where id=v_category) then raise exception 'Categoria não encontrada.';end if;
 if v_coach is not null and not exists(
  select 1 from public.staff_profiles p join public.coaches co on co.id=p.coach_id
  where p.coach_id=v_coach and p.role='treinador' and p.active and not p.is_test and co.is_active
 ) then raise exception 'Selecione um usuário ativo com cargo de treinador em Equipe e acessos.';end if;
 if v_capacity is not null and v_capacity<(select count(*) from public.enrollments e join public.students s on s.id=e.student_id where e.class_id=c.id and e.status='active' and s.status='active') then raise exception 'A capacidade não pode ser menor que o número de atletas ativos vinculados.';end if;
 update public.classes set name=v_name,category_id=v_category,coach_id=v_coach,
  shift=v_shift,days_of_week=v_days,start_time=v_start,end_time=v_end,max_students=v_capacity,updated_at=now()
 where id=c.id;
end;$$;
revoke all on function public.update_class_details(uuid,jsonb) from public,anon;
grant execute on function public.update_class_details(uuid,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.enroll_student(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if c.category_id is null or c.start_time is null or c.end_time is null or c.max_students is null then raise exception 'Complete categoria, horários e capacidade da turma antes de novas matrículas.';end if;
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
 select * into c from public.classes where id=p_class and is_active for update;
 if not found then raise exception 'Escolha uma turma ativa.';end if;
 if c.max_students is not null and (select count(*) from public.enrollments ee join public.students ss on ss.id=ee.student_id where ee.class_id=c.id and ee.status='active' and ss.status='active' and ee.id<>e.id)>=c.max_students then raise exception 'Esta turma está sem vagas.';end if;
 if p_plan is not null and not exists(select 1 from public.plans where id=p_plan and is_active) then raise exception 'Escolha um plano ativo.';end if;
 update public.enrollments set class_id=c.id,plan_id=p_plan,monthly_fee=p_fee,due_day=p_due_day,updated_at=now(),import_source=import_source||jsonb_build_object('reviewed_at',now(),'reviewed_by',auth.uid()) where id=e.id;
end;$function$;

CREATE OR REPLACE FUNCTION public.staff_class_catalog(p_unit uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','treinador']) then raise exception 'Acesso restrito.'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('unit',jsonb_build_object('name',u.name),'category',jsonb_build_object('name',ca.name),'coach',jsonb_build_object('name',co.name),'active_students_count',(select count(*) from public.enrollments e join public.students s on s.id=e.student_id where e.class_id=c.id and e.status='active' and s.status='active')) order by case c.shift when 'morning' then 1 when 'afternoon' then 2 when 'evening' then 3 else 4 end,c.start_time,c.name,c.id),'[]') from public.classes c left join public.units u on u.id=c.unit_id left join public.categories ca on ca.id=c.category_id left join public.coaches co on co.id=c.coach_id where private.can_class(c.id) and (p_unit is null or c.unit_id=p_unit));
end; $function$;
