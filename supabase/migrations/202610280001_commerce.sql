-- Commerce layer: catalog presentation fields, server-priced checkout, payments,
-- shipment tracking, CMS fields, review moderation and public image buckets.
-- Run after 202610270001_initial.sql and 202610270002_customer_approval.sql.

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute procedure public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();
drop trigger if exists faqs_updated_at on public.faqs;
create trigger faqs_updated_at before update on public.faqs for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists subtitle text not null default '',
  add column if not exists badge text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

alter table public.product_variants
  add column if not exists sort_order integer not null default 0;

create index if not exists products_active_sort_idx on public.products (is_active, sort_order);
create index if not exists variants_product_sort_idx on public.product_variants (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Orders: numbering, contact, idempotency, payments, shipments
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'pending_payment', 'confirmed', 'draft_prepared', 'preview_approved', 'in_production', 'dispatched', 'delivered', 'cancelled'
));
alter table public.orders alter column status set default 'pending_payment';

create sequence if not exists public.order_number_seq start 1001;

alter table public.orders
  add column if not exists order_number text,
  add column if not exists idempotency_key uuid,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists gift_note text,
  add column if not exists subtotal_amount integer,
  add column if not exists shipping_amount integer not null default 0,
  add column if not exists payment_provider text,
  add column if not exists payment_order_id text,
  add column if not exists payment_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists courier_name text,
  add column if not exists tracking_url text,
  add column if not exists shipment_status text;

update public.orders set order_number = 'CK' || nextval('public.order_number_seq') where order_number is null;
alter table public.orders alter column order_number set default ('CK' || nextval('public.order_number_seq'));
alter table public.orders alter column order_number set not null;

create unique index if not exists orders_order_number_idx on public.orders (order_number);
create unique index if not exists orders_payment_order_idx on public.orders (payment_order_id) where payment_order_id is not null;
create unique index if not exists orders_user_idempotency_idx on public.orders (user_id, idempotency_key) where idempotency_key is not null;
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_courier_awb_idx on public.orders (courier_awb) where courier_awb is not null;

-- Customers never insert orders directly (RLS only lets admins write). Checkout
-- goes through this function, which prices every line from the database, checks
-- that each reference photo was uploaded by the caller, and is idempotent per key.
create or replace function public.place_order(
  p_items jsonb,
  p_contact jsonb,
  p_shipping jsonb,
  p_gift_note text,
  p_idempotency_key uuid
)
returns table (order_id uuid, order_number text, total_amount integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_existing public.orders;
  v_new public.orders;
  v_item jsonb;
  v_qty integer;
  v_price integer;
  v_path text;
  v_subtotal integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_idempotency_key is null then
    raise exception 'invalid_request';
  end if;

  select * into v_existing from public.orders o where o.user_id = v_uid and o.idempotency_key = p_idempotency_key;
  if found then
    return query select v_existing.id, v_existing.order_number, v_existing.total_amount;
    return;
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 10 then
    raise exception 'invalid_items';
  end if;

  if coalesce(length(btrim(p_contact ->> 'name')), 0) not between 2 and 100
    or coalesce(p_contact ->> 'phone', '') !~ '^\+?[0-9]{10,13}$'
    or coalesce(length(btrim(p_shipping ->> 'line1')), 0) not between 3 and 200
    or coalesce(length(btrim(p_shipping ->> 'city')), 0) not between 2 and 80
    or coalesce(length(btrim(p_shipping ->> 'state')), 0) not between 2 and 80
    or coalesce(p_shipping ->> 'pincode', '') !~ '^[1-9][0-9]{5}$'
  then
    raise exception 'invalid_address';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_item ->> 'quantity', '') !~ '^[0-9]{1,2}$' or coalesce(v_item ->> 'variant_id', '') !~* '^[0-9a-f-]{36}$' then
      raise exception 'invalid_items';
    end if;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty not between 1 and 5 then
      raise exception 'invalid_items';
    end if;

    select v.price_inr into v_price
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = (v_item ->> 'variant_id')::uuid and v.is_active and p.is_active;
    if not found then
      raise exception 'variant_unavailable';
    end if;

    v_path := v_item ->> 'reference_path';
    if v_path is null
      or split_part(v_path, '/', 1) <> v_uid::text
      or not exists (select 1 from storage.objects so where so.bucket_id = 'customer-reference-images' and so.name = v_path)
    then
      raise exception 'missing_reference_photo';
    end if;

    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  insert into public.orders (
    user_id, status, payment_status, total_amount, subtotal_amount, shipping_amount, shipping_address,
    contact_name, contact_email, contact_phone, gift_note, idempotency_key
  ) values (
    v_uid, 'pending_payment', 'pending', v_subtotal, v_subtotal, 0,
    jsonb_build_object(
      'line1', left(btrim(p_shipping ->> 'line1'), 200),
      'line2', left(btrim(coalesce(p_shipping ->> 'line2', '')), 200),
      'landmark', left(btrim(coalesce(p_shipping ->> 'landmark', '')), 120),
      'city', left(btrim(p_shipping ->> 'city'), 80),
      'state', left(btrim(p_shipping ->> 'state'), 80),
      'pincode', p_shipping ->> 'pincode',
      'country', 'IN'
    ),
    left(btrim(p_contact ->> 'name'), 100),
    (select u.email from auth.users u where u.id = v_uid),
    p_contact ->> 'phone',
    left(nullif(btrim(coalesce(p_gift_note, '')), ''), 500),
    p_idempotency_key
  )
  returning * into v_new;

  insert into public.order_items (
    order_id, product_variant_id, product_title, variant_snapshot, quantity, unit_price, custom_reference_image_path, custom_notes
  )
  select
    v_new.id, v.id, p.title,
    jsonb_build_object('product_slug', p.slug, 'dimension', v.dimension, 'frame_finish', v.frame_finish, 'string_density', v.string_density),
    (e.value ->> 'quantity')::integer, v.price_inr, e.value ->> 'reference_path',
    left(nullif(btrim(coalesce(e.value ->> 'notes', '')), ''), 1000)
  from jsonb_array_elements(p_items) e
  join public.product_variants v on v.id = (e.value ->> 'variant_id')::uuid
  join public.products p on p.id = v.product_id;

  return query select v_new.id, v_new.order_number, v_new.total_amount;
