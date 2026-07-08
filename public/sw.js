// ─────────────────────────────────────────────────────────────────────────────
// Tierra Bendita — Service Worker (PWA completa)
// Cachea el app shell completo: menú, POS, ventas, auth, display.
// También maneja sincronización offline de ventas en campo.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE    = 'tb-app-v3';
const SYNC_TAG = 'flush-sales';

const PRECACHE = [
  '/',
  '/menu',
  '/pos',
  '/sales',
  '/display',
  '/auth',
  '/logo.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/apple-icon-76x76.png',
  '/favicon-96x96.png',
  '/site.webmanifest',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('twilio.com') ||
    url.hostname.includes('r2.dev') ||
    request.method !== 'GET'
  ) return;

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
        }).catch(() => cached);
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }
});

self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushPendingSales());
  }
});

self.addEventListener('online', () => {
  self.registration.sync?.register(SYNC_TAG).catch(() => {});
});

const DB_NAME    = 'tb-offline';
const DB_VERSION = 1;
const STORE      = 'pending-sales';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess       = e => resolve(e.target.result);
    req.onerror         = e => reject(e.target.error);
  });
}

function idbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

async function flushPendingSales() {
  const cfg = await getConfig();
  if (!cfg) return;

  const db    = await openDB();
  const sales = await idbGetAll(db);
  let synced  = 0;
  let failed  = 0;

  for (const sale of sales) {
    try {
      const orderRes = await fetch(`${cfg.url}/rest/v1/orders`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':         cfg.key,
          'Authorization': `Bearer ${cfg.key}`,
          'Prefer':         'return=representation',
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
    } catch (err) {
      console.warn(`[SW] Could not sync sale ${sale.id}:`, err);
      failed++;
    }
  }

  db.close();
  return { synced, failed };
}

let _config = null;

self.addEventListener('message', event => {
  if (event.data?.type === 'SW_CONFIG') {
    _config = event.data.config;
  }
});

async function getConfig() {
  return _config;
}