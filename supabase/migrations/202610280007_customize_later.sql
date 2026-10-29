-- "Buy now, customize later": an order line may be placed without a reference
-- photo; the customer attaches it afterwards from their account.
-- 1. place_order: reference_path is optional (still verified when present).
-- 2. attach_reference_photo: lets the owner add or replace the photo on their
--    own order line until the artist uploads the first draft.

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

    -- The photo is optional ("customize later"), but if given it must be the caller's upload.
    v_path := nullif(v_item ->> 'reference_path', '');
    if v_path is not null and (
      split_part(v_path, '/', 1) <> v_uid::text
      or not exists (select 1 from storage.objects so where so.bucket_id = 'customer-reference-images' and so.name = v_path)
    ) then
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
    (e.value ->> 'quantity')::integer, v.price_inr, nullif(e.value ->> 'reference_path', ''),
    left(nullif(btrim(coalesce(e.value ->> 'notes', '')), ''), 1000)
  from jsonb_array_elements(p_items) e
  join public.product_variants v on v.id = (e.value ->> 'variant_id')::uuid
  join public.products p on p.id = v.product_id;

  return query select v_new.id, v_new.order_number, v_new.total_amount;
end;
$$;
revoke all on function public.place_order(jsonb, jsonb, jsonb, text, uuid) from public, anon;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text, uuid) to authenticated;

create or replace function public.attach_reference_photo(p_order_item_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_path is null
    or split_part(p_path, '/', 1) <> v_uid::text
    or not exists (select 1 from storage.objects so where so.bucket_id = 'customer-reference-images' and so.name = p_path)
  then
    raise exception 'missing_reference_photo';
  end if;

  update public.order_items i
  set custom_reference_image_path = p_path
  from public.orders o
  where i.id = p_order_item_id
    and o.id = i.order_id
    and o.user_id = v_uid
    and o.status in ('pending_payment', 'confirmed')
    and not exists (select 1 from public.custom_artwork_approvals a where a.order_item_id = i.id);
  if not found then
    raise exception 'not_allowed';
  end if;
end;
$$;
revoke all on function public.attach_reference_photo(uuid, text) from public, anon;
grant execute on function public.attach_reference_photo(uuid, text) to authenticated;
