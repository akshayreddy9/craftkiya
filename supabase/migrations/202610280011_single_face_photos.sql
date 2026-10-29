-- All current photos are single faces: they belong to the Single Face product only.
-- Double Face and Family show a "sample photo coming soon" card until real photos are added
-- (Studio -> Catalog -> cover image / slideshow images).
update public.products p
set cover_image_url = v.cover,
    gallery_image_urls = v.gallery
from (values
  ('single-face-string-art-portrait', '/art/portrait-studio-smile.jpg',
   array['/art/craftkiya-easel-portrait.jpg', '/art/portrait-studio-scarf.jpg', '/art/portrait-studio-glance.jpg', '/art/portrait-studio-warm.jpg']),
  ('double-face-string-art-portrait', '/art/placeholder-double-face.jpg', array[]::text[]),
  ('family-string-art-portrait', '/art/placeholder-family.jpg', array[]::text[])
) as v (slug, cover, gallery)
where p.slug = v.slug;
