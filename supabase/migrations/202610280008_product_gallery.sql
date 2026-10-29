-- Product page slideshow: extra images shown after the cover image.
-- Managed in /studio/catalog (upload or paste links). Safe to re-run.
alter table public.products add column if not exists gallery_image_urls text[] not null default '{}';

-- Start every product with the real Craftkiya pieces we have, cover first.
update public.products p
set gallery_image_urls = array(
  select u from unnest(array[
    '/art/string-art-portrait-smile.jpg',
    '/art/string-art-portrait-black.jpg',
    '/art/string-art-portrait-home.jpg'
  ]) as u
  where u is distinct from p.cover_image_url
)
where cardinality(p.gallery_image_urls) = 0;
