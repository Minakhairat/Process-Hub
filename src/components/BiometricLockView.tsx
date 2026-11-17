import React, { useState } from 'react';
import { Fingerprint, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { OWNER_INFO } from '../data/defaultApps';
import { FreshLogo } from './FreshLogo';

interface BiometricLockViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const BiometricLockView: React.FC<BiometricLockViewProps> = ({
  theme,
  onToggleTheme,
}) => {
  const { user, userProfile, localBiometricBinding, unlockWithBiometrics, signOutUser } =
    usePlatform();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUnlock = async () => {
    setBusy(true);
    setErrorMsg('');
    const res = await unlockWithBiometrics();
    setBusy(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'تعذر التحقق من البصمة، حاول مرة أخرى.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FreshLogo size="md" />
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
              عمليات فريش إليكتريك
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="تبديل المظهر"
            className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap shrink-0"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 space-y-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
            <Fingerprint className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">
              تأمين الدخول البيومتري
            </p>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">
              {userProfile?.displayName || localBiometricBinding?.displayName || user?.displayName || 'مرحباً بك'}
            </h1>
            <p className="text-xs font-latin text-zinc-500 dark:text-zinc-400" dir="ltr">
              {user?.email || localBiometricBinding?.email}
            </p>
            {localBiometricBinding?.deviceName && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                الجهاز المسجل: {localBiometricBinding.deviceName}
              </p>
            )}
          </div>

          {errorMsg && (
            <p className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300 leading-relaxed text-right">
              {errorMsg}
            </p>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleUnlock()}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <Fingerprint className="h-5 w-5" />
              <span>{busy ? 'جاري التحقق من البصمة...' : 'فتح المنصة بالبصمة / الوجه'}</span>
            </button>

            <button
              type="button"
              onClick={() => void signOutUser()}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج أو استخدام حساب آخر</span>
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400 text-right">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              تعتمد المصادقة البيومترية على أمان جهازك المحلي (Touch ID / Face ID / بصمة أندرويد) وتظل اختيارية ويمكنك إلغاؤها من صفحة حسابي ({OWNER_INFO.companyAr}).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
