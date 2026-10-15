-- Update current catalog labels without changing identities, access or financial history.
update public.units set name=regexp_replace(name,'Academia do Gol','Escolinha do Sport','gi') where name ilike '%Academia do Gol%';
update public.uniform_inventory set item_name=regexp_replace(item_name,'Academia do Gol','Escolinha do Sport','gi') where item_name ilike '%Academia do Gol%';
update public.plans set name=regexp_replace(name,'Academia do Gol','Escolinha do Sport','gi') where name ilike '%Academia do Gol%';
