-- Performance tuning from the Supabase advisors.
-- 1. Each "<table>_admin_manage" policy was FOR ALL, which overlapped the
--    table's SELECT policy (those already include `or is_admin()`), so every
--    read evaluated two permissive policies. Split admin rights into
--    insert/update/delete only; reads stay covered by the existing SELECT policies.
-- 2. Index the two foreign keys that had no covering index.

do $$
declare
  t text;
  base text;
begin
  for t, base in select * from (values
    ('products', 'products_admin'),
    ('product_variants', 'variants_admin'),
    ('orders', 'orders_admin'),
    ('order_items', 'order_items_admin'),
    ('custom_artwork_approvals', 'approvals_admin'),
    ('site_banners', 'banners_admin'),
    ('reviews', 'reviews_admin'),
    ('faqs', 'faqs_admin')
  ) as v (table_name, policy_base)
  loop
    execute format('drop policy if exists %I on public.%I', base || '_manage', t);
    execute format('drop policy if exists %I on public.%I', base || '_insert', t);
    execute format('drop policy if exists %I on public.%I', base || '_update', t);
    execute format('drop policy if exists %I on public.%I', base || '_delete', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))', base || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', base || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))', base || '_delete', t);
  end loop;
end;
$$;

create index if not exists order_items_variant_idx on public.order_items (product_variant_id);
create index if not exists reviews_user_idx on public.reviews (user_id);
