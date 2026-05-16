/**
 * useOfflineSync.ts
 *
 * React hook that:
 *   1. Sends SW_CONFIG to the service worker so it has Supabase credentials
 *   2. Listens for online/offline events
 *   3. On coming online → flushes pending sales
 *   4. Exposes pendingCount so the UI can show a badge
 *   5. Provides saveSale() that enqueues + tries immediate sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { enqueueSale, countPending, requestBackgroundSync, PendingSale } from '@/lib/offlineQueue';
import { flushPendingSales } from '@/lib/syncSales';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function useOfflineSync() {
  const [isOnline, setIsOnline]         = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing]           = useState(false);
  const [lastSync, setLastSync]         = useState<Date | null>(null);
  const flushRef = useRef(false);

  // ── Send config to SW ──
  useEffect(() => {
    const sendConfig = async () => {
      if (!('serviceWorker' in navigator)) return;
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({
        type:   'SW_CONFIG',
        config: { url: SUPABASE_URL, key: SUPABASE_KEY },
      });
    };
    sendConfig();
  }, []);

  // ── Listen to SW sync results ──
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_RESULT') {
        refreshCount();
        if (event.data.synced > 0) setLastSync(new Date());
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // ── Online/offline events ──
  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  tryFlush(); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── On mount, refresh count and try flush if online ──
  useEffect(() => {
    refreshCount();
    if (navigator.onLine) tryFlush();
  }, []);

  const refreshCount = async () => {
    const n = await countPending();
    setPendingCount(n);
  };

  const tryFlush = useCallback(async () => {
    if (flushRef.current) return;  // already flushing
    const pending = await countPending();
    if (pending === 0) return;

    flushRef.current = true;
    setSyncing(true);
    try {
      const { synced } = await flushPendingSales();
      if (synced > 0) setLastSync(new Date());
      await refreshCount();
    } finally {
      flushRef.current = false;
      setSyncing(false);
    }
  }, []);

  /**
   * saveSale — enqueues to IndexedDB first (always succeeds),
   * then tries to sync immediately if online.
   * Returns { queued: true } so the UI can show success regardless of network.
   */
  const saveSale = useCallback(async (sale: Omit<PendingSale, 'id' | 'created_at' | 'synced'>) => {
    const fullSale: PendingSale = {
      ...sale,
      id:         crypto.randomUUID(),
      created_at: new Date().toISOString(),
      synced:     false,
    };

    await enqueueSale(fullSale);
    await refreshCount();

    if (navigator.onLine) {
      // Try immediate sync — don't await so UI responds instantly
      tryFlush();
    } else {
      // Register background sync for when connection returns
      await requestBackgroundSync();
    }

    return { id: fullSale.id, queued: true };
  }, [tryFlush]);

  return {
    isOnline,
    pendingCount,
    syncing,
    lastSync,
    saveSale,
    tryFlush,
  };
}
