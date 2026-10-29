-- Replace the original phone photos with the cleaned-up studio shots
-- (/public/art/portrait-studio-*.jpg) and the easel photo.
-- Slideshow: the product's own image first, then the easel shot, then the other pieces.
update public.products p
set cover_image_url = v.cover,
    gallery_image_urls = v.gallery
from (values
  ('single-face-string-art-portrait', '/art/portrait-studio-smile.jpg',
   array['/art/craftkiya-easel-portrait.jpg', '/art/portrait-studio-scarf.jpg', '/art/portrait-studio-glance.jpg', '/art/portrait-studio-warm.jpg']),
  ('double-face-string-art-portrait', '/art/portrait-studio-scarf.jpg',
   array['/art/craftkiya-easel-portrait.jpg', '/art/portrait-studio-smile.jpg', '/art/portrait-studio-glance.jpg', '/art/portrait-studio-warm.jpg']),
  ('family-string-art-portrait', '/art/portrait-studio-warm.jpg',
   array['/art/craftkiya-easel-portrait.jpg', '/art/portrait-studio-smile.jpg', '/art/portrait-studio-scarf.jpg', '/art/portrait-studio-glance.jpg'])
) as v (slug, cover, gallery)
where p.slug = v.slug;
