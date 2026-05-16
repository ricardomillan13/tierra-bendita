/**
 * offlineQueue.ts
 *
 * Manages a persistent queue of pending sales in IndexedDB.
 * Used by both the Sales page (write) and the service worker (read/flush).
 *
 * DB: tb_offline  |  Store: pending_sales
 */

const DB_NAME    = 'tb_offline';
const DB_VERSION = 1;
const STORE      = 'pending_sales';

export interface PendingSale {
  id:           string;   // local UUID, generated client-side
  seller_id:    string;
  seller_name:  string;
  total:        number;
  items: {
    product_id:   string;
    product_name: string;
    quantity:     number;
    unit_price:   number;
    subtotal:     number;
  }[];
  created_at:   string;   // ISO string
  synced:       boolean;
}

// ── Open DB ───────────────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Enqueue ───────────────────────────────────────────────────────────────────
export async function enqueueSale(sale: PendingSale): Promise<void> {
  const db    = await openDB();
  const tx    = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  store.put(sale);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = () => { db.close(); reject(tx.error); };
  });
}

// ── Get all pending (unsynced) ────────────────────────────────────────────────
export async function getPendingSales(): Promise<PendingSale[]> {
  const db    = await openDB();
  const tx    = tx_read(db);
  const store = tx.objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve((req.result as PendingSale[]).filter(s => !s.synced));
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

// ── Mark as synced (and delete) ───────────────────────────────────────────────
export async function markSynced(id: string): Promise<void> {
  const db    = await openDB();
  const tx    = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = () => { db.close(); reject(tx.error); };
  });
}

// ── Count pending ─────────────────────────────────────────────────────────────
export async function countPending(): Promise<number> {
  const db    = await openDB();
  const tx    = tx_read(db);
  const store = tx.objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

// ── Register Background Sync ──────────────────────────────────────────────────
export async function requestBackgroundSync(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('sync' in reg) {
      await (reg as any).sync.register('flush-sales');
    }
  } catch {
    // Background Sync not supported (iOS Safari) — fallback handled by online event
  }
}

// Helper
function tx_read(db: IDBDatabase) {
  return db.transaction(STORE, 'readonly');
}
