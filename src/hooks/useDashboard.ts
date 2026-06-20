import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DateRange = 'today' | 'week' | 'month' | 'all';

function getFromDate(range: DateRange): string | undefined {
  const now = new Date();
  if (range === 'today') {
    const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString();
  }
  if (range === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString();
  }
  if (range === 'month') {
    const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString();
  }
  return undefined;
}

// ── Local sales (source = 'menu') ─────────────────────────────────────────────
export function useLocalMetrics(range: DateRange) {
  const from = getFromDate(range);
  return useQuery({
    queryKey: ['dashboard_local', range],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('id, total, created_at, order_items(product_name, quantity, subtotal)')
        .eq('source', 'menu')
        .neq('status', 'cancelled');
      if (from) query = query.gte('created_at', from);
      const { data, error } = await query;
      if (error) throw error;
      return buildMetrics(data ?? []);
    },
    staleTime: 60000, // evita refetch si reabres el dashboard antes de 1 min
  });
}

// ── Field sales (source = 'sales_app') ────────────────────────────────────────
export function useFieldMetrics(range: DateRange) {
  const from = getFromDate(range);
  return useQuery({
    queryKey: ['dashboard_field', range],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          id, total, created_at, seller_id,
          sellers(name),
          order_items(product_name, quantity, subtotal)
        `)
        .eq('source', 'sales_app')
        .neq('status', 'cancelled');
      if (from) query = query.gte('created_at', from);
      const { data, error } = await query;
      if (error) throw error;
      return buildFieldMetrics(data ?? []);
    },
    staleTime: 60000,
  });
}

// ── Hourly breakdown (local only — to find peak hours) ───────────────────────
export function useHourlyMetrics(range: DateRange) {
  const from = getFromDate(range);
  return useQuery({
    queryKey: ['dashboard_hourly', range],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('created_at, total')
        .eq('source', 'menu')
        .neq('status', 'cancelled');
      if (from) query = query.gte('created_at', from);
      const { data, error } = await query;
      if (error) throw error;

      const hours: Record<number, { orders: number; total: number }> = {};
      for (let h = 0; h < 24; h++) hours[h] = { orders: 0, total: 0 };

      (data ?? []).forEach((o: any) => {
        const h = new Date(o.created_at).getHours();
        hours[h].orders++;
        hours[h].total += Number(o.total);
      });

      return Object.entries(hours).map(([hour, v]) => ({
        hour: Number(hour),
        label: `${hour.toString().padStart(2,'0')}:00`,
        ...v,
      }));
    },
  });
}

// ── Daily series for both channels ───────────────────────────────────────────
export function useDailySeries(range: DateRange) {
  const from = getFromDate(range);
  return useQuery({
    queryKey: ['dashboard_daily', range],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('created_at, total, source')
        .neq('status', 'cancelled');
      if (from) query = query.gte('created_at', from);
      const { data, error } = await query;
      if (error) throw error;

      const local: Record<string, number>  = {};
      const field: Record<string, number>  = {};

      (data ?? []).forEach((o: any) => {
        const day = o.created_at.slice(0, 10);
        if (o.source === 'menu') {
          local[day] = (local[day] ?? 0) + Number(o.total);
        } else {
          field[day] = (field[day] ?? 0) + Number(o.total);
        }
      });

      const allDays = [...new Set([...Object.keys(local), ...Object.keys(field)])].sort();
      return allDays.map(date => ({
        date,
        label: new Date(date + 'T12:00:00').toLocaleDateString('es', { month: 'short', day: 'numeric' }),
        local:  local[date]  ?? 0,
        field:  field[date]  ?? 0,
        total: (local[date] ?? 0) + (field[date] ?? 0),
      }));
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildMetrics(orders: any[]) {
  const totalSales  = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = orders.length;
  const avgTicket   = totalOrders > 0 ? totalSales / totalOrders : 0;

  const productMap: Record<string, { qty: number; total: number }> = {};
  orders.forEach(o => {
    o.order_items?.forEach((i: any) => {
      if (!productMap[i.product_name]) productMap[i.product_name] = { qty: 0, total: 0 };
      productMap[i.product_name].qty   += i.quantity;
      productMap[i.product_name].total += Number(i.subtotal);
    });
  });

  const sorted = Object.entries(productMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty);

  return {
    totalSales, totalOrders, avgTicket,
    topProducts:  sorted.slice(0, 5),
    leastSold:    [...sorted].reverse().slice(0, 5).filter(p => p.qty > 0),
    daily: buildDaily(orders),
  };
}

function buildFieldMetrics(orders: any[]) {
  const base = buildMetrics(orders);

  const sellerMap: Record<string, { name: string; sales: number; orders: number }> = {};
  orders.forEach((o: any) => {
    const sid   = o.seller_id ?? 'unknown';
    const sname = (o.sellers as any)?.name ?? 'Desconocido';
    if (!sellerMap[sid]) sellerMap[sid] = { name: sname, sales: 0, orders: 0 };
    sellerMap[sid].sales  += Number(o.total);
    sellerMap[sid].orders += 1;
  });

  const sellers = Object.entries(sellerMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.sales - a.sales);

  return { ...base, sellers };
}

function buildDaily(orders: any[]) {
  const map: Record<string, number> = {};
  orders.forEach(o => {
    const day = o.created_at.slice(0, 10);
    map[day] = (map[day] ?? 0) + Number(o.total);
  });
  return Object.entries(map)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}