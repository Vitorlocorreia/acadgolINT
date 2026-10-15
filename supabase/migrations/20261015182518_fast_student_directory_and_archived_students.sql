alter table public.students add column archive_note text;
alter table public.students alter column birth_date drop not null;
alter table public.students add constraint student_birth_date_or_paused_archive check (
 birth_date is not null or (status is not distinct from 'paused' and nullif(trim(archive_note),'') is not null)
);

create index students_name_id_idx on public.students(name,id);
create index invoices_month_status_due_id_idx on public.invoices(reference_month,status,due_date,id);

create function public.student_directory(p_search text default '',p_status text default 'all',p_page integer default 1)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_total integer;v_page integer;v_students jsonb;v_pattern text;v_digits text;v_today date:=(now() at time zone 'America/Recife')::date;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Consulta de atletas não autorizada.';end if;
 if p_search is null or length(p_search)>120 or p_status is null or p_status not in('all','active','paused','trial','overdue') or p_page is null or p_page<1 or p_page>100000 then raise exception 'Revise os filtros de atletas.';end if;
 v_pattern='%'||replace(replace(replace(trim(p_search),E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%';
 v_digits=regexp_replace(p_search,'[^0-9]','','g');
 with filtered as materialized (
  select s.id,s.name,s.birth_date,s.status,s.preferred_position,
   case when s.photo_url like 'data:%' then null else s.photo_url end as photo_url
  from public.students s
  where (p_status in('all','overdue') or s.status=p_status)
   and (p_status<>'overdue' or exists(select 1 from public.invoices i where i.student_id=s.id and (i.status='overdue' or (i.status='pending' and i.due_date<v_today))))
   and (trim(p_search)='' or s.name ilike v_pattern or exists(select 1 from public.guardians g where g.student_id=s.id and (g.name ilike v_pattern or (v_digits<>'' and regexp_replace(g.phone,'[^0-9]','','g') like '%'||v_digits||'%'))))
 ), totals as (select count(*)::integer as n from filtered), selected as (
  select * from filtered order by name,id limit 50 offset ((least(p_page,greatest(1,(select ceil(n/50.0)::integer from totals)))-1)*50)
 )
 select t.n,least(p_page,greatest(1,ceil(t.n/50.0)::integer)),
  coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object(
   'guardian',coalesce((select jsonb_agg(jsonb_build_object('name',g.name,'phone',g.phone) order by g.created_at,g.id) from public.guardians g where g.student_id=s.id),'[]'),
   'enrollment',coalesce((select jsonb_agg(e.row) from (select jsonb_build_object('status',e.status,'class',case when c.id is null then null else jsonb_build_object('name',c.name,'unit',jsonb_build_object('name',u.name)) end) as row from public.enrollments e left join public.classes c on c.id=e.class_id left join public.units u on u.id=c.unit_id where e.student_id=s.id order by (e.status in('active','trial')) desc,e.created_at desc,e.id limit 1)e),'[]'),
   'overdue_count',(select count(*) from public.invoices i where i.student_id=s.id and (i.status='overdue' or (i.status='pending' and i.due_date<v_today)))
  ) order by s.name,s.id) from selected s),'[]') into v_total,v_page,v_students from totals t;
 return jsonb_build_object('students',v_students,'total',v_total,'page',v_page,'pageSize',50,'pages',greatest(1,ceil(v_total/50.0)::integer));
end;$$;
revoke all on function public.student_directory(text,text,integer) from public,anon;
grant execute on function public.student_directory(text,text,integer) to authenticated;

create or replace function public.change_student_status(p_student uuid,p_status text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria']) then raise exception 'Alteração não autorizada.';end if;
 if p_status not in('active','paused') then raise exception 'Situação inválida.';end if;
 perform 1 from public.students where id=p_student and status in('active','paused') for update;
 if not found then raise exception 'Atleta não encontrado ou matrícula ainda experimental.';end if;
 if p_status='active' and exists(select 1 from public.students where id=p_student and birth_date is null) then raise exception 'Complete a data de nascimento deste cadastro histórico antes de reativar a matrícula.';end if;
 update public.students set status=p_status,updated_at=now() where id=p_student;
 update public.enrollments set status=p_status,updated_at=now() where student_id=p_student and status in('active','paused');
 return true;
end;$$;
revoke all on function public.change_student_status(uuid,text) from public,anon;
grant execute on function public.change_student_status(uuid,text) to authenticated;
