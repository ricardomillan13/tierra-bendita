export interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  show_in_display: boolean;
  display_order: number;
  // Schedule — null means no restriction (always available)
  available_days: number[] | null;  // 0=Sun, 1=Mon … 6=Sat
  available_from: string | null;    // "HH:MM"
  available_to: string | null;      // "HH:MM"
  has_sizes: boolean;
  price_large: number | null;
  is_featured: boolean;
  is_cross_sell: boolean;         // null = no size variant
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size?: 'medium' | 'large';  // only set when product.has_sizes = true
}

export interface Order {
  id: string;
  order_number: number;
  customer_whatsapp: string;
  customer_name: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  total: number;
  notes: string | null;
  whatsapp_notified: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discount_type: 'price' | 'text';
  discount_value: number | null;
  badge_text: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}