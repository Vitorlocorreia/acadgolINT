create or replace function public.enroll_student(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s uuid;e uuid;t public.trial_classes%rowtype; c public.classes%rowtype; p public.plans%rowtype; g jsonb; gs jsonb;request uuid;birthday date;day integer;fee numeric;today date:=(now() at time zone 'America/Recife')::date;firstday date;stock uuid;
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


revoke all on function public.enroll_student(jsonb) from public,anon;
grant execute on function public.enroll_student(jsonb) to authenticated;
