/**
 * PWA Utilities - Progressive Web App 기능
 */

/**
 * Service Worker 등록
 */
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        '/service-worker.js',
        { scope: '/' }
      );
      
      console.log('Service Worker registered:', registration.scope);
      
      // 업데이트 확인
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('Service Worker update found');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 새 버전 사용 가능
            console.log('New version available');
            showUpdateNotification();
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  } else {
    console.warn('Service Workers not supported');
    return null;
  }
};

/**
 * Service Worker 업데이트 알림
 */
const showUpdateNotification = () => {
  if (confirm('새 버전이 있습니다. 지금 업데이트하시겠습니까?')) {
    window.location.reload();
  }
};

/**
 * 앱 설치 프롬프트
 */
let deferredPrompt = null;

export const initInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    
    // 설치 버튼 표시
    showInstallButton();
  });
  
  // 설치 완료 이벤트
  window.addEventListener('appinstalled', () => {
    console.log('App installed');
    deferredPrompt = null;
    hideInstallButton();
  });
};

/**
 * 앱 설치 실행
 */
export const promptInstall = async () => {
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return false;
  }
  
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`Install prompt outcome: ${outcome}`);
    
    if (outcome === 'accepted') {
      deferredPrompt = null;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Install prompt error:', error);
    return false;
  }
};

/**
 * 설치 버튼 표시
 */
const showInstallButton = () => {
  const installButton = document.getElementById('install-button');
  if (installButton) {
    installButton.style.display = 'block';
  }
};

/**
 * 설치 버튼 숨기기
 */
const hideInstallButton = () => {
  const installButton = document.getElementById('install-button');
  if (installButton) {
    installButton.style.display = 'none';
  }
};

/**
 * 푸시 알림 권한 요청
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

/**
 * 푸시 구독 생성
 */
export const subscribeToPush = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // VAPID 공개 키 (실제 프로젝트에서는 환경 변수로 관리)
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
    
    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured');
      return null;
    }
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    
    console.log('Push subscription created:', subscription);
    
    // 서버에 구독 정보 전송
    await savePushSubscription(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    throw error;
  }
};

/**
 * 푸시 구독 저장
 */
const savePushSubscription = async (subscription) => {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save push subscription');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Save push subscription error:', error);
    throw error;
  }
};

/**
 * Base64 to Uint8Array 변환
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
};

/**
 * 온/오프라인 상태 감지
 */
export const initOnlineStatus = (onOnline, onOffline) => {
  const updateOnlineStatus = () => {
    if (navigator.onLine) {
      console.log('Online');
      if (onOnline) onOnline();
    } else {
      console.log('Offline');
      if (onOffline) onOffline();
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // 초기 상태 확인
  updateOnlineStatus();
  
  return () => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  };
};

/**
 * 백그라운드 동기화 등록
 */
export const registerBackgroundSync = async (tag) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    if ('sync' in registration) {
      await registration.sync.register(tag);
      console.log('Background sync registered:', tag);
      return true;
    } else {
      console.warn('Background sync not supported');
      return false;
    }
  } catch (error) {
    console.error('Background sync registration failed:', error);
    return false;
  }
};

/**
 * 캐시 관리
 */
export const clearCache = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((name) => caches.delete(name))
    );
    console.log('All caches cleared');
    return true;
  }
  return false;
};

/**
 * 캐시 크기 확인
 */
export const getCacheSize = async () => {
  if ('caches' in window && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      usageInMB: (estimate.usage / (1024 * 1024)).toFixed(2),
      quotaInMB: (estimate.quota / (1024 * 1024)).toFixed(2),
      percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
    };
  }
  return null;
};

/**
 * 앱 정보 가져오기
 */
export const getAppInfo = () => {
  return {
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    isAndroid: /Android/.test(navigator.userAgent),
    isMobile: /Mobile|Android|iPhone/.test(navigator.userAgent),
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsNotifications: 'Notification' in window,
    supportsPush: 'PushManager' in window,
    supportsBackgroundSync: 'sync' in (navigator.serviceWorker?.constructor || {})
  };
};

/**
 * PWA 설치 여부 확인
 */
export const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

/**
 * 앱 공유
 */
export const shareApp = async (data = {}) => {
  if (!navigator.share) {
    console.warn('Web Share API not supported');
    return false;
  }
  
  try {
    await navigator.share({
      title: data.title || '포토스튜디오 CRM',
      text: data.text || '사진관을 위한 올인원 고객관리 시스템',
      url: data.url || window.location.href
    });
    
    console.log('Shared successfully');
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Share failed:', error);
    }
    return false;
  }
};

/**
 * 앱 리뷰 요청 (iOS)
 */
export const requestAppReview = () => {
  const appInfo = getAppInfo();
  
  if (appInfo.isIOS && window.webkit?.messageHandlers?.requestReview) {
    window.webkit.messageHandlers.requestReview.postMessage({});
    return true;
  }
  
  return false;
};

/**
 * 햅틱 피드백 (지원하는 경우)
 */
export const triggerHaptic = (type = 'light') => {
  if (navigator.vibrate) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [30, 100, 30, 100, 30]
    };
    
    navigator.vibrate(patterns[type] || patterns.light);
    return true;
  }
  
  return false;
};

/**
 * PWA 초기화
 */
export const initPWA = async (options = {}) => {
  const {
    enableServiceWorker = true,
    enableInstallPrompt = true,
    enableNotifications = false,
    onOnline,
    onOffline
  } = options;
  
  console.log('Initializing PWA...');
  
  const results = {
    serviceWorker: null,
    installPrompt: false,
    notifications: false,
    appInfo: getAppInfo()
  };
  
  // Service Worker 등록
  if (enableServiceWorker) {
    try {
      results.serviceWorker = await registerServiceWorker();
    } catch (error) {
      console.error('Service Worker init failed:', error);
    }
  }
  
  // 설치 프롬프트 초기화
  if (enableInstallPrompt) {
    initInstallPrompt();
    results.installPrompt = true;
  }
  
  // 알림 권한 요청
  if (enableNotifications) {
    results.notifications = await requestNotificationPermission();
  }
  
  // 온/오프라인 상태 감지
  initOnlineStatus(onOnline, onOffline);
  
  console.log('PWA initialized:', results);
  
  return results;
};

export default {
  registerServiceWorker,
  initInstallPrompt,
  promptInstall,
  requestNotificationPermission,
  subscribeToPush,
  initOnlineStatus,
  registerBackgroundSync,
  clearCache,
  getCacheSize,
  getAppInfo,
  isAppInstalled,
  shareApp,
  requestAppReview,
  triggerHaptic,
  initPWA
};
