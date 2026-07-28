/**
 * syncSales.ts
 *
 * Flush pending sales from IndexedDB → Supabase.
 * Called from:
 *   1. The service worker (background sync event)
 *   2. The Sales page (when navigator.onLine becomes true)
 *   3. The Sales page (after each successful submit, to catch leftover queue)
 *
 * This file is intentionally side-effect-free and importable from both
 * the main thread and the SW (SW imports it via a bundled copy if needed;
 * for simplicity the SW re-implements the fetch logic inline using the
 * Supabase REST API directly, since it can't import TS modules).
 */

import { createClient } from '@supabase/supabase-js';
import { getPendingSales, markSynced } from './offlineQueue';

// We can't use the shared client here because this runs in contexts where
// the Vite alias "@/" might not resolve (SW). For the main thread, we
// instantiate a lightweight client using the same env vars.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function getClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export interface SyncResult {
  synced: number;
  failed: number;
}

export async function flushPendingSales(): Promise<SyncResult> {
  const pending = await getPendingSales();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const supabase = getClient();
  let synced = 0;
  let failed = 0;

  for (const sale of pending) {
    try {
      // Insert order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_whatsapp: 'ventas-mostrador',
          customer_name:     sale.seller_name,
          notes:             'Venta en campo (sync offline)',
          total:             sale.total,
          source:            'sales_app',
          seller_id:         sale.seller_id,
          status:            'completed',
        })
        .select('id, order_number')
        .single();

      if (orderErr) throw orderErr;

      // Insert order items
      const items = sale.items.map(item => ({
        order_id:     order.id,
        product_id:   item.product_id,
        product_name: item.product_name,
        quantity:     item.quantity,
        unit_price:   item.unit_price,
        subtotal:     item.subtotal,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;

      // Persistir el descuento en el inventario del vendedor —
      // sin esto, el stock se resetea al recargar el PWA.
      for (const item of sale.items) {
        const { error: decErr } = await supabase.rpc('decrement_seller_inventory', {
          p_seller_id:  sale.seller_id,
          p_product_id: item.product_id,
          p_qty:        item.quantity,
        });
        if (decErr) console.warn(`[sync] No se pudo descontar inventario de ${item.product_name}:`, decErr);
      }

      await markSynced(sale.id);
      synced++;
    } catch (err) {
      console.warn(`[sync] Failed to sync sale ${sale.id}:`, err);
      failed++;
      // Don't mark synced — will retry on next flush
    }
  }

  return { synced, failed };
}
