import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem, CartItem } from '@/types/menu';
import { useSettings } from '@/hooks/useSettings';

// ── Audio ─────────────────────────────────────────────────────────────────────
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const REPS = 3;
    const TONE_DUR = 0.18;
    const NOTE_GAP = 0.03;
    const REP_GAP = 0.12;
    const pattern = [988, 740];

    let t = 0;
    for (let r = 0; r < REPS; r++) {
      pattern.forEach(freq => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
        gain.gain.setValueAtTime(0, ctx.currentTime + t);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + TONE_DUR);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + TONE_DUR);
        t += TONE_DUR + NOTE_GAP;
      });
      t += REP_GAP;
    }
    setTimeout(() => ctx.close(), (t + 0.5) * 1000);
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
  const pendingChimeRef    = useRef(false);

  const { data: settings } = useSettings();
  const isStoreOpen = settings?.is_open ?? true;

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
    refetchInterval: isStoreOpen ? 30000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  // Detect new orders → chime + browser notification
  const notifiedOrdersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const orders = ordersQuery.data;
    if (!orders) return;

    const currentIds = new Set(orders.map(o => o.id));

    if (prevOrderIdsRef.current === null) {
      // Primera carga: marcar todos los existentes como ya notificados
      prevOrderIdsRef.current = currentIds;
      orders.forEach(o => notifiedOrdersRef.current.add(o.id));
      return;
    }

    const newOrders = orders.filter(
      o => !prevOrderIdsRef.current!.has(o.id) && o.status === 'pending'
    );

    if (newOrders.length > 0) {
      if (document.hidden) {
        newOrders.forEach(o => sendBrowserNotification(o.order_number));
        pendingChimeRef.current = true;
      } else {
        playChime();
      }

      // Mandar WhatsApp "pedido recibido" solo si no lo hemos notificado antes
      newOrders.forEach(o => {
        if (o.customer_whatsapp && !notifiedOrdersRef.current.has(o.id)) {
          notifiedOrdersRef.current.add(o.id);
          supabase.functions.invoke('send-whatsapp', {
            body: {
              to: o.customer_whatsapp,
              orderNumber: o.order_number,
              customerName: o.customer_name || undefined,
              status: 'received',
            },
          }).catch(err => console.warn('[WA] Error enviando recibido:', err));
        }
      });
    }

    prevOrderIdsRef.current = currentIds;
  }, [ordersQuery.data]);

  // Stable subscription + visibility handler
  useEffect(() => {
    if (!isStoreOpen) return;

    const channel = supabase
      .channel(`orders-rt-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => queryClientRef.current.invalidateQueries({ queryKey: ['orders'] })
      )
      .subscribe();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        queryClientRef.current.invalidateQueries({ queryKey: ['orders'] });
        if (pendingChimeRef.current) {
          pendingChimeRef.current = false;
          setTimeout(playChime, 300);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    requestNotificationPermission();

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStoreOpen]);

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

      const orderItems = items.map(item => {
        const sizeLabel = item.size === 'large' ? ' (Grande)' : item.size === 'medium' ? ' (Mediano)' : '';
        const extrasLabel = item.extras?.whippedCream ? ' + Crema batida' : '';
        return {
          order_id: order.id,
          product_id: item.product.id.startsWith('promo_') ? null : item.product.id,
          product_name: `${item.product.name}${sizeLabel}${extrasLabel}`,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.product.price * item.quantity,
        };
      });
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Descuenta del inventario general (solo productos reales, no promos).
      for (const item of items) {
        if (item.product.id.startsWith('promo_')) continue;
        const { error: decErr } = await supabase.rpc('decrement_business_inventory', {
          p_product_id: item.product.id,
          p_qty:        item.quantity,
        });
        if (decErr) console.warn(`No se pudo descontar inventario general de ${item.product.name}:`, decErr);
      }

      return order as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['business_inventory'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, cancelReason }: { id: string; status: Order['status']; cancelReason?: string }) => {
      const updatePayload: { status: Order['status']; cancel_reason?: string } = { status };
      if (status === 'cancelled') {
        updatePayload.cancel_reason = cancelReason || null as unknown as string;
      }
      const { data, error } = await supabase
        .from('orders').update(updatePayload).eq('id', id).select().single();
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
        const to = new Date(filters.dateTo);
        to.setDate(to.getDate() + 1);
        query = query.lt('created_at', to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let orders = data as Order[];

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
