create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  cover_image_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  dimension text not null,
  frame_finish text not null,
  string_density text not null default 'Standard',
  price_inr integer not null check (price_inr > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, dimension, frame_finish, string_density)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  status text not null default 'confirmed' check (status in ('confirmed', 'draft_prepared', 'preview_approved', 'in_production', 'dispatched', 'delivered', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  total_amount integer not null check (total_amount >= 0),
  shipping_address jsonb not null default '{}'::jsonb,
  courier_awb text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_variant_id uuid references public.product_variants (id) on delete set null,
  product_title text not null,
  variant_snapshot jsonb not null default '{}'::jsonb,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price > 0),
  custom_reference_image_path text,
  custom_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_artwork_approvals (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  draft_image_path text,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  client_feedback text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.site_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  target_url text,
  is_active boolean not null default false,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null default '',
  before_image_path text,
  after_image_path text,
  is_featured boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists approvals_order_item_idx on public.custom_artwork_approvals (order_item_id, created_at desc);
create index if not exists reviews_product_approved_idx on public.reviews (product_id, is_approved, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.custom_artwork_approvals enable row level security;
alter table public.site_banners enable row level security;
alter table public.reviews enable row level security;
alter table public.faqs enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;
revoke all on public.products, public.product_variants, public.orders, public.order_items,
  public.custom_artwork_approvals, public.site_banners, public.reviews, public.faqs from anon, authenticated;
grant select on public.products, public.product_variants, public.site_banners, public.reviews, public.faqs to anon, authenticated;
grant insert, update, delete on public.products, public.product_variants, public.orders,
  public.order_items, public.custom_artwork_approvals, public.site_banners, public.reviews, public.faqs to authenticated;
grant select on public.orders, public.order_items, public.custom_artwork_approvals to authenticated;

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (is_active or (select public.is_admin()));
drop policy if exists products_admin_manage on public.products;
create policy products_admin_manage on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists variants_public_read on public.product_variants;
create policy variants_public_read on public.product_variants
  for select to anon, authenticated using (
    is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active)
    or (select public.is_admin())
  );
drop policy if exists variants_admin_manage on public.product_variants;
create policy variants_admin_manage on public.product_variants
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists orders_read_own on public.orders;
create policy orders_read_own on public.orders
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists orders_admin_manage on public.orders;
create policy orders_admin_manage on public.orders
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists order_items_read_own on public.order_items;
create policy order_items_read_own on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );
drop policy if exists order_items_admin_manage on public.order_items;
create policy order_items_admin_manage on public.order_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists approvals_read_own on public.custom_artwork_approvals;
create policy approvals_read_own on public.custom_artwork_approvals
  for select to authenticated using (
    exists (
      select 1 from public.order_items i join public.orders o on o.id = i.order_id
      where i.id = order_item_id and o.user_id = (select auth.uid())
    ) or (select public.is_admin())
  );
drop policy if exists approvals_admin_manage on public.custom_artwork_approvals;
create policy approvals_admin_manage on public.custom_artwork_approvals
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists banners_public_read on public.site_banners;
create policy banners_public_read on public.site_banners
  for select to anon, authenticated using (
    is_active and (start_date is null or start_date <= now()) and (end_date is null or end_date >= now())
    or (select public.is_admin())
  );
drop policy if exists banners_admin_manage on public.site_banners;
create policy banners_admin_manage on public.site_banners
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated using (is_approved or user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists reviews_customer_submit on public.reviews;
create policy reviews_customer_submit on public.reviews
  for insert to authenticated with check (
    user_id = (select auth.uid()) and not is_approved and not is_featured
    and order_item_id is not null and exists (
      select 1 from public.order_items i join public.orders o on o.id = i.order_id
      where i.id = order_item_id and o.user_id = (select auth.uid())
    )
  );
drop policy if exists reviews_admin_manage on public.reviews;
create policy reviews_admin_manage on public.reviews
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists faqs_public_read on public.faqs;
create policy faqs_public_read on public.faqs
  for select to anon, authenticated using (is_active or (select public.is_admin()));
drop policy if exists faqs_admin_manage on public.faqs;
create policy faqs_admin_manage on public.faqs
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into storage.buckets (id, name, public)
values ('customer-reference-images', 'customer-reference-images', false),
       ('approval-previews', 'approval-previews', false)
on conflict (id) do nothing;

drop policy if exists customer_images_read_own on storage.objects;
create policy customer_images_read_own on storage.objects for select to authenticated
  using (bucket_id = 'customer-reference-images' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
drop policy if exists customer_images_upload_own on storage.objects;
create policy customer_images_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'customer-reference-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists customer_images_delete_own on storage.objects;
create policy customer_images_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'customer-reference-images' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

drop policy if exists approval_previews_read_owner_or_admin on storage.objects;
create policy approval_previews_read_owner_or_admin on storage.objects for select to authenticated
  using (bucket_id = 'approval-previews' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
drop policy if exists approval_previews_admin_manage on storage.objects;
create policy approval_previews_admin_manage on storage.objects for all to authenticated
  using (bucket_id = 'approval-previews' and (select public.is_admin()))
  with check (bucket_id = 'approval-previews' and (select public.is_admin()));