-- The fourth argument has no default, preserving unambiguous RPC calls from older deployments.
create function public.student_directory(p_search text,p_status text,p_page integer,p_class text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_total integer;v_page integer;v_students jsonb;v_pattern text;v_digits text;v_classes jsonb;
 v_today date:=(now() at time zone 'America/Recife')::date;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Consulta de atletas não autorizada.';end if;
 if p_search is null or length(p_search)>120 or p_status is null or p_status not in('all','active','paused','trial','overdue','deleted')
  or p_page is null or p_page not between 1 and 100000 or p_class is null
  or (p_class not in('all','unassigned') and p_class !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
  raise exception 'Revise os filtros de atletas.';
 end if;
 v_pattern='%'||replace(replace(replace(trim(p_search),E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%';
 v_digits=regexp_replace(p_search,'[^0-9]','','g');
 with filtered as materialized (
  select s.id,s.name,s.birth_date,s.status,s.preferred_position,s.deleted_at,
   case when s.photo_url like 'data:%' then null else s.photo_url end as photo_url,
   e.id enrollment_id,e.status enrollment_status,e.class_id
  from public.students s
  left join lateral (select en.id,en.status,en.class_id from public.enrollments en where en.student_id=s.id
   order by (en.status in('active','trial')) desc,en.created_at desc,en.id limit 1)e on true
  where ((p_status='deleted' and s.deleted_at is not null) or (p_status<>'deleted' and s.deleted_at is null and (p_status in('all','overdue') or s.status=p_status)))
   and (p_class='all' or (p_class='unassigned' and e.class_id is null) or e.class_id::text=lower(p_class))
   and (p_status<>'overdue' or exists(select 1 from public.invoices i where i.student_id=s.id and (i.status='overdue' or (i.status='pending' and i.due_date<v_today))))
   and (trim(p_search)='' or s.name ilike v_pattern or exists(select 1 from public.guardians g where g.student_id=s.id and (g.name ilike v_pattern or (v_digits<>'' and regexp_replace(g.phone,'[^0-9]','','g') like '%'||v_digits||'%'))))
 ), totals as (select count(*)::integer n from filtered), selected as (
  select * from filtered order by name,id limit 50 offset ((least(p_page,greatest(1,(select ceil(n/50.0)::integer from totals)))-1)*50)
 )
 select t.n,least(p_page,greatest(1,ceil(t.n/50.0)::integer)),
  coalesce((select jsonb_agg((to_jsonb(s)-'enrollment_id'-'enrollment_status'-'class_id')||jsonb_build_object(
   'guardian',coalesce((select jsonb_agg(jsonb_build_object('name',g.name,'phone',g.phone) order by g.created_at,g.id) from public.guardians g where g.student_id=s.id),'[]'),
   'enrollment',case when s.enrollment_id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('status',s.enrollment_status,'class',
    case when c.id is null then null else jsonb_build_object('id',c.id,'name',c.name,'unit',jsonb_build_object('name',u.name)) end)) end,
   'overdue_count',(select count(*) from public.invoices i where i.student_id=s.id and (i.status='overdue' or (i.status='pending' and i.due_date<v_today)))
  ) order by s.name,s.id) from selected s left join public.classes c on c.id=s.class_id left join public.units u on u.id=c.unit_id),'[]')
 into v_total,v_page,v_students from totals t;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'is_active',c.is_active) order by c.name,c.id),'[]')
 into v_classes from public.classes c;
 return jsonb_build_object('students',v_students,'total',v_total,'page',v_page,'pageSize',50,'pages',greatest(1,ceil(v_total/50.0)::integer),'classes',v_classes);
end;$$;
revoke all on function public.student_directory(text,text,integer,text) from public,anon;
grant execute on function public.student_directory(text,text,integer,text) to authenticated;

-- Keep one implementation for class filtering, search, counts, exclusions and pagination.
create or replace function public.student_directory(p_search text default '',p_status text default 'all',p_page integer default 1)
returns jsonb language sql stable security invoker set search_path='' as $$
 select public.student_directory(p_search,p_status,p_page,'all'::text);
$$;
revoke all on function public.student_directory(text,text,integer) from public,anon;
grant execute on function public.student_directory(text,text,integer) to authenticated;
