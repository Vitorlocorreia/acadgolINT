alter table public.students add column enrollment_request_id uuid unique;
alter table public.trial_classes add column request_id uuid unique;

create function public.enroll_student(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s uuid;e uuid;t public.trial_classes%rowtype; c public.classes%rowtype; p public.plans%rowtype; g jsonb; gs jsonb;request uuid;birthday date;day integer;fee numeric;today date:=(now() at time zone 'America/Recife')::date;firstday date;stock uuid;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Matrícula não autorizada.';end if;
 request=(p_payload->>'request_id')::uuid;if request is null then raise exception 'Atualize o formulário de matrícula.';end if;
 perform pg_advisory_xact_lock(hashtext(request::text));
 select id into s from public.students where enrollment_request_id=request;
 if found then return jsonb_build_object('studentId',s,'alreadyRecorded',true);end if;
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
 insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status) values(s,c.id,p.id,today,day,fee,'active') returning id into e;
 firstday=date_trunc('month',today)::date;
 insert into public.invoices(enrollment_id,student_id,reference_month,due_date,amount,status,pix_code) values(e,s,to_char(today,'YYYY-MM'),firstday+least(day,extract(day from(firstday+interval '1 month'-interval '1 day'))::integer)-1,fee,'pending',null);
 if p.includes_uniform then
  select id into stock from public.uniform_inventory where item_type='kit_complete' and size=p_payload->>'uniform_size' for update;
  if stock is null then raise exception 'Kit deste tamanho não cadastrado no estoque.';end if;
  update public.uniform_inventory set quantity=quantity-1,updated_at=now() where id=stock and quantity>0;
  if not found then raise exception 'Kit sem estoque. Reponha antes de concluir este plano.';end if;
 end if;
 return jsonb_build_object('success',true,'studentId',s);
end; $$;

create function public.schedule_trial(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 insert into public.guardians(student_id,name,relationship,phone,email,receives_notifications) values(s,trim(p_payload->>'guardian_name'),'Responsável',p_payload->>'guardian_phone',nullif(p_payload->>'guardian_email',''),true);
 insert into public.enrollments(student_id,class_id,plan_id,start_date,due_day,monthly_fee,status,notes) values(s,c.id,p,d,10,0,'trial','Aula experimental');
 insert into public.trial_classes(student_name,student_age,guardian_name,guardian_phone,guardian_email,unit_id,category_id,scheduled_date,scheduled_time,status,feedback,request_id) values(trim(p_payload->>'student_name'),age,trim(p_payload->>'guardian_name'),p_payload->>'guardian_phone',nullif(p_payload->>'guardian_email',''),c.unit_id,c.category_id,d,c.start_time,'scheduled',jsonb_build_object('class_id',c.id,'student_id',s,'userNotes',p_payload->>'feedback')::text,request) returning id into t;
 return jsonb_build_object('success',true,'trialId',t);
end; $$;

create function public.save_match(p_match uuid,p_payload jsonb,p_students uuid[]) returns uuid language plpgsql security definer set search_path='' as $$
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
  if not private.can_student(sid) then raise exception 'Atleta fora das turmas autorizadas.';end if;
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
end; $$;
revoke all on function public.enroll_student(jsonb),public.schedule_trial(jsonb),public.save_match(uuid,jsonb,uuid[]) from public,anon;
grant execute on function public.enroll_student(jsonb),public.schedule_trial(jsonb),public.save_match(uuid,jsonb,uuid[]) to authenticated;
