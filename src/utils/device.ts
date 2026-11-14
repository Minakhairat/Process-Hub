export function detectPlatformInfo(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';

  const ua = navigator.userAgent.toLowerCase();
  let os = 'Web';
  if (/iphone|ipad|ipod/.test(ua)) {
    os = /ipad/.test(ua) ? 'iPadOS' : 'iOS';
  } else if (/android/.test(ua)) {
    os = 'Android';
  } else if (/windows/.test(ua)) {
    os = 'Windows';
  } else if (/mac os x|macintosh/.test(ua)) {
    os = 'macOS';
  } else if (/linux/.test(ua)) {
    os = 'Linux';
  }

  let device = 'Desktop';
  if (/mobile|iphone|ipod/.test(ua) || (/android/.test(ua) && /mobile/.test(ua))) {
    device = 'Mobile';
  } else if (/ipad|tablet/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) {
    device = 'Tablet';
  }

  return `${os} · ${device}`;
}

export function canUseBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!canUseBrowserNotifications()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function dispatchDeviceNotification(title: string, body: string, url?: string): Promise<void> {
  if (!canUseBrowserNotifications() || Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: './pwa-192x192.png',
          badge: './pwa-192x192.png',
          data: { url },
        });
        return;
      }
    }
    new Notification(title, {
      body,
      icon: './pwa-192x192.png',
    });
  } catch {
    // Silent fallback when OS notification channel is unavailable inside embedded frames
  }
}

export function sanitizeSlug(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return cleaned || `app-${Date.now().toString(36)}`;
}
