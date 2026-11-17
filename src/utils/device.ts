import { SCHEMA_LIMITS } from '../types/platform';

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
          icon: './fresh-ops-192.png',
          badge: './fresh-ops-192.png',
          data: { url },
        });
        return;
      }
    }
    new Notification(title, {
      body,
      icon: './fresh-ops-192.png',
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

export function sanitizeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

export function sanitizeCustomFields(raw?: Record<string, string>): Record<string, string> {
  if (!raw) return {};
  const result: Record<string, string> = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (count >= SCHEMA_LIMITS.CUSTOM_FIELDS_MAX) break;
    const cleanKey = key.trim().slice(0, SCHEMA_LIMITS.CUSTOM_KEY_MAX);
    const cleanVal = String(value ?? '').trim().slice(0, SCHEMA_LIMITS.CUSTOM_VALUE_MAX);
    if (!cleanKey) continue;
    result[cleanKey] = cleanVal;
    count += 1;
  }
  return result;
}

export function formatDurationAr(totalSeconds?: number): string {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (sec === 0) return '0 ث';
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remSeconds = sec % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours} س ${minutes} د` : `${hours} س`;
  }
  if (minutes > 0) {
    return remSeconds > 0 ? `${minutes} د ${remSeconds} ث` : `${minutes} د`;
  }
  return `${remSeconds} ث`;
}
