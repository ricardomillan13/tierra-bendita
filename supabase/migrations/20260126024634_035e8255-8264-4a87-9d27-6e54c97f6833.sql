-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  customer_whatsapp TEXT NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  whatsapp_notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Categories: Public read, admin write (for now, public access)
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories can be managed by anyone" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- Products: Public read, admin write
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Products can be managed by anyone" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Orders: Public access for customers and admin
CREATE POLICY "Orders are viewable by everyone" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Orders can be created by anyone" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders can be updated by anyone" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Orders can be deleted by anyone" ON public.orders FOR DELETE USING (true);

-- Order items: Public access
CREATE POLICY "Order items are viewable by everyone" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Order items can be created by anyone" ON public.order_items FOR INSERT WITH CHECK (true);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample categories
INSERT INTO public.categories (name, description, display_order) VALUES
  ('Cafés', 'Deliciosos cafés preparados con granos premium', 1),
  ('Bebidas Frías', 'Refrescantes bebidas para cualquier momento', 2),
  ('Postres', 'Dulces tentaciones artesanales', 3),
  ('Snacks', 'Bocadillos para acompañar tu café', 4);

-- Insert sample products
INSERT INTO public.products (category_id, name, description, price, display_order) VALUES
  ((SELECT id FROM public.categories WHERE name = 'Cafés'), 'Espresso', 'Shot intenso de café 100% arábica', 2.50, 1),
  ((SELECT id FROM public.categories WHERE name = 'Cafés'), 'Americano', 'Espresso suavizado con agua caliente', 3.00, 2),
  ((SELECT id FROM public.categories WHERE name = 'Cafés'), 'Cappuccino', 'Espresso con leche vaporizada y espuma', 4.00, 3),
  ((SELECT id FROM public.categories WHERE name = 'Cafés'), 'Latte', 'Cremoso café con leche vaporizada', 4.50, 4),
  ((SELECT id FROM public.categories WHERE name = 'Bebidas Frías'), 'Frappuccino', 'Café helado cremoso', 5.50, 1),
  ((SELECT id FROM public.categories WHERE name = 'Bebidas Frías'), 'Té Helado', 'Refrescante té con limón', 3.50, 2),
  ((SELECT id FROM public.categories WHERE name = 'Postres'), 'Cheesecake', 'Cremoso pastel de queso artesanal', 5.00, 1),
  ((SELECT id FROM public.categories WHERE name = 'Postres'), 'Brownie', 'Intenso brownie de chocolate', 3.50, 2),
  ((SELECT id FROM public.categories WHERE name = 'Snacks'), 'Croissant', 'Croissant francés recién horneado', 2.50, 1),
  ((SELECT id FROM public.categories WHERE name = 'Snacks'), 'Sandwich Club', 'Sándwich clásico con pollo y vegetales', 6.00, 2);