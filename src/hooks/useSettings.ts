import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Settings {
  whatsapp_auto_notify: { enabled: boolean };
  menu_url: string;
  daily_phrase: string;
  is_open: boolean;
  closed_message: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');
      
      if (error) throw error;
      
      const settings: Settings = {
        whatsapp_auto_notify: { enabled: true },
        menu_url: '',
        daily_phrase: 'El mejor momento para un buen café... es ahora.',
        is_open: true,
        closed_message: 'Estamos cerrados por el momento, pronto regresamos.',
      };
      
      data?.forEach(row => {
        if (row.key === 'whatsapp_auto_notify') {
          settings.whatsapp_auto_notify = row.value as { enabled: boolean };
        } else if (row.key === 'menu_url') {
          settings.menu_url = row.value as string;
        } else if (row.key === 'daily_phrase') {
          settings.daily_phrase = row.value as string;
        } else if (row.key === 'is_open') {
          settings.is_open = row.value as boolean;
        } else if (row.key === 'closed_message') {
          settings.closed_message = row.value as string;
        } else if (row.key === 'closed_message') {
          settings.closed_message = row.value as string;
        }
      });
      
      return settings;
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data, error } = await supabase
        .from('settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}