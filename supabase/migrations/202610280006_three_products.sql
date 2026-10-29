-- Three products, all 24-inch circles: Single Face, Double Face, Family.
-- The existing three products are renamed in place (ids, orders and reviews
-- keep their links). Adds an optional "original price" for strike-through
-- display; it must be higher than the selling price. Safe to re-run.

alter table public.product_variants add column if not exists compare_at_price_inr integer;
alter table public.product_variants drop constraint if exists variants_compare_at_check;
alter table public.product_variants add constraint variants_compare_at_check
  check (compare_at_price_inr is null or compare_at_price_inr > price_inr);

update public.products p set
  slug = v.new_slug, title = v.title, subtitle = v.subtitle, description = v.description,
  badge = v.badge, sort_order = v.sort_order, cover_image_url = v.cover, is_active = true
from (values
  ('mini-string-art-keepsake', 'single-face-string-art-portrait', 'Single Face String Art Portrait', 'One face, threaded by hand',
   'A 24-inch circular string-art portrait of one face (a parent, partner, friend or pet) made from your photograph. Our artist maps your photo, then winds one continuous black thread around a ring of pins until the face appears.',
   'Perfect gift', 1, '/art/string-art-portrait-smile.jpg'),
  ('couple-string-art-portrait', 'double-face-string-art-portrait', 'Double Face String Art Portrait', 'Two faces, one circle',
   'A 24-inch hand-threaded string-art portrait of you and your favourite person, made from a photo of the two of you. Perfect for anniversaries, weddings and couples.',
   'For couples', 2, '/art/string-art-portrait-black.jpg'),
  ('custom-string-art-portrait', 'family-string-art-portrait', 'Family String Art Portrait', 'Everyone you love, in one frame',
   'Bring the whole family into one 24-inch circle, hand-threaded from your family photo with one continuous black thread. Works best for three to five people standing close together.',
   'For families', 3, '/art/string-art-portrait-home.jpg')
) as v (old_slug, new_slug, title, subtitle, description, badge, sort_order, cover)
where p.slug in (v.old_slug, v.new_slug);

update public.product_variants pv set price_inr = v.price, compare_at_price_inr = v.compare_at, is_active = true
from public.products p, (values
  ('single-face-string-art-portrait', 4499, 6427),
  ('double-face-string-art-portrait', 5999, 8570),
  ('family-string-art-portrait', 7499, 10713)
) as v (slug, price, compare_at)
where pv.product_id = p.id and p.slug = v.slug
  and pv.dimension = '24-inch circle' and pv.frame_finish = 'White ring frame' and pv.string_density = 'Single thread';
