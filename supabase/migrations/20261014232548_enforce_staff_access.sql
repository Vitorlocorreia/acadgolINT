-- Remove legacy anonymous CRUD. Access now requires a current staff session and a specific role.
do $$ declare t record;p record;begin
 for t in select tablename from pg_tables where schemaname='public' and tablename not in('staff_profiles','audit_events','app_settings','invoice_payments','payment_reversals') loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t.tablename loop execute format('drop policy %I on public.%I',p.policyname,t.tablename);end loop;
  execute format('alter table public.%I enable row level security',t.tablename);
  execute format('revoke all on public.%I from public,anon,authenticated',t.tablename);
  execute format('grant all on public.%I to service_role',t.tablename);
 end loop;
end $$;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon,authenticated;
alter default privileges in schema public revoke execute on functions from public,anon;

grant select on public.students,public.guardians,public.medical_records,public.enrollments,public.technical_evaluations,public.uniform_inventory to authenticated;
create policy students_office_read on public.students for select to authenticated using(private.has_role(array['admin','secretaria']));
create policy guardians_office_read on public.guardians for select to authenticated using(private.has_role(array['admin','secretaria']));
create policy medical_office_read on public.medical_records for select to authenticated using(private.has_role(array['admin','secretaria']));
create policy enrollments_office_read on public.enrollments for select to authenticated using(private.has_role(array['admin','secretaria']));
create policy evaluations_office_read on public.technical_evaluations for select to authenticated using(private.has_role(array['admin','secretaria']));
create policy uniforms_office_read on public.uniform_inventory for select to authenticated using(private.has_role(array['admin','secretaria']));
grant update(photo_url) on public.students to authenticated;
create policy students_office_photo on public.students for update to authenticated using(private.has_role(array['admin','secretaria'])) with check(private.has_role(array['admin','secretaria']));
grant insert on public.guardians,public.uniform_inventory to authenticated;
grant update(receives_notifications),delete on public.guardians to authenticated;
create policy guardian_office_create on public.guardians for insert to authenticated with check(private.has_role(array['admin','secretaria']) and length(trim(name)) between 3 and 120 and length(regexp_replace(phone,'[^0-9]','','g')) between 10 and 13);
create policy guardian_office_update on public.guardians for update to authenticated using(private.has_role(array['admin','secretaria'])) with check(private.has_role(array['admin','secretaria']));
create policy guardian_office_delete on public.guardians for delete to authenticated using(private.has_role(array['admin','secretaria']));
create policy uniform_office_create on public.uniform_inventory for insert to authenticated with check(private.has_role(array['admin','secretaria']) and length(trim(item_name)) between 2 and 120 and length(size) between 1 and 12);

grant select on public.invoices,public.finance_invoices to authenticated;
create policy invoices_finance_read on public.invoices for select to authenticated using(private.has_role(array['admin','secretaria','financeiro']));

grant select on public.units,public.categories,public.plans,public.coaches,public.classes to authenticated;
create policy units_staff_read on public.units for select to authenticated using(private.has_role(array['admin','secretaria','treinador']));
create policy categories_staff_read on public.categories for select to authenticated using(private.has_role(array['admin','secretaria','treinador']));
create policy plans_office_read on public.plans for select to authenticated using(private.has_role(array['admin','secretaria']));
-- Coaches contain private phone numbers; coaches only see their own row.
create policy coaches_staff_read on public.coaches for select to authenticated using(private.has_role(array['admin','secretaria']) or (private.staff_role()='treinador' and id=private.staff_coach()));
create policy classes_staff_read on public.classes for select to authenticated using(private.can_class(id));
grant insert on public.classes to authenticated;
create policy classes_office_create on public.classes for insert to authenticated with check(private.has_role(array['admin','secretaria']) and length(trim(name)) between 3 and 120 and max_students between 1 and 100 and start_time<end_time and jsonb_array_length(days_of_week) between 1 and 7);

