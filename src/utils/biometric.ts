import { detectPlatformInfo } from './device';

const BIOMETRIC_BINDING_KEY = 'fresh_ops_biometric_binding_v1';
const BIOMETRIC_LOCK_KEY = 'fresh_ops_biometric_locked_v1';
const BIOMETRIC_SESSION_UNLOCKED_KEY = 'fresh_ops_biometric_session_unlocked_v1';

export interface LocalBiometricBinding {
  uid: string;
  email: string;
  displayName: string;
  deviceId: string;
  credentialId: string;
  deviceName: string;
  platformInfo: string;
  lockOnStart: boolean;
  registeredAt: number;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const arrayBuffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.credentials)
  );
}

export async function isPlatformBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function getLocalBiometricBinding(): LocalBiometricBinding | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BIOMETRIC_BINDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalBiometricBinding;
    if (!parsed?.uid || !parsed?.credentialId || !parsed?.deviceId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalBiometricBinding(binding: LocalBiometricBinding | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (binding) {
      localStorage.setItem(BIOMETRIC_BINDING_KEY, JSON.stringify(binding));
    } else {
      localStorage.removeItem(BIOMETRIC_BINDING_KEY);
      localStorage.removeItem(BIOMETRIC_LOCK_KEY);
      sessionStorage.removeItem(BIOMETRIC_SESSION_UNLOCKED_KEY);
    }
  } catch {
    // Ignore restricted storage errors
  }
}

export function setBiometricLockState(locked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (locked) {
      localStorage.setItem(BIOMETRIC_LOCK_KEY, '1');
      sessionStorage.removeItem(BIOMETRIC_SESSION_UNLOCKED_KEY);
    } else {
      localStorage.removeItem(BIOMETRIC_LOCK_KEY);
      sessionStorage.setItem(BIOMETRIC_SESSION_UNLOCKED_KEY, '1');
    }
  } catch {
    // Ignore storage failures
  }
}

export function shouldRequireBiometricUnlock(uid?: string | null): boolean {
  if (typeof window === 'undefined' || !uid) return false;
  const binding = getLocalBiometricBinding();
  if (!binding || binding.uid !== uid) return false;

  try {
    const explicitLocked = localStorage.getItem(BIOMETRIC_LOCK_KEY) === '1';
    if (explicitLocked) return true;
    if (binding.lockOnStart) {
      return sessionStorage.getItem(BIOMETRIC_SESSION_UNLOCKED_KEY) !== '1';
    }
  } catch {
    return false;
  }
  return false;
}

export function markBiometricSessionUnlocked(): void {
  setBiometricLockState(false);
}

function mapWebAuthnError(error: unknown): string {
  const errName = (error as { name?: string })?.name || '';
  const errMsg = (error as { message?: string })?.message || '';
  if (errName === 'NotAllowedError') {
    if (errMsg.toLowerCase().includes('publickey-credentials')) {
      return 'المتصفح الحالي داخل إطار معزول يمنع البصمة. افتح المنصة كتطبيق مثبت (PWA) أو في تبويب متصفح مستقل لتفعيل البصمة.';
    }
    return 'تم إلغاء التحقق البيومتري أو انتهت مهلة البصمة. يمكنك المحاولة مرة أخرى.';
  }
  if (errName === 'SecurityError') {
    return 'يتطلب التحقق بالبصمة فتح المنصة مباشرة عبر رابط HTTPS آمن أو من التطبيق المثبت على الموبايل.';
  }
  if (errName === 'NotSupportedError') {
    return 'هذا الجهاز أو المتصفح لا يدعم المصادقة البيومترية عبر WebAuthn.';
  }
  return 'تعذر إتمام التحقق البيومتري على هذا الجهاز.';
}

export async function registerDeviceBiometricPasskey(params: {
  uid: string;
  email: string;
  displayName: string;
  deviceName?: string;
}): Promise<
  | {
      ok: true;
      deviceId: string;
      credentialId: string;
      deviceName: string;
      platformInfo: string;
    }
  | { ok: false; error: string }
> {
  if (!isWebAuthnSupported()) {
    return {
      ok: false,
      error: 'المتصفح الحالي لا يدعم المصادقة البيومترية (WebAuthn).',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userIdBytes = new TextEncoder().encode(params.uid);
    const platformInfo = detectPlatformInfo().slice(0, 100);
    const cleanDeviceName = (params.deviceName?.trim() || `جهاز ${platformInfo}`).slice(0, 100);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'عمليات فريش إليكتريك',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: params.email,
          displayName: params.displayName || params.email,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.rawId) {
      return { ok: false, error: 'لم يتم إنشاء مفتاح البصمة على الجهاز.' };
    }

    const credentialId = bufferToBase64Url(credential.rawId);
    const deviceId = `bio_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      ok: true,
      deviceId,
      credentialId,
      deviceName: cleanDeviceName,
      platformInfo,
    };
  } catch (err) {
    return { ok: false, error: mapWebAuthnError(err) };
  }
}

export async function verifyDeviceBiometricPasskey(
  credentialId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isWebAuthnSupported()) {
    return {
      ok: false,
      error: 'المتصفح الحالي لا يدعم المصادقة البيومترية (WebAuthn).',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const rawId = base64UrlToUint8Array(credentialId);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: rawId,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { ok: false, error: 'تعذر التحقق من البصمة.' };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapWebAuthnError(err) };
  }
}
