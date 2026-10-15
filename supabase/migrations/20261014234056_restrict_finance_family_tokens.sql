-- Billing staff do not receive family capabilities, which also unlock attendance and evaluations.
create or replace function private.billing_student(p_student uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then return null;end if;
 return(select jsonb_build_object('id',s.id,'name',s.name,'status',s.status,'portal_token',case when private.has_role(array['admin','secretaria']) then s.portal_token else null end,'guardian',coalesce((select jsonb_agg(jsonb_build_object('name',g.name,'phone',g.phone,'email',g.email)) from public.guardians g where g.student_id=s.id),'[]')) from public.students s where s.id=p_student);
end;$$;
revoke all on function private.billing_student(uuid) from public,anon;
grant execute on function private.billing_student(uuid) to authenticated;
