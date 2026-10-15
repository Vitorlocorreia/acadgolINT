-- Every fixture and enrollment change rolls back. No payments or notifications are made.
begin;
do $$declare v_id uuid;begin
 insert into public.classes(name,unit_id,category_id,start_time,end_time,shift,days_of_week,max_students,import_source)
 select 'Verification imported class group',id,null,null,null,'afternoon','["ter","qui"]',null,
 jsonb_build_object('file_sha256',repeat('0',64),'group_key','verification') from public.units where is_active limit 1 returning id into v_id;
 perform set_config('test.class_id',v_id::text,true);
 update public.enrollments set class_id=v_id where id in(select e.id from public.enrollments e join public.students s on s.id=e.student_id where e.status='active' and s.status='active' order by e.id limit 2);
 begin
  insert into public.classes(name,unit_id,category_id,start_time,end_time,max_students)
  select 'Verification invalid regular class',id,null,null,null,20 from public.units where is_active limit 1;
  raise exception 'Unconfigured regular class accepted';
 exception when check_violation then null;end;
 perform set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.role='admin' and p.active and not p.must_change_password order by s.created_at desc limit 1),true);
end;$$;
set local role authenticated;
do $$declare v_id uuid:=current_setting('test.class_id')::uuid;v_details jsonb:=jsonb_build_object('name','Verification imported class group','category_id',null,'coach_id',null,'shift','afternoon','days_of_week','["ter","qui"]'::jsonb,'start_time',null,'end_time',null,'max_students',null);v_before jsonb;begin
 select to_jsonb(c) into v_before from public.classes c where id=v_id;
 perform public.update_class_details(v_id,v_details||'{"import_source":{"forged":true},"is_active":false,"unit_id":null}');
 if not exists(select 1 from public.classes where id=v_id and import_source=v_before->'import_source' and is_active and unit_id=(v_before->>'unit_id')::uuid and start_time is null and category_id is null and max_students is null) then raise exception 'Class update changed protected source fields';end if;
 begin perform public.update_class_details(v_id,v_details||'{"max_students":1}');raise exception 'Capacity smaller than active roster accepted';exception when raise_exception then if sqlerrm not like 'A capacidade não pode%' then raise;end if;end;
 begin perform public.update_class_details(v_id,v_details||'{"days_of_week":["ter","ter"]}');raise exception 'Duplicate weekdays accepted';exception when raise_exception then if sqlerrm not like 'Revise os dias%' then raise;end if;end;
 begin perform public.update_class_details(v_id,v_details||'{"start_time":"14:00"}');raise exception 'Incomplete time accepted';exception when raise_exception then if sqlerrm not like 'Preencha início%' then raise;end if;end;
 begin perform public.update_class_details(v_id,v_details||jsonb_build_object('coach_id',gen_random_uuid()));raise exception 'Unlinked trainer accepted';exception when raise_exception then if sqlerrm not like 'Selecione um usuário ativo%' then raise;end if;end;
 if jsonb_array_length(public.staff_class_roster(v_id,current_date))<>2 then raise exception 'Imported group roster mismatch';end if;
end;$$;
reset role;
set local role anon;
do $$begin
 begin perform public.update_class_details(current_setting('test.class_id')::uuid,'{}');raise exception 'Anonymous class update allowed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: import-only nullable configuration, protected provenance, active roster, capacity, schedule validation, trainer linkage and anonymous denial' verification;