grant select,insert on public.attendance_logs to authenticated;
grant update(status,coach_notes) on public.attendance_logs to authenticated;
-- Upsert also needs update privileges for supplied identity columns; policy checks prevent moving a record out of scope.
grant update(class_id,student_id,training_date) on public.attendance_logs to authenticated;
create function private.can_attend(p_class uuid,p_student uuid,p_date date) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.can_class(p_class) and p_date between (now() at time zone 'America/Recife')::date-366 and (now() at time zone 'America/Recife')::date and exists(select 1 from public.enrollments e join public.students s on s.id=e.student_id where e.class_id=p_class and e.student_id=p_student and s.status in('active','trial') and(e.status='active' or(e.status='trial' and e.start_date=p_date)));
$$;
revoke all on function private.can_attend(uuid,uuid,date) from public,anon;
grant execute on function private.can_attend(uuid,uuid,date) to authenticated;
create policy attendance_staff_read on public.attendance_logs for select to authenticated using(private.can_class(class_id));
create policy attendance_staff_create on public.attendance_logs for insert to authenticated with check(private.can_attend(class_id,student_id,training_date) and status in('present','absent','justified') and length(coalesce(coach_notes,''))<=2000);
create policy attendance_staff_update on public.attendance_logs for update to authenticated using(private.can_class(class_id)) with check(private.can_attend(class_id,student_id,training_date) and status in('present','absent','justified') and length(coalesce(coach_notes,''))<=2000);

grant select on public.trial_classes to authenticated;
grant update(status,updated_at) on public.trial_classes to authenticated;
create policy trials_office_read on public.trial_classes for select to authenticated using(private.has_role(array['admin','secretaria']));
create policy trials_staff_update on public.trial_classes for update to authenticated using(private.has_role(array['admin','secretaria'])) with check(private.has_role(array['admin','secretaria']) and status in('scheduled','attended','missed','cancelled'));
-- Attendance can mark only the matching experimental session, through a scoped function.
create function public.sync_trial_attendance(p_class uuid,p_date date,p_students uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.can_class(p_class) or cardinality(p_students)>100 then raise exception 'Acesso restrito.';end if;
 update public.trial_classes set status='attended',updated_at=now() where status='scheduled' and scheduled_date=p_date and private.trial_class_id(feedback)=p_class and(feedback::jsonb->>'student_id')::uuid=any(p_students) and exists(select 1 from public.attendance_logs l where l.class_id=p_class and l.training_date=p_date and l.student_id=(feedback::jsonb->>'student_id')::uuid and l.status='present');
end;$$;
revoke all on function public.sync_trial_attendance(uuid,date,uuid[]) from public,anon;
grant execute on function public.sync_trial_attendance(uuid,date,uuid[]) to authenticated;

grant select on public.matches,public.match_callups to authenticated;
grant update(our_score,opponent_score,status) on public.matches to authenticated;
grant update(goals,assists,status) on public.match_callups to authenticated;
create policy matches_staff_read on public.matches for select to authenticated using(private.can_match(id));
create policy matches_staff_score on public.matches for update to authenticated using(private.can_match(id)) with check(private.can_match(id) and coalesce(our_score,0) between 0 and 100 and coalesce(opponent_score,0) between 0 and 100 and status in('scheduled','finished','cancelled'));
create policy callups_staff_read on public.match_callups for select to authenticated using(private.can_match(match_id));
create policy callups_staff_stats on public.match_callups for update to authenticated using(private.can_match(match_id)) with check(private.can_match(match_id) and coalesce(goals,0) between 0 and 100 and coalesce(assists,0) between 0 and 100 and status in('pending','confirmed','declined','played','absent'));

-- Legacy demo PIX payloads are not bank-issued payment instructions.
update public.invoices set pix_code=null where pix_code is not null;
-- Reissue family links once after removing public database access.
update public.students set portal_token=gen_random_uuid(),portal_token_expires_at=now()+interval '90 days';
