import { useEffect, useRef } from 'react';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';
import { isWithinClosedWindow } from '@/lib/schedule';

/**
 * Safety net: if "auto_schedule_enabled" is on, this checks every minute
 * whether the current time falls inside the configured closed window
 * (auto_close_time → auto_open_time, e.g. 23:00 → 12:00) and corrects
 * `is_open` automatically in case the staff forgot to toggle it manually.
 *
 * Mount this once near the top of the POS screen.
 */
export function useAutoStoreSchedule() {
  const { data: settings } = useSettings();
  const updateSetting = useUpdateSetting();
  const correctingRef = useRef(false);

  useEffect(() => {
    if (!settings?.auto_schedule_enabled) return;

    const check = () => {
      if (correctingRef.current) return;

      const shouldBeClosed = isWithinClosedWindow(
        settings.auto_close_time,
        settings.auto_open_time
      );

      // Mismatch → correct it (e.g. staff forgot to close at 11pm,
      // or forgot to reopen the next day at noon)
      if (shouldBeClosed === settings.is_open) {
        correctingRef.current = true;
        updateSetting.mutate(
          { key: 'is_open', value: !shouldBeClosed },
          { onSettled: () => { correctingRef.current = false; } }
        );
      }
    };

    check(); // run once immediately on mount/settings change
    const interval = setInterval(check, 60000); // and every minute after
    return () => clearInterval(interval);
  }, [
    settings?.auto_schedule_enabled,
    settings?.auto_close_time,
    settings?.auto_open_time,
    settings?.is_open,
  ]);
}