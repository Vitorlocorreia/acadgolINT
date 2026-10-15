-- Transactional verification. No real enrollment, message or profile change is retained.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$ begin if auth.uid() is null then raise exception 'Current secretary session required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
create temporary table photo_fixture(plan uuid default gen_random_uuid(),request uuid default gen_random_uuid(),class uuid);
insert into photo_fixture(class) select id from public.classes where is_active limit 1;
insert into public.plans(id,name,price,includes_uniform,is_active) select plan,'Plano para verificar foto',100,false,true from photo_fixture;
grant select on photo_fixture to authenticated;
set local role authenticated;
do $$ declare f photo_fixture%rowtype;payload jsonb;r jsonb;photo text:='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=';begin
 select * into f from photo_fixture;
 payload=jsonb_build_object('request_id',f.request,'name','Verificação obrigatoriedade de foto','birth_date','2017-01-01','due_day',10,'monthly_fee',100,'guardians_json','[{"name":"Responsável de verificação","phone":"81900000000"}]','class_id',f.class,'plan_id',f.plan,'preferred_position','Meia','dominant_foot','Destro','uniform_size','M');
 begin perform public.enroll_student(payload);raise exception 'Enrollment accepted without photo';exception when raise_exception then if sqlerrm not like 'Anexe uma foto válida%' then raise;end if;end;
 begin perform public.enroll_student(payload||jsonb_build_object('photo_url','https://arbitrary.example/photo.jpg'));raise exception 'Unverified external photo accepted';exception when raise_exception then if sqlerrm not like 'Anexe uma foto válida%' then raise;end if;end;
 r=public.enroll_student(payload||jsonb_build_object('photo_url',photo));
 if not exists(select 1 from public.students where id=(r->>'studentId')::uuid and photo_url=photo) then raise exception 'Enrollment did not save the athlete photo';end if;
 if (select count(*) from public.invoices where student_id=(r->>'studentId')::uuid)<>1 then raise exception 'Enrollment first invoice changed';end if;
 r=public.enroll_student(payload||jsonb_build_object('photo_url',photo));
 if r->>'alreadyRecorded'<>'true' then raise exception 'Enrollment retry duplicated the athlete';end if;
end;$$;
reset role;
rollback;
select 'PASS: missing or external photos rejected, real inline photo saved, first invoice preserved, and retry idempotent. All fixtures rolled back.' as verification;
