alter table public.staff_profiles add column credential_reset_until timestamptz;
create function private.protect_reset_role() returns trigger language plpgsql set search_path='' as $$
begin
 if new.role is distinct from old.role and old.credential_reset_until>now() then raise exception 'Aguarde a redefinição de senha antes de alterar o cargo.';end if;
 return new;
end;$$;
revoke all on function private.protect_reset_role() from public,anon,authenticated;
create trigger protect_reset_role before update of role on public.staff_profiles for each row execute function private.protect_reset_role();

create or replace function public.complete_password_change() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.valid_session(auth.uid()) then raise exception 'Sessão inválida.';end if;
 if exists(select 1 from public.staff_profiles where id=auth.uid() and credential_reset_until>now()) then raise exception 'Aguarde a redefinição de senha e entre novamente.';end if;
 if not exists(select 1 from auth.users u join private.pending_password_changes p on p.user_id=u.id where u.id=auth.uid() and u.encrypted_password is distinct from p.password_hash) then raise exception 'Altere a senha antes de continuar.';end if;
 update public.staff_profiles set must_change_password=false,updated_at=now() where id=auth.uid() and active;
 return found;
end;$$;
revoke all on function public.complete_password_change() from public,anon;
grant execute on function public.complete_password_change() to authenticated;

create or replace function public.current_staff_profile() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then return null;end if;
 return(select to_jsonb(p)-'is_test'-'sessions_valid_after'-'credential_reset_until'||jsonb_build_object('session_valid',private.valid_session(p.id)) from public.staff_profiles p where p.id=auth.uid());
end;$$;
revoke all on function public.current_staff_profile() from public,anon;
grant execute on function public.current_staff_profile() to authenticated;
