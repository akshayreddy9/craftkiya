-- DEPRECATED REFERENCE ONLY: Do not run this schema for the Next.js app.
-- Use supabase/migrations/202610270001_initial.sql instead. This legacy schema
-- predates Supabase Auth profiles and has incomplete RLS coverage.
-- Craftkiya.com Supabase/PostgreSQL Schema

-- USERS
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  phone text UNIQUE,
  name text,
  role text NOT NULL CHECK (role IN ('customer', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- PRODUCTS
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  cover_image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- PRODUCT VARIANTS
CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  dimension text NOT NULL, -- e.g., '30x30 cm'
  frame_finish text NOT NULL, -- e.g., 'Black', 'Matte Teak', 'Natural Pine'
  string_density text, -- e.g., 'Standard', 'Dense'
  price integer NOT NULL,
  is_active boolean DEFAULT true
);

-- ORDERS
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('confirmed', 'draft_prepared', 'preview_approved', 'in_production', 'dispatched', 'delivered', 'cancelled')),
  total_amount integer NOT NULL,
  payment_status text CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  shipping_address jsonb,
  courier_awb text,
  created_at timestamptz DEFAULT now()
);

-- ORDER ITEMS
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_variant_id uuid REFERENCES product_variants(id),
  quantity integer NOT NULL,
  custom_reference_image_url text,
  custom_notes text
);

-- CUSTOM ARTWORK APPROVALS
CREATE TABLE custom_artwork_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  draft_image_url text,
  approval_status text NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  client_feedback text,
  approved_at timestamptz
);

-- SITE BANNERS
CREATE TABLE site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  image_url text,
  is_active boolean DEFAULT true,
  start_date timestamptz,
  end_date timestamptz
);

-- REVIEWS
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  before_image_url text,
  after_image_url text,
  is_featured boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- FAQ
CREATE TABLE faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS POLICIES (EXAMPLES)
-- Users can only see/update their own orders, order_items, reviews, approvals
-- Admins can access everything

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_artwork_approvals ENABLE ROW LEVEL SECURITY;

-- Orders: customers see their own, admins see all
CREATE POLICY "Customers can view their orders" ON orders
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Order Items: customers see their own, admins see all
CREATE POLICY "Customers can view their order items" ON order_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))));

-- Reviews: customers see their own, admins see all
CREATE POLICY "Customers can view their reviews" ON reviews
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Custom Artwork Approvals: customers see their own, admins see all
CREATE POLICY "Customers can view their approvals" ON custom_artwork_approvals
  FOR SELECT USING (EXISTS (SELECT 1 FROM order_items WHERE id = order_item_id AND (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))));

-- Admins can do everything
CREATE POLICY "Admins full access" ON orders
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins full access" ON order_items
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins full access" ON reviews
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins full access" ON custom_artwork_approvals
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
