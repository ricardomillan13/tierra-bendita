import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CashRegisterClosing {
  id: string;
  closed_by: string | null;
  closing_date: string;
  total_sales: number;
  total_orders: number;
  orders_by_category: Record<string, { count: number; total: number }>;
  top_products: { name: string; quantity: number; total: number }[];
  notes: string | null;
  created_at: string;
}

export function useCashRegisterClosings() {
  return useQuery({
    queryKey: ['cash-register-closings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_register_closings')
        .select('*')
        .order('closing_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as CashRegisterClosing[];
    },
  });
}

export function useTodaysSales() {
  return useQuery({
    queryKey: ['todays-sales'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;
      
      // Get today's completed orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .in('status', ['completed', 'ready']);
      
      if (ordersError) throw ordersError;
      
      // Get order items for these orders
      const orderIds = orders?.map(o => o.id) || [];
      
      if (orderIds.length === 0) {
        return {
          totalSales: 0,
          totalOrders: 0,
          ordersByCategory: {},
          topProducts: [],
        };
      }
      
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_name, quantity, subtotal, product_id')
        .in('order_id', orderIds);
      
      if (itemsError) throw itemsError;
      
      // Get products with categories
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, category_id');
      
      if (productsError) throw productsError;
      
      // Get categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name');
      
      if (categoriesError) throw categoriesError;
      
      // Build product to category map
      const productCategoryMap = new Map<string, string>();
      products?.forEach(p => {
        const cat = categories?.find(c => c.id === p.category_id);
        productCategoryMap.set(p.id, cat?.name || 'Sin categoría');
      });
      
      // Calculate totals
      const totalSales = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const totalOrders = orders?.length || 0;
      
      // Orders by category
      const ordersByCategory: Record<string, { count: number; total: number }> = {};
      items?.forEach(item => {
        const categoryName = item.product_id 
          ? productCategoryMap.get(item.product_id) || 'Sin categoría'
          : 'Sin categoría';
        
        if (!ordersByCategory[categoryName]) {
          ordersByCategory[categoryName] = { count: 0, total: 0 };
        }
        ordersByCategory[categoryName].count += item.quantity;
        ordersByCategory[categoryName].total += Number(item.subtotal);
      });
      
      // Top products
      const productTotals = new Map<string, { quantity: number; total: number }>();
      items?.forEach(item => {
        const existing = productTotals.get(item.product_name) || { quantity: 0, total: 0 };
        productTotals.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          total: existing.total + Number(item.subtotal),
        });
      });
      
      const topProducts = Array.from(productTotals.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
      
      return {
        totalSales,
        totalOrders,
        ordersByCategory,
        topProducts,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useCreateCashClosing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      total_sales: number;
      total_orders: number;
      orders_by_category: Record<string, { count: number; total: number }>;
      top_products: { name: string; quantity: number; total: number }[];
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: closing, error } = await supabase
        .from('cash_register_closings')
        .insert({
          closed_by: user.user?.id,
          total_sales: data.total_sales,
          total_orders: data.total_orders,
          orders_by_category: data.orders_by_category,
          top_products: data.top_products,
          notes: data.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return closing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-closings'] });
    },
  });
}
