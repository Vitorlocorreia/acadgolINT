-- Only office staff can add categories; existing coach read access is preserved.
alter table public.categories enable row level security;
alter table public.categories
  add constraint categories_name_valid check (length(btrim(name)) between 2 and 100),
  add constraint categories_age_range_valid check (min_age is not null and max_age is not null and min_age between 0 and 100 and max_age between min_age and 100),
  add constraint categories_description_valid check (description is null or length(description)<=500);
create unique index categories_name_unique on public.categories (lower(btrim(name)));
grant insert (name,min_age,max_age,description) on public.categories to authenticated;
create policy categories_office_insert on public.categories for insert to authenticated
  with check ((select private.has_role(array['admin','secretaria'])));