end;
$$;
revoke all on function public.place_order(jsonb, jsonb, jsonb, text, uuid) from public, anon;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text, uuid) to authenticated;

-- Keep order progress in step with artwork proofs: uploading a proof moves the
-- order to "preview ready"; approving every item's latest proof moves it on.
create or replace function public.sync_order_status_from_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  select i.order_id into v_order_id from public.order_items i where i.id = new.order_item_id;
  if v_order_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    update public.orders set status = 'draft_prepared' where id = v_order_id and status in ('confirmed', 'draft_prepared');
  elsif new.approval_status = 'approved' and old.approval_status = 'pending' then
    if not exists (
      select 1 from public.order_items i
      where i.order_id = v_order_id
        and coalesce((
          select a.approval_status from public.custom_artwork_approvals a
          where a.order_item_id = i.id order by a.created_at desc limit 1
        ), 'none') <> 'approved'
    ) then
      update public.orders set status = 'preview_approved' where id = v_order_id and status = 'draft_prepared';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_order_status_from_approval() from public, anon, authenticated;

drop trigger if exists approvals_sync_order_status on public.custom_artwork_approvals;
create trigger approvals_sync_order_status
  after insert or update of approval_status on public.custom_artwork_approvals
  for each row execute procedure public.sync_order_status_from_approval();

-- ---------------------------------------------------------------------------
-- CMS: banners & FAQs
-- ---------------------------------------------------------------------------
alter table public.site_banners
  add column if not exists kind text not null default 'announcement',
  add column if not exists body text,
  add column if not exists sort_order integer not null default 0;
alter table public.site_banners drop constraint if exists site_banners_kind_check;
alter table public.site_banners add constraint site_banners_kind_check check (kind in ('announcement', 'promo'));

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
alter table public.reviews
  add column if not exists customer_name text not null default '',
  add column if not exists occasion text,
  add column if not exists photo_consent boolean not null default false,
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz;
create unique index if not exists reviews_order_item_unique_idx on public.reviews (order_item_id) where order_item_id is not null;

drop policy if exists reviews_customer_submit on public.reviews;
create policy reviews_customer_submit on public.reviews
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and not is_approved and not is_featured and admin_reply is null
    and order_item_id is not null
    and exists (
      select 1 from public.order_items i
      join public.orders o on o.id = i.order_id
      where i.id = order_item_id and o.user_id = (select auth.uid()) and o.status = 'delivered'
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: limits on private buckets, public catalog and review photo buckets
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 12582912,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'customer-reference-images';

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'approval-previews';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog-images', 'catalog-images', true, 6291456, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('review-photos', 'review-photos', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists catalog_images_admin_manage on storage.objects;
create policy catalog_images_admin_manage on storage.objects for all to authenticated
  using (bucket_id = 'catalog-images' and (select public.is_admin()))
  with check (bucket_id = 'catalog-images' and (select public.is_admin()));

drop policy if exists review_photos_upload_own on storage.objects;
create policy review_photos_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists review_photos_admin_delete on storage.objects;
create policy review_photos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
