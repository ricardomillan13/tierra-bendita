import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Settings {
  whatsapp_auto_notify: { enabled: boolean };
  menu_url: string;
  daily_phrase: string;
  is_open: boolean;
  closed_message: string;
  display_interval_seconds: number;
  auto_schedule_enabled: boolean;
  auto_close_time: string;
  auto_open_time: string;
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
        display_interval_seconds: 8,
        auto_schedule_enabled: false,
        auto_close_time: '23:00',
        auto_open_time: '12:00',
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
        } else if (row.key === 'display_interval_seconds') {
          settings.display_interval_seconds = row.value as number;
        } else if (row.key === 'auto_schedule_enabled') {
          settings.auto_schedule_enabled = row.value as boolean;
        } else if (row.key === 'auto_close_time') {
          settings.auto_close_time = row.value as string;
        } else if (row.key === 'auto_open_time') {
          settings.auto_open_time = row.value as string;
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
      // Try update first, insert if not exists
      const { data: existing } = await supabase
        .from('settings')
        .select('key')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('settings')
          .insert({ key, value })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}