import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BusinessInventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
  product_name?: string;
  product_price?: number;
}

// ── Inventario general ────────────────────────────────────────────────────────
export function useBusinessInventory() {
  return useQuery({
    queryKey: ['business_inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_inventory')
        .select(`*, products(name, price)`);
      if (error) throw error;
      return data.map((row: any) => ({
        ...row,
        product_name: row.products?.name,
        product_price: row.products?.price,
      })) as BusinessInventoryItem[];
    },
  });
}

export function useUpsertBusinessInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ product_id, quantity }: { product_id: string; quantity: number }) => {
      const { error } = await supabase
        .from('business_inventory')
        .upsert(
          { product_id, quantity: Math.max(0, quantity), updated_at: new Date().toISOString() },
          { onConflict: 'product_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_inventory'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error al actualizar inventario general', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Cierre de turno ───────────────────────────────────────────────────────────
export interface CloseoutItemInput {
  product_id: string;
  product_name: string;
  system_qty: number;
  returned_qty: number;
}

export function useCreateShiftCloseout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      seller_id, items, notes,
    }: {
      seller_id: string;
      items: CloseoutItemInput[];
      notes?: string;
    }) => {
      const { data: closeout, error: closeoutErr } = await supabase
        .from('shift_closeouts')
        .insert({ seller_id, notes: notes || null })
        .select()
        .single();
      if (closeoutErr) throw closeoutErr;

      const rows = items.map(i => ({
        closeout_id:   closeout.id,
        product_id:    i.product_id,
        product_name:  i.product_name,
        system_qty:    i.system_qty,
        returned_qty:  i.returned_qty,
        shrinkage_qty: Math.max(0, i.system_qty - i.returned_qty),
      }));
      const { error: itemsErr } = await supabase.from('shift_closeout_items').insert(rows);
      if (itemsErr) throw itemsErr;

      // Regresa al inventario general lo confirmado, y deja al vendedor en 0.
      for (const item of items) {
        if (item.returned_qty > 0) {
          const { error: incErr } = await supabase.rpc('increment_business_inventory', {
            p_product_id: item.product_id,
            p_qty:        item.returned_qty,
          });
          if (incErr) throw incErr;
        }
        const { error: sellerErr } = await supabase
          .from('seller_inventory')
          .update({ quantity: 0, updated_at: new Date().toISOString() })
          .eq('seller_id', seller_id)
          .eq('product_id', item.product_id);
        if (sellerErr) throw sellerErr;
      }

      return closeout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_inventory'] });
      queryClient.invalidateQueries({ queryKey: ['seller_inventory'] });
      toast({ title: 'Cierre de turno registrado' });
    },
    onError: (err: any) => {
      toast({ title: 'Error al cerrar turno', description: err.message, variant: 'destructive' });
    },
  });
}
