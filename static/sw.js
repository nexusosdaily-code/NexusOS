/**
 * NexusOS Service Worker
 * 
 * Enables offline-first PWA functionality for iOS Safari.
 * Caches critical assets and queues messages for sync.
 * 
 * Priority caching for BHLS distributions.
 */

const CACHE_NAME = 'nexusos-v2';
const API_CACHE = 'nexusos-api-v2';
const OFFLINE_QUEUE = 'nexusos-offline-queue';

const STATIC_ASSETS = [
  '/',
  '/pwa',
  '/static/manifest.json',
  '/static/css/mobile.css',
  '/static/js/app.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/pwa.html'
];

const API_ENDPOINTS = [
  '/api',
  '/api/status',
  '/api/health/programs',
  '/api/bhls/status',
  '/api/dex/pools',
  '/api/governance/constitution',
  '/api/sectors',
  '/api/curriculum/stats',
  '/api/curriculum/grades',
  '/api/physics/lambda',
  '/api/system/readiness'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing NexusOS Service Worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('undefined')));
      })
      .catch((err) => {
        console.log('[SW] Cache failed, continuing:', err);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating NexusOS Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== API_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
  } else {
    event.respondWith(handleStaticRequest(event.request));
  }
});

async function handleStaticRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  if (request.method === 'GET') {
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE);
        cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        const data = await cachedResponse.clone().json();
        data._cached = true;
        data._cachedAt = new Date().toISOString();
        
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({
        error: 'offline',
        message: 'You are offline. Data will sync when connected.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  if (request.method === 'POST') {
    try {
      return await fetch(request);
    } catch (error) {
      await queueOfflineRequest(request);
      
      return new Response(JSON.stringify({
        success: true,
        queued: true,
        message: 'Request queued for sync when online'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return fetch(request);
}

async function queueOfflineRequest(request) {
  const queue = await getOfflineQueue();
  
  const body = await request.clone().text();
  
  queue.push({
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: body,
    timestamp: Date.now(),
    priority: getPriority(request.url)
  });
  
  queue.sort((a, b) => a.priority - b.priority);
  
  await saveOfflineQueue(queue);
}

function getPriority(url) {
  if (url.includes('/bhls/')) return 1;
  if (url.includes('/mesh/send')) return 2;
  if (url.includes('/health/')) return 3;
  return 4;
}

async function getOfflineQueue() {
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    const response = await cache.match('queue');
    
    if (response) {
      return await response.json();
    }
  } catch (e) {}
  
  return [];
}

async function saveOfflineQueue(queue) {
  const cache = await caches.open(OFFLINE_QUEUE);
  await cache.put('queue', new Response(JSON.stringify(queue)));
}

async function processOfflineQueue() {
  const queue = await getOfflineQueue();
  const processed = [];
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
      
      if (response.ok) {
        processed.push(item);
      }
    } catch (error) {
      break;
    }
  }
  
  const remaining = queue.filter(item => !processed.includes(item));
  await saveOfflineQueue(remaining);
  
  return {
    processed: processed.length,
    remaining: remaining.length
  };
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processOfflineQueue());
  }
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'SYNC_NOW') {
    processOfflineQueue().then((result) => {
      event.ports[0].postMessage(result);
    });
  }
  
  if (event.data.type === 'GET_QUEUE_STATUS') {
    getOfflineQueue().then((queue) => {
      event.ports[0].postMessage({
        pending: queue.length,
        items: queue
      });
    });
  }
});

self.addEventListener('online', () => {
  console.log('[SW] Back online - syncing queue');
  processOfflineQueue();
});
