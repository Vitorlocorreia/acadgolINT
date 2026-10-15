alter table public.staff_profiles add column username text;
update public.staff_profiles set username='verificacao.'||left(id::text,8);
alter table public.staff_profiles alter column username set not null;
alter table public.staff_profiles add constraint staff_username_format check(username=lower(username) and username ~ '^[a-z0-9][a-z0-9._-]{2,39}$');
create unique index staff_username_unique on public.staff_profiles(username);

-- Buckets contain hashes, never passwords or raw addresses. Only Edge Functions can consume them.
create table private.request_buckets(bucket text primary key, hits integer not null, expires_at timestamptz not null);
revoke all on private.request_buckets from public,anon,authenticated;
create function public.consume_request_limit(p_bucket text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare v_hits integer;
begin
 if length(p_bucket)>160 or p_limit<1 or p_limit>1000 or p_seconds<10 or p_seconds>86400 then return false; end if;
 delete from private.request_buckets where expires_at<now()-interval '1 day';
 insert into private.request_buckets as b(bucket,hits,expires_at) values(p_bucket,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set hits=case when b.expires_at<now() then 1 else b.hits+1 end,expires_at=case when b.expires_at<now() then excluded.expires_at else b.expires_at end returning hits into v_hits;
 return v_hits<=p_limit;
end; $$;
revoke all on function public.consume_request_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_request_limit(text,integer,integer) to service_role;
