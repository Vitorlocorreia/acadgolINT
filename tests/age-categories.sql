-- Verify office creation and real class linkage without retaining any fixtures.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$ begin if auth.uid() is null then raise exception 'Current secretary session required';end if;end;$$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
set local role authenticated;
do $$ declare c uuid;new_class uuid;begin
 insert into public.categories(name,min_age,max_age,description) values('Categoria de verificação',18,19,'Faixa etária de teste') returning id into c;
 if not exists(select 1 from public.categories where id=c and min_age=18 and max_age=19) then raise exception 'New category not readable';end if;
 begin insert into public.categories(name,min_age,max_age) values(' CATEGORIA DE VERIFICAÇÃO ',18,19);raise exception 'Duplicate name accepted';exception when unique_violation then null;end;
 begin insert into public.categories(name,min_age,max_age) values('Faixa inválida',20,19);raise exception 'Invalid age range accepted';exception when check_violation then null;end;
 begin insert into public.categories(name,min_age,max_age) values('Idade inválida',-1,5);raise exception 'Negative age accepted';exception when check_violation then null;end;
 insert into public.classes(name,unit_id,category_id,coach_id,days_of_week,start_time,end_time,max_students,is_active)
 select 'Turma de verificação de categoria',unit_id,c,coach_id,days_of_week,start_time,end_time,max_students,true from public.classes where is_active limit 1 returning id into new_class;
 if new_class is null or not exists(select 1 from public.classes where id=new_class and category_id=c) then raise exception 'Category could not be selected for a class';end if;
 begin update public.categories set name='Alteração indevida' where id=c;raise exception 'Unrequested category editing enabled';exception when insufficient_privilege then null;end;
 begin delete from public.categories where id=c;raise exception 'Category deletion enabled';exception when insufficient_privilege then null;end;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin insert into public.categories(name,min_age,max_age) values('Categoria não autorizada',1,2);raise exception 'Unauthorized category creation accepted';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: category creation, returned identity, real class linkage, age validation, case-insensitive duplicate rejection and denied unauthorized changes. All changes rolled back.' as verification;
