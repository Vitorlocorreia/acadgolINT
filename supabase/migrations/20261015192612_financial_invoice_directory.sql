-- Restrict financial lookup to verified office/finance staff and return only a bounded billing page.
create function private.finance_search_fold(p_text text) returns text language sql immutable parallel safe set search_path='' as $$
 select translate(lower(coalesce(p_text,'')),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn');
$$;
revoke all on function private.finance_search_fold(text) from public,anon;

create function private.finance_invoice_directory(p_month text,p_filters jsonb,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_q text;v_status text;v_class text;v_charge text;v_due text;v_sort text;
 v_total integer;v_page integer;v_counts jsonb;v_rows jsonb;v_classes jsonb;
 v_today date:=(now() at time zone 'America/Recife')::date;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Consulta financeira não autorizada.';end if;
 if p_month is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' or p_filters is null or jsonb_typeof(p_filters)<>'object' or p_page is null or p_page not between 1 and 100000 then raise exception 'Revise os filtros financeiros.';end if;
 v_q=private.finance_search_fold(trim(coalesce(p_filters->>'q','')));
 v_status=coalesce(p_filters->>'status','all');v_class=coalesce(p_filters->>'classId','all');
 v_charge=coalesce(p_filters->>'charge','all');v_due=coalesce(p_filters->>'due','all');v_sort=coalesce(p_filters->>'sort','name');
 if length(v_q)>120 or v_status not in('all','pending','paid','unconfirmed','overdue')
 or (v_class not in('all','unassigned') and v_class !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
 or v_charge not in('all','monthly','registration') or v_due not in('all','first','middle','last')
 or v_sort not in('name','due_date','amount_desc') then raise exception 'Revise os filtros financeiros.';end if;
 with base as materialized (
  select i.id,i.status,i.due_date,i.amount,private.finance_search_fold(s.name) sort_name,c.name class_name
  from public.invoices i join public.students s on s.id=i.student_id
  left join public.enrollments e on e.id=i.enrollment_id left join public.classes c on c.id=e.class_id
  where i.reference_month=p_month and i.status is distinct from 'cancelled'
   and (v_q='' or position(v_q in private.finance_search_fold(s.name))>0 or exists(
    select 1 from public.guardians g where g.student_id=s.id and position(v_q in private.finance_search_fold(g.name))>0))
   and (v_class='all' or (v_class='unassigned' and e.class_id is null) or e.class_id::text=v_class)
   and (v_charge='all' or i.charge_type=v_charge)
   and (v_due='all' or (v_due='first' and extract(day from i.due_date) between 1 and 10)
    or (v_due='middle' and extract(day from i.due_date) between 11 and 20)
    or (v_due='last' and extract(day from i.due_date) between 21 and 31))
 ), counts as (
  select jsonb_build_object('all',count(*),'pending',count(*) filter(where status in('pending','overdue','unconfirmed')),
   'paid',count(*) filter(where status='paid'),'unconfirmed',count(*) filter(where status='unconfirmed'),
   'overdue',count(*) filter(where status='overdue' or(status='pending' and due_date<v_today))) data from base
 ), filtered as materialized (
  select * from base where v_status='all' or (v_status='pending' and status in('pending','overdue','unconfirmed'))
   or(v_status='paid' and status='paid') or(v_status='unconfirmed' and status='unconfirmed')
   or(v_status='overdue' and (status='overdue' or(status='pending' and due_date<v_today)))
 ), totals as (select count(*)::integer n from filtered), ranked as (
  select f.*,row_number() over(order by case when v_sort='due_date' then due_date end,
   case when v_sort='amount_desc' then amount end desc,sort_name,id) position from filtered f
 ), selected as (
  select * from ranked order by position limit 50 offset ((least(p_page,greatest(1,(select ceil(n/50.0)::integer from totals)))-1)*50)
 )
 select t.n,least(p_page,greatest(1,ceil(t.n/50.0)::integer)),(select data from counts),
  coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('class_name',s.class_name) order by s.position)
   from selected s join public.finance_invoices v on v.id=s.id),'[]')
 into v_total,v_page,v_counts,v_rows from totals t;
 select coalesce(jsonb_agg(to_jsonb(c) order by c.name,c.id),'[]') into v_classes from (
  select distinct c.id,c.name from public.invoices i join public.enrollments e on e.id=i.enrollment_id
  join public.classes c on c.id=e.class_id where i.reference_month=p_month and i.status is distinct from 'cancelled'
 )c;
 return jsonb_build_object('invoices',v_rows,'counts',v_counts,'classes',v_classes,
  'pagination',jsonb_build_object('page',v_page,'pageSize',50,'total',v_total,'pages',greatest(1,ceil(v_total/50.0)::integer)));
end;$$;
revoke all on function private.finance_invoice_directory(text,jsonb,integer) from public,anon;
grant execute on function private.finance_invoice_directory(text,jsonb,integer) to authenticated;

create function public.finance_invoice_directory(p_month text,p_filters jsonb default '{}'::jsonb,p_page integer default 1)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.finance_invoice_directory(p_month,p_filters,p_page);
$$;
revoke all on function public.finance_invoice_directory(text,jsonb,integer) from public,anon;
grant execute on function public.finance_invoice_directory(text,jsonb,integer) to authenticated;
