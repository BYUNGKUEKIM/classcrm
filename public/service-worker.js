/**
 * Service Worker for PWA
 * 오프라인 지원, 캐싱, 푸시 알림
 */

const CACHE_NAME = 'photo-studio-crm-v1';
const RUNTIME_CACHE = 'photo-studio-runtime-v1';

// 캐시할 정적 자원
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// 설치 이벤트 - 정적 자원 캐싱
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// 활성화 이벤트 - 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== CACHE_NAME && name !== RUNTIME_CACHE;
            })
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch 이벤트 - 네트워크 요청 처리
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 같은 origin의 요청만 처리
  if (url.origin !== location.origin) {
    return;
  }
  
  // API 요청은 Network First 전략
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // HTML 페이지는 Network First
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // 이미지, CSS, JS는 Cache First 전략
  event.respondWith(cacheFirst(request));
});

/**
 * Cache First 전략
 * 캐시에 있으면 캐시에서, 없으면 네트워크에서 가져오고 캐시에 저장
 */
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[ServiceWorker] Cache hit:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    // 성공한 응답만 캐시
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[ServiceWorker] Fetch failed:', error);
    
    // 오프라인 페이지 반환
    if (request.headers.get('accept').includes('text/html')) {
      const offlineCache = await caches.open(CACHE_NAME);
      return offlineCache.match('/offline.html');
    }
    
    throw error;
  }
}

/**
 * Network First 전략
 * 네트워크에서 먼저 시도하고, 실패하면 캐시에서 가져옴
 */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const response = await fetch(request);
    
    // 성공한 응답을 캐시에 저장
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);
    
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // HTML 요청이면 오프라인 페이지
    if (request.headers.get('accept').includes('text/html')) {
      const offlineCache = await caches.open(CACHE_NAME);
      return offlineCache.match('/offline.html');
    }
    
    throw error;
  }
}

/**
 * 푸시 알림 수신
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data = {
        title: '새 알림',
        body: event.data.text()
      };
    }
  }
  
  const options = {
    body: data.body || '새로운 소식이 있습니다.',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'explore',
        title: '확인하기',
        icon: '/check-icon.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/close-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '포토스튜디오 CRM', options)
  );
});

/**
 * 알림 클릭 이벤트
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * 백그라운드 동기화
 */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
  
  if (event.tag === 'sync-photos') {
    event.waitUntil(syncPhotos());
  }
});

/**
 * 예약 데이터 동기화
 */
async function syncBookings() {
  try {
    console.log('[ServiceWorker] Syncing bookings...');
    
    // IndexedDB에서 대기 중인 예약 가져오기
    const pendingBookings = await getPendingBookings();
    
    // 서버로 전송
    for (const booking of pendingBookings) {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(booking)
      });
      
      // 성공하면 IndexedDB에서 제거
      await removePendingBooking(booking.id);
    }
    
    console.log('[ServiceWorker] Bookings synced successfully');
  } catch (error) {
    console.error('[ServiceWorker] Sync bookings failed:', error);
    throw error;
  }
}

/**
 * 사진 데이터 동기화
 */
async function syncPhotos() {
  try {
    console.log('[ServiceWorker] Syncing photos...');
    
    // IndexedDB에서 대기 중인 사진 업로드 가져오기
    const pendingPhotos = await getPendingPhotos();
    
    // 서버로 전송
    for (const photo of pendingPhotos) {
      const formData = new FormData();
      formData.append('photo', photo.file);
      formData.append('metadata', JSON.stringify(photo.metadata));
      
      await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData
      });
      
      // 성공하면 IndexedDB에서 제거
      await removePendingPhoto(photo.id);
    }
    
    console.log('[ServiceWorker] Photos synced successfully');
  } catch (error) {
    console.error('[ServiceWorker] Sync photos failed:', error);
    throw error;
  }
}

/**
 * IndexedDB 헬퍼 함수들 (실제 구현 필요)
 */
async function getPendingBookings() {
  // TODO: IndexedDB에서 대기 중인 예약 조회
  return [];
}

async function removePendingBooking(id) {
  // TODO: IndexedDB에서 예약 제거
}

async function getPendingPhotos() {
  // TODO: IndexedDB에서 대기 중인 사진 조회
  return [];
}

async function removePendingPhoto(id) {
  // TODO: IndexedDB에서 사진 제거
}

/**
 * 메시지 이벤트 - 클라이언트와 통신
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME
    });
  }
});

console.log('[ServiceWorker] Loaded');
