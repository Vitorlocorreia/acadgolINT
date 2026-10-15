-- Verification for the initial staff accounts. All settings, fixtures and history roll back.
begin;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',p.id,'role','authenticated','session_id',s.id)::text from public.staff_profiles p join auth.sessions s on s.user_id=p.id where p.username='secretaria' and p.role='secretaria' and p.active and s.created_at>=p.sessions_valid_after order by s.created_at desc limit 1),true);
do $$ begin if auth.uid() is null then raise exception 'Sign in with the initial secretary account before this verification.';end if;end $$;
update public.staff_profiles set must_change_password=false where id=auth.uid();
create temporary table secretary_verification(student uuid,invoice uuid,coach_user uuid,secretary uuid);
insert into secretary_verification values(gen_random_uuid(),gen_random_uuid(),(select id from public.staff_profiles where role='treinador' limit 1),auth.uid());
grant select on secretary_verification to authenticated,service_role;
insert into public.students(id,name,birth_date,status) select student,'Verificação da secretaria',(current_date-interval '9 years')::date,'active' from secretary_verification;
insert into public.invoices(id,student_id,reference_month,due_date,amount,status,notes) select invoice,student,to_char(current_date,'YYYY-MM'),current_date,100,'pending','Observação preservada' from secretary_verification;
set local role authenticated;
do $$ declare v secretary_verification%rowtype;begin
 select * into v from secretary_verification;
 if not private.has_role(array['secretaria']) then raise exception 'Secretary session rejected';end if;
 if not exists(select 1 from public.staff_profiles where role='treinador') then raise exception 'Secretary cannot list trainer access';end if;
 if exists(select 1 from public.staff_profiles where role in('admin','financeiro')) then raise exception 'Secretary can list protected staff profiles';end if;
 begin update public.staff_profiles set role='admin' where id=auth.uid();raise exception 'Direct role escalation allowed';exception when insufficient_privilege then null;end;
 begin perform public.create_coach_access_profile('{}');raise exception 'Public profile provisioning allowed';exception when insufficient_privilege then null;end;
 perform public.record_manual_payment(jsonb_build_object('invoiceId',v.invoice,'idempotencyKey',gen_random_uuid(),'paymentMethod','pix','receivedAmount',100,'overdueOption','waive'));
 perform public.reverse_manual_payment(v.invoice,'Estorno de verificação pela secretaria');
 if not exists(select 1 from public.invoices where id=v.invoice and status='pending' and amount=100 and notes='Observação preservada') then raise exception 'Secretary reversal failed';end if;
end;$$;
reset role;
-- A reset locks the target's role until the credential update finishes.
do $$ declare target uuid;begin
 select coach_user into target from secretary_verification;
 update public.staff_profiles set credential_reset_until=now()+interval '2 minutes' where id=target;
 begin update public.staff_profiles set role='financeiro',coach_id=null where id=target;raise exception 'Role changed during password reset';exception when raise_exception then if sqlerrm not like 'Aguarde a redefinição%' then raise;end if;end;
 update public.staff_profiles set credential_reset_until=null where id=target;
end;$$;
set local role service_role;
do $$ declare before_count integer;v secretary_verification%rowtype;begin
 select * into v from secretary_verification;select count(*) into before_count from public.coaches;
 begin
  perform public.create_coach_access_profile(jsonb_build_object('id',v.coach_user,'full_name','Treinador de verificação','username','verification.'||left(gen_random_uuid()::text,8),'email','verification.'||gen_random_uuid()::text||'@accounts.acadgol.invalid','created_by',v.secretary));
  raise exception 'Duplicate Auth identity accepted';
 exception when unique_violation then null;end;
 if (select count(*) from public.coaches)<>before_count then raise exception 'Failed profile creation left an orphan coach';end if;
end;$$;
reset role;
rollback;
select 'PASS: secretary receives and reverses payments, sees trainer access only, cannot escalate roles or provision directly, and failed creation leaves no orphan coach; all fixtures rolled back' as verification;
