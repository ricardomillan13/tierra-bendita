// ────────────────────────────────────────────────────────────────────────────
// Tierra Bendita Sales — Service Worker
// Handles:
//   1. Static asset caching (app shell)
//   2. Offline navigation fallback
//   3. Background Sync — flushes pending sales to Supabase when back online
// ────────────────────────────────────────────────────────────────────────────

const CACHE   = 'tb-sales-v2';
const SYNC_TAG = 'flush-sales';

const PRECACHE = [
  '/sales',
  '/logo.png',
  '/web-app-manifest-192x192.png',
  '/site.webmanifest',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through Supabase / non-GET
  if (url.hostname.includes('supabase.co') || request.method !== 'GET') return;

  // Cache-first for static assets
  if (
    request.destination === 'image' ||
    request.destination === 'font'  ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
          return res;
        });
      })
    );
    return;
  }

  // Network-first with offline fallback for navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/sales').then(cached =>
          cached ?? caches.match('/').then(r =>
            r ?? new Response('<h2>Sin conexión</h2>', {
              headers: { 'Content-Type': 'text/html' },
              status: 503,
            })
          )
        )
      )
    );
  }
});

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushQueue());
  }
});

// Also try to sync when the SW receives a message from the page
self.addEventListener('message', event => {
  if (event.data?.type === 'FLUSH_SALES') {
    flushQueue().then(result => {
      // Notify all open clients of the result
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC_RESULT', ...result }))
      );
    });
  }
});

// ── IndexedDB helpers (SW context — no imports) ───────────────────────────────
const IDB_NAME  = 'tb_offline';
const IDB_VER   = 1;
const IDB_STORE = 'pending_sales';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result.filter(s => !s.synced));
    req.onerror   = () => reject(req.error);
  });
}

function idbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ── Flush queue → Supabase REST API ──────────────────────────────────────────
async function flushQueue() {
  // Read Supabase credentials stored by the page in the SW scope
  // (sent via postMessage on SW registration)
  const cfg = await getConfig();
  if (!cfg) {
    console.warn('[SW] No Supabase config available yet');
    return { synced: 0, failed: 0 };
  }

  const db      = await idbOpen();
  const pending = await idbGetAll(db);

  if (pending.length === 0) {
    db.close();
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const sale of pending) {
    try {
      // 1. Insert order
      const orderRes = await fetch(`${cfg.url}/rest/v1/orders`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':         cfg.key,
          'Authorization': `Bearer ${cfg.key}`,
          'Prefer':        'return=representation',
        },
        body: JSON.stringify({
          customer_whatsapp: 'ventas-mostrador',
          customer_name:     sale.seller_name,
          notes:             'Venta en campo (sync offline)',
          total:             sale.total,
          source:            'sales_app',
          seller_id:         sale.seller_id,
          status:            'completed',
        }),
      });

      if (!orderRes.ok) throw new Error(`Order insert failed: ${orderRes.status}`);
      const [order] = await orderRes.json();

      // 2. Insert order items
      const itemsRes = await fetch(`${cfg.url}/rest/v1/order_items`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':         cfg.key,
          'Authorization': `Bearer ${cfg.key}`,
        },
        body: JSON.stringify(
          sale.items.map(item => ({
            order_id:     order.id,
            product_id:   item.product_id,
            product_name: item.product_name,
            quantity:     item.quantity,
            unit_price:   item.unit_price,
            subtotal:     item.subtotal,
          }))
        ),
      });

      if (!itemsRes.ok) throw new Error(`Items insert failed: ${itemsRes.status}`);

      await idbDelete(db, sale.id);
      synced++;
      console.log(`[SW] Synced sale ${sale.id}`);
    } catch (err) {
      console.warn(`[SW] Could not sync sale ${sale.id}:`, err);
      failed++;
    }
  }

  db.close();
  return { synced, failed };
}

// ── Config storage (Supabase URL + key sent from page) ────────────────────────
let _config = null;

self.addEventListener('message', event => {
  if (event.data?.type === 'SW_CONFIG') {
    _config = event.data.config;
  }
});

async function getConfig() {
  return _config; // set by the page via postMessage
}
