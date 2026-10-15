-- Catalog management is restricted to the same office roles that enroll athletes.
-- Prices already agreed in enrollments and invoices are never updated here.
alter table public.plans enable row level security;

alter table public.plans
  add constraint plans_name_valid check (length(btrim(name)) between 2 and 120),
  add constraint plans_price_valid check (price between 0 and 100000),
  add constraint plans_registration_valid check (registration_fee is not null and registration_fee between 0 and 100000),
  add constraint plans_frequency_valid check (frequency_per_week is not null and frequency_per_week between 1 and 7),
  add constraint plans_duration_valid check (duration_months is not null and duration_months between 1 and 36),
  add constraint plans_sibling_discount_valid check (sibling_discount_percent is not null and sibling_discount_percent between 0 and 100),
  add constraint plans_flags_valid check (includes_uniform is not null and is_active is not null);

grant insert (name,price,registration_fee,frequency_per_week,duration_months,sibling_discount_percent,includes_uniform,is_active),
      update (name,price,registration_fee,frequency_per_week,duration_months,sibling_discount_percent,includes_uniform,is_active)
on public.plans to authenticated;

create policy plans_office_insert on public.plans for insert to authenticated
  with check ((select private.has_role(array['admin','secretaria'])));
create policy plans_office_update on public.plans for update to authenticated
  using ((select private.has_role(array['admin','secretaria'])))
  with check ((select private.has_role(array['admin','secretaria'])));
