import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem, CartItem } from '@/types/menu';

// ── Audio ─────────────────────────────────────────────────────────────────────
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [
      { freq: 880,  start: 0,   duration: 0.25 },
      { freq: 1047, start: 0.2, duration: 0.4  },
    ];
    notes.forEach(({ freq, start, duration }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch { /* silently fail */ }
}

// ── Browser notifications ─────────────────────────────────────────────────────
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendBrowserNotification(orderNumber: number) {
  if (Notification.permission !== 'granted') return;
  new Notification('🔔 Nuevo pedido — Tierra Bendita', {
    body: `Pedido #${orderNumber} recibido`,
    icon: '/logo.png',
    tag: `order-${orderNumber}`,
    requireInteraction: true,
  });
}

// ── useOrders ─────────────────────────────────────────────────────────────────
export function useOrders() {
  const queryClient = useQueryClient();
  const queryClientRef     = useRef(queryClient);
  queryClientRef.current   = queryClient;

  const prevOrderIdsRef    = useRef<Set<string> | null>(null);
  const pendingChimeRef    = useRef(false); // chime queued for when tab becomes visible

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Order[];
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,  // ← keeps polling even when tab is hidden
    refetchOnWindowFocus: true,
  });

  // Detect new orders → chime + browser notification
  useEffect(() => {
    const orders = ordersQuery.data;
    if (!orders) return;

    const currentIds = new Set(orders.map(o => o.id));

    if (prevOrderIdsRef.current === null) {
      prevOrderIdsRef.current = currentIds;
      return;
    }

    const newOrders = orders.filter(
      o => !prevOrderIdsRef.current!.has(o.id) && o.status === 'pending'
    );

    if (newOrders.length > 0) {
      if (document.hidden) {
        // Tab is hidden: browser notification (OS plays its own sound)
        newOrders.forEach(o => sendBrowserNotification(o.order_number));
        // Queue chime for when the user returns to the tab
        pendingChimeRef.current = true;
      } else {
        // Tab is visible: play chime immediately
        playChime();
      }
    }

    prevOrderIdsRef.current = currentIds;
  }, [ordersQuery.data]);

  // Stable subscription + visibility handler
  useEffect(() => {
    // Realtime
    const channel = supabase
      .channel(`orders-rt-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => queryClientRef.current.invalidateQueries({ queryKey: ['orders'] })
      )
      .subscribe();

    // When tab becomes visible: refetch + play queued chime
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        queryClientRef.current.invalidateQueries({ queryKey: ['orders'] });
        if (pendingChimeRef.current) {
          pendingChimeRef.current = false;
          setTimeout(playChime, 300); // small delay so tab is fully active
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Request notification permission (non-blocking)
    requestNotificationPermission();

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return ordersQuery;
}

// ── Other hooks ───────────────────────────────────────────────────────────────

export function useOrderItems(orderId: string | null) {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      items, customerWhatsapp, customerName, notes,
    }: {
      items: CartItem[];
      customerWhatsapp: string;
      customerName?: string;
      notes?: string;
    }) => {
      const total = items.reduce(
        (sum, item) => sum + item.product.price * item.quantity, 0
      );
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({ customer_whatsapp: customerWhatsapp, customer_name: customerName || null, notes: notes || null, total })
        .select()
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id.startsWith('promo_') ? null : item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
      return order as Order;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order['status'] }) => {
      const { data, error } = await supabase
        .from('orders').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useMarkWhatsAppNotified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('orders').update({ whatsapp_notified: true }).eq('id', id).select().single();
      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useOrderHistory(filters: {
  search?: string;
  status?: 'completed' | 'cancelled' | 'all';
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['order-history', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .in('status', filters.status && filters.status !== 'all'
          ? [filters.status]
          : ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        // Add 1 day to include the full end date
        const to = new Date(filters.dateTo);
        to.setDate(to.getDate() + 1);
        query = query.lt('created_at', to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let orders = data as Order[];

      // Client-side search by name, whatsapp or order number
      if (filters.search) {
        const s = filters.search.toLowerCase();
        orders = orders.filter(o =>
          o.order_number.toString().includes(s) ||
          o.customer_whatsapp.includes(s) ||
          (o.customer_name?.toLowerCase().includes(s) ?? false)
        );
      }

      return orders;
    },
    staleTime: 30000,
  });
}