-- Bounded billing directory for the initial list and automatic search.
create function private.finance_advance_student_directory(p_search text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_search text;v_total integer;v_page integer;v_students jsonb;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Consulta financeira não autorizada.';end if;
 if p_search is null or length(p_search)>120 or p_page is null or p_page not between 1 and 100000 then raise exception 'Revise a pesquisa de atletas.';end if;
 v_search=private.finance_search_fold(trim(p_search));
 with eligible as materialized (
  select s.id,s.name,private.finance_search_fold(s.name) sort_name,e.monthly_fee,e.due_day
  from public.students s
  join lateral(select en.monthly_fee,en.due_day from public.enrollments en where en.student_id=s.id and en.status='active'
   order by en.created_at desc nulls last,en.id limit 1)e on true
  where s.status='active' and s.deleted_at is null
   and (v_search='' or position(v_search in private.finance_search_fold(s.name))>0 or exists(
    select 1 from public.guardians g where g.student_id=s.id and position(v_search in private.finance_search_fold(g.name))>0))
 ), totals as(select count(*)::integer n from eligible), selected as(
  select * from eligible order by sort_name,id limit 25 offset ((least(p_page,greatest(1,(select ceil(n/25.0)::integer from totals)))-1)*25)
 )
 select t.n,least(p_page,greatest(1,ceil(t.n/25.0)::integer)),coalesce((select jsonb_agg((to_jsonb(s)-'sort_name')||jsonb_build_object(
  'guardian_name',coalesce((select string_agg(g.name,' / ' order by g.name) from public.guardians g where g.student_id=s.id),'')) order by s.sort_name,s.id) from selected s),'[]'::jsonb)
 into v_total,v_page,v_students from totals t;
 return jsonb_build_object('students',v_students,'total',v_total,'page',v_page,'pages',greatest(1,ceil(v_total/25.0)::integer),'pageSize',25);
end;$$;
revoke all on function private.finance_advance_student_directory(text,integer) from public,anon;
grant execute on function private.finance_advance_student_directory(text,integer) to authenticated;
create function public.finance_advance_student_directory(p_search text,p_page integer)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.finance_advance_student_directory(p_search,p_page);
$$;
revoke all on function public.finance_advance_student_directory(text,integer) from public,anon;
grant execute on function public.finance_advance_student_directory(text,integer) to authenticated;

-- Prepares charges, never receipts. Invalid/paid/cancelled selections roll the entire statement back.
create function private.prepare_advance_monthly_invoices(p_students uuid[],p_month text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_student uuid;v_name text;v_result jsonb;v_invoices jsonb:='[]';v_created integer:=0;
begin
 if auth.uid() is null or not private.has_role(array['admin','secretaria','financeiro']) then raise exception 'Emissão de mensalidade não autorizada.';end if;
 if p_students is null or coalesce(array_ndims(p_students),0)<>1 or coalesce(array_length(p_students,1),0) not between 1 and 50 then
  raise exception 'Selecione de 1 a 50 atletas, sem repetir nomes.';
 end if;
 if array_position(p_students,null) is not null
  or (select count(distinct x) from unnest(p_students)x)<>cardinality(p_students) then
  raise exception 'Selecione de 1 a 50 atletas, sem repetir nomes.';
 end if;
 foreach v_student in array p_students loop
  select name into v_name from public.students where id=v_student;
  begin
   v_result=private.prepare_advance_monthly_invoice(v_student,p_month);
  exception when raise_exception then
   raise exception 'Não foi possível preparar a seleção. Atleta %: %. Nenhuma nova mensalidade desta seleção foi emitida.',coalesce(v_name,'não encontrado'),sqlerrm;
  end;
  if (v_result->>'created')::boolean then v_created=v_created+1;end if;
  v_invoices=v_invoices||jsonb_build_array(v_result->'invoice');
 end loop;
 return jsonb_build_object('success',true,'createdCount',v_created,'invoices',v_invoices);
end;$$;
revoke all on function private.prepare_advance_monthly_invoices(uuid[],text) from public,anon;
grant execute on function private.prepare_advance_monthly_invoices(uuid[],text) to authenticated;
create function public.prepare_advance_monthly_invoices(p_students uuid[],p_month text)
returns jsonb language sql security invoker set search_path='' as $$
 select private.prepare_advance_monthly_invoices(p_students,p_month);
$$;
revoke all on function public.prepare_advance_monthly_invoices(uuid[],text) from public,anon;
grant execute on function public.prepare_advance_monthly_invoices(uuid[],text) to authenticated;
