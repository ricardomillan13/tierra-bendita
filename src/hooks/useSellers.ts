import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Seller {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  email?: string; // joined from auth via RPC or passed in
}

export interface SellerInventoryItem {
  id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
  product_name?: string;
  product_price?: number;
}

export interface SellerMetrics {
  seller_id: string;
  seller_name: string;
  total_sales: number;
  total_orders: number;
  top_products: { product_name: string; qty: number; total: number }[];
  least_sold: { product_name: string; qty: number; total: number }[];
}

// ── Sellers CRUD ──────────────────────────────────────────────────────────────
export function useSellers() {
  return useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Seller[];
    },
  });
}

export function useCreateSeller() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name: string;
    }) => {
      // 1. Create auth user via Supabase Admin API (service-role not available client-side)
      //    Instead we use signUp + immediately assign role via admin insert
      //    Workaround: use the standard signUp, then insert into sellers + user_roles
      //    Note: the new user will receive a confirmation email unless disabled in Supabase dashboard
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { seller_name: name },
        },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      const userId = authData.user.id;

      // 2. Insert seller profile
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .insert({ user_id: userId, name })
        .select()
        .single();
      if (sellerError) throw sellerError;

      // 3. Assign seller role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'seller' as any });
      if (roleError) throw roleError;

      return seller as Seller;
    },
    onSuccess: (seller) => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      toast({ title: `Vendedor "${seller.name}" creado`, description: 'Ya puede iniciar sesión en /sales' });
    },
    onError: (err: any) => {
      toast({ title: 'Error al crear vendedor', description: err.message, variant: 'destructive' });
    },
  });
}

export function useToggleSellerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('sellers').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sellers'] }),
  });
}

// ── Seller Inventory ──────────────────────────────────────────────────────────
export function useSellerInventory(sellerId?: string) {
  return useQuery({
    queryKey: ['seller_inventory', sellerId],
    enabled: !!sellerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_inventory')
        .select(`*, products(name, price)`)
        .eq('seller_id', sellerId!);
      if (error) throw error;
      return data.map((row: any) => ({
        ...row,
        product_name: row.products?.name,
        product_price: row.products?.price,
      })) as SellerInventoryItem[];
    },
  });
}

// Inventory visible to the seller themselves
export function useMyInventory(sellerId?: string) {
  return useSellerInventory(sellerId);
}

export function useUpsertSellerInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      seller_id,
      product_id,
      quantity,
      delta,
    }: {
      seller_id: string;
      product_id: string;
      quantity: number;
      delta?: number; // unidades netas movidas del inventario general (+asigna / -regresa)
    }) => {
      const { error } = await supabase
        .from('seller_inventory')
        .upsert(
          { seller_id, product_id, quantity, updated_at: new Date().toISOString() },
          { onConflict: 'seller_id,product_id' }
        );
      if (error) throw error;

      if (delta && delta > 0) {
        const { error: decErr } = await supabase.rpc('decrement_business_inventory', {
          p_product_id: product_id,
          p_qty:        delta,
        });
        if (decErr) throw decErr;
      } else if (delta && delta < 0) {
        const { error: incErr } = await supabase.rpc('increment_business_inventory', {
          p_product_id: product_id,
          p_qty:        -delta,
        });
        if (incErr) throw incErr;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['seller_inventory', vars.seller_id] });
      queryClient.invalidateQueries({ queryKey: ['business_inventory'] });
      toast({ title: 'Inventario actualizado' });
    },
    onError: (err: any) => {
      toast({ title: 'Error al actualizar inventario', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Seller Metrics ────────────────────────────────────────────────────────────
export function useSellerMetrics(sellerId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['seller_metrics', sellerId, from, to],
    enabled: !!sellerId,
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`id, total, created_at, order_items(product_name, quantity, subtotal)`)
        .eq('seller_id', sellerId!)
        .eq('source', 'sales_app')
        .neq('status', 'cancelled');

      if (from) query = query.gte('created_at', from);
      if (to)   query = query.lte('created_at', to);

      const { data, error } = await query;
      if (error) throw error;

      const totalSales  = data.reduce((s: number, o: any) => s + Number(o.total), 0);
      const totalOrders = data.length;

      // Aggregate product quantities
      const productMap: Record<string, { qty: number; total: number }> = {};
      data.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          if (!productMap[item.product_name]) {
            productMap[item.product_name] = { qty: 0, total: 0 };
          }
          productMap[item.product_name].qty   += item.quantity;
          productMap[item.product_name].total += Number(item.subtotal);
        });
      });

      const sorted = Object.entries(productMap)
        .map(([product_name, v]) => ({ product_name, ...v }))
        .sort((a, b) => b.qty - a.qty);

      return {
        total_sales:  totalSales,
        total_orders: totalOrders,
        top_products:  sorted.slice(0, 5),
        least_sold:    [...sorted].reverse().slice(0, 5),
        daily: buildDailySeries(data),
      };
    },
  });
}

// All sellers aggregate metrics for POS dashboard
export function useAllSellersMetrics(from?: string, to?: string) {
  return useQuery({
    queryKey: ['all_sellers_metrics', from, to],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`id, total, seller_id, created_at, sellers(name), order_items(product_name, quantity, subtotal)`)
        .eq('source', 'sales_app')
        .neq('status', 'cancelled');

      if (from) query = query.gte('created_at', from);
      if (to)   query = query.lte('created_at', to);

      const { data, error } = await query;
      if (error) throw error;

      const totalSales  = data.reduce((s: number, o: any) => s + Number(o.total), 0);
      const totalOrders = data.length;

      const productMap: Record<string, { qty: number; total: number }> = {};
      const sellerMap:  Record<string, { name: string; sales: number; orders: number }> = {};

      data.forEach((order: any) => {
        const sid   = order.seller_id ?? 'unknown';
        const sname = order.sellers?.name ?? 'Desconocido';
        if (!sellerMap[sid]) sellerMap[sid] = { name: sname, sales: 0, orders: 0 };
        sellerMap[sid].sales  += Number(order.total);
        sellerMap[sid].orders += 1;

        order.order_items?.forEach((item: any) => {
          if (!productMap[item.product_name]) productMap[item.product_name] = { qty: 0, total: 0 };
          productMap[item.product_name].qty   += item.quantity;
          productMap[item.product_name].total += Number(item.subtotal);
        });
      });

      const sortedProducts = Object.entries(productMap)
        .map(([product_name, v]) => ({ product_name, ...v }))
        .sort((a, b) => b.qty - a.qty);

      const sortedSellers = Object.entries(sellerMap)
        .map(([seller_id, v]) => ({ seller_id, ...v }))
        .sort((a, b) => b.sales - a.sales);

      return {
        total_sales:   totalSales,
        total_orders:  totalOrders,
        top_products:  sortedProducts.slice(0, 5),
        least_sold:    [...sortedProducts].reverse().slice(0, 5),
        sellers:       sortedSellers,
        daily:         buildDailySeries(data),
      };
    },
  });
}

function buildDailySeries(orders: any[]) {
  const map: Record<string, number> = {};
  orders.forEach(o => {
    const day = o.created_at.slice(0, 10);
    map[day] = (map[day] ?? 0) + Number(o.total);
  });
  return Object.entries(map)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Get the seller record for the currently logged-in seller user
export function useMySellerProfile(userId?: string) {
  return useQuery({
    queryKey: ['my_seller_profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Seller | null;
    },
  });
}
