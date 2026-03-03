import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Category = Tables<'categories'>;

/* =======================
   GET ALL
======================= */
export function useAllCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data ?? [];
    },
  });
}

/* =======================
   CREATE (AUTO ORDER)
======================= */
export function useCreateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const { data: last } = await supabase
        .from('categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (last?.display_order ?? 0) + 1;

      const { data, error } = await supabase
        .from('categories')
        .insert({ name, display_order: nextOrder })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (newCategory) => {
      qc.setQueryData<Category[]>(['categories'], (old = []) =>
        [...old, newCategory].sort(
          (a, b) => a.display_order - b.display_order
        )
      );
    },
  });
}

/* =======================
   UPDATE
======================= */
export function useUpdateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

/* =======================
   DELETE
======================= */
export function useDeleteCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    onSuccess: (_, id) => {
      qc.setQueryData<Category[]>(['categories'], (old = []) =>
        old.filter((c) => c.id !== id)
      );
    },
  });
}

