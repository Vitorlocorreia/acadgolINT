-- Login aliases change atomically without replacing Auth identity/password.
-- Every profile and audit change in this verification rolls back.
begin;
do $$
declare
  target public.staff_profiles%rowtype;
  other public.staff_profiles%rowtype;
  password_before text;
  new_username text='verification.'||left(gen_random_uuid()::text,8);
  new_email text=gen_random_uuid()::text||'@example.invalid';
begin
  select * into target from public.staff_profiles order by id limit 1 for update;
  select * into other from public.staff_profiles where id<>target.id order by id limit 1;
  if target.id is null or other.id is null then raise exception 'Two verification accounts are required.';end if;
  select encrypted_password into password_before from auth.users where id=target.id;
  update public.staff_profiles set username=new_username,email=new_email,sessions_valid_after=clock_timestamp(),updated_by=target.id where id=target.id;
  if not exists(select 1 from public.staff_profiles where id=target.id and username=new_username and email=new_email and role=target.role and active=target.active) then raise exception 'Identity/profile was not preserved.';end if;
  if (select encrypted_password from auth.users where id=target.id) is distinct from password_before then raise exception 'Alias edit changed password.';end if;
  if not exists(select 1 from public.audit_events where entity='staff_profiles' and entity_id=target.id::text and action='UPDATE' and metadata->'changed_fields' @> '["username","email"]'::jsonb) then raise exception 'Alias change was not audited.';end if;
  begin
    update public.staff_profiles set username=other.username where id=target.id;
    raise exception 'Duplicate username was accepted.';
  exception when unique_violation then null;end;
  begin
    update public.staff_profiles set email=other.email where id=target.id;
    raise exception 'Duplicate email was accepted.';
  exception when unique_violation then null;end;
  if not exists(select 1 from public.staff_profiles where id=target.id and username=new_username and email=new_email) then raise exception 'Rejected edit damaged the previous aliases.';end if;
end;$$;
rollback;
select 'PASS: login aliases, identity/password preservation, uniqueness and audit verified; all changes rolled back' as verification;
