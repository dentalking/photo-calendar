// Service Worker for Photo Calendar PWA
const CACHE_NAME = 'photo-calendar-v1.0.0';
const RUNTIME_CACHE = 'runtime-cache-v1';
const IMAGE_CACHE = 'image-cache-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/calendar',
  '/dashboard',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME &&
                   cacheName !== RUNTIME_CACHE &&
                   cacheName !== IMAGE_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Handle image requests - Cache First
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request).then((response) => {
            const responseToCache = response.clone();
            
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
            
            return response;
          });
        })
    );
    return;
  }

  // Handle navigation requests - Network First with fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Return offline page if available
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // Default strategy - Stale While Revalidate
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Update cache with new response
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          
          return networkResponse;
        });
        
        // Return cached response immediately, update cache in background
        return cachedResponse || fetchPromise;
      })
  );
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-events' || event.tag === 'sync-calendar') {
    event.waitUntil(
      // Sync calendar events when back online
      syncCalendarEvents()
    );
  }
  
  if (event.tag === 'sync-calendar-queue') {
    event.waitUntil(
      // Process sync queue from IndexedDB
      processSyncQueue()
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : '새로운 일정이 있습니다',
    icon: '/favicon-192x192.png',
    badge: '/favicon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: '보기',
        icon: '/icons/view.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/icons/close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Photo Calendar', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/calendar')
    );
  }
});

// Helper function to sync calendar events
async function syncCalendarEvents() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    
    const eventRequests = requests.filter(request => 
      request.url.includes('/api/events') || request.url.includes('/api/calendar/sync')
    );
    
    for (const request of eventRequests) {
      try {
        const response = await fetch(request);
        await cache.put(request, response);
      } catch (error) {
        console.error('[SW] Failed to sync:', request.url);
      }
    }
    
    // Notify clients of successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
    console.log('[SW] Calendar events synced successfully');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Process sync queue from IndexedDB
async function processSyncQueue() {
  try {
    // Open IndexedDB
    const dbRequest = indexedDB.open('PhotoCalendarSync', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;
        const transaction = db.transaction(['syncQueue'], 'readonly');
        const store = transaction.objectStore('syncQueue');
        const items = await new Promise((res, rej) => {
          const req = store.getAll();
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
        
        console.log(`[SW] Processing ${items.length} queued items`);
        
        // Process each item
        for (const item of items) {
          try {
            const response = await fetch('/api/calendar/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: item.action,
                eventIds: item.data.eventIds,
                googleEventId: item.data.googleEventId,
              }),
            });
            
            if (response.ok) {
              // Remove from queue on success
              const deleteTransaction = db.transaction(['syncQueue'], 'readwrite');
              const deleteStore = deleteTransaction.objectStore('syncQueue');
              deleteStore.delete(item.id);
              console.log('[SW] Successfully synced:', item.id);
            } else {
              console.error('[SW] Sync failed for:', item.id);
            }
          } catch (error) {
            console.error('[SW] Error processing item:', item.id, error);
          }
        }
        
        db.close();
        resolve();
      };
      
      dbRequest.onerror = () => {
        console.error('[SW] Failed to open IndexedDB');
        reject(dbRequest.error);
      };
    });
  } catch (error) {
    console.error('[SW] Failed to process sync queue:', error);
  }
}

// Message handler for skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});